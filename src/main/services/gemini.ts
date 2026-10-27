import { GoogleGenAI } from '@google/genai';
import { StorageService } from './storage';
import { ResponseMode, ResponseLength } from '../../shared/types';

export class GeminiService {
  private storage: StorageService;
  private client: GoogleGenAI | null = null;

  constructor(storage: StorageService) {
    this.storage = storage;
    this.initClient();
  }

  public initClient(): void {
    const key = this.storage.getApiKey();
    if (key) {
      this.client = new GoogleGenAI({ apiKey: key });
    } else {
      this.client = null;
    }
  }

  public getClient(): GoogleGenAI {
    if (!this.client) {
      this.initClient();
    }
    if (!this.client) {
      throw new Error('Google Gemini API key is missing. Please enter your Gemini API key in Settings or during onboarding.');
    }
    return this.client;
  }

  public async testConnection(): Promise<{ success: boolean; model: string; error?: string }> {
    try {
      const client = this.getClient();
      const settings = this.storage.getSettings();
      const model = settings.textModel || 'gemini-3.1-flash-lite';

      const response = await client.models.generateContent({
        model,
        contents: 'Respond with "OK" if connection is successful.',
        config: {
          maxOutputTokens: 10,
        },
      });

      const reply = response.text ? response.text.trim() : '';
      return { success: reply.length > 0, model };
    } catch (err: any) {
      return { success: false, model: '', error: err.message || 'Unknown Google Gemini API error' };
    }
  }

  public async createEmbedding(text: string): Promise<number[]> {
    const client = this.getClient();
    const settings = this.storage.getSettings();
    const model = settings.embeddingModel || 'gemini-embedding-001';

    const resp = await client.models.embedContent({
      model,
      contents: text.slice(0, 8000),
    });

    const values = (resp as any).embeddings?.[0]?.values || resp.embedding?.values || [];
    this.storage.recordTokenUsage(Math.ceil(text.length / 4), 0, model);

    return values;
  }

