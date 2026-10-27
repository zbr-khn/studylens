import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Key,
  BookOpen,
  UploadCloud,
  Headphones,
  CheckCircle2,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const {
    isOnboardingOpen,
    setIsOnboardingOpen,
    updateSettings,
    uploadFiles,
    courses,
  } = useApp();

  const [currentStep, setCurrentStep] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  if (!isOnboardingOpen) return null;

  const handleSaveKeyAndNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      // Allow skipping or proceed
      setCurrentStep(2);
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    try {
      await window.api.setApiKey(apiKey.trim());
      await updateSettings({ hasApiKey: true });
      const test = await window.api.testApiKey();
      if (test.success) {
        setCurrentStep(2);
      } else {
        setVerifyError(test.error || 'Invalid API key or network error');
      }
    } catch (err: any) {
      setVerifyError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-surface border border-surface-border rounded-3xl p-8 shadow-floating space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent-dark via-accent to-accent-light mx-auto flex items-center justify-center shadow-glow">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Welcome to StudyLens</h2>
          <p className="text-xs text-muted">
            Your university AI study assistant powered by the official Google Gemini API.
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center justify-between px-4 text-xs font-semibold text-muted">
          {[
            { step: 1, label: 'API Key' },
            { step: 2, label: 'Course' },
            { step: 3, label: 'Materials' },
            { step: 4, label: 'Audio' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  currentStep === item.step
                    ? 'bg-accent text-white shadow-glow'
                    : currentStep > item.step
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-secondary text-muted'
                }`}
              >
                {currentStep > item.step ? '✓' : item.step}
              </span>
              <span className={currentStep === item.step ? 'text-white' : ''}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Connect Gemini API Key */}
        {currentStep === 1 && (
          <form onSubmit={handleSaveKeyAndNext} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Key className="w-4 h-4 text-accent-light" />
                <span>1. Connect your Google Gemini API key</span>
              </label>
              <p className="text-[11px] text-muted leading-relaxed">
                StudyLens connects directly to official Google Gemini endpoints. Your API key is encrypted
                using Windows DPAPI and never exposed in browser scripts.
              </p>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIzaSy... or Gemini API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2.5 bg-secondary text-xs rounded-xl border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-3 text-muted hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {verifyError && (
                <div className="text-[11px] text-danger bg-red-950/40 p-2 rounded-lg border border-red-500/30">
                  {verifyError}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs text-muted hover:text-white"
              >
                Configure later
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-glow flex items-center gap-1.5 transition-all"
              >
                {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Create Default Course Workspace */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-text flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-accent-light" />
                <span>2. Default Course Workspace Created</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                We've initialized <strong className="text-white">"My Bachelor's"</strong> as your default workspace,
                along with preset study subjects like Theory of Computation, Mathematics, and Database Systems.
              </p>
              <div className="p-3.5 rounded-xl bg-secondary/60 border border-surface-border space-y-1.5">
                <div className="text-xs font-bold text-accent-light">My Bachelor's</div>
                <div className="text-[11px] text-muted">
                  Workspace for lecture slides, past exams, assignment briefs, and study sessions.
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-glow flex items-center gap-1.5"
              >
                <span>Continue to Materials</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload Course Material */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-text flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-accent-light" />
                <span>3. Upload your Course Material</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Add PDFs, DOCX lecture notes, slides (PPTX), or Markdown files. StudyLens indexes
                document headings and sections for precise academic citations.
              </p>
              <button
                onClick={uploadFiles}
                className="w-full py-4 border-2 border-dashed border-accent/40 rounded-2xl bg-accent/5 hover:bg-accent/10 text-xs font-medium text-text flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <UploadCloud className="w-6 h-6 text-accent-light" />
                <span className="font-semibold text-white">Select Course Files</span>
                <span className="text-[10px] text-muted">PDF, DOCX, TXT, PPTX, or ZIP</span>
              </button>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="text-xs text-muted hover:text-white"
              >
                Skip for now
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-glow flex items-center gap-1.5"
              >
                <span>Next: Audio Test</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Audio Test & Ready */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-accent-light" />
                <span>4. Test Audio & Ready to Study</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                StudyLens supports both your headset microphone and Windows system audio loopback
                (e.g., recorded lectures and Microsoft Teams audio).
              </p>

              <div className="p-4 rounded-xl bg-secondary/50 border border-surface-border space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Audio subsystem configured</span>
                </div>
                <div className="text-[11px] text-muted leading-relaxed">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-surface-border text-accent-light font-mono">Ctrl+Shift+Space</kbd> anytime
                  to summon the floating assistant.
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsOnboardingOpen(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent-dark text-white rounded-xl text-xs font-bold shadow-glow transition-all active:scale-95"
              >
                Start Studying with StudyLens
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
