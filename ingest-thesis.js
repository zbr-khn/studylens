const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const JSZip = require('jszip');
const { GoogleGenAI } = require('@google/genai');

const THESIS_DIR = 'C:\\Users\\khanZ\\OneDrive\\Desktop\\College\\Sem 6\\Thesis';
const DATA_FILE = path.join(process.env.APPDATA || '', 'studylens', 'studylens_data.json');
const LOCAL_SEED_FILE = path.join(__dirname, 'sample-materials', 'thesis_preindexed.json');

console.log('--- Ingesting Bachelor Thesis Materials ---');
console.log('Source Directory:', THESIS_DIR);

let apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey && fs.existsSync(path.join(__dirname, '.env'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
  if (match) apiKey = match[1].trim();
}
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY is not set. Please set it in .env or as an environment variable.');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

function splitByHeadings(fileName, rawText) {
  const lines = rawText.split('\n');
  const sections = [];
  let currentHeading = `${fileName} - Overview`;
  let currentContent = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeader =
      /^#{1,4}\s+(.+)$/.test(trimmed) ||
      /^(Chapter|Section|Unit|Lecture|Part|Slide)\s+\d+[:\s\-]*(.+)?$/i.test(trimmed) ||
      /^[0-9]\.[0-9]+(\.[0-9]+)?\s+[A-Z]/.test(trimmed) ||
      /^[A-Z\s]{4,40}:$/.test(trimmed);

    if (isHeader) {
      if (currentContent.join('\n').trim().length > 30) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join('\n').trim(),
        });
        currentContent = [];
      }
      currentHeading = `${fileName} → ${trimmed.replace(/^#+\s*/, '')}`;
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.join('\n').trim().length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join('\n').trim(),
    });
  }

  return sections;
}

function createChunks(docId, courseId, docName, sections) {
  const chunks = [];
  const MAX_CHUNK_CHAR = 1100;
  const OVERLAP = 150;

  for (const sec of sections) {
    const text = sec.content;
    if (text.length <= MAX_CHUNK_CHAR) {
      chunks.push({
        id: `chunk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        documentId: docId,
        courseId,
        docName,
        heading: sec.heading,
        content: text,
      });
    } else {
      let start = 0;
      let part = 1;
      while (start < text.length) {
        const end = Math.min(start + MAX_CHUNK_CHAR, text.length);
        const slice = text.substring(start, end).trim();
        if (slice.length > 20) {
          chunks.push({
            id: `chunk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            documentId: docId,
            courseId,
            docName,
            heading: `${sec.heading} (Part ${part})`,
            content: slice,
          });
          part++;
        }
        if (end >= text.length) break;
        start += MAX_CHUNK_CHAR - OVERLAP;
      }
    }
  }
  return chunks;
}

async function processPdf(filePath) {
  const buf = fs.readFileSync(filePath);
  const data = await pdfParse(buf);
  return data.text || '';
}

async function processPptx(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  let slideIndex = 1;
  const slideTexts = [];
  while (true) {
    const slideFile = zip.file(`ppt/slides/slide${slideIndex}.xml`);
    if (!slideFile) break;
    const slideXml = await slideFile.async('text');
    const textMatches = slideXml.match(/<a:t>([^<]+)<\/a:t>/g);
    if (textMatches && textMatches.length > 0) {
      const slideText = textMatches
        .map((tag) => tag.replace(/<\/?a:t>/g, ''))
        .join(' ')
        .trim();
      if (slideText.length > 5) {
        slideTexts.push(`Slide ${slideIndex}\n${slideText}`);
      }
    }
    slideIndex++;
  }
  return slideTexts.join('\n\n');
}

