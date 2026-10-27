import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AppSettings,
  Course,
  CourseDocument,
  DocumentChunk,
  StudySession,
  ChatMessage,
  Quiz,
  Flashcard,
  NoteItem,
  TokenUsage
} from '../../shared/types';

interface StoreData {
  encryptedApiKey?: string;
  security?: {
    pinEnabled: boolean;
    pinHash?: string;
    pinSalt?: string;
    failedAttempts: number;
    lockoutUntil?: number;
  };
  settings: AppSettings;
  courses: Course[];
  documents: CourseDocument[];
  chunks: DocumentChunk[];
  sessions: StudySession[];
  messages: Record<string, ChatMessage[]>;
  quizzes: Quiz[];
  flashcards: Flashcard[];
  notes: NoteItem[];
  tokenUsage: TokenUsage;
}

const DEFAULT_SETTINGS: AppSettings = {
  hasApiKey: true,
  textModel: 'gemini-3.1-flash-lite',
  visionModel: 'gemini-3.1-flash-lite',
  transcriptionModel: 'gemini-3.1-flash-lite',
  embeddingModel: 'gemini-embedding-001',
  temperature: 0.3,
  audioSource: 'microphone',
  audioDeviceId: 'default',
  speechLanguage: 'en',
  windowOpacity: 85,
  blurAmount: 20,
  compactMode: false,
  alwaysOnTop: true,
  hotkeyCapture: 'CommandOrControl+Shift+S',
  hotkeyAssistant: 'CommandOrControl+Shift+Space',
  privacyStoreTranscripts: true,
  privacyStoreAudio: false,
  privacyStoreScreenshots: false,
  autoDeleteOnExit: false,
};

const DEFAULT_COURSES: Course[] = [
  {
    id: 'course-bachelor',
    name: "My Bachelor's",
    code: 'CS-GEN',
    description: 'General workspace for university coursework, lecture notes, assignments, and exam revision.',
    createdAt: Date.now(),
    documentCount: 0,
  },
  {
    id: 'course-thesis',
    name: 'Bachelor Thesis: Agentic AI for Task Automation',
    code: 'THESIS-92127983',
    description: 'Literature analysis and prototype demonstration on agentic AI workflows, evaluation, and governance.',
    createdAt: Date.now(),
    documentCount: 10,
  },
  {
    id: 'course-toc',
    name: 'Theory of Computation',
    code: 'CS-301',
    description: 'Automata theory, formal languages, Chomsky hierarchy, Turing machines, and NP-completeness.',
    createdAt: Date.now(),
    documentCount: 1,
  },
  {
    id: 'course-math',
    name: 'Mathematics & Linear Algebra',
    code: 'MATH-202',
    description: 'Discrete mathematics, linear algebra, calculus, and mathematical logic for computer science.',
    createdAt: Date.now(),
    documentCount: 1,
  },
  {
    id: 'course-db',
    name: 'Database Systems',
    code: 'CS-305',
    description: 'Relational algebra, SQL, normalisation (1NF-BCNF), ACID properties, and indexing.',
    createdAt: Date.now(),
    documentCount: 1,
  },
];

