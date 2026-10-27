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
  TokenUsage,
  ResponseMode,
  ResponseLength,
  SearchContextResult
} from './types';

export interface StudyLensAPI {
  // Settings & Auth
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  setApiKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  testApiKey: () => Promise<{ success: boolean; model: string; error?: string }>;
  
  // Courses
  getCourses: () => Promise<Course[]>;
  createCourse: (name: string, description?: string) => Promise<Course>;
  deleteCourse: (id: string) => Promise<boolean>;

  // Documents & Knowledge Base
  selectAndUploadFiles: (courseId: string) => Promise<CourseDocument[]>;
  uploadFilesFromPaths: (courseId: string, paths: string[]) => Promise<CourseDocument[]>;
  uploadFileBuffers: (courseId: string, files: Array<{ name: string; buffer: Uint8Array }>) => Promise<CourseDocument[]>;
  getDocuments: (courseId: string) => Promise<CourseDocument[]>;
  deleteDocument: (id: string) => Promise<boolean>;
  searchKnowledge: (courseId: string, query: string, topK?: number) => Promise<SearchContextResult>;
  
  // Sessions & Chat
  getSessions: (courseId: string) => Promise<StudySession[]>;
  createSession: (courseId: string, title: string, topic?: string) => Promise<StudySession>;
  updateSession: (session: Partial<StudySession> & { id: string }) => Promise<StudySession>;
  deleteSession: (id: string) => Promise<boolean>;
  getSessionMessages: (sessionId: string) => Promise<ChatMessage[]>;
  saveMessage: (message: ChatMessage) => Promise<ChatMessage>;
  clearSessionMessages: (sessionId: string) => Promise<boolean>;
  
  // AI Queries & Streaming
  askAiStream: (params: {
    sessionId: string;
    courseId: string;
    prompt: string;
    mode: ResponseMode;
    responseLength?: ResponseLength;
    screenshotBase64?: string;
  }) => Promise<void>;
  stopAiStream: () => Promise<void>;

  // Audio Transcription & Processing
  transcribeAudio: (audioBuffer: Uint8Array, mimeType?: string) => Promise<string>;
  analyzeSpeechStatement: (params: {
    courseId: string;
    sessionId: string;
    transcriptText: string;
    mode: ResponseMode;
  }) => Promise<{
    questionDetected: boolean;
    detectedQuestion?: string;
    answer?: string;
    sources?: Array<{ docName: string; heading: string; snippet: string }>;
  }>;

  // Screen Context
  captureScreen: () => Promise<string>; // returns base64 PNG
  analyzeScreenshot: (params: {
    imageBase64: string;
    prompt: string;
    courseId: string;
    mode?: ResponseMode;
  }) => Promise<string>;

  // Quizzes & Flashcards
  generateQuiz: (params: {
    courseId: string;
    topic: string;
    count: number;
    difficulty: 'introductory' | 'university' | 'advanced';
    types: ('mcq' | 'short_answer' | 'true_false')[];
  }) => Promise<Quiz>;
  getQuizzes: (courseId: string) => Promise<Quiz[]>;
  saveQuizResult: (quiz: Quiz) => Promise<boolean>;
  
  generateFlashcards: (params: {
    courseId: string;
    topic: string;
    count: number;
  }) => Promise<Flashcard[]>;
  getFlashcards: (courseId: string) => Promise<Flashcard[]>;
  updateFlashcard: (card: Flashcard) => Promise<Flashcard>;
  deleteFlashcard: (id: string) => Promise<boolean>;

  // Notes
  getNotes: (courseId: string) => Promise<NoteItem[]>;
  saveNote: (note: Partial<NoteItem> & { courseId: string; title: string; content: string }) => Promise<NoteItem>;
  deleteNote: (id: string) => Promise<boolean>;

  // Token Usage & Cost
  getTokenUsage: () => Promise<TokenUsage>;
  resetTokenUsage: () => Promise<void>;

  // Window Management & Floating Interface
  toggleFloatingWindow: () => Promise<boolean>;
  isFloatingWindow: () => Promise<boolean>;
  setFloatingOpacity: (opacity: number) => Promise<void>;
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  // Privacy & Security Actions
  clearAllData: () => Promise<boolean>;
  openExternal: (url: string) => Promise<boolean>;
  setPasscode: (pin: string) => Promise<{ success: boolean; error?: string }>;
  verifyPasscode: (pin: string) => Promise<{ success: boolean; error?: string; lockedOut?: boolean }>;
  disablePasscode: (currentPin: string) => Promise<{ success: boolean; error?: string }>;
  isPasscodeProtected: () => Promise<boolean>;

  // Event Listeners
  onStreamChunk: (callback: (data: { chunk: string; fullContent: string }) => void) => () => void;
  onStreamDone: (callback: (data: { fullContent: string; sources?: any[] }) => void) => () => void;
  onStreamError: (callback: (data: { error: string }) => void) => () => void;
  onAudioTranscript: (callback: (data: { text: string; isFinal: boolean; speaker: string }) => void) => () => void;
  onTriggerFloatingAssistant: (callback: () => void) => () => void;
  onTriggerScreenCapture: (callback: () => void) => () => void;
}
