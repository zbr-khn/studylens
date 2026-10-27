import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  BookOpen,
  Mic,
  Square,
  Activity,
  Layers,
  Camera,
  ChevronDown,
  Plus,
  Minus,
  Maximize2,
  X,
  Coins,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    courses,
    activeCourse,
    setActiveCourse,
    createCourse,
    isRecording,
    isAiProcessing,
    stopAudioCapture,
    stopGeneration,
    tokenUsage,
    toggleFloatingWindow,
    setActiveTab,
  } = useApp();

  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    await createCourse(newCourseName.trim());
    setNewCourseName('');
    setIsCreatingCourse(false);
    setIsCourseDropdownOpen(false);
  };

  return (
    <header className="titlebar-drag h-13 border-b border-surface-border bg-surface/90 backdrop-blur-md flex items-center justify-between px-4 select-none z-50">
      {/* Brand & Course Selector */}
      <div className="flex items-center gap-4 no-drag">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('chat')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-dark via-accent to-accent-light flex items-center justify-center shadow-glow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>StudyLens</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-accent/20 text-accent-light border border-accent/30">
                AI Tutor
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-white/10" />

        {/* Course Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-tertiary border border-surface-border text-xs font-medium text-text transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-accent-light" />
            <span className="max-w-[160px] truncate">{activeCourse?.name || 'Select Course'}</span>
            <ChevronDown className="w-3 h-3 text-muted" />
          </button>

          {isCourseDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-surface border border-surface-border rounded-xl shadow-floating p-2 z-50">
              <div className="text-[11px] font-semibold text-muted px-2 py-1 uppercase tracking-wider">
                My Bachelor's Courses
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1 my-1">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => {
                      setActiveCourse(course);
                      setIsCourseDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      activeCourse?.id === course.id
                        ? 'bg-accent/15 text-accent-light font-medium'
                        : 'text-text hover:bg-secondary'
                    }`}
                  >
                    <span className="truncate">{course.name}</span>
                    <span className="text-[10px] text-muted">{course.documentCount} docs</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-surface-border mt-1">
                {isCreatingCourse ? (
                  <form onSubmit={handleCreateCourse} className="space-y-2">
                    <input
                      type="text"
                      placeholder="Course name (e.g. Distributed Systems)"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      autoFocus
                      className="w-full px-2.5 py-1.5 bg-secondary text-xs rounded border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsCreatingCourse(false)}
                        className="px-2 py-1 text-[11px] rounded text-muted hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 text-[11px] rounded bg-accent text-white font-medium hover:bg-accent-hover"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsCreatingCourse(true)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-accent-light hover:bg-accent/10 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Course</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Privacy Status Indicators (Requirement 11) */}
      <div className="flex items-center gap-3 no-drag">
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-green"></span>
            <span>AUDIO CAPTURE ACTIVE</span>
            <button
              onClick={stopAudioCapture}
              className="ml-1 p-0.5 rounded hover:bg-emerald-800/50 text-emerald-300"
              title="Stop audio capture"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
            </button>
          </div>
        )}

        {isAiProcessing && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-accent/40 text-[11px] font-semibold text-accent-light">
            <span className="w-2 h-2 rounded-full bg-accent pulse-purple"></span>
            <span>AI PROCESSING ACTIVE</span>
            <button
              onClick={stopGeneration}
              className="ml-1 p-0.5 rounded hover:bg-purple-800/50 text-accent-light"
              title="Stop AI processing"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
            </button>
          </div>
        )}
      </div>

      {/* Right Controls: Token Usage, Quick Floating Overlay, Window Controls */}
      <div className="flex items-center gap-3 no-drag">
        {/* Cost & Token Monitor (Requirement 23) */}
        <div
          onClick={() => setActiveTab('settings')}
          className="cursor-pointer flex items-center gap-2 px-2.5 py-1 rounded-lg bg-secondary/80 border border-surface-border text-xs hover:border-accent/40 transition-colors"
          title={`Input: ${tokenUsage.inputTokens.toLocaleString()} | Output: ${tokenUsage.outputTokens.toLocaleString()}`}
        >
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-muted font-mono text-[11px]">
            ${tokenUsage.estimatedCostUsd.toFixed(3)}
          </span>
        </div>

        {/* Screen capture shortcut button */}
        <button
          onClick={() => setActiveTab('screen')}
          className="p-1.5 rounded-lg bg-secondary hover:bg-tertiary border border-surface-border text-muted hover:text-text transition-colors"
          title="Screen Region Capture (Ctrl+Shift+S)"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Floating Mode Toggle (Requirement 10) */}
        <button
          onClick={toggleFloatingWindow}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent-light text-xs font-medium transition-all"
          title="Toggle Floating Translucent Assistant (Ctrl+Shift+Space)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Floating HUD</span>
        </button>

        {/* Windows Titlebar Controls */}
        <div className="flex items-center ml-2 border-l border-surface-border pl-2">
          <button
            onClick={() => window.api.minimizeWindow()}
            className="p-1.5 hover:bg-white/10 rounded text-muted hover:text-text transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.api.maximizeWindow()}
            className="p-1.5 hover:bg-white/10 rounded text-muted hover:text-text transition-colors"
            title="Maximize"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.api.closeWindow()}
            className="p-1.5 hover:bg-danger/80 rounded text-muted hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
