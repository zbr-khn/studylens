import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  Course,
  CourseDocument,
  StudySession,
  ChatMessage,
  AppSettings,
  TokenUsage,
  AudioSource,
  TranscriptItem,
  ResponseMode,
  ResponseLength,
} from '../../shared/types';

interface AppContextType {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Courses
  courses: Course[];
  activeCourse: Course | null;
  setActiveCourse: (course: Course) => void;
  createCourse: (name: string, description?: string) => Promise<Course>;
  deleteCourse: (id: string) => Promise<void>;

  // Documents
  documents: CourseDocument[];
  refreshDocuments: () => Promise<void>;
  uploadFiles: () => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  // Sessions
  sessions: StudySession[];
  activeSession: StudySession | null;
  setActiveSession: (session: StudySession) => void;
  createSession: (title: string, topic?: string) => Promise<StudySession>;
  deleteSession: (id: string) => Promise<void>;

  // Chat & AI
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingContent: string;
  responseMode: ResponseMode;
  setResponseMode: (mode: ResponseMode) => void;
  responseLength: ResponseLength;
  setResponseLength: (len: ResponseLength) => void;
  sendMessage: (text: string, screenshotBase64?: string) => Promise<void>;
  stopGeneration: () => Promise<void>;
  clearChat: () => Promise<void>;

  // Live Audio & Transcription
  isRecording: boolean;
  isAiProcessing: boolean;
  audioLevel: number;
  audioSource: AudioSource;
  setAudioSource: (src: AudioSource) => void;
  transcripts: TranscriptItem[];
  latestAiAnswer: {
    question?: string;
    answer?: string;
    sources?: Array<{ docName: string; heading: string; snippet: string }>;
  } | null;
  startAudioCapture: () => Promise<void>;
  stopAudioCapture: () => void;
  clearTranscripts: () => void;

  // Settings & Usage
  settings: AppSettings | null;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  tokenUsage: TokenUsage;
  refreshUsage: () => Promise<void>;

  // Onboarding
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;

  // Floating Window Summon
  toggleFloatingWindow: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('chat');

