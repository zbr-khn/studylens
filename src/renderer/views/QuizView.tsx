import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sliders,
  ChevronRight,
  BookOpen,
  Award,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Quiz, QuizQuestion } from '../../shared/types';

export const QuizView: React.FC = () => {
  const { activeCourse } = useApp();
  const [topic, setTopic] = useState('Chomsky hierarchy & Formal Grammars');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'introductory' | 'university' | 'advanced'>('university');
  const [types, setTypes] = useState<('mcq' | 'short_answer' | 'true_false')[]>(['mcq', 'short_answer']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleToggleType = (t: 'mcq' | 'short_answer' | 'true_false') => {
    if (types.includes(t)) {
      if (types.length > 1) {
        setTypes(types.filter((item) => item !== t));
      }
    } else {
      setTypes([...types, t]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !topic.trim()) return;
    setIsGenerating(true);
    setIsSubmitted(false);
    setSelectedAnswers({});
    setCurrentQIndex(0);

    try {
      const generated = await window.api.generateQuiz({
        courseId: activeCourse.id,
        topic: topic.trim(),
        count,
        difficulty,
        types,
      });
      setActiveQuiz(generated);
    } catch (err: any) {
      alert(`Quiz generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (qIdx: number, val: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: val }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !activeCourse) return;
    setIsSubmitted(true);

    let score = 0;
    const weakTopics: string[] = [];

    activeQuiz.questions.forEach((q, idx) => {
      const userAns = selectedAnswers[idx]?.trim().toLowerCase();
      const correctAns = String(q.correctAnswer).trim().toLowerCase();
      const isCorrect = userAns === correctAns || userAns === q.options?.[Number(q.correctAnswer)]?.toLowerCase();
      if (isCorrect) {
        score++;
      } else {
        weakTopics.push(q.question.slice(0, 40));
      }
    });

    const updatedQuiz: Quiz = {
      ...activeQuiz,
      score,
      weakTopics,
      completedAt: Date.now(),
    };
    setActiveQuiz(updatedQuiz);
    await window.api.saveQuizResult(updatedQuiz);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-accent-light" />
          <span>Course Quiz Generator</span>
        </h1>
        <p className="text-xs text-muted mt-1">
          Generate university-level assessment tests directly from your indexed lecture notes and textbook chapters.
        </p>
      </div>

      {/* Generator Configuration Card */}
      {!activeQuiz || isSubmitted ? (
        <div className="bg-surface/50 border border-surface-border rounded-2xl p-5 space-y-4">
          <div className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-accent-light" />
            <span>Generate New Academic Quiz</span>
          </div>

          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-muted font-medium">Topic or Chapter:</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Chomsky Hierarchy, Context-Free Grammars, Pumping Lemma"
                className="w-full px-3 py-2 bg-secondary text-xs rounded-xl border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-muted font-medium">Number of Questions:</label>
              <div className="flex gap-2">
                {[5, 10, 15].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={`flex-1 py-1.5 rounded-lg border font-semibold ${
                      count === n
                        ? 'border-accent bg-accent text-white'
                        : 'border-surface-border bg-secondary text-muted hover:text-text'
                    }`}
                  >
                    {n} Questions
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-muted font-medium">Difficulty Level:</label>
              <div className="flex gap-2">
                {[
                  { id: 'introductory', label: 'Intro' },
                  { id: 'university', label: 'University' },
                  { id: 'advanced', label: 'Advanced' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id as any)}
                    className={`flex-1 py-1.5 rounded-lg border font-semibold ${
                      difficulty === d.id
                        ? 'border-accent bg-accent text-white'
                        : 'border-surface-border bg-secondary text-muted hover:text-text'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-muted font-medium">Question Formats:</label>
              <div className="flex gap-3">
                {[
                  { id: 'mcq', label: 'Multiple Choice (MCQ)' },
                  { id: 'short_answer', label: 'Short Answer' },
                  { id: 'true_false', label: 'True / False' },
                ].map((t) => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer text-text">
                    <input
                      type="checkbox"
                      checked={types.includes(t.id as any)}
                      onChange={() => handleToggleType(t.id as any)}
                      className="rounded text-accent focus:ring-0"
                    />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={isGenerating || !topic.trim()}
                className="w-full py-3 bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent-dark text-white rounded-xl text-xs font-bold shadow-glow disabled:opacity-40 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Generate University Quiz from Course Material</span>
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Active Quiz Taking Interface */}
      {activeQuiz && (
        <div className="space-y-6">
          {/* Quiz Stats Bar */}
          <div className="p-4 rounded-2xl bg-surface border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">{activeQuiz.title}</div>
              <div className="text-xs text-muted mt-0.5">
                Difficulty: <span className="capitalize text-accent-light">{activeQuiz.difficulty}</span> •{' '}
                {activeQuiz.questions.length} Questions
              </div>
            </div>

            {isSubmitted && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/20 border border-accent/40 text-accent-light font-bold text-xs">
                  <Award className="w-4 h-4" />
                  <span>
                    Score: {activeQuiz.score} / {activeQuiz.questions.length} (
                    {Math.round(((activeQuiz.score || 0) / activeQuiz.questions.length) * 100)}%)
                  </span>
                </div>
                <button
                  onClick={() => setActiveQuiz(null)}
                  className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-tertiary border border-surface-border text-xs text-text transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>New Quiz</span>
                </button>
              </div>
            )}
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {activeQuiz.questions.map((q, qIdx) => {
              const userAns = selectedAnswers[qIdx];
              const isCorrect = isSubmitted && (
                userAns?.toLowerCase() === String(q.correctAnswer).toLowerCase() ||
                userAns?.toLowerCase() === q.options?.[Number(q.correctAnswer)]?.toLowerCase()
              );

              return (
                <div
                  key={q.id || qIdx}
                  className={`p-5 rounded-2xl border transition-all ${
                    isSubmitted
                      ? isCorrect
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-red-950/20 border-red-500/40'
                      : 'bg-surface/50 border-surface-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-accent-light uppercase tracking-wider">
                        Question {qIdx + 1} • <span className="uppercase text-muted">{q.type.replace('_', ' ')}</span>
                      </div>
                      <div className="text-sm font-semibold text-text leading-relaxed">
                        {q.question}
                      </div>
                    </div>

                    {isSubmitted && (
                      <div>
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-danger shrink-0" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Options for MCQ */}
                  {q.options && q.options.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = userAns === opt || userAns === String(optIdx);
                        const isThisCorrect = isSubmitted && (String(q.correctAnswer) === String(optIdx) || String(q.correctAnswer).toLowerCase() === opt.toLowerCase());

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectOption(qIdx, opt)}
                            disabled={isSubmitted}
                            className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                              isThisCorrect
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                                : isSelected
                                ? 'bg-accent/20 border-accent text-white font-medium'
                                : 'bg-secondary/40 border-surface-border text-muted hover:text-text hover:bg-secondary'
                            }`}
                          >
                            <span className="font-mono text-muted mr-2">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Text input for short answer */
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Type your answer..."
                        value={userAns || ''}
                        onChange={(e) => handleSelectOption(qIdx, e.target.value)}
                        disabled={isSubmitted}
                        className="w-full p-2.5 bg-secondary text-xs rounded-xl border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent"
                      />
                    </div>
                  )}

                  {/* Post-submission academic explanation */}
                  {isSubmitted && (
                    <div className="mt-4 pt-3 border-t border-surface-border text-xs space-y-1">
                      <div className="text-[11px] font-bold text-accent-light uppercase tracking-wider">
                        Official Academic Explanation:
                      </div>
                      <p className="text-muted leading-relaxed font-sans">{q.explanation}</p>
                      {q.source && (
                        <div className="text-[10px] text-muted font-mono mt-1">
                          Source: {q.source}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          {!isSubmitted && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmitQuiz}
                className="px-6 py-3 bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent-dark text-white rounded-xl text-xs font-bold shadow-glow transition-all active:scale-95"
              >
                Submit & Grade Exam
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
