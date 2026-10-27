import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import {
  Send,
  Square,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Bookmark,
  RefreshCw,
  Trash2,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  GraduationCap,
  MessageSquare,
  FileCheck,
} from 'lucide-react';
import { ResponseMode, ResponseLength, StudySession } from '../../shared/types';

export const ChatView: React.FC = () => {
  const {
    activeCourse,
    sessions,
    activeSession,
    setActiveSession,
    createSession,
    deleteSession,
    messages,
    sendMessage,
    isGenerating,
    streamingContent,
    stopGeneration,
    clearChat,
    responseMode,
    setResponseMode,
    responseLength,
    setResponseLength,
  } = useApp();

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [isSessionDrawerOpen, setIsSessionDrawerOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isGenerating) return;
    sendMessage(inputPrompt.trim());
    setInputPrompt('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToNotes = async (id: string, text: string) => {
    if (!activeCourse) return;
    const titleMatch = text.match(/### SHORT ANSWER\s*\n([^\n]+)/) || text.match(/^([^\n]+)/);
    const title = titleMatch ? titleMatch[1].slice(0, 50) : 'Study Response';

    await window.api.saveNote({
      courseId: activeCourse.id,
      title: `${activeSession?.title || 'Session'} - ${title}`,
      content: text,
      tags: ['ai-chat', activeSession?.currentTopic || 'study'],
    });

    setSavedNoteId(id);
    setTimeout(() => setSavedNoteId(null), 2000);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTitle.trim()) return;
    await createSession(newSessionTitle.trim());
    setNewSessionTitle('');
    setIsCreatingSession(false);
  };

  const modeOptions: Array<{ id: ResponseMode; label: string; icon: string }> = [
    { id: 'study_answer', label: 'Study Answer', icon: '🎓' },
    { id: 'explain', label: 'Explain', icon: '💡' },
    { id: 'detailed', label: 'Detailed', icon: '🔍' },
    { id: 'simple', label: 'Simple (ELI5)', icon: '🐣' },
    { id: 'follow_up', label: 'Follow-up', icon: '❓' },
    { id: 'sources', label: 'Sources Only', icon: '📜' },
    { id: 'teach_me', label: 'Teach Me', icon: '👨‍🏫' },
  ];

  const lengthOptions: Array<{ id: ResponseLength; label: string }> = [
    { id: 'one_sentence', label: '1-Sentence' },
    { id: 'short', label: 'Short' },
    { id: 'medium', label: 'Medium' },
    { id: 'detailed', label: 'Detailed' },
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sessions Drawer */}
      <div
        className={`w-64 border-r border-surface-border bg-surface/50 flex flex-col justify-between transition-all duration-300 ${
          isSessionDrawerOpen ? 'ml-0' : '-ml-64'
        }`}
      >
        <div className="p-3 border-b border-surface-border flex items-center justify-between">
          <div className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-accent-light" />
            <span>Study Sessions</span>
          </div>
          <button
            onClick={() => setIsCreatingSession(true)}
            className="p-1 rounded-lg hover:bg-secondary text-accent-light"
            title="Create new session"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isCreatingSession && (
            <form onSubmit={handleCreateSession} className="p-2 rounded-xl bg-secondary/80 border border-accent/40 space-y-2 mb-2">
              <input
                type="text"
                placeholder="Session title (e.g. Chomsky Hierarchy)"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                autoFocus
                className="w-full px-2 py-1 bg-surface text-xs rounded border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent"
              />
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingSession(false)}
                  className="px-2 py-0.5 text-[10px] rounded text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2 py-0.5 text-[10px] rounded bg-accent text-white font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveSession(s)}
              className={`p-2.5 rounded-xl cursor-pointer text-xs transition-colors flex items-center justify-between group ${
                activeSession?.id === s.id
                  ? 'bg-accent/15 text-accent-light border border-accent/30 font-medium'
                  : 'text-text hover:bg-secondary/60 border border-transparent'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="truncate font-semibold">{s.title}</div>
                <div className="text-[10px] text-muted truncate mt-0.5">
                  Topic: {s.currentTopic || 'General'}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(s.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-danger/20 hover:text-danger rounded text-muted transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Current Session Weak Areas card */}
        {activeSession && activeSession.weakAreas.length > 0 && (
          <div className="p-3 border-t border-surface-border bg-secondary/30 text-xs space-y-1">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              Weak Areas Tracked:
            </div>
            <ul className="text-[11px] text-muted space-y-0.5">
              {activeSession.weakAreas.map((w, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="truncate">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Top Chat Toolbar */}
        <div className="px-4 py-2 border-b border-surface-border bg-surface/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSessionDrawerOpen(!isSessionDrawerOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary hover:bg-tertiary border border-surface-border text-muted hover:text-text transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Sessions ({sessions.length})</span>
            </button>

            <div className="flex items-center gap-1.5 font-semibold text-text">
              <span>{activeSession?.title || 'Study Session'}</span>
              <span className="text-muted font-normal">•</span>
              <span className="text-[11px] text-muted font-normal">
                Course: {activeCourse?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Clear Chat Button */}
            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-text transition-colors"
              title="Clear conversation history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Response Mode & Length Bar */}
        <div className="px-4 py-2 border-b border-surface-border bg-secondary/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] text-muted font-semibold uppercase tracking-wider mr-1">
              Mode:
            </span>
            {modeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setResponseMode(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                  responseMode === opt.id
                    ? 'bg-accent text-white shadow-glow'
                    : 'bg-surface hover:bg-secondary text-muted hover:text-text border border-surface-border'
                }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Length Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted font-semibold uppercase tracking-wider mr-1">
              Length:
            </span>
            {lengthOptions.map((len) => (
              <button
                key={len.id}
                onClick={() => setResponseLength(len.id)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  responseLength === len.id
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-muted hover:text-text hover:bg-surface'
                }`}
              >
                {len.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isGenerating && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent-light shadow-glow">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text">
                  StudyLens AI Study Session
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Ask any question from your course syllabus, lecture notes, or past exams.
                  The assistant will prioritize your uploaded documents and cite exact sections.
                </p>
              </div>

              {/* Preset suggestion chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
                {[
                  'Explain context-sensitive grammars.',
                  'What is the Chomsky hierarchy?',
                  'Prove that regular languages are closed under union.',
                  'Explain eigenvalues with an intuitive geometric example.',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputPrompt(preset);
                      sendMessage(preset);
                    }}
                    className="p-2.5 rounded-xl bg-surface/70 hover:bg-surface border border-surface-border hover:border-accent/40 text-left text-xs text-text transition-colors"
                  >
                    "{preset}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 transition-all ${
                  msg.sender === 'user'
                    ? 'bg-accent/90 text-white shadow-md rounded-br-sm'
                    : 'bg-surface border border-surface-border shadow-md rounded-bl-sm space-y-3'
                }`}
              >
                {/* Header for assistant message */}
                {msg.sender === 'assistant' && (
                  <div className="flex items-center justify-between border-b border-surface-border pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center text-white">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <span className="font-semibold text-text">StudyLens</span>
                      {msg.hasCourseCitation && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-accent-light bg-accent/15 px-2 py-0.5 rounded-full border border-accent/30">
                          <FileCheck className="w-3 h-3" />
                          <span>Course Material Cited</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 rounded hover:bg-secondary text-muted hover:text-text transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleSaveToNotes(msg.id, msg.content)}
                        className="p-1 rounded hover:bg-secondary text-muted hover:text-text transition-colors"
                        title="Save to study notes"
                      >
                        {savedNoteId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Screenshot preview if attached */}
                {msg.screenshotBase64 && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/20 max-w-sm">
                    <img
                      src={msg.screenshotBase64}
                      alt="Captured context"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                {msg.sender === 'user' ? (
                  <div className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                ) : (
                  <MarkdownRenderer content={msg.content} />
                )}

                {/* Sources list footer */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pt-2 border-t border-surface-border text-[11px] text-muted space-y-1">
                    <div className="font-semibold text-accent-light flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>Retrieved Course Sources:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-secondary border border-surface-border text-[10px] text-gray-300 font-mono"
                          title={s.snippet}
                        >
                          {s.docName} → {s.heading}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming active message */}
          {isGenerating && streamingContent && (
            <div className="flex flex-col items-start">
              <div className="max-w-[85%] rounded-2xl p-4 bg-surface border border-accent/40 shadow-glow rounded-bl-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-surface-border pb-2 text-xs">
                  <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center text-white animate-pulse">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span className="font-semibold text-text">StudyLens Thinking & Formulating...</span>
                </div>
                <MarkdownRenderer content={streamingContent} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-surface-border bg-surface/70">
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder={`Ask StudyLens about ${activeCourse?.name || 'course'} (e.g. Explain Type-1 grammars)...`}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={isGenerating}
              className="flex-1 px-4 py-2.5 bg-secondary text-xs rounded-xl border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent"
            />

            {isGenerating ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="px-4 py-2.5 rounded-xl bg-danger/20 hover:bg-danger/30 border border-danger/40 text-danger text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputPrompt.trim()}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs font-semibold shadow-glow transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