  // Courses & Sessions
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);

  // Messages & Streaming
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [responseMode, setResponseMode] = useState<ResponseMode>('study_answer');
  const [responseLength, setResponseLength] = useState<ResponseLength>('medium');

  // Live Audio & Transcripts
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone');
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [latestAiAnswer, setLatestAiAnswer] = useState<{
    question?: string;
    answer?: string;
    sources?: Array<{ docName: string; heading: string; snippet: string }>;
  } | null>(null);

  // Settings & Usage
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    totalRequests: 0,
  });
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Audio recording refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioIntervalRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const rollingSpeechRef = useRef<string>('');

  // Initial load
  useEffect(() => {
    loadInitialData();

    // Stream listeners
    const unsubChunk = window.api.onStreamChunk((data) => {
      setStreamingContent((prev) => prev + data.chunk);
    });

    const unsubDone = window.api.onStreamDone(async (data) => {
      setIsGenerating(false);
      setIsAiProcessing(false);
      if (activeSession) {
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          sessionId: activeSession.id,
          sender: 'assistant',
          content: data.fullContent,
          timestamp: Date.now(),
          mode: responseMode,
          responseLength,
          sources: data.sources,
          hasCourseCitation: Boolean(data.sources && data.sources.length > 0),
        };
        await window.api.saveMessage(assistantMsg);
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingContent('');
        refreshUsage();
      }
    });

    const unsubError = window.api.onStreamError((data) => {
      setIsGenerating(false);
      setIsAiProcessing(false);
      alert(`AI Generation Error: ${data.error}`);
    });

    const unsubAssistantHotkey = window.api.onTriggerFloatingAssistant(() => {
      window.api.toggleFloatingWindow();
    });

    const unsubScreenHotkey = window.api.onTriggerScreenCapture(() => {
      setActiveTab('screen');
    });

    return () => {
      unsubChunk();
      unsubDone();
      unsubError();
      unsubAssistantHotkey();
      unsubScreenHotkey();
      stopAudioCapture();
    };
  }, [activeSession, responseMode, responseLength]);

  const loadInitialData = async () => {
    try {
      const s = await window.api.getSettings();
      setSettings(s);

      const usage = await window.api.getTokenUsage();
      setTokenUsage(usage);

      const cList = await window.api.getCourses();
      setCourses(cList);

      if (cList.length > 0) {
        const primary = cList[0];
        setActiveCourse(primary);
        await loadCourseData(primary.id);
      }

      // Check first-run onboarding
      if (!s.hasApiKey) {
        setIsOnboardingOpen(true);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const loadCourseData = async (courseId: string) => {
    try {
      const docs = await window.api.getDocuments(courseId);
      setDocuments(docs);

      const sess = await window.api.getSessions(courseId);
      setSessions(sess);

      if (sess.length > 0) {
        setActiveSession(sess[0]);
        const msgs = await window.api.getSessionMessages(sess[0].id);
        setMessages(msgs);
      } else {
        // Create initial default session
        const newSess = await window.api.createSession(courseId, 'General Study Session', 'Overview');
        setSessions([newSess]);
        setActiveSession(newSess);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error loading course data:', err);
    }
  };

  const switchCourse = async (course: Course) => {
    setActiveCourse(course);
    await loadCourseData(course.id);
  };

  const switchSession = async (session: StudySession) => {
    setActiveSession(session);
    const msgs = await window.api.getSessionMessages(session.id);
    setMessages(msgs);
  };

  const refreshDocuments = async () => {
    if (activeCourse) {
      const docs = await window.api.getDocuments(activeCourse.id);
      setDocuments(docs);
    }
  };

  const refreshUsage = async () => {
    try {
      const usage = await window.api.getTokenUsage();
      setTokenUsage(usage);
    } catch (e) {
      console.error(e);
    }
  };

  const createCourse = async (name: string, description?: string): Promise<Course> => {
    const created = await window.api.createCourse(name, description);
    const updated = await window.api.getCourses();
    setCourses(updated);
    await switchCourse(created);
    return created;
  };

  const deleteCourse = async (id: string): Promise<void> => {
    await window.api.deleteCourse(id);
    const updated = await window.api.getCourses();
    setCourses(updated);
    if (updated.length > 0) {
      await switchCourse(updated[0]);
    } else {
      setActiveCourse(null);
      setDocuments([]);
      setSessions([]);
      setActiveSession(null);
      setMessages([]);
    }
  };

  const uploadFiles = async () => {
    if (!activeCourse) return;
    const uploaded = await window.api.selectAndUploadFiles(activeCourse.id);
    if (uploaded && uploaded.length > 0) {
      await refreshDocuments();
      const updatedCourses = await window.api.getCourses();
      setCourses(updatedCourses);
    }
  };

  const deleteDocument = async (id: string) => {
    await window.api.deleteDocument(id);
    await refreshDocuments();
  };

  const createSession = async (title: string, topic?: string): Promise<StudySession> => {
    if (!activeCourse) throw new Error('No active course');
    const sess = await window.api.createSession(activeCourse.id, title, topic);
    setSessions((prev) => [sess, ...prev]);
    await switchSession(sess);
    return sess;
  };

  const deleteSession = async (id: string): Promise<void> => {
    await window.api.deleteSession(id);
    if (activeCourse) {
      const remaining = await window.api.getSessions(activeCourse.id);
      setSessions(remaining);
      if (remaining.length > 0) {
        await switchSession(remaining[0]);
      } else {
        setActiveSession(null);
        setMessages([]);
      }
    }
  };

  const sendMessage = async (text: string, screenshotBase64?: string) => {
    if (!activeSession || !activeCourse || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sessionId: activeSession.id,
      sender: 'user',
      content: text,
      timestamp: Date.now(),
      screenshotBase64,
    };

    await window.api.saveMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    setIsAiProcessing(true);
    setStreamingContent('');

    try {
      await window.api.askAiStream({
        sessionId: activeSession.id,
        courseId: activeCourse.id,
        prompt: text,
        mode: responseMode,
        responseLength,
        screenshotBase64,
      });
    } catch (err: any) {
      setIsGenerating(false);
      setIsAiProcessing(false);
      alert(`Chat error: ${err.message}`);
    }
  };

  const stopGeneration = async () => {
    await window.api.stopAiStream();
    setIsGenerating(false);
    setIsAiProcessing(false);
  };

  const clearChat = async () => {
    if (!activeSession) return;
    await window.api.clearSessionMessages(activeSession.id);
    setMessages([]);
  };

  // Audio capture using Web Audio API + MediaRecorder + Whisper
  const startAudioCapture = async () => {
    try {
      let stream: MediaStream;
      if (audioSource === 'system') {
        // System loopback via displayMedia
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } else {
        // Microphone
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      mediaStreamRef.current = stream;

      // Audio level analyser
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      sourceNode.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Chunk recorder for Whisper transcription
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      let chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        chunks = [];

        try {
          const arrayBuf = await blob.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuf);
          const transcriptText = await window.api.transcribeAudio(uint8, 'audio/webm');

          if (transcriptText && transcriptText.trim().length > 3) {
            const cleanText = transcriptText.trim();
            rollingSpeechRef.current += ` ${cleanText}`;

            // Add to transcripts feed
            const newItem: TranscriptItem = {
              id: `trans-${Date.now()}`,
              sessionId: activeSession?.id || 'live',
              speaker: 'Professor',
              text: cleanText,
              isFinal: true,
              timestamp: Date.now(),
            };
            setTranscripts((prev) => [...prev, newItem]);

            // Question detector & contextual AI answer trigger
            if (activeCourse && activeSession) {
              setIsAiProcessing(true);
              const analysis = await window.api.analyzeSpeechStatement({
                courseId: activeCourse.id,
                sessionId: activeSession.id,
                transcriptText: rollingSpeechRef.current,
                mode: responseMode,
              });
              setIsAiProcessing(false);

              if (analysis.questionDetected && analysis.answer) {
                setLatestAiAnswer({
                  question: analysis.detectedQuestion,
                  answer: analysis.answer,
                  sources: analysis.sources,
                });
                rollingSpeechRef.current = ''; // reset rolling context
              }
            }
          }
        } catch (err) {
          console.warn('Chunk transcription failed:', err);
        }
      };

      // Slice audio in 5-second chunks
      recorder.start();
      setIsRecording(true);

      audioIntervalRef.current = setInterval(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          recorder.start();
        }
      }, 5000);
    } catch (err: any) {
      console.error('Audio capture error:', err);
      alert(`Could not start audio capture: ${err.message}`);
      stopAudioCapture();
    }
  };

  const stopAudioCapture = () => {
    setIsRecording(false);
    setAudioLevel(0);
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const clearTranscripts = () => {
    setTranscripts([]);
    setLatestAiAnswer(null);
    rollingSpeechRef.current = '';
  };

  const updateSettings = async (partial: Partial<AppSettings>) => {
    const updated = await window.api.updateSettings(partial);
    setSettings(updated);
  };

  const toggleFloatingWindow = async () => {
    await window.api.toggleFloatingWindow();
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        courses,
        activeCourse,
        setActiveCourse: switchCourse,
        createCourse,
        deleteCourse,
        documents,
        refreshDocuments,
        uploadFiles,
        deleteDocument,
        sessions,
        activeSession,
        setActiveSession: switchSession,
        createSession,
        deleteSession,
        messages,
        isGenerating,
        streamingContent,
        responseMode,
        setResponseMode,
        responseLength,
        setResponseLength,
        sendMessage,
        stopGeneration,
        clearChat,
        isRecording,
        isAiProcessing,
        audioLevel,
        audioSource,
        setAudioSource,
        transcripts,
        latestAiAnswer,
        startAudioCapture,
        stopAudioCapture,
        clearTranscripts,
        settings,
        updateSettings,
        tokenUsage,
        refreshUsage,
        isOnboardingOpen,
        setIsOnboardingOpen,
        toggleFloatingWindow,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
