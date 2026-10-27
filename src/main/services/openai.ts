import OpenAI, { toFile } from 'openai';
import { StorageService } from './storage';
import { ResponseMode, ResponseLength } from '../../shared/types';

export class OpenAIService {
  private storage: StorageService;
  private client: OpenAI | null = null;

  constructor(storage: StorageService) {
    this.storage = storage;
    this.initClient();
  }

  public initClient(): void {
    const key = this.storage.getApiKey();
    if (key) {
      this.client = new OpenAI({ apiKey: key });
    } else {
      this.client = null;
    }
  }

  public getClient(): OpenAI {
    if (!this.client) {
      this.initClient();
    }
    if (!this.client) {
      throw new Error('OpenAI API key is missing. Please enter your API key in Settings.');
    }
    return this.client;
  }

  public async testConnection(): Promise<{ success: boolean; model: string; error?: string }> {
    try {
      const client = this.getClient();
      const settings = this.storage.getSettings();
      const model = settings.textModel || 'gpt-4o-mini';

      const response = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: 'Respond with "OK" if connection is successful.' }],
        max_tokens: 10,
      });

      const reply = response.choices[0]?.message?.content?.trim() || '';
      return { success: reply.length > 0, model };
    } catch (err: any) {
      return { success: false, model: '', error: err.message || 'Unknown OpenAI API error' };
    }
  }

  public async createEmbedding(text: string): Promise<number[]> {
    const client = this.getClient();
    const settings = this.storage.getSettings();
    const model = settings.embeddingModel || 'text-embedding-3-small';

    const resp = await client.embeddings.create({
      model,
      input: text.slice(0, 8000), // within token limits
    });

    const tokens = resp.usage?.total_tokens || Math.ceil(text.length / 4);
    this.storage.recordTokenUsage(tokens, 0, model);

    return resp.data[0].embedding;
  }

  public async generateResponse(
    prompt: string,
    systemPrompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const client = this.getClient();
    const settings = this.storage.getSettings();
    const model = options?.model || settings.textModel || 'gpt-4o';
    const temperature = options?.temperature ?? settings.temperature ?? 0.3;

    const resp = await client.chat.completions.create({
      model,
      temperature,
      max_tokens: options?.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });

    const inTokens = resp.usage?.prompt_tokens || 0;
    const outTokens = resp.usage?.completion_tokens || 0;
    this.storage.recordTokenUsage(inTokens, outTokens, model);

    return resp.choices[0]?.message?.content || '';
  }

  public async analyzeImage(
    imageBase64: string,
    prompt: string,
    courseContext?: string
  ): Promise<string> {
    const client = this.getClient();
    const settings = this.storage.getSettings();
    const model = settings.visionModel || 'gpt-4o';

    const cleanBase64 = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;

    const systemPrompt = `You are StudyLens, an academic study assistant for university students.
The user provided a screen capture (slide, code, math equation, or question) and asked a question about it.
${courseContext ? `Here is relevant context from their uploaded course materials:\n${courseContext}\n` : ''}

Analyze the visual content accurately:
- If it's a mathematical formula or proof, break down each step using LaTeX formatting ($...$ or $$...$$).
- If it's code, explain the logic, asymptotic complexity, or error.
- If it's a slide diagram, interpret the architectural or theoretical significance.
- Clearly separate what is in the image vs. additional academic insights.`;

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt || 'Analyze and explain this screen capture.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${cleanBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
    });

    const inTokens = resp.usage?.prompt_tokens || 0;
    const outTokens = resp.usage?.completion_tokens || 0;
    this.storage.recordTokenUsage(inTokens, outTokens, model);

    return resp.choices[0]?.message?.content || '';
  }

  public async transcribeAudio(
    audioBuffer: Uint8Array,
    mimeType: string = 'audio/webm'
  ): Promise<string> {
    const client = this.getClient();
    const settings = this.storage.getSettings();
    const model = settings.transcriptionModel || 'whisper-1';
    const language = settings.speechLanguage || 'en';

    const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'm4a' : 'webm';
    const file = await toFile(Buffer.from(audioBuffer), `audio.${ext}`, {
      type: mimeType,
    });

    const resp = await client.audio.transcriptions.create({
      file,
      model,
      language: language === 'auto' ? undefined : language,
    });

    // Whisper pricing is ~ $0.006 per minute. Record synthetic request count
    this.storage.recordTokenUsage(20, 20, 'whisper-1');

    return resp.text.trim();
  }

  public async streamResponse(
    params: {
      prompt: string;
      systemPrompt: string;
      messagesHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      mode?: ResponseMode;
      responseLength?: ResponseLength;
      courseContext?: string;
      screenshotBase64?: string;
    },
    onChunk: (chunk: string) => void,
    onDone: (fullContent: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const client = this.getClient();
      const settings = this.storage.getSettings();
      const model = settings.textModel || 'gpt-4o';
      const temperature = settings.temperature ?? 0.3;

      let builtSystemPrompt = this.buildAcademicSystemPrompt(
        params.mode || 'study_answer',
        params.responseLength || 'medium',
        params.courseContext
      );

      const messages: any[] = [{ role: 'system', content: builtSystemPrompt }];

      if (params.messagesHistory && params.messagesHistory.length > 0) {
        // Include last 6 messages for context
        for (const msg of params.messagesHistory.slice(-6)) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }

      if (params.screenshotBase64) {
        const cleanBase64 = params.screenshotBase64.includes('base64,')
          ? params.screenshotBase64.split('base64,')[1]
          : params.screenshotBase64;
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: params.prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${cleanBase64}`, detail: 'high' },
            },
          ],
        });
      } else {
        messages.push({ role: 'user', content: params.prompt });
      }

      const stream = await client.chat.completions.create({
        model,
        temperature,
        messages,
        stream: true,
        stream_options: { include_usage: true },
      });

      let fullContent = '';
      let promptTokens = 0;
      let completionTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullContent += delta;
          onChunk(delta);
        }
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens;
          completionTokens = chunk.usage.completion_tokens;
        }
      }

      if (promptTokens === 0) {
        promptTokens = Math.ceil((builtSystemPrompt.length + params.prompt.length) / 4);
        completionTokens = Math.ceil(fullContent.length / 4);
      }
      this.storage.recordTokenUsage(promptTokens, completionTokens, model);

      onDone(fullContent);
    } catch (err: any) {
      console.error('Streaming error:', err);
      onError(err.message || 'Error communicating with OpenAI');
    }
  }

  private buildAcademicSystemPrompt(
    mode: ResponseMode,
    length: ResponseLength,
    courseContext?: string
  ): string {
    let lengthInstruction = '';
    switch (length) {
      case 'one_sentence':
        lengthInstruction = 'Provide a strictly ONE SENTENCE ultra-concise answer.';
        break;
      case 'short':
        lengthInstruction = 'Keep the answer concise (2-3 short sentences or bullet points), highly direct for fast revision.';
        break;
      case 'medium':
        lengthInstruction = 'Provide a standard university-level explanation: brief, structured, with intuition and formulas.';
        break;
      case 'detailed':
        lengthInstruction = 'Provide a comprehensive academic breakdown with complete mathematical derivation, code example, or theoretical proofs.';
        break;
    }

    let modeInstruction = '';
    switch (mode) {
      case 'explain':
        modeInstruction = 'Explain what the speaker or question is discussing in clear conceptual terms.';
        break;
      case 'study_answer':
        modeInstruction = `Format the answer with clear academic structure:
### SHORT ANSWER
[Direct core answer]

### WHY
[Intuition or underlying theoretical reason]

### EXAMPLE / PROOF
[Clear concrete example or formula]

### FROM YOUR COURSE MATERIAL
[Explicit citations from uploaded slides/handbook if present in context, or state "General academic principle"]

### ADDITIONAL EXPLANATION
[Further academic context or edge cases]`;
        break;
      case 'simple':
        modeInstruction = 'Explain this concept as simply as possible (ELI5) using an everyday intuitive metaphor without sacrificing technical correctness.';
        break;
      case 'detailed':
        modeInstruction = 'Deliver a rigorous, complete examination-grade answer with step-by-step logic, notation, and caveats.';
        break;
      case 'follow_up':
        modeInstruction = 'Provide a brief answer followed by 3 insightful, high-value academic follow-up questions the student can ask the lecturer or explore.';
        break;
      case 'sources':
        modeInstruction = 'Focus strictly on referencing and quoting the exact passages and definitions from the uploaded course material.';
        break;
      case 'teach_me':
        modeInstruction = `You are an expert university professor and 1-on-1 tutor. Guide the student interactively:
1. Concept statement
2. Intuitive explanation
3. Worked example
4. Check for understanding: ask the student a quick check question to see if they followed!`;
        break;
    }

    return `You are StudyLens, a premier AI-powered Bachelor's study assistant for university students.
You assist with computer science, mathematics, engineering, and academic coursework.
Always output standard Markdown with LaTeX formulas formatted using $...$ for inline or $$...$$ for block math.

${lengthInstruction}
${modeInstruction}

CRITICAL RULES ON COURSE MATERIAL:
1. Always prioritize the user's uploaded course material provided below.
2. Clearly distinguish between:
   **From your course material** (material directly sourced from the provided snippets)
   and
   **Additional explanation** (standard academic / broader knowledge).
3. If the uploaded material does not contain the answer, explicitly state: "From your course material: No direct section found. Additional explanation:" then proceed with the academic answer.

${
  courseContext
    ? `=== RELEVANT UPLOADED COURSE MATERIAL ===\n${courseContext}\n=========================================`
    : '=== NO SPECIFIC COURSE MATERIAL UPLOADED FOR THIS QUERY ==='
}`;
  }
}