async function main() {
  const courseId = 'course-thesis';
  const filesToProcess = [
    { name: 'Zubair_Ahmed_Khan_92127983_Bachelor_Thesis.pdf', type: 'pdf' },
    { name: 'Zubair thesis presentation script.pdf', type: 'pdf' },
    { name: 'Colloquium PPT ENG (2).pptx', type: 'pptx' },
    { name: 'Zubair Thesis Presentation.pptx', type: 'pptx' },
    { name: 'Zubair Exposé Agentic AI.pdf', type: 'pdf' },
    { name: 'Requirements and Scope of the Thesis (3).pdf', type: 'pdf' },
    { name: 'Thesis Handbook_EN_ab 2025.pdf', type: 'pdf' },
    { name: 'README.md', type: 'txt' },
  ];

  const processedDocuments = [];
  const allChunks = [];

  for (const item of filesToProcess) {
    const fullPath = path.join(THESIS_DIR, item.name);
    if (!fs.existsSync(fullPath)) {
      // Try fuzzy match for Expose file
      const dirFiles = fs.readdirSync(THESIS_DIR);
      const match = dirFiles.find((f) => f.toLowerCase().includes(item.name.slice(0, 12).toLowerCase()));
      if (!match) {
        console.warn(`File not found: ${fullPath}`);
        continue;
      }
      item.name = match;
    }

    const actualPath = path.join(THESIS_DIR, item.name);
    console.log(`Processing: ${item.name}...`);
    let rawText = '';
    if (item.type === 'pdf') {
      rawText = await processPdf(actualPath);
    } else if (item.type === 'pptx') {
      rawText = await processPptx(actualPath);
    } else {
      rawText = fs.readFileSync(actualPath, 'utf-8');
    }

    console.log(`  Extracted ${rawText.length} characters.`);
    const sections = splitByHeadings(item.name, rawText);
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const chunks = createChunks(docId, courseId, item.name, sections);
    console.log(`  Created ${chunks.length} chunks.`);

    processedDocuments.push({
      id: docId,
      courseId,
      name: item.name,
      fileType: item.type,
      size: fs.statSync(actualPath).size,
      uploadedAt: Date.now(),
      chunkCount: chunks.length,
      status: 'indexed',
    });

    allChunks.push(...chunks);
  }

  console.log(`\nTotal Documents Indexed: ${processedDocuments.length}`);
  console.log(`Total Semantic Chunks: ${allChunks.length}`);

  // Also analyze the two thesis question images with Gemini Vision so their questions are indexed too!
  const imageFiles = ['thesis questions.jpeg', 'thesis questions 2.jpeg'];
  for (const imgName of imageFiles) {
    const imgPath = path.join(THESIS_DIR, imgName);
    if (fs.existsSync(imgPath)) {
      console.log(`Extracting defense questions from image: ${imgName}...`);
      try {
        const b64 = fs.readFileSync(imgPath).toString('base64');
        const res = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/jpeg', data: b64 } },
                { text: 'Transcribe all the thesis defense/colloquium questions shown in this image accurately.' },
              ],
            },
          ],
        });
        const imgText = res.text || '';
        if (imgText.length > 10) {
          const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const chunk = {
            id: `chunk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            documentId: docId,
            courseId,
            docName: imgName,
            heading: `${imgName} → Expected Defense Questions`,
            content: imgText,
          };
          processedDocuments.push({
            id: docId,
            courseId,
            name: imgName,
            fileType: 'image',
            size: fs.statSync(imgPath).size,
            uploadedAt: Date.now(),
            chunkCount: 1,
            status: 'indexed',
          });
          allChunks.push(chunk);
          console.log(`  Extracted questions from ${imgName}:\n${imgText.slice(0, 200)}...`);
        }
      } catch (e) {
        console.warn(`  Image OCR skipped for ${imgName}:`, e.message);
      }
    }
  }

  const thesisCourse = {
    id: courseId,
    name: 'Bachelor Thesis: Agentic AI for Task Automation',
    code: 'THESIS-92127983',
    description: 'A Literature-Based Analysis of Agentic AI for Task Automation: Opportunities, Challenges, and a Lightweight Prototype Demonstration (Zubair Ahmed Khan).',
    createdAt: Date.now(),
    documentCount: processedDocuments.length,
  };

  const thesisSession = {
    id: 'session-colloquium-defense',
    courseId,
    title: 'Colloquium & Thesis Defense Q&A (Live Assistant)',
    currentTopic: 'Agentic AI Task Automation, Prototype & Evaluation Defense',
    weakAreas: [
      'Justification of rule-based critique vs LLM critic',
      'Bounded autonomy & human-in-the-loop approval',
      'Deterministic baseline vs LLM mode evaluation metrics',
    ],
    notes: 'Thesis Title: A Literature-Based Analysis of Agentic AI for Task Automation: Opportunities, Challenges, and a Lightweight Prototype Demonstration.\nAuthor: Zubair Ahmed Khan (92127983).',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const db = {
    settings: {
      hasApiKey: true,
      textModel: 'gemini-3.1-flash-lite',
      visionModel: 'gemini-3.1-flash-lite',
      transcriptionModel: 'gemini-3.1-flash-lite',
      embeddingModel: 'gemini-embedding-001',
      temperature: 0.2,
      audioSource: 'system',
      audioDeviceId: 'default',
      speechLanguage: 'en',
      windowOpacity: 85,
      blurAmount: 24,
      compactMode: true,
      alwaysOnTop: true,
      hotkeyCapture: 'CommandOrControl+Shift+S',
      hotkeyAssistant: 'CommandOrControl+Shift+Space',
      privacyStoreTranscripts: true,
      privacyStoreAudio: false,
      privacyStoreScreenshots: false,
      autoDeleteOnExit: false,
    },
    courses: [thesisCourse],
    documents: processedDocuments,
    chunks: allChunks,
    sessions: [thesisSession],
    messages: {},
    quizzes: [],
    flashcards: [],
    notes: [],
    tokenUsage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, totalRequests: 0 },
  };

  const appDataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  fs.writeFileSync(LOCAL_SEED_FILE, JSON.stringify(db, null, 2), 'utf-8');

  console.log(`\n✓ Saved pre-indexed Thesis Knowledge Base (${allChunks.length} chunks) to:`);
  console.log(`  1) ${DATA_FILE}`);
  console.log(`  2) ${LOCAL_SEED_FILE}`);
}

main().catch(console.error);
