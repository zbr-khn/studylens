import { app, BrowserWindow, ipcMain, globalShortcut, dialog, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { StorageService } from './services/storage';
import { GeminiService } from './services/gemini';
import { KnowledgeBaseService } from './services/knowledge-base';
import { ScreenCaptureService } from './services/screen-capture';
import { ResponseMode, ResponseLength } from '../shared/types';

// Rate Limiter to prevent API abuse, rapid scraping, and token exhaustion
class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 30, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public check(): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      return { allowed: false, retryAfterMs: this.windowMs - (now - oldest) };
    }
    this.timestamps.push(now);
    return { allowed: true };
  }
}

const aiRateLimiter = new RateLimiter(25, 60000); // Max 25 AI queries per minute
const searchRateLimiter = new RateLimiter(50, 60000); // Max 50 searches per minute

// Keep GPU compositing for translucent acrylic effects
app.commandLine.appendSwitch('enable-transparent-visuals');

let mainWindow: BrowserWindow | null = null;
let floatingWindow: BrowserWindow | null = null;

const storage = new StorageService();
const gemini = new GeminiService(storage);
const kb = new KnowledgeBaseService(storage, gemini);
const screenCapture = new ScreenCaptureService();

function getRendererIndexPath(): string {
  const candidates = [
    path.join(app.getAppPath(), 'dist/index.html'),
    path.join(__dirname, '../../dist/index.html'),
    path.join(__dirname, '../renderer/index.html'),
    path.join(process.cwd(), 'dist/index.html'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(app.getAppPath(), 'dist/index.html');
}

function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'StudyLens - AI Study Assistant',
    backgroundColor: '#0F1115',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('Renderer did-fail-load:', code, desc, url);
  });

  mainWindow.webContents.on('console-message', (_e, _level, message) => {
    console.log('[Renderer]:', message);
  });

  // Security: Prevent untrusted in-app navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith(process.env.VITE_DEV_SERVER_URL || 'http://localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Security: Open external links in user's default external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Security: Block webview tag injection
  mainWindow.webContents.on('will-attach-webview', (e) => {
    e.preventDefault();
  });

  const indexPath = getRendererIndexPath();
  console.log('[Main] Loading renderer from:', indexPath);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[Main] Failed to load index.html:', err);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Failsafe: ensure window becomes visible even if ready-to-show was delayed
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 600);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.close();
    }
  });

  return mainWindow;
}

function createFloatingWindow(): BrowserWindow {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    return floatingWindow;
  }

  const settings = storage.getSettings();

  floatingWindow = new BrowserWindow({
    width: 440,
    height: 640,
    minWidth: 360,
    minHeight: 450,
    frame: false,
    transparent: true,
    alwaysOnTop: settings.alwaysOnTop ?? true,
    skipTaskbar: false,
    title: 'StudyLens Floating Assistant',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (settings.alwaysOnTop ?? true) {
    floatingWindow.setAlwaysOnTop(true);
  }

  // Security: Prevent untrusted in-app navigation
  floatingWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith(process.env.VITE_DEV_SERVER_URL || 'http://localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Security: Open external links in user's default external browser
  floatingWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Security: Block webview tag injection
  floatingWindow.webContents.on('will-attach-webview', (e) => {
    e.preventDefault();
  });

  const indexPath = getRendererIndexPath();
  const url = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}#/floating`
    : `file://${indexPath}#/floating`;

  floatingWindow.loadURL(url);

  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });

  return floatingWindow;
}

function registerHotkeys() {
  const settings = storage.getSettings();
  try {
    globalShortcut.unregisterAll();

    // Hotkey: Assistant summon
    const assistantHotkey = settings.hotkeyAssistant || 'CommandOrControl+Shift+Space';
    globalShortcut.register(assistantHotkey, () => {
      toggleFloatingWindow();
    });

    // Hotkey: Screen capture
    const captureHotkey = settings.hotkeyCapture || 'CommandOrControl+Shift+S';
    globalShortcut.register(captureHotkey, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('trigger-screen-capture');
      }
      if (floatingWindow && !floatingWindow.isDestroyed()) {
        floatingWindow.webContents.send('trigger-screen-capture');
      }
    });
  } catch (err) {
    console.error('Failed to register global shortcuts:', err);
  }
}

