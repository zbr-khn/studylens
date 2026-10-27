import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  CreditCard,
  Sparkles,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { Flashcard } from '../../shared/types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

export const FlashcardView: React.FC = () => {
  const { activeCourse } = useApp();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [topic, setTopic] = useState('Key Theorems & Definitions');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'difficult'>('all');

  useEffect(() => {
    if (activeCourse) {
      loadCards();
    }
  }, [activeCourse]);

  const loadCards = async () => {
    if (!activeCourse) return;
    const cards = await window.api.getFlashcards(activeCourse.id);
    setFlashcards(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !topic.trim()) return;
    setIsGenerating(true);
    try {
      await window.api.generateFlashcards({
        courseId: activeCourse.id,
        topic: topic.trim(),
        count: 8,
      });
      await loadCards();
    } catch (err: any) {
      alert(`Flashcard generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRate = async (difficulty: 'easy' | 'medium' | 'difficult') => {
    if (flashcards.length === 0) return;
    const current = flashcards[currentIndex];
    const updated: Flashcard = {
      ...current,
      difficulty,
      lastReviewed: Date.now(),
      reviewCount: (current.reviewCount || 0) + 1,
    };
    await window.api.updateFlashcard(updated);
    const newCards = [...flashcards];
    newCards[currentIndex] = updated;
    setFlashcards(newCards);

    // Advance to next
    setIsFlipped(false);
    if (currentIndex < visibleCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleDeleteCurrent = async () => {
    if (visibleCards.length === 0) return;
    const cardId = visibleCards[currentIndex].id;
    await window.api.deleteFlashcard(cardId);
    await loadCards();
  };

  const visibleCards = filterDifficulty === 'difficult'
    ? flashcards.filter((c) => c.difficulty === 'difficult')
    : flashcards;

  const currentCard = visibleCards[currentIndex];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent-light" />
            <span>Interactive Spaced Flashcards</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Synthesized directly from your course materials. Prioritize difficult cards for final revision.
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFilterDifficulty(filterDifficulty === 'all' ? 'difficult' : 'all');
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              filterDifficulty === 'difficult'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-secondary text-muted hover:text-text border-surface-border'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{filterDifficulty === 'difficult' ? 'Showing Difficult Only' : 'Show All Cards'}</span>
          </button>
        </div>
      </div>

      {/* Generator Form */}
      <div className="bg-surface/50 border border-surface-border rounded-2xl p-4">
        <form onSubmit={handleGenerate} className="flex gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic to generate flashcards for (e.g. Regular Grammars, Normalization)..."
            className="flex-1 px-3 py-2 bg-secondary text-xs rounded-xl border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={isGenerating || !topic.trim()}
            className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-glow disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Auto-Generate Cards</span>
          </button>
        </form>
      </div>

      {/* Main Flashcard 3D Card Display */}
      {visibleCards.length > 0 && currentCard ? (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Card {currentIndex + 1} of {visibleCards.length}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  currentCard.difficulty === 'difficult'
                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                    : currentCard.difficulty === 'easy'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {currentCard.difficulty}
              </span>
              <button
                onClick={handleDeleteCurrent}
                className="p-1 hover:text-danger rounded"
                title="Delete this card"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="h-72 w-full cursor-pointer perspective-1000 group select-none"
          >
            <div
              className={`w-full h-full relative transition-transform duration-500 transform-style-3d rounded-3xl border border-surface-border p-6 shadow-floating ${
                isFlipped ? 'rotate-y-180 bg-[#161B26]' : 'bg-[#131720]'
              }`}
            >
              {/* Front Side */}
              <div
                className={`absolute inset-0 p-8 flex flex-col justify-between backface-hidden ${
                  isFlipped ? 'hidden' : 'flex'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-accent-light uppercase tracking-wider">
                  <span>Question / Prompt</span>
                  <span className="text-muted text-[10px] flex items-center gap-1">
                    <RotateCw className="w-3 h-3" /> Click to reveal answer
                  </span>
                </div>

                <div className="text-base font-semibold text-white leading-relaxed text-center my-auto">
                  {currentCard.front}
                </div>

                <div className="text-[11px] text-muted text-center font-mono">
                  {currentCard.source ? `Source: ${currentCard.source}` : 'Course Material'}
                </div>
              </div>

              {/* Back Side */}
              <div
                className={`absolute inset-0 p-8 flex flex-col justify-between backface-hidden rotate-y-180 ${
                  isFlipped ? 'flex' : 'hidden'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <span>Explanation & Formula</span>
                  <span className="text-muted text-[10px] flex items-center gap-1">
                    <RotateCw className="w-3 h-3" /> Click to flip back
                  </span>
                </div>

                <div className="text-sm text-text leading-relaxed my-auto overflow-y-auto max-h-44 pr-2">
                  <MarkdownRenderer content={currentCard.back} />
                </div>

                <div className="text-[11px] text-muted text-center">
                  Reviewed {currentCard.reviewCount || 0} times
                </div>
              </div>
            </div>
          </div>

          {/* Spaced Repetition Rating Buttons */}
          <div className="space-y-3">
            <div className="text-center text-xs text-muted font-medium">Rate your recall:</div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleRate('easy')}
                className="py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors"
              >
                Easy (Recall High)
              </button>
              <button
                onClick={() => handleRate('medium')}
                className="py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors"
              >
                Medium
              </button>
              <button
                onClick={() => handleRate('difficult')}
                className="py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition-colors"
              >
                Difficult (Needs Review)
              </button>
            </div>
          </div>

          {/* Stepper controls */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => {
                setIsFlipped(false);
                setCurrentIndex((prev) => Math.max(0, prev - 1));
              }}
              disabled={currentIndex === 0}
              className="p-2 rounded-xl bg-secondary hover:bg-tertiary text-text disabled:opacity-30 border border-surface-border"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted">
              {currentIndex + 1} / {visibleCards.length}
            </span>
            <button
              onClick={() => {
                setIsFlipped(false);
                setCurrentIndex((prev) => Math.min(visibleCards.length - 1, prev + 1));
              }}
              disabled={currentIndex === visibleCards.length - 1}
              className="p-2 rounded-xl bg-secondary hover:bg-tertiary text-text disabled:opacity-30 border border-surface-border"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-xs text-muted space-y-2">
          <CreditCard className="w-10 h-10 text-muted/50 mx-auto" />
          <div className="font-semibold text-text">No flashcards found</div>
          <div>Type a topic above and click "Auto-Generate Cards" to build flashcards from your material.</div>
        </div>
      )}
    </div>
  );
};
