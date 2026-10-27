import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Key,
  Mic,
  Sliders,
  Keyboard,
  Shield,
  Coins,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RotateCcw,
  Trash2,
  Loader2,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, tokenUsage, refreshUsage } = useApp();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinMsg, setPinMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [testStatus, setTestStatus] = useState<{
    tested: boolean;
    success?: boolean;
    model?: string;
    error?: string;
  }>({ tested: false });
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    refreshUsage();
    window.api.isPasscodeProtected().then(setPinEnabled);
  }, []);

  const handleSetPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setPinMsg({ text: 'PIN must be at least 4 characters long.', isError: true });
      return;
    }
    const res = await window.api.setPasscode(pinInput);
    if (res.success) {
      setPinEnabled(true);
      setPinInput('');
      setPinMsg({ text: 'Passcode enabled with PBKDF2 hashing!', isError: false });
    } else {
      setPinMsg({ text: res.error || 'Failed to set passcode', isError: true });
    }
    setTimeout(() => setPinMsg(null), 3000);
  };

  const handleDisablePasscode = async () => {
    const entered = prompt('Enter your current PIN to disable app protection:');
    if (!entered) return;
    const res = await window.api.disablePasscode(entered);
    if (res.success) {
      setPinEnabled(false);
      setPinMsg({ text: 'App passcode protection disabled.', isError: false });
    } else {
      setPinMsg({ text: res.error || 'Incorrect passcode', isError: true });
    }
    setTimeout(() => setPinMsg(null), 3000);
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    await window.api.setApiKey(apiKeyInput.trim());
    await updateSettings({ hasApiKey: true });
    setApiKeyInput('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleTestKey = async () => {
    setIsTesting(true);
    setTestStatus({ tested: false });
    try {
      const res = await window.api.testApiKey();
      setTestStatus({
        tested: true,
        success: res.success,
        model: res.model,
        error: res.error,
      });
    } catch (err: any) {
      setTestStatus({
        tested: true,
        success: false,
        error: err.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearAllData = async () => {
    if (confirm('Are you sure you want to clear all StudyLens local databases, cached documents, and API keys? This cannot be undone.')) {
      await window.api.clearAllData();
      alert('All local study data cleared.');
      window.location.reload();
    }
  };

  if (!settings) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-accent-light" />
          <span>Application Settings</span>
        </h1>
        <p className="text-xs text-muted mt-1">
          Configure official Google Gemini backend credentials, academic models, audio loopback, appearance, and privacy.
        </p>
      </div>

      {/* Section 1: Google Gemini API Key & Model Configuration */}
      <div className="bg-surface/60 border border-surface-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-text uppercase tracking-wider">
            <Key className="w-4 h-4 text-accent-light" />
            <span>Google Gemini API Credentials & Models</span>
          </div>
          <div className="flex items-center gap-1.5">
            {settings.hasApiKey ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                <span>API Key Configured Securely</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30">
                <AlertCircle className="w-3 h-3" />
                <span>Key Not Set</span>
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveApiKey} className="space-y-3">
          <label className="text-xs text-muted font-medium block">
            Update Google Gemini API Key (Stored securely using Windows DPAPI encryption):
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="AIzaSy... or Gemini API Key"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-3 py-2 bg-secondary text-xs rounded-xl border border-surface-border text-white placeholder-muted focus:outline-none focus:border-accent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-muted hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={!apiKeyInput.trim()}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-glow transition-all"
            >
              {saveSuccess ? 'Saved!' : 'Save Key'}
            </button>

            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !settings.hasApiKey}
              className="px-4 py-2 bg-secondary hover:bg-tertiary disabled:opacity-40 text-text border border-surface-border rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Test API Connection</span>
            </button>
          </div>

          {testStatus.tested && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testStatus.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-danger shrink-0" />
              )}
              <span>
                {testStatus.success
                  ? `Successfully authenticated with Google Gemini API (Model: ${testStatus.model})`
                  : `API Verification failed: ${testStatus.error}`}
              </span>
            </div>
          )}
        </form>

        {/* Model Selection Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="space-y-1.5">
            <label className="text-muted font-medium">Text Generation Model:</label>
            <select
              value={settings.textModel}
              onChange={(e) => updateSettings({ textModel: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-surface-border rounded-xl text-text focus:outline-none focus:border-accent"
            >
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Recommended - Ultra-Fast & Efficient)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Next-Gen Flagship)</option>
              <option value="gemini-flash-latest">gemini-flash-latest (Auto-Updated Flash)</option>
              <option value="gemini-pro-latest">gemini-pro-latest (Deep STEM Reasoning)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted font-medium">Vision / Image Model:</label>
            <select
              value={settings.visionModel}
              onChange={(e) => updateSettings({ visionModel: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-surface-border rounded-xl text-text focus:outline-none focus:border-accent"
            >
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (High Resolution Vision)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Multimodal Flagship)</option>
              <option value="gemini-pro-latest">gemini-pro-latest (Deep Diagram & Proof Inspection)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted font-medium">Embedding Model (Semantic Search):</label>
            <select
              value={settings.embeddingModel}
              onChange={(e) => updateSettings({ embeddingModel: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-surface-border rounded-xl text-text focus:outline-none focus:border-accent"
            >
              <option value="gemini-embedding-001">gemini-embedding-001 (Google 3072-dim Vector Search)</option>
              <option value="gemini-embedding-2">gemini-embedding-2 (Next-Gen Semantic Vector Search)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-muted font-medium">
              <span>Temperature (Creativity / Determinism):</span>
              <span className="font-mono text-text">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Token Usage & Cost Awareness (Requirement 23) */}
      <div className="bg-surface/60 border border-surface-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-text uppercase tracking-wider">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>API Token Usage & Cost Awareness</span>
          </div>
          <button
            onClick={() => window.api.resetTokenUsage().then(refreshUsage)}
            className="text-[11px] text-muted hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Usage</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-secondary/50 border border-surface-border space-y-1">
            <div className="text-[10px] text-muted uppercase font-bold">Input Tokens</div>
            <div className="text-base font-bold text-white font-mono">
              {tokenUsage.inputTokens.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-secondary/50 border border-surface-border space-y-1">
            <div className="text-[10px] text-muted uppercase font-bold">Output Tokens</div>
            <div className="text-base font-bold text-white font-mono">
              {tokenUsage.outputTokens.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-secondary/50 border border-surface-border space-y-1">
            <div className="text-[10px] text-muted uppercase font-bold">Total AI Queries</div>
            <div className="text-base font-bold text-white font-mono">
              {tokenUsage.totalRequests.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-accent/15 border border-accent/30 space-y-1">
            <div className="text-[10px] text-accent-light uppercase font-bold">Estimated Cost</div>
            <div className="text-base font-bold text-white font-mono">
              ${tokenUsage.estimatedCostUsd.toFixed(4)}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted leading-relaxed">
          StudyLens leverages vector chunk retrieval to send only relevant textbook and slide excerpts,
          minimizing API token consumption during lectures and study sessions.
        </p>
      </div>

      {/* Section 3: Floating Assistant Appearance & Shortcuts (Requirement 10 & 22) */}
      <div className="bg-surface/60 border border-surface-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-text uppercase tracking-wider border-b border-surface-border pb-3">
          <Sliders className="w-4 h-4 text-accent-light" />
          <span>Floating Translucent Assistant & Appearance</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <div className="flex justify-between text-muted font-medium">
              <span>Floating Window Opacity:</span>
              <span className="font-mono text-text">{settings.windowOpacity}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="100"
              step="5"
              value={settings.windowOpacity}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                updateSettings({ windowOpacity: val });
                window.api.setFloatingOpacity(val);
              }}
              className="w-full accent-accent"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-muted font-medium">
              <span>Acrylic Blur Amount:</span>
              <span className="font-mono text-text">{settings.blurAmount}px</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={settings.blurAmount}
              onChange={(e) => updateSettings({ blurAmount: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-surface-border">
            <div>
              <div className="font-semibold text-text">Always on Top</div>
              <div className="text-[11px] text-muted">Keep floating assistant visible above other apps</div>
            </div>
            <input
              type="checkbox"
              checked={settings.alwaysOnTop}
              onChange={(e) => updateSettings({ alwaysOnTop: e.target.checked })}
              className="w-4 h-4 rounded text-accent focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-surface-border">
            <div>
              <div className="font-semibold text-text">Compact Mode</div>
              <div className="text-[11px] text-muted">Minimize typography and padding on floating HUD</div>
            </div>
            <input
              type="checkbox"
              checked={settings.compactMode}
              onChange={(e) => updateSettings({ compactMode: e.target.checked })}
              className="w-4 h-4 rounded text-accent focus:ring-0"
            />
          </div>
        </div>

        {/* Global Shortcuts */}
        <div className="pt-2 border-t border-surface-border space-y-2 text-xs">
          <div className="font-semibold text-text">Global Windows Hotkeys:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-secondary/40 border border-surface-border flex items-center justify-between">
              <span className="text-muted">Toggle Floating Assistant:</span>
              <kbd className="px-2 py-1 rounded bg-surface border border-surface-border font-mono text-[11px] text-accent-light">
                Ctrl + Shift + Space
              </kbd>
            </div>
            <div className="p-3 rounded-xl bg-secondary/40 border border-surface-border flex items-center justify-between">
              <span className="text-muted">Screen Region Capture:</span>
              <kbd className="px-2 py-1 rounded bg-surface border border-surface-border font-mono text-[11px] text-accent-light">
                Ctrl + Shift + S
              </kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Authentication & App Lock */}
      <div className="bg-surface/60 border border-surface-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-text uppercase tracking-wider border-b border-surface-border pb-3">
          <Lock className="w-4 h-4 text-accent-light" />
          <span>App Lock & Passcode Authentication</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-secondary/50 border border-surface-border">
            <div>
              <div className="font-semibold text-text flex items-center gap-2">
                <span>Passcode Protection</span>
                {pinEnabled ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-success/20 text-success border border-success/30 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Protected</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-muted/20 text-muted border border-surface-border font-normal">
                    Disabled
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                Protects local notes, chat transcripts, and API credentials with PBKDF2 (100,000 rounds) salt hashing and brute-force lockout.
              </div>
            </div>

            {pinEnabled ? (
              <button
                type="button"
                onClick={handleDisablePasscode}
                className="px-3 py-1.5 rounded-xl bg-danger/20 hover:bg-danger/30 border border-danger/40 text-danger text-xs font-semibold whitespace-nowrap transition-colors"
              >
                Disable PIN Lock
              </button>
            ) : (
              <form onSubmit={handleSetPasscode} className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="New PIN (min 4 chars)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  maxLength={16}
                  className="w-36 px-3 py-1.5 bg-black/40 border border-surface-border rounded-xl text-xs text-text focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={pinInput.length < 4}
                  className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white disabled:opacity-40 text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  Enable Lock
                </button>
              </form>
            )}
          </div>

          {pinMsg && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                pinMsg.isError ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-success/10 text-success border border-success/20'
              }`}
            >
              <span>{pinMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 5: Privacy & Data Retention (Requirement 11 & 22) */}
      <div className="bg-surface/60 border border-surface-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-text uppercase tracking-wider border-b border-surface-border pb-3">
          <Shield className="w-4 h-4 text-accent-light" />
          <span>Privacy & Data Management</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-surface-border">
            <div>
              <div className="font-semibold text-text">Store Lecture Transcripts Locally</div>
              <div className="text-[11px] text-muted">Preserves live lecture transcription in local session history</div>
            </div>
            <input
              type="checkbox"
              checked={settings.privacyStoreTranscripts}
              onChange={(e) => updateSettings({ privacyStoreTranscripts: e.target.checked })}
              className="w-4 h-4 rounded text-accent focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-surface-border">
            <div>
              <div className="font-semibold text-text">Save Permanent Raw Audio Files</div>
              <div className="text-[11px] text-muted">StudyLens processes audio in real time and discards raw wav by default</div>
            </div>
            <input
              type="checkbox"
              checked={settings.privacyStoreAudio}
              onChange={(e) => updateSettings({ privacyStoreAudio: e.target.checked })}
              className="w-4 h-4 rounded text-accent focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-surface-border">
            <div>
              <div className="font-semibold text-text">Auto-Delete Session History On App Exit</div>
              <div className="text-[11px] text-muted">Wipes active conversation memory when closing the application</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoDeleteOnExit}
              onChange={(e) => updateSettings({ autoDeleteOnExit: e.target.checked })}
              className="w-4 h-4 rounded text-accent focus:ring-0"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-surface-border flex justify-between items-center">
          <span className="text-[11px] text-muted">Permanent local reset:</span>
          <button
            onClick={handleClearAllData}
            className="px-4 py-2 rounded-xl bg-danger/20 hover:bg-danger/30 border border-danger/40 text-danger text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Local Study Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