const DEFAULT_SESSIONS: StudySession[] = [
  {
    id: 'session-general-study',
    courseId: 'course-bachelor',
    title: 'General Study & Concept Review',
    currentTopic: 'Coursework Revision & Exam Prep',
    weakAreas: ['Multi-step Proofs', 'Complex Algorithms'],
    notes: 'Interactive study session: ask questions, break down difficult concepts, and work through examples step-by-step.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'session-thesis-study',
    courseId: 'course-thesis',
    title: 'Agentic AI Architecture & Concepts',
    currentTopic: 'Agentic AI Workflows & Governance',
    weakAreas: [
      'Deterministic Planning vs Stochastic LLM Control',
      'Rule-Based Critique Mechanisms',
      'Governance and Bounded Autonomy Frameworks',
    ],
    notes: 'Candidate: Zubair Ahmed Khan (92127983)\nCore loop: Perception -> Planning -> Action -> Critique -> Memory.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'session-toc-grammars',
    courseId: 'course-toc',
    title: 'Formal Grammars & Chomsky Hierarchy',
    currentTopic: 'Formal Grammars',
    weakAreas: ['Context-Sensitive Grammars (Type 1)', 'Pumping Lemma for CFLs'],
    notes: 'Type 0: Unrestricted\nType 1: Context-Sensitive\nType 2: Context-Free\nType 3: Regular',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export class StorageService {
  private filePath: string;
  private data: StoreData;
  private plainApiKey: string = '';

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'studylens_data.json');
    this.data = this.loadData();
  }

  private findPreindexedSeedPath(): string | null {
    const candidates = [
      path.join(process.cwd(), 'sample-materials', 'thesis_preindexed.json'),
      path.join(__dirname, '../../sample-materials/thesis_preindexed.json'),
      path.join(__dirname, '../../../sample-materials/thesis_preindexed.json'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  private getEnvApiKey(): string {
    if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
    try {
      const candidates = [
        path.join(process.cwd(), '.env'),
        path.join(app.getAppPath(), '.env'),
        path.join(__dirname, '../../.env'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf-8');
          const match = content.match(/^GEMINI_API_KEY=(.*)$/m);
          if (match && match[1]) return match[1].trim();
        }
      }
    } catch {}
    return '';
  }

  private loadData(): StoreData {
    this.plainApiKey = this.getEnvApiKey();

    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.encryptedApiKey) {
          try {
            if (safeStorage.isEncryptionAvailable()) {
              const buffer = Buffer.from(parsed.encryptedApiKey, 'base64');
              this.plainApiKey = safeStorage.decryptString(buffer);
            } else {
              this.plainApiKey = Buffer.from(parsed.encryptedApiKey, 'base64').toString('utf-8');
            }
          } catch (e) {
            console.error('Failed to decrypt API key:', e);
          }
        }
        if (!this.plainApiKey) {
          this.plainApiKey = this.getEnvApiKey();
        }

        // If storage exists and already has the indexed thesis chunks, return it
        if (parsed.chunks && parsed.chunks.length > 0) {
          return {
            ...parsed,
            settings: { ...DEFAULT_SETTINGS, ...parsed.settings, hasApiKey: Boolean(this.plainApiKey) },
            courses: parsed.courses || DEFAULT_COURSES,
            documents: parsed.documents || [],
            chunks: parsed.chunks || [],
            sessions: parsed.sessions || DEFAULT_SESSIONS,
            messages: parsed.messages || {},
            quizzes: parsed.quizzes || [],
            flashcards: parsed.flashcards || [],
            notes: parsed.notes || [],
            tokenUsage: parsed.tokenUsage || { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, totalRequests: 0 },
          };
        }
      }

      // Otherwise seed from sample-materials/thesis_preindexed.json
      const seedPath = this.findPreindexedSeedPath();
      if (seedPath) {
        const seedRaw = fs.readFileSync(seedPath, 'utf-8');
        const seedParsed = JSON.parse(seedRaw);
        return {
          ...seedParsed,
          settings: { ...DEFAULT_SETTINGS, ...seedParsed.settings, hasApiKey: true },
          courses: seedParsed.courses || DEFAULT_COURSES,
          documents: seedParsed.documents || [],
          chunks: seedParsed.chunks || [],
          sessions: seedParsed.sessions || DEFAULT_SESSIONS,
          messages: seedParsed.messages || {},
          quizzes: seedParsed.quizzes || [],
          flashcards: seedParsed.flashcards || [],
          notes: seedParsed.notes || [],
          tokenUsage: seedParsed.tokenUsage || { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, totalRequests: 0 },
        };
      }
    } catch (err) {
      console.error('Error reading storage data:', err);
    }

    return {
      settings: { ...DEFAULT_SETTINGS, hasApiKey: true },
      courses: DEFAULT_COURSES,
      documents: [],
      chunks: [],
      sessions: DEFAULT_SESSIONS,
      messages: {},
      quizzes: [],
      flashcards: [],
      notes: [],
      tokenUsage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, totalRequests: 0 },
    };
  }

  public save(): void {
    try {
      const dataToSave = {
        ...this.data,
        settings: {
          ...this.data.settings,
          hasApiKey: Boolean(this.plainApiKey),
        },
      };
      fs.writeFileSync(this.filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save data:', err);
    }
  }

  // API Key management
  public setApiKey(key: string): void {
    this.plainApiKey = key.trim();
    if (!this.plainApiKey) {
      this.data.encryptedApiKey = undefined;
      this.data.settings.hasApiKey = false;
    } else {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(this.plainApiKey);
        this.data.encryptedApiKey = encrypted.toString('base64');
      } else {
        this.data.encryptedApiKey = Buffer.from(this.plainApiKey, 'utf-8').toString('base64');
      }
      this.data.settings.hasApiKey = true;
    }
    this.save();
  }

  public getApiKey(): string {
    return this.plainApiKey;
  }

  // Settings
  public getSettings(): AppSettings {
    return { ...this.data.settings, hasApiKey: Boolean(this.plainApiKey) };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...partial, hasApiKey: Boolean(this.plainApiKey) };
    this.save();
    return this.getSettings();
  }

  // Courses
  public getCourses(): Course[] {
    return this.data.courses;
  }

  public createCourse(name: string, description?: string): Course {
    const newCourse: Course = {
      id: `course-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      description,
      createdAt: Date.now(),
      documentCount: 0,
    };
    this.data.courses.push(newCourse);
    this.save();
    return newCourse;
  }

  public deleteCourse(id: string): boolean {
    this.data.courses = this.data.courses.filter((c) => c.id !== id);
    this.data.documents = this.data.documents.filter((d) => d.courseId !== id);
    this.data.chunks = this.data.chunks.filter((c) => c.courseId !== id);
    this.data.sessions = this.data.sessions.filter((s) => s.courseId !== id);
    this.data.notes = this.data.notes.filter((n) => n.courseId !== id);
    this.data.quizzes = this.data.quizzes.filter((q) => q.courseId !== id);
    this.data.flashcards = this.data.flashcards.filter((f) => f.courseId !== id);
    this.save();
    return true;
  }

  // Documents
  public getDocuments(courseId: string): CourseDocument[] {
    return this.data.documents.filter((d) => d.courseId === courseId);
  }

  public saveDocument(doc: CourseDocument): void {
    const idx = this.data.documents.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      this.data.documents[idx] = doc;
    } else {
      this.data.documents.push(doc);
    }
    // Update course document count
    const course = this.data.courses.find((c) => c.id === doc.courseId);
    if (course) {
      course.documentCount = this.data.documents.filter((d) => d.courseId === doc.courseId).length;
    }
    this.save();
  }

  public deleteDocument(id: string): boolean {
    const doc = this.data.documents.find((d) => d.id === id);
    if (!doc) return false;
    const courseId = doc.courseId;
    this.data.documents = this.data.documents.filter((d) => d.id !== id);
    this.data.chunks = this.data.chunks.filter((c) => c.documentId !== id);
    const course = this.data.courses.find((c) => c.id === courseId);
    if (course) {
      course.documentCount = this.data.documents.filter((d) => d.courseId === courseId).length;
    }
    this.save();
    return true;
  }

  // Chunks
  public saveChunks(chunks: DocumentChunk[]): void {
    this.data.chunks.push(...chunks);
    this.save();
  }

  public getChunks(courseId?: string): DocumentChunk[] {
    if (!courseId) return this.data.chunks;
    return this.data.chunks.filter((c) => c.courseId === courseId);
  }

  // Sessions
  public getSessions(courseId: string): StudySession[] {
    return this.data.sessions.filter((s) => s.courseId === courseId);
  }

  public createSession(courseId: string, title: string, topic?: string): StudySession {
    const session: StudySession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      courseId,
      title,
      currentTopic: topic || title,
      weakAreas: [],
      notes: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.sessions.unshift(session);
    this.save();
    return session;
  }

  public updateSession(partial: Partial<StudySession> & { id: string }): StudySession {
    const idx = this.data.sessions.findIndex((s) => s.id === partial.id);
    if (idx >= 0) {
      this.data.sessions[idx] = { ...this.data.sessions[idx], ...partial, updatedAt: Date.now() };
      this.save();
      return this.data.sessions[idx];
    }
    throw new Error('Session not found');
  }

  public deleteSession(id: string): boolean {
    this.data.sessions = this.data.sessions.filter((s) => s.id !== id);
    delete this.data.messages[id];
    this.save();
    return true;
  }

  // Messages
  public getMessages(sessionId: string): ChatMessage[] {
    return this.data.messages[sessionId] || [];
  }

  public saveMessage(message: ChatMessage): ChatMessage {
    if (!this.data.messages[message.sessionId]) {
      this.data.messages[message.sessionId] = [];
    }
    this.data.messages[message.sessionId].push(message);
    this.save();
    return message;
  }

  public clearMessages(sessionId: string): boolean {
    this.data.messages[sessionId] = [];
    this.save();
    return true;
  }

  // Notes
  public getNotes(courseId: string): NoteItem[] {
    return this.data.notes.filter((n) => n.courseId === courseId);
  }

  public saveNote(note: Partial<NoteItem> & { courseId: string; title: string; content: string }): NoteItem {
    if (note.id) {
      const idx = this.data.notes.findIndex((n) => n.id === note.id);
      if (idx >= 0) {
        this.data.notes[idx] = {
          ...this.data.notes[idx],
          ...note,
          updatedAt: Date.now(),
        };
        this.save();
        return this.data.notes[idx];
      }
    }
    const newNote: NoteItem = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      courseId: note.courseId,
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      updatedAt: Date.now(),
    };
    this.data.notes.unshift(newNote);
    this.save();
    return newNote;
  }

  public deleteNote(id: string): boolean {
    this.data.notes = this.data.notes.filter((n) => n.id !== id);
    this.save();
    return true;
  }

  // Quizzes
  public getQuizzes(courseId: string): Quiz[] {
    return this.data.quizzes.filter((q) => q.courseId === courseId);
  }

  public saveQuiz(quiz: Quiz): boolean {
    const idx = this.data.quizzes.findIndex((q) => q.id === quiz.id);
    if (idx >= 0) {
      this.data.quizzes[idx] = quiz;
    } else {
      this.data.quizzes.unshift(quiz);
    }
    this.save();
    return true;
  }

  // Flashcards
  public getFlashcards(courseId: string): Flashcard[] {
    return this.data.flashcards.filter((f) => f.courseId === courseId);
  }

  public saveFlashcards(cards: Flashcard[]): void {
    this.data.flashcards.push(...cards);
    this.save();
  }

  public updateFlashcard(card: Flashcard): Flashcard {
    const idx = this.data.flashcards.findIndex((f) => f.id === card.id);
    if (idx >= 0) {
      this.data.flashcards[idx] = card;
      this.save();
      return this.data.flashcards[idx];
    }
    return card;
  }

  public deleteFlashcard(id: string): boolean {
    this.data.flashcards = this.data.flashcards.filter((f) => f.id !== id);
    this.save();
    return true;
  }

  // Token Usage & Cost tracking
  public getTokenUsage(): TokenUsage {
    return this.data.tokenUsage;
  }

  public recordTokenUsage(input: number, output: number, model: string = 'gemini-2.5-flash'): void {
    this.data.tokenUsage.inputTokens += input;
    this.data.tokenUsage.outputTokens += output;
    this.data.tokenUsage.totalRequests += 1;

    // Approximate cost estimation for Google Gemini
    let inputRate = 0.075 / 1_000_000;
    let outputRate = 0.30 / 1_000_000;
    if (model.includes('pro')) {
      inputRate = 1.25 / 1_000_000;
      outputRate = 5.00 / 1_000_000;
    }

    const cost = input * inputRate + output * outputRate;
    this.data.tokenUsage.estimatedCostUsd += cost;
    this.save();
  }

  public resetTokenUsage(): void {
    this.data.tokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      totalRequests: 0,
    };
    this.save();
  }

  // Privacy: Clear all data
  public clearAllData(): boolean {
    this.plainApiKey = '';
    this.data = {
      settings: DEFAULT_SETTINGS,
      courses: DEFAULT_COURSES,
      documents: [],
      chunks: [],
      sessions: DEFAULT_SESSIONS,
      messages: {},
      quizzes: [],
      flashcards: [],
      notes: [],
      tokenUsage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, totalRequests: 0 },
    };
    this.save();
    return true;
  }

  // Passcode & App Lock Security (OWASP PBKDF2 with 100,000 rounds & SHA-512)
  public setPasscode(pin: string): { success: boolean; error?: string } {
    if (!pin || pin.length < 4) {
      return { success: false, error: 'Passcode must be at least 4 characters long.' };
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(pin, salt, 100000, 64, 'sha512').toString('hex');
    this.data.security = {
      pinEnabled: true,
      pinHash: hash,
      pinSalt: salt,
      failedAttempts: 0,
    };
    this.save();
    return { success: true };
  }

  public verifyPasscode(pin: string): { success: boolean; error?: string; lockedOut?: boolean } {
    if (!this.data.security?.pinEnabled || !this.data.security?.pinHash || !this.data.security?.pinSalt) {
      return { success: true };
    }

    const now = Date.now();
    if (this.data.security.lockoutUntil && now < this.data.security.lockoutUntil) {
      const remainingSec = Math.ceil((this.data.security.lockoutUntil - now) / 1000);
      return {
        success: false,
        lockedOut: true,
        error: `Account temporarily locked due to failed attempts. Try again in ${remainingSec}s.`,
      };
    }

    const checkHash = crypto.pbkdf2Sync(pin, this.data.security.pinSalt, 100000, 64, 'sha512').toString('hex');
    const isMatch = crypto.timingSafeEqual(Buffer.from(checkHash, 'hex'), Buffer.from(this.data.security.pinHash, 'hex'));

    if (isMatch) {
      this.data.security.failedAttempts = 0;
      this.data.security.lockoutUntil = undefined;
      this.save();
      return { success: true };
    } else {
      this.data.security.failedAttempts = (this.data.security.failedAttempts || 0) + 1;
      if (this.data.security.failedAttempts >= 5) {
        this.data.security.lockoutUntil = now + 60000; // 60-second lockout
        this.save();
        return { success: false, lockedOut: true, error: 'Too many incorrect attempts. Locked out for 60 seconds.' };
      }
      this.save();
      return { success: false, error: `Incorrect passcode. ${5 - this.data.security.failedAttempts} attempt(s) remaining.` };
    }
  }

  public disablePasscode(currentPin: string): { success: boolean; error?: string } {
    const verified = this.verifyPasscode(currentPin);
    if (!verified.success) return verified;
    this.data.security = { pinEnabled: false, failedAttempts: 0 };
    this.save();
    return { success: true };
  }

  public isPasscodeProtected(): boolean {
    return Boolean(this.data.security?.pinEnabled);
  }
}
