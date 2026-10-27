import React, { useState, useEffect } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import {
  Sparkles,
  Mic,
  Camera,
  Layers,
  X,
  Minus,
  Send,
  Loader2,
  BookOpen,
  Volume2,
  HelpCircle,
} from 'lucide-react';
import { AppSettings, Course } from '../../shared/types';

export const FloatingAssistantView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [detectedQuestion, setDetectedQuestion] = useState<string>(
    'Explain the difference between Type 1 and Type 2 grammars in the Chomsky hierarchy.'
  );
  const [aiAnswer, setAiAnswer] = useState<string>(
`### Short Answer
Type-1 grammars are **context-sensitive**, where production rules $\\alpha A \\beta \\to \\alpha \\gamma \\beta$ depend on surrounding symbols $\\alpha$ and $\\beta$.

Type-2 grammars are **context-free**, where production rules $A \\to \\gamma$ apply regardless of the surrounding context.

### Key Theoretical Differences
- **Type 1 (Context-Sensitive)**: Rules cannot shorten strings ($|\\alpha A \\beta| \\le |\\alpha \\gamma \\beta|$). Recognized by **Linear Bounded Automata (LBA)**.
- **Type 2 (Context-Free)**: The left side is strictly a single non-terminal ($A$). Recognized by **Pushdown Automata (PDA)**.

### Examples
- **Context-Free**: Standard arithmetic expressions and programming language syntax.
- **Context-Sensitive**: Languages requiring equal counts across three variables, such as $L = \\{a^n b^n c^n \\mid n \\ge 1\\}$.`
  );
  const [sourceCitation, setSourceCitation] = useState<string>(
    'Unit 4 - Formal Grammars & Chomsky Hierarchy.pdf'
  );
  const [quickInput, setQuickInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    window.api.getSettings().then((s) => setSettings(s));
    window.api.getCourses().then((cList) => {
      if (cList.length > 0) setActiveCourse(cList[0]);
    });

    const unsubStream = window.api.onStreamChunk((data) => {
      setAiAnswer((prev) => prev + data.chunk);
    });

    const unsubDone = window.api.onStreamDone((data) => {
      setIsLoading(false);
      if (data.sources && data.sources.length > 0) {
        setSourceCitation(`${data.sources[0].docName} (${data.sources[0].heading})`);
      }
    });

    return () => {
      unsubStream();
      unsubDone();
    };
  }, []);

  const askStudyQuestion = async (prompt: string) => {
    if (!activeCourse) return;
    setDetectedQuestion(prompt);
    setIsLoading(true);
    setAiAnswer('');

    try {
      const searchRes = await window.api.searchKnowledge(activeCourse.id, prompt, 4);
      if (searchRes.chunks.length > 0) {
        setSourceCitation(`${searchRes.chunks[0].docName} → ${searchRes.chunks[0].heading}`);
      } else {
        setSourceCitation('Course Material Knowledge Base');
      }

      await window.api.askAiStream({
        sessionId: 'floating',
        courseId: activeCourse.id,
        prompt,
        mode: 'study_answer',
        responseLength: 'short',
      });
    } catch (err: any) {
      setIsLoading(false);
      setAiAnswer(`Error: ${err.message}`);
    }
  };

  const handleAskQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || !activeCourse) return;
    const prompt = quickInput.trim();
    setDetectedQuestion(prompt);
    setQuickInput('');
    setIsLoading(true);
    setAiAnswer('');

    try {
      // Find course context
      const searchRes = await window.api.searchKnowledge(activeCourse.id, prompt, 3);
      if (searchRes.chunks.length > 0) {
        setSourceCitation(`${searchRes.chunks[0].docName} → ${searchRes.chunks[0].heading}`);
      } else {
        setSourceCitation('Academic Course Knowledge');
      }

      await window.api.askAiStream({
        sessionId: 'floating',
        courseId: activeCourse.id,
        prompt,
        mode: 'study_answer',
        responseLength: 'short',
      });
    } catch (err: any) {
      setIsLoading(false);
      setAiAnswer(`Error: ${err.message}`);
    }
  };

  const handleScreenCapture = async () => {
    if (!activeCourse) return;
    setIsCapturing(true);
    setIsLoading(true);
    setAiAnswer('Analyzing captured screen region with course notes...');
    try {
      const b64 = await window.api.captureScreen();
      const analysis = await window.api.analyzeScreenshot({
        imageBase64: b64,
        prompt: 'Explain what is shown on screen and relate to course material.',
        courseId: activeCourse.id,
      });
      setDetectedQuestion('Screen Visual Capture');
      setAiAnswer(analysis);
      setSourceCitation('Screen Capture + Syllabus');
    } catch (err: any) {
      setAiAnswer(`Screen analysis error: ${err.message}`);
    } finally {
      setIsCapturing(false);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col justify-between overflow-hidden rounded-2xl select-none"
      style={{
        backgroundColor: `rgba(15, 17, 21, ${(settings?.windowOpacity || 85) / 100})`,
        backdropFilter: `blur(${settings?.blurAmount || 20}px)`,
        WebkitBackdropFilter: `blur(${settings?.blurAmount || 20}px)`,
        border: '1px solid rgba(124, 92, 252, 0.35)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 25px rgba(124, 92, 252, 0.2)',
      }}
    >
      {/* Draggable Header */}
      <div className="titlebar-drag h-11 px-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center shadow-glow">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-xs tracking-tight text-white">StudyLens Assistant</span>
        </div>

        {/* Status & Close */}
        <div className="flex items-center gap-1.5 no-drag">
          <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-green"></span>
            <span>Listening</span>
          </span>

          <button
            onClick={() => window.api.closeWindow()}
            className="p-1 rounded hover:bg-white/10 text-muted hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-drag text-xs">
        {/* Detected Question Banner */}
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
          <div className="text-[10px] font-bold text-accent-light uppercase tracking-wider flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            <span>Study Topic / Detected Question:</span>
          </div>
          <p className="text-white font-medium text-xs leading-relaxed italic">
            "{detectedQuestion}"
          </p>
        </div>

        <div className="h-[1px] w-full bg-white/10" />

        {/* AI Answer Content */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-2 text-muted">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
              <span className="text-[11px]">Finding explanation in course materials...</span>
            </div>
          ) : (
            <div className="leading-relaxed text-gray-200">
              <MarkdownRenderer content={aiAnswer} />
            </div>
          )}

          {sourceCitation && (
            <div className="pt-2 border-t border-white/10 text-[10px] text-accent-light flex items-center gap-1 font-mono">
              <BookOpen className="w-3 h-3" />
              <span className="truncate">Source: {sourceCitation}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action & Input Footer */}
      <div className="p-3 border-t border-white/10 bg-white/[0.02] space-y-2 no-drag">
        {/* Quick Study Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px] scrollbar-none">
          <button
            onClick={() =>
              askStudyQuestion(
                'Explain the core concept in simple terms with an intuitive real-world analogy.'
              )
            }
            disabled={isLoading}
            className="px-2 py-0.5 rounded bg-accent/25 hover:bg-accent/35 text-accent-light border border-accent/40 whitespace-nowrap transition-colors"
          >
            Explain Simply
          </button>
          <button
            onClick={() =>
              askStudyQuestion(
                'Give a concrete, practical worked example illustrating this concept step-by-step.'
              )
            }
            disabled={isLoading}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 whitespace-nowrap transition-colors"
          >
            Give Example
          </button>
          <button
            onClick={() =>
              askStudyQuestion(
                'What are the key mathematical formulas, complexity notations, or definitions for this?'
              )
            }
            disabled={isLoading}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 whitespace-nowrap transition-colors"
          >
            Key Formulas
          </button>
          <button
            onClick={() =>
              askStudyQuestion(
                'Ask me a challenging exam-style question about this topic to test my understanding.'
              )
            }
            disabled={isLoading}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 whitespace-nowrap transition-colors"
          >
            Test Me
          </button>
          <button
            onClick={handleScreenCapture}
            disabled={isCapturing}
            className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 whitespace-nowrap transition-colors"
          >
            <Camera className="w-2.5 h-2.5" />
            <span>Screen Context</span>
          </button>
        </div>

        {/* Input bar */}
        <form onSubmit={handleAskQuick} className="flex gap-1.5 items-center">
          <input
            type="text"
            placeholder="Type quick question (or press Ctrl+Shift+Space)..."
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-black/40 text-xs rounded-xl border border-white/15 text-white placeholder-muted/60 focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!quickInput.trim() || isLoading}
            className="p-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white shadow-glow transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