  public async generateResponse(
    prompt: string,
    systemInstruction: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const client = this.getClient();
    const settings = this.storage.getSettings();
    const model = options?.model || settings.textModel || 'gemini-3.1-flash-lite';
    const temperature = options?.temperature ?? settings.temperature ?? 0.3;

    const resp = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || undefined,
        temperature,
        maxOutputTokens: options?.maxTokens,
      },
    });

    const outputText = resp.text || '';
    const inTokens = resp.usageMetadata?.promptTokenCount || Math.ceil((prompt.length + systemInstruction.length) / 4);
    const outTokens = resp.usageMetadata?.candidatesTokenCount || Math.ceil(outputText.length / 4);
    this.storage.recordTokenUsage(inTokens, outTokens, model);

    return outputText;
  }

  public async analyzeImage(
    imageBase64: string,
    prompt: string,
    courseContext?: string
  ): Promise<string> {
    const client = this.getClient();
    const settings = this.storage.getSettings();
    const model = settings.visionModel || 'gemini-3.1-flash-lite';

    const cleanBase64 = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;

    const systemInstruction = `You are StudyLens, an academic study assistant for university students powered by Google Gemini.
The user provided a screen capture (slide, code, math equation, or question) and asked a question about it.
${courseContext ? `Here is relevant context from their uploaded course materials:\n${courseContext}\n` : ''}

Analyze the visual content accurately:
- If it's a mathematical formula or proof, break down each step using LaTeX formatting ($...$ or $$...$$).
- If it's code, explain the logic, asymptotic complexity, or error.
- If it's a slide diagram, interpret the architectural or theoretical significance.
- Clearly separate what is in the image vs. additional academic insights.`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64,
            },
          },
          {
            text: prompt || 'Analyze and explain this screen capture.',
          },
        ],
      },
    ];

    const resp = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const text = resp.text || '';
    const inTokens = resp.usageMetadata?.promptTokenCount || 250;
    const outTokens = resp.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
    this.storage.recordTokenUsage(inTokens, outTokens, model);

    return text;
  }

  public async transcribeAudio(
    audioBuffer: Uint8Array,
    mimeType: string = 'audio/webm'
  ): Promise<string> {
    const client = this.getClient();
    const settings = this.storage.getSettings();
    const model = settings.transcriptionModel || 'gemini-3.1-flash-lite';
    const language = settings.speechLanguage || 'en';

    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    const cleanMime = mimeType.split(';')[0]; // e.g. audio/webm

    const promptText = `Transcribe the speech in this audio recording accurately.
Output strictly and only the verbatim transcription text. Do not add metadata, comments, or quotes.
${language && language !== 'auto' ? `Language: ${language}.` : ''}`;

    const resp = await client.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Audio,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
      },
    });

    this.storage.recordTokenUsage(50, 20, model);

    return (resp.text || '').trim();
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
      const model = settings.textModel || 'gemini-3.1-flash-lite';
      const temperature = settings.temperature ?? 0.3;

      const builtSystemInstruction = this.buildAcademicSystemPrompt(
        params.mode || 'study_answer',
        params.responseLength || 'medium',
        params.courseContext
      );

      // Construct Gemini contents array
      const contents: any[] = [];

      if (params.messagesHistory && params.messagesHistory.length > 0) {
        for (const msg of params.messagesHistory.slice(-6)) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }

      const userParts: any[] = [];
      if (params.screenshotBase64) {
        const cleanBase64 = params.screenshotBase64.includes('base64,')
          ? params.screenshotBase64.split('base64,')[1]
          : params.screenshotBase64;
        userParts.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64,
          },
        });
      }
      userParts.push({ text: params.prompt });

      contents.push({
        role: 'user',
        parts: userParts,
      });

      const responseStream = await client.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: builtSystemInstruction,
          temperature,
        },
      });

      let fullContent = '';
      let inTokens = 0;
      let outTokens = 0;

      for await (const chunk of responseStream) {
        const text = chunk.text || '';
        if (text) {
          fullContent += text;
          onChunk(text);
        }
        if (chunk.usageMetadata) {
          inTokens = chunk.usageMetadata.promptTokenCount || inTokens;
          outTokens = chunk.usageMetadata.candidatesTokenCount || outTokens;
        }
      }

      if (inTokens === 0) {
        inTokens = Math.ceil((builtSystemInstruction.length + params.prompt.length) / 4);
        outTokens = Math.ceil(fullContent.length / 4);
      }
      this.storage.recordTokenUsage(inTokens, outTokens, model);

      onDone(fullContent);
    } catch (err: any) {
      console.error('Gemini streaming error:', err);
      onError(err.message || 'Error communicating with Google Gemini API');
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
        modeInstruction = 'Explain what the concept, passage, or question is discussing in clear, intuitive conceptual terms.';
        break;
      case 'study_answer':
        modeInstruction = `Format the answer with clear academic structure to maximize learning:
### Short Answer
[Direct core answer and conceptual summary]

### Key Concepts & Explanation
[Intuition, theoretical foundation, or step-by-step breakdown]

### Example / Application
[Concrete example, code snippet, formula derivation, or scenario]

### From Your Course Material
[Explicit citations and key definitions from uploaded documents, or note if based on general academic principles]

### Key Takeaways / Exam Tip
[1-2 bullet points highlighting common pitfalls, exam focus points, or memory hooks]`;
        break;
      case 'simple':
        modeInstruction = 'Explain this concept as simply as possible (ELI5) using an everyday intuitive metaphor without sacrificing technical correctness.';
        break;
      case 'detailed':
        modeInstruction = 'Deliver a rigorous, complete university-level explanation with comprehensive step-by-step logic, mathematical derivations, asymptotic complexity, or proofs.';
        break;
      case 'follow_up':
        modeInstruction = 'Provide a concise explanation followed by 3 insightful, high-value academic follow-up questions the student should test themselves on or ask their professor.';
        break;
      case 'sources':
        modeInstruction = 'Focus strictly on referencing, summarizing, and quoting the exact passages and definitions from the uploaded course materials.';
        break;
      case 'teach_me':
        modeInstruction = `Act as an expert, supportive university professor and 1-on-1 tutor. Guide the student interactively:
1. Concept statement
2. Intuitive explanation with a real-world parallel
3. Worked example
4. Check for understanding: ask the student a quick check question to see if they followed!`;
        break;
    }

    return `You are StudyLens, a premier AI-powered university study assistant and personal academic tutor powered by Google Gemini.
Your mission is to help university students deeply understand their course material, prepare for exams, complete assignments, master difficult concepts, and revise effectively.

Always output clean GitHub-flavored Markdown. Format mathematical formulas using LaTeX: $...$ for inline math and $$...$$ for block math.

${lengthInstruction}
${modeInstruction}

CRITICAL RULES ON COURSE MATERIAL:
1. Always prioritize the user's uploaded course material provided below.
2. Clearly distinguish between:
   **From your course material** (material directly sourced from the provided snippets)
   and
   **Additional explanation** (standard academic knowledge or broader context).
3. If the uploaded material does not contain the answer, explicitly state: "From your course material: No direct section found. Additional explanation:" then proceed with the academic answer.
4. Be encouraging, precise, and academically rigorous. Help the student build genuine comprehension and problem-solving skills.

${
  courseContext
    ? `=== RELEVANT UPLOADED COURSE MATERIAL ===\n${courseContext}\n=========================================`
    : '=== NO SPECIFIC COURSE MATERIAL UPLOADED FOR THIS QUERY ==='
}`;
  }
}
