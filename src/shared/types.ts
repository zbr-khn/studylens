export interface Course {
  id: string;
  name: string;
  code?: string;
  description?: string;
  createdAt: number;
  documentCount: number;
}

export interface CourseDocument {
  id: string;
  courseId: string;
  name: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'md' | 'pptx' | 'image' | 'zip';
  size: number;
  uploadedAt: number;
  chunkCount: number;
  status: 'indexing' | 'indexed' | 'error';
  errorMessage?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  courseId: string;
  docName: string;
  heading: string;
  pageNumber?: number;
  content: string;
  embedding?: number[];
}

export interface StudySession {
  id: string;
  courseId: string;
  title: string;
  currentTopic: string;
  weakAreas: string[];
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export type ResponseMode =
  | 'explain'
  | 'study_answer'
  | 'detailed'
  | 'simple'
  | 'follow_up'
  | 'sources'
  | 'teach_me';

export type ResponseLength = 'one_sentence' | 'short' | 'medium' | 'detailed';

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'assistant' | 'professor' | 'system';
  content: string;
  timestamp: number;
  mode?: ResponseMode;
  responseLength?: ResponseLength;
  sources?: Array<{ docName: string; heading: string; snippet: string }>;
  hasCourseCitation?: boolean;
  screenshotBase64?: string;
  isStreaming?: boolean;
}

export type AudioSource = 'microphone' | 'system' | 'both';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface AudioState {
  isRecording: boolean;
  isAiProcessing: boolean;
  selectedSource: AudioSource;
  selectedDeviceId: string;
  speechLanguage: string;
  lastDetectedSpeech: string;
  level: number;
}

export interface TranscriptItem {
  id: string;
  sessionId: string;
  speaker: 'Professor' | 'Student' | 'Speaker';
  text: string;
  isFinal: boolean;
  timestamp: number;
  aiSuggested?: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'short_answer' | 'true_false';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  source?: string;
  userAnswer?: string | number;
  isCorrect?: boolean;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  topic: string;
  difficulty: 'introductory' | 'university' | 'advanced';
  questions: QuizQuestion[];
  score?: number;
  totalQuestions: number;
  weakTopics?: string[];
  createdAt: number;
  completedAt?: number;
}

export interface Flashcard {
  id: string;
  courseId: string;
  front: string;
  back: string;
  source?: string;
  difficulty: 'easy' | 'medium' | 'difficult';
  lastReviewed?: number;
  nextReview?: number;
  reviewCount: number;
}

export interface NoteItem {
  id: string;
  courseId: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: number;
}

export interface AppSettings {
  hasApiKey: boolean;
  textModel: string;
  visionModel: string;
  transcriptionModel: string;
  embeddingModel: string;
  temperature: number;
  audioSource: AudioSource;
  audioDeviceId: string;
  speechLanguage: string;
  windowOpacity: number;
  blurAmount: number;
  compactMode: boolean;
  alwaysOnTop: boolean;
  hotkeyCapture: string;
  hotkeyAssistant: string;
  privacyStoreTranscripts: boolean;
  privacyStoreAudio: boolean;
  privacyStoreScreenshots: boolean;
  autoDeleteOnExit: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  totalRequests: number;
}

export interface SearchContextResult {
  chunks: DocumentChunk[];
  contextFormatted: string;
  hasMatch: boolean;
}

export interface UploadedFilePayload {
  name: string;
  path: string;
  buffer?: ArrayBuffer;
  size: number;
}
