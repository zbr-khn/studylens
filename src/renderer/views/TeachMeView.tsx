import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Lightbulb,
  Send,
  Loader2,
  BookOpen,
} from 'lucide-react';

interface TutorStep {
  step: 'concept' | 'intuition' | 'example' | 'practice';
  title: string;
  content: string;
}

export const TeachMeView: React.FC = () => {
  const { activeCourse } = useApp();
  const [topicInput, setTopicInput] = useState('');
  const [activeTopic, setActiveTopic] = useState('');
  const [steps, setSteps] = useState<TutorStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const startTutoring = async (topic: string) => {
    if (!topic.trim() || !activeCourse) return;
    setActiveTopic(topic);
    setIsLoading(true);
    setFeedback(null);
    setUserAnswer('');

    try {
      const searchRes = await window.api.searchKnowledge(activeCourse.id, topic, 4);
      const prompt = `You are a world-class university professor. We are starting a structured 1-on-1 tutoring session on the topic: "${topic}".
Course Material Context:
${searchRes.contextFormatted || 'Standard syllabus'}

Generate a structured pedagogical breakdown in strictly valid JSON:
{
  "steps": [
    {
      "step": "concept",
      "title": "1. Core Academic Definition",
      "content": "Formal, precise definition with standard notation."
    },
    {
      "step": "intuition",
      "title": "2. Intuitive Metaphor & Why It Matters",
      "content": "Simple mental model explaining why we study this."
    },
    {
      "step": "example",
      "title": "3. Worked Step-by-Step Example / Derivation",
      "content": "Concrete academic worked problem showing the exact method."
    },
    {
      "step": "practice",
      "title": "4. Knowledge Check Question",
      "content": "A thoughtful practice question to test if the student truly grasps the concept."
    }
  ]
}
Output strictly raw JSON without markdown code fences.`;

      // Use ask via backend
      const res = await window.api.analyzeScreenshot({
        imageBase64: '',
        prompt,
        courseId: activeCourse.id,
      });

      let clean = res.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);

      const parsed = JSON.parse(clean.trim());
      setSteps(parsed.steps || []);
      setCurrentStepIndex(0);
    } catch (err: any) {
      alert(`Tutoring generation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluateAnswer = async () => {
    if (!userAnswer.trim() || !activeCourse || steps.length === 0) return;
    setIsEvaluating(true);
    try {
      const practiceStep = steps.find((s) => s.step === 'practice');
      const prompt = `Topic: "${activeTopic}"
Practice Question: "${practiceStep?.content}"
Student's Answer: "${userAnswer}"

Evaluate the student's answer academically:
1. State whether their reasoning is correct, partially correct, or incorrect.
2. Highlight misconceptions.
3. Show the correct method.`;

      const result = await window.api.analyzeScreenshot({
        imageBase64: '',
        prompt,
        courseId: activeCourse.id,
      });

      setFeedback(result);
    } catch (err: any) {
      alert(`Evaluation error: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-accent-light" />
          <span>Interactive "Teach Me" Tutor Mode</span>
        </h1>
        <p className="text-xs text-muted mt-1">
          Behavioral university tutor. Step-by-step concept progression, intuition, worked examples, and check questions.
        </p>
      </div>

      {/* Topic Selection Bar */}
      <div className="bg-surface/50 border border-surface-border rounded-2xl p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTutoring(topicInput);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <BookOpen className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
            <input
              type="text"
              placeholder="Enter difficult concept (e.g. Pumping Lemma, BCNF Normalization, Red-Black Trees)..."
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary text-xs rounded-xl border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !topicInput.trim()}
            className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-glow disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Teach Me This</span>
          </button>
        </form>

        {/* Suggestion tags */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
            Popular Topics:
          </span>
          {[
            'Chomsky Hierarchy Type-1 vs Type-2',
            'Eigenvalues & Eigenvectors',
            'Master Theorem for Recurrences',
            'ACID Transactions & Isolation Levels',
          ].map((t, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTopicInput(t);
                startTutoring(t);
              }}
              className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-[11px] text-text border border-surface-border hover:border-accent/40 transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tutoring Stepper */}
      {steps.length > 0 && (
        <div className="space-y-4">
          {/* Stepper Navigation */}
          <div className="grid grid-cols-4 gap-2">
            {steps.map((st, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  currentStepIndex === idx
                    ? 'border-accent bg-accent/15 text-white shadow-glow'
                    : 'border-surface-border bg-surface/40 text-muted hover:text-text'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-accent-light">
                  Step {idx + 1}
                </div>
                <div className="text-xs font-semibold truncate mt-0.5">{st.title.split('. ')[1] || st.title}</div>
              </button>
            ))}
          </div>

          {/* Current Step Card */}
          <div className="bg-surface/50 border border-surface-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2 className="text-sm font-bold text-accent-light flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>{steps[currentStepIndex].title}</span>
              </h2>
              <span className="text-xs text-muted">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-surface-border">
              <MarkdownRenderer content={steps[currentStepIndex].content} />
            </div>

            {/* If Practice Question Step, show interactive answer box */}
            {steps[currentStepIndex].step === 'practice' && (
              <div className="pt-4 border-t border-surface-border space-y-3">
                <div className="text-xs font-semibold text-text">Your Solution / Answer:</div>
                <textarea
                  rows={3}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your explanation or calculation here to check your understanding..."
                  className="w-full p-3 bg-secondary text-xs rounded-xl border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent"
                />
                <button
                  onClick={handleEvaluateAnswer}
                  disabled={isEvaluating || !userAnswer.trim()}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-glow disabled:opacity-40 transition-all flex items-center gap-2"
                >
                  {isEvaluating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Evaluate My Answer</span>
                </button>

                {feedback && (
                  <div className="p-4 rounded-xl bg-secondary/80 border border-accent/40 space-y-2 mt-3">
                    <div className="text-xs font-bold text-accent-light uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Professor Feedback & Correction:</span>
                    </div>
                    <MarkdownRenderer content={feedback} />
                  </div>
                )}
              </div>
            )}

            {/* Next Step Button */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-tertiary text-xs font-medium text-text border border-surface-border disabled:opacity-30"
              >
                Previous Step
              </button>
              {currentStepIndex < steps.length - 1 && (
                <button
                  onClick={() => setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                  className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-xs font-semibold text-white shadow-glow flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