function toggleFloatingWindow(): boolean {
  if (!floatingWindow || floatingWindow.isDestroyed()) {
    createFloatingWindow();
    floatingWindow?.show();
    return true;
  }

  if (floatingWindow.isVisible()) {
    floatingWindow.hide();
    return false;
  } else {
    floatingWindow.show();
    floatingWindow.focus();
    return true;
  }
}

function setupIpcHandlers() {
  // Settings
  ipcMain.handle('get-settings', async () => storage.getSettings());
  ipcMain.handle('update-settings', async (_, partial) => {
    const updated = storage.updateSettings(partial);
    registerHotkeys();
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      if (typeof partial.alwaysOnTop === 'boolean') {
        floatingWindow.setAlwaysOnTop(partial.alwaysOnTop);
      }
    }
    return updated;
  });
  ipcMain.handle('set-api-key', async (_, key: string) => {
    if (typeof key !== 'string') return { success: false, error: 'Invalid key format' };
    const cleanKey = key.trim().slice(0, 256);
    storage.setApiKey(cleanKey);
    gemini.initClient();
    return { success: true };
  });
  ipcMain.handle('test-api-key', async () => {
    return await gemini.testConnection();
  });

  // Courses
  ipcMain.handle('get-courses', async () => storage.getCourses());
  ipcMain.handle('create-course', async (_, name, description) => storage.createCourse(name, description));
  ipcMain.handle('delete-course', async (_, id) => storage.deleteCourse(id));

  // Documents & Knowledge Base
  ipcMain.handle('select-and-upload-files', async (_, courseId: string) => {
    if (!mainWindow) return [];
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Course Materials',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Course Documents',
          extensions: ['pdf', 'docx', 'doc', 'txt', 'md', 'pptx', 'ppt', 'zip', 'png', 'jpg', 'jpeg'],
        },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }

    const processedDocs = [];
    for (const filePath of result.filePaths) {
      const buffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const doc = await kb.processFile(courseId, fileName, buffer);
      processedDocs.push(doc);
    }
    return processedDocs;
  });

  ipcMain.handle('upload-files-from-paths', async (_, courseId: string, filePaths: string[]) => {
    if (!Array.isArray(filePaths)) return [];
    const processedDocs = [];
    for (const filePath of filePaths.slice(0, 50)) {
      if (typeof filePath === 'string' && fs.existsSync(filePath)) {
        try {
          const resolved = path.resolve(filePath);
          const stats = fs.statSync(resolved);
          // Security: restrict file size to max 100MB to prevent DoS
          if (stats.isFile() && stats.size <= 100 * 1024 * 1024) {
            const buffer = fs.readFileSync(resolved);
            const fileName = path.basename(resolved);
            const doc = await kb.processFile(String(courseId || ''), fileName, buffer);
            processedDocs.push(doc);
          }
        } catch (err) {
          console.warn('Skipped unreadable file path:', err);
        }
      }
    }
    return processedDocs;
  });

  ipcMain.handle(
    'upload-file-buffers',
    async (_, courseId: string, files: Array<{ name: string; buffer: Uint8Array }>) => {
      if (!Array.isArray(files)) return [];
      const processedDocs = [];
      for (const item of files.slice(0, 50)) {
        if (item && item.buffer && item.buffer.length <= 100 * 1024 * 1024) {
          const nodeBuffer = Buffer.from(item.buffer);
          const doc = await kb.processFile(String(courseId || ''), path.basename(item.name || 'document'), nodeBuffer);
          processedDocs.push(doc);
        }
      }
      return processedDocs;
    }
  );

  ipcMain.handle('get-documents', async (_, courseId) => storage.getDocuments(courseId));
  ipcMain.handle('delete-document', async (_, id) => storage.deleteDocument(id));
  ipcMain.handle('search-knowledge', async (_, courseId, query, topK) => {
    if (typeof query !== 'string' || !query.trim()) {
      return { chunks: [], hasMatch: false, contextFormatted: '' };
    }
    const limitStatus = searchRateLimiter.check();
    if (!limitStatus.allowed) {
      return { chunks: [], hasMatch: false, contextFormatted: 'Search rate limit reached. Please wait a moment.' };
    }
    const cleanQuery = query.trim().slice(0, 1000);
    const safeTopK = Math.min(Math.max(1, typeof topK === 'number' ? topK : 4), 20);
    return await kb.search(String(courseId || ''), cleanQuery, safeTopK);
  });

  // Sessions & Chat
  ipcMain.handle('get-sessions', async (_, courseId) => storage.getSessions(courseId));
  ipcMain.handle('create-session', async (_, courseId, title, topic) =>
    storage.createSession(courseId, title, topic)
  );
  ipcMain.handle('update-session', async (_, partial) => storage.updateSession(partial));
  ipcMain.handle('delete-session', async (_, id) => storage.deleteSession(id));
  ipcMain.handle('get-session-messages', async (_, sessionId) => storage.getMessages(sessionId));
  ipcMain.handle('save-message', async (_, message) => storage.saveMessage(message));
  ipcMain.handle('clear-session-messages', async (_, sessionId) => storage.clearMessages(sessionId));

  // AI Streaming Chat
  let activeStreamAbort = false;
  ipcMain.handle('stop-ai-stream', async () => {
    activeStreamAbort = true;
  });

  ipcMain.handle(
    'ask-ai-stream',
    async (
      event,
      params: {
        sessionId: string;
        courseId: string;
        prompt: string;
        mode: ResponseMode;
        responseLength?: ResponseLength;
        screenshotBase64?: string;
      }
    ) => {
      activeStreamAbort = false;
      const sender = event.sender;

      // Security: Validate inputs and bounds check
      if (!params || typeof params.prompt !== 'string') {
        sender.send('ai-stream-error', { error: 'Invalid prompt provided.' });
        return;
      }
      const cleanPrompt = params.prompt.trim().slice(0, 30000);
      if (!cleanPrompt) {
        sender.send('ai-stream-error', { error: 'Prompt cannot be empty.' });
        return;
      }

      // Security: Rate limiting to prevent token exhaustion and API flooding
      const limitStatus = aiRateLimiter.check();
      if (!limitStatus.allowed) {
        const waitSec = Math.ceil((limitStatus.retryAfterMs || 1000) / 1000);
        sender.send('ai-stream-error', {
          error: `Rate limit reached. Please wait ${waitSec}s before sending another request.`,
        });
        return;
      }

      // 1. Search knowledge base first!
      const searchResult = await kb.search(String(params.courseId || ''), cleanPrompt, 4);
      const existingMessages = storage.getMessages(String(params.sessionId || ''));
      const history = existingMessages.map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      }));

      await gemini.streamResponse(
        {
          prompt: cleanPrompt,
          systemPrompt: '',
          messagesHistory: history,
          mode: params.mode,
          responseLength: params.responseLength,
          courseContext: searchResult.hasMatch ? searchResult.contextFormatted : undefined,
          screenshotBase64: params.screenshotBase64,
        },
        (chunk) => {
          if (!activeStreamAbort) {
            sender.send('ai-stream-chunk', { chunk });
          }
        },
        (fullContent) => {
          const sources = searchResult.chunks.map((c) => ({
            docName: c.docName,
            heading: c.heading,
            snippet: c.content.slice(0, 200) + '...',
          }));
          sender.send('ai-stream-done', { fullContent, sources });
        },
        (error) => {
          sender.send('ai-stream-error', { error });
        }
      );
    }
  );

  // Audio transcription
  ipcMain.handle('transcribe-audio', async (_, audioBuffer: Uint8Array, mimeType?: string) => {
    return await gemini.transcribeAudio(audioBuffer, mimeType);
  });

  // Speech Statement Analysis (for real-time live mode)
  ipcMain.handle(
    'analyze-speech-statement',
    async (
      _,
      params: {
        courseId: string;
        sessionId: string;
        transcriptText: string;
        mode: ResponseMode;
      }
    ) => {
      const text = params.transcriptText.trim();
      if (!text || text.length < 15) {
        return { questionDetected: false };
      }

      // Check if it's a question or core concept
      const isQuestion =
        text.includes('?') ||
        /^(what|why|how|explain|difference|can you|could|which|define|does|is|are|prove)/i.test(text);

      if (!isQuestion && text.split(' ').length < 8) {
        return { questionDetected: false };
      }

      // Search knowledge base
      const searchResult = await kb.search(params.courseId, text, 3);
      const prompt = `The lecturer just said:\n"${text}"\n\nProvide a concise academic explanation/answer for this topic.`;

      const answer = await gemini.generateResponse(
        prompt,
        `You are StudyLens, a real-time study assistant during lectures.
Format your answer with concise bullet points:
- SHORT ANSWER
- WHY
- FROM YOUR COURSE MATERIAL (cite uploaded snippets if matching, or state "General academic principle")
- ADDITIONAL EXPLANATION`,
        { maxTokens: 400, temperature: 0.3 }
      );

      const sources = searchResult.chunks.map((c) => ({
        docName: c.docName,
        heading: c.heading,
        snippet: c.content.slice(0, 180),
      }));

      return {
        questionDetected: true,
        detectedQuestion: text,
        answer,
        sources,
      };
    }
  );

  // Screen Context
  ipcMain.handle('capture-screen', async () => {
    return await screenCapture.captureScreen();
  });

  ipcMain.handle(
    'analyze-screenshot',
    async (
      _,
      params: {
        imageBase64: string;
        prompt: string;
        courseId: string;
        mode?: ResponseMode;
      }
    ) => {
      // Find course context based on prompt
      const searchResult = await kb.search(params.courseId, params.prompt || 'slide concept equation', 3);
      return await gemini.analyzeImage(
        params.imageBase64,
        params.prompt,
        searchResult.hasMatch ? searchResult.contextFormatted : undefined
      );
    }
  );

  // Quizzes & Flashcards
  ipcMain.handle(
    'generate-quiz',
    async (
      _,
      params: {
        courseId: string;
        topic: string;
        count: number;
        difficulty: 'introductory' | 'university' | 'advanced';
        types: ('mcq' | 'short_answer' | 'true_false')[];
      }
    ) => {
      const searchResult = await kb.search(params.courseId, params.topic, 5);
      const prompt = `Generate a ${params.count}-question university exam level quiz on "${params.topic}".
Difficulty: ${params.difficulty}.
Types: ${params.types.join(', ')}.

Uploaded Course Material Context:
${searchResult.contextFormatted || 'Standard university syllabus.'}

Return strictly a JSON object conforming to this TypeScript schema:
{
  "title": "${params.topic} Quiz",
  "questions": [
    {
      "id": "q1",
      "type": "mcq" | "short_answer" | "true_false",
      "question": "string",
      "options": ["A", "B", "C", "D"], // for mcq only
      "correctAnswer": "string or index",
      "explanation": "string",
      "source": "string"
    }
  ]
}
DO NOT wrap in backticks or markdown, output ONLY raw JSON.`;

      const raw = await gemini.generateResponse(
        prompt,
        'You are an expert university examiner. Output only valid JSON.',
        { temperature: 0.2, maxTokens: 2500 }
      );

      let clean = raw.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);

      const parsed = JSON.parse(clean.trim());
      const quiz = {
        id: `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        courseId: params.courseId,
        title: parsed.title || `${params.topic} Quiz`,
        topic: params.topic,
        difficulty: params.difficulty,
        questions: parsed.questions || [],
        totalQuestions: (parsed.questions || []).length,
        createdAt: Date.now(),
      };

      storage.saveQuiz(quiz as any);
      return quiz;
    }
  );

  ipcMain.handle('get-quizzes', async (_, courseId) => storage.getQuizzes(courseId));
  ipcMain.handle('save-quiz-result', async (_, quiz) => storage.saveQuiz(quiz));

  ipcMain.handle(
    'generate-flashcards',
    async (_, params: { courseId: string; topic: string; count: number }) => {
      const searchResult = await kb.search(params.courseId, params.topic, 5);
      const prompt = `Generate ${params.count} academic flashcards for university study on "${params.topic}".
Course Context:
${searchResult.contextFormatted || 'Standard university syllabus.'}

Return strictly a JSON array of flashcards:
[
  {
    "front": "Question, theorem name, or concept prompt",
    "back": "Precise answer, definition, formula, or proof outline",
    "source": "Course section or general topic",
    "difficulty": "medium"
  }
]
Output strictly raw JSON without markdown formatting.`;

      const raw = await gemini.generateResponse(
        prompt,
        'You are an expert university educator. Output only valid JSON.',
        { temperature: 0.2, maxTokens: 2000 }
      );

      let clean = raw.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);

      const parsed: any[] = JSON.parse(clean.trim());
      const cards = parsed.map((item) => ({
        id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        courseId: params.courseId,
        front: item.front,
        back: item.back,
        source: item.source || params.topic,
        difficulty: (item.difficulty || 'medium') as 'easy' | 'medium' | 'difficult',
        reviewCount: 0,
      }));

      storage.saveFlashcards(cards as any);
      return cards;
    }
  );

  ipcMain.handle('get-flashcards', async (_, courseId) => storage.getFlashcards(courseId));
  ipcMain.handle('update-flashcard', async (_, card) => storage.updateFlashcard(card));
  ipcMain.handle('delete-flashcard', async (_, id) => storage.deleteFlashcard(id));

  // Notes
  ipcMain.handle('get-notes', async (_, courseId) => storage.getNotes(courseId));
  ipcMain.handle('save-note', async (_, note) => storage.saveNote(note));
  ipcMain.handle('delete-note', async (_, id) => storage.deleteNote(id));

  // Token Usage & Cost
  ipcMain.handle('get-token-usage', async () => storage.getTokenUsage());
  ipcMain.handle('reset-token-usage', async () => storage.resetTokenUsage());

  // Window Management
  ipcMain.handle('toggle-floating-window', async () => toggleFloatingWindow());
  ipcMain.handle('is-floating-window', async (event) => {
    return event.sender.id === floatingWindow?.webContents.id;
  });
  ipcMain.handle('set-floating-opacity', async (_, opacity: number) => {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.setOpacity(Math.max(0.2, Math.min(1, opacity / 100)));
    }
  });
  ipcMain.handle('set-always-on-top', async (_, alwaysOnTop: boolean) => {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.setAlwaysOnTop(alwaysOnTop);
    }
  });
  ipcMain.handle('minimize-window', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });
  ipcMain.handle('maximize-window', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });
  ipcMain.handle('close-window', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win === floatingWindow) {
      floatingWindow.hide();
    } else {
      win?.close();
    }
  });

  // Privacy Actions
  ipcMain.handle('clear-all-data', async () => {
    return storage.clearAllData();
  });

  // Security: Safe external link launcher
  ipcMain.handle('open-external', async (_, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return true;
    }
    return false;
  });

  // Security: Authentication & Passcode protection
  ipcMain.handle('set-passcode', async (_, pin: string) => {
    if (typeof pin !== 'string') return { success: false, error: 'Invalid PIN' };
    return storage.setPasscode(pin);
  });
  ipcMain.handle('verify-passcode', async (_, pin: string) => {
    if (typeof pin !== 'string') return { success: false, error: 'Invalid PIN' };
    return storage.verifyPasscode(pin);
  });
  ipcMain.handle('disable-passcode', async (_, currentPin: string) => {
    if (typeof currentPin !== 'string') return { success: false, error: 'Invalid PIN' };
    return storage.disablePasscode(currentPin);
  });
  ipcMain.handle('is-passcode-protected', async () => {
    return storage.isPasscodeProtected();
  });
}

async function seedSampleMaterialsIfNeeded() {
  try {
    const tocDocs = storage.getDocuments('course-toc');
    if (tocDocs.length === 0) {
      const samplePaths = [
        { courseId: 'course-toc', file: 'Unit_4_Chomsky_Hierarchy.txt' },
        { courseId: 'course-bachelor', file: 'Unit_4_Chomsky_Hierarchy.txt' },
        { courseId: 'course-math', file: 'Linear_Algebra_Eigenvalues.txt' },
        { courseId: 'course-db', file: 'Database_Normalization_Guide.md' },
      ];

      for (const item of samplePaths) {
        // Try multiple path resolutions
        const possiblePaths = [
          path.resolve(__dirname, '../../sample-materials', item.file),
          path.resolve(process.cwd(), 'sample-materials', item.file),
          path.resolve(app.getAppPath(), 'sample-materials', item.file),
        ];

        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            const buf = fs.readFileSync(p);
            await kb.processFile(item.courseId, item.file, buf);
            break;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Initial seeding skipped:', err);
  }
}

app.whenReady().then(() => {
  // Security: Enforce Content-Security-Policy & Security Headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' file: data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: file:; connect-src 'self' https://generativelanguage.googleapis.com http://localhost:* ws://localhost:*;"
        ],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
      },
    });
  });

  setupIpcHandlers();
  createMainWindow();
  registerHotkeys();
  seedSampleMaterialsIfNeeded().catch((err) => console.warn('Background seed notice:', err));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
