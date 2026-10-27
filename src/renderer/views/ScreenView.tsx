import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import {
  Camera,
  Scan,
  Sparkles,
  RefreshCw,
  Layers,
  Copy,
  Check,
  Send,
  Loader2,
  FileQuestion,
  Code,
  Sigma,
} from 'lucide-react';

export const ScreenView: React.FC = () => {
  const { activeCourse } = useApp();
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCaptureScreen = async () => {
    setIsCapturing(true);
    try {
      const b64 = await window.api.captureScreen();
      setScreenshotBase64(b64);
      setAnalysisResult(null);
    } catch (err: any) {
      alert(`Capture failed: ${err.message}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleAnalyze = async (customPrompt?: string) => {
    if (!screenshotBase64 || !activeCourse) return;
    const finalPrompt = customPrompt || prompt || 'Explain what is shown on this screen in detail.';
    setIsAnalyzing(true);
    try {
      const result = await window.api.analyzeScreenshot({
        imageBase64: screenshotBase64,
        prompt: finalPrompt,
        courseId: activeCourse.id,
      });
      setAnalysisResult(result);
    } catch (err: any) {
      alert(`Vision analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (analysisResult) {
      navigator.clipboard.writeText(analysisResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Scan className="w-5 h-5 text-accent-light" />
            <span>Screen Context & Vision Analysis</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Capture mathematical formulas, code, slide diagrams, or exam questions. Global shortcut:{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-surface-border text-[10px] text-text font-mono">
              Ctrl + Shift + S
            </kbd>
          </p>
        </div>

        <button
          onClick={handleCaptureScreen}
          disabled={isCapturing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-glow transition-all active:scale-95"
        >
          {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          <span>Capture Screen Now</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Screenshot Preview & Presets */}
        <div className="space-y-4">
          <div className="bg-surface/50 border border-surface-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-text">
              <span>Captured Visual Context</span>
              {screenshotBase64 && (
                <button
                  onClick={handleCaptureScreen}
                  className="text-accent-light hover:underline flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Recapture</span>
                </button>
              )}
            </div>

            {screenshotBase64 ? (
              <div className="rounded-xl overflow-hidden border border-surface-border max-h-[380px] bg-black/40 flex items-center justify-center">
                <img
                  src={screenshotBase64}
                  alt="Captured Screen"
                  className="max-h-[380px] w-auto object-contain"
                />
              </div>
            ) : (
              <div
                onClick={handleCaptureScreen}
                className="h-64 border-2 border-dashed border-surface-border rounded-xl flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:border-accent/40 bg-surface/30 transition-colors"
              >
                <Camera className="w-10 h-10 text-muted/60 mb-2" />
                <span className="text-xs font-medium text-text">No screenshot captured yet</span>
                <span className="text-[11px] text-muted mt-1">
                  Click here or press <span className="font-mono text-accent-light">Ctrl+Shift+S</span>
                </span>
              </div>
            )}

            {/* Quick Preset Prompts */}
            <div className="pt-2 border-t border-surface-border space-y-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Quick Academic Prompts:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Explain Formula / Proof', icon: Sigma, text: 'Break down this mathematical formula step-by-step with LaTeX equations.' },
                  { label: 'Analyze Code & Complexity', icon: Code, text: 'Analyze this code, explain its logic and state its Big-O time and space complexity.' },
                  { label: 'Explain Slide Concept', icon: Layers, text: 'Summarize the core academic concept illustrated on this slide.' },
                  { label: 'Solve Problem Step-by-Step', icon: FileQuestion, text: 'Solve this question step-by-step, explaining the underlying method.' },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setPrompt(item.text);
                        handleAnalyze(item.text);
                      }}
                      disabled={!screenshotBase64 || isAnalyzing}
                      className="p-2.5 rounded-xl bg-secondary/60 hover:bg-secondary border border-surface-border hover:border-accent/40 text-left text-xs text-text transition-colors flex items-center gap-2 disabled:opacity-40"
                    >
                      <Icon className="w-4 h-4 text-accent-light shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Prompt Input */}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Ask specific question about the screen..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={!screenshotBase64 || isAnalyzing}
                className="flex-1 px-3 py-2 bg-secondary text-xs rounded-xl border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent disabled:opacity-40"
              />
              <button
                onClick={() => handleAnalyze()}
                disabled={!screenshotBase64 || isAnalyzing}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-glow disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Analyze</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Vision & Course Synthesis */}
        <div className="bg-surface/50 border border-surface-border rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-light" />
                <span className="text-xs font-bold text-text uppercase tracking-wider">
                  Vision + Course Material Explanation
                </span>
              </div>
              {analysisResult && (
                <button
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-secondary text-muted hover:text-text transition-colors"
                  title="Copy analysis"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {isAnalyzing ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <div className="text-xs font-medium text-text">
                  Sending image to OpenAI Vision & searching course notes...
                </div>
                <div className="text-[11px] text-muted">Synthesizing LaTeX formulas and theoretical context</div>
              </div>
            ) : analysisResult ? (
              <div className="max-h-[500px] overflow-y-auto pr-2">
                <MarkdownRenderer content={analysisResult} />
              </div>
            ) : (
              <div className="py-24 text-center text-xs text-muted space-y-1">
                <Sparkles className="w-8 h-8 text-accent/30 mx-auto mb-2" />
                <div className="font-semibold text-text">No active vision analysis</div>
                <div>Capture your screen to interpret slides, code, or equations.</div>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-secondary/30 border border-surface-border text-[11px] text-muted flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            <span>
              Vision model ({activeCourse?.name}): Cross-referenced with indexed documents for exact terminology.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
