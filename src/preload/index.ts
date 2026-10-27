import { contextBridge, ipcRenderer } from 'electron';
import { StudyLensAPI } from '../shared/ipc';

const api: StudyLensAPI = {
  // Settings & Auth
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  setApiKey: (key) => ipcRenderer.invoke('set-api-key', key),
  testApiKey: () => ipcRenderer.invoke('test-api-key'),

  // Courses
  getCourses: () => ipcRenderer.invoke('get-courses'),
  createCourse: (name, description) => ipcRenderer.invoke('create-course', name, description),
  deleteCourse: (id) => ipcRenderer.invoke('delete-course', id),

  // Documents & Knowledge Base
  selectAndUploadFiles: (courseId) => ipcRenderer.invoke('select-and-upload-files', courseId),
  uploadFilesFromPaths: (courseId, paths) => ipcRenderer.invoke('upload-files-from-paths', courseId, paths),
  uploadFileBuffers: (courseId, files) => ipcRenderer.invoke('upload-file-buffers', courseId, files),
  getDocuments: (courseId) => ipcRenderer.invoke('get-documents', courseId),
  deleteDocument: (id) => ipcRenderer.invoke('delete-document', id),
  searchKnowledge: (courseId, query, topK) => ipcRenderer.invoke('search-knowledge', courseId, query, topK),

  // Sessions & Chat
  getSessions: (courseId) => ipcRenderer.invoke('get-sessions', courseId),
  createSession: (courseId, title, topic) => ipcRenderer.invoke('create-session', courseId, title, topic),
  updateSession: (session) => ipcRenderer.invoke('update-session', session),
  deleteSession: (id) => ipcRenderer.invoke('delete-session', id),
  getSessionMessages: (sessionId) => ipcRenderer.invoke('get-session-messages', sessionId),
  saveMessage: (message) => ipcRenderer.invoke('save-message', message),
  clearSessionMessages: (sessionId) => ipcRenderer.invoke('clear-session-messages', sessionId),

  // AI Queries & Streaming
  askAiStream: (params) => ipcRenderer.invoke('ask-ai-stream', params),
  stopAiStream: () => ipcRenderer.invoke('stop-ai-stream'),

  // Audio & Live Transcription
  transcribeAudio: (audioBuffer, mimeType) => ipcRenderer.invoke('transcribe-audio', audioBuffer, mimeType),
  analyzeSpeechStatement: (params) => ipcRenderer.invoke('analyze-speech-statement', params),

  // Screen Context
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  analyzeScreenshot: (params) => ipcRenderer.invoke('analyze-screenshot', params),

  // Quizzes & Flashcards
  generateQuiz: (params) => ipcRenderer.invoke('generate-quiz', params),
  getQuizzes: (courseId) => ipcRenderer.invoke('get-quizzes', courseId),
  saveQuizResult: (quiz) => ipcRenderer.invoke('save-quiz-result', quiz),
  generateFlashcards: (params) => ipcRenderer.invoke('generate-flashcards', params),
  getFlashcards: (courseId) => ipcRenderer.invoke('get-flashcards', courseId),
  updateFlashcard: (card) => ipcRenderer.invoke('update-flashcard', card),
  deleteFlashcard: (id) => ipcRenderer.invoke('delete-flashcard', id),

  // Notes
  getNotes: (courseId) => ipcRenderer.invoke('get-notes', courseId),
  saveNote: (note) => ipcRenderer.invoke('save-note', note),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),

  // Token Usage & Cost
  getTokenUsage: () => ipcRenderer.invoke('get-token-usage'),
  resetTokenUsage: () => ipcRenderer.invoke('reset-token-usage'),

  // Window Management
  toggleFloatingWindow: () => ipcRenderer.invoke('toggle-floating-window'),
  isFloatingWindow: () => ipcRenderer.invoke('is-floating-window'),
  setFloatingOpacity: (opacity) => ipcRenderer.invoke('set-floating-opacity', opacity),
  setAlwaysOnTop: (alwaysOnTop) => ipcRenderer.invoke('set-always-on-top', alwaysOnTop),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Privacy & Security Actions
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  setPasscode: (pin: string) => ipcRenderer.invoke('set-passcode', pin),
  verifyPasscode: (pin: string) => ipcRenderer.invoke('verify-passcode', pin),
  disablePasscode: (currentPin: string) => ipcRenderer.invoke('disable-passcode', currentPin),
  isPasscodeProtected: () => ipcRenderer.invoke('is-passcode-protected'),

  // Event Listeners
  onStreamChunk: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('ai-stream-chunk', handler);
    return () => ipcRenderer.removeListener('ai-stream-chunk', handler);
  },
  onStreamDone: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('ai-stream-done', handler);
    return () => ipcRenderer.removeListener('ai-stream-done', handler);
  },
  onStreamError: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('ai-stream-error', handler);
    return () => ipcRenderer.removeListener('ai-stream-error', handler);
  },
  onAudioTranscript: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('audio-transcript', handler);
    return () => ipcRenderer.removeListener('audio-transcript', handler);
  },
  onTriggerFloatingAssistant: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('trigger-floating-assistant', handler);
    return () => ipcRenderer.removeListener('trigger-floating-assistant', handler);
  },
  onTriggerScreenCapture: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('trigger-screen-capture', handler);
    return () => ipcRenderer.removeListener('trigger-screen-capture', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);
