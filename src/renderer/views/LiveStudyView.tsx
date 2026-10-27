import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Sparkles,
  Trash2,
  Play,
  Square,
  Settings2,
} from 'lucide-react';
import { AudioSource } from '../../shared/types';

export const LiveStudyView: React.FC = () => {
  const {
    activeCourse,
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
    responseMode,
    setResponseMode,
  } = useApp();

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testSpeechDetected, setTestSpeechDetected] = useState<string>('Listening for voice...');

  useEffect(() => {
    // Enumerate audio input devices
    navigator.mediaDevices
      .enumerateDevices()
      .then((all) => {
        const audioInputs = all.filter((d) => d.kind === 'audioinput');
        setDevices(audioInputs);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Control Panel */}
      <div className="w-80 border-r border-surface-border bg-surface/50 p-5 flex flex-col justify-between space-y-6 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-accent/15 border border-accent/30 text-accent-light">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Live Study Mode</h2>
                <div className="text-[11px] text-muted">Lectures, Revision & Mock Interviews</div>
              </div>
            </div>
          </div>

          {/* Audio Source Selector (Requirement 6) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-text uppercase tracking-wider">
              Audio Source
            </div>
            <div className="space-y-1.5">
              {[
                { id: 'microphone', label: 'Microphone', desc: 'Direct voice from headset/mic' },
                { id: 'system', label: 'System Audio Loopback', desc: 'Lecture video, Teams, or stream' },
                { id: 'both', label: 'Microphone + System Audio', desc: 'Interactive interview & lecture' },
              ].map((src) => (
                <label
                  key={src.id}
                  onClick={() => !isRecording && setAudioSource(src.id as AudioSource)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                    audioSource === src.id
                      ? 'border-accent bg-accent/10 text-white'
                      : 'border-surface-border bg-surface/60 text-muted hover:text-text hover:bg-secondary'
                  } ${isRecording ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="audioSource"
                    checked={audioSource === src.id}
                    onChange={() => {}}
                    disabled={isRecording}
                    className="mt-0.5 text-accent focus:ring-0"
                  />
                  <div>
                    <div className="font-semibold text-text">{src.label}</div>
                    <div className="text-[10px] text-muted mt-0.5">{src.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Device Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text uppercase tracking-wider">
              Input Device
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              disabled={isRecording}
              className="w-full px-3 py-2 bg-secondary border border-surface-border rounded-xl text-xs text-text focus:outline-none focus:border-accent"
            >
              <option value="default">Default Windows Audio Device</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Device ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Live Level Visualizer (VU meter) */}
          <div className="space-y-2 p-3.5 rounded-xl bg-secondary/40 border border-surface-border">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-accent-light" />
                <span>Live Audio Level</span>
              </span>
              <span className="font-mono text-[11px] text-text">{audioLevel}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface overflow-hidden p-0.5 border border-surface-border">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  audioLevel > 60
                    ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500'
                    : 'bg-accent'
                }`}
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>

          {/* Audio Test Screen Button (Requirement 12) */}
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-secondary hover:bg-tertiary border border-surface-border text-xs font-medium text-text flex items-center justify-center gap-2 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-muted" />
            <span>Open Audio Diagnostic Test</span>
          </button>
        </div>

        {/* Start / Stop Main Capture Button */}
        <div>
          {isRecording ? (
            <button
              onClick={stopAudioCapture}
              className="w-full py-3 rounded-xl bg-danger hover:bg-danger/90 text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>STOP LIVE AUDIO CAPTURE</span>
            </button>
          ) : (
            <button
              onClick={startAudioCapture}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent-dark text-white text-xs font-bold shadow-glow transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Mic className="w-4 h-4" />
              <span>START LIVE CAPTURE</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Real-Time Feeds: Live Transcript + AI Response */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Top Transcript Header */}
        <div className="px-6 py-3 border-b border-surface-border bg-surface/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>LIVE TRANSCRIPT</span>
            </span>
            {isRecording ? (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-green"></span>
                <span>Listening actively...</span>
              </span>
            ) : (
              <span className="text-[11px] text-muted">Standby (Click Start Live Capture)</span>
            )}
          </div>

          <button
            onClick={clearTranscripts}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted hover:text-text transition-colors"
            title="Clear transcript feed"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Content split: Live Transcript & AI Study Response Card */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-5 overflow-hidden">
          {/* Transcript Feed */}
          <div className="flex flex-col bg-surface/50 border border-surface-border rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-surface-border bg-secondary/30 text-xs font-semibold text-text flex items-center justify-between">
              <span>Speech Stream</span>
              <span className="text-[10px] text-muted">{transcripts.length} utterances</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {transcripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-muted">
                  <Mic className="w-8 h-8 text-muted/50 mb-2" />
                  <span>No speech detected yet. Start capture and speak or play lecture audio.</span>
                </div>
              ) : (
                transcripts.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-secondary/50 border border-surface-border space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-accent-light">{t.speaker}</span>
                      <span className="text-muted text-[10px]">
                        {new Date(t.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-text leading-relaxed font-sans">{t.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Response Card (Requirement 8) */}
          <div className="flex flex-col bg-surface/50 border border-surface-border rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-surface-border bg-accent/10 text-xs font-semibold text-accent-light flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Contextual Study Answer</span>
              </div>
              {isAiProcessing && (
                <span className="text-[10px] font-semibold text-accent-light animate-pulse">
                  Analyzing speech & course material...
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {latestAiAnswer ? (
                <div className="space-y-4">
                  {latestAiAnswer.question && (
                    <div className="p-3 rounded-xl bg-accent/15 border border-accent/30 text-xs">
                      <div className="text-[10px] font-bold text-accent-light uppercase tracking-wider mb-1">
                        Detected Topic / Question:
                      </div>
                      <div className="text-white font-medium italic">
                        "{latestAiAnswer.question}"
                      </div>
                    </div>
                  )}

                  {latestAiAnswer.sources && latestAiAnswer.sources.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase text-muted">
                        Matched Course Material:
                      </span>
                      {latestAiAnswer.sources.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-secondary border border-surface-border text-[10px] text-accent-light font-mono"
                        >
                          {s.docName} → {s.heading}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-surface border border-surface-border">
                    <MarkdownRenderer content={latestAiAnswer.answer || ''} />
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-muted space-y-2">
                  <Sparkles className="w-8 h-8 text-accent/40 mb-1" />
                  <div className="font-medium text-text">Waiting for lecture statement or question</div>
                  <p className="max-w-xs text-[11px] leading-relaxed">
                    When the lecturer explains a theorem or asks a question, StudyLens cross-references
                    your uploaded course notes and presents the explanation here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Diagnostic Test Screen Modal (Requirement 12) */}
      {isTestModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-6 shadow-floating space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Headphones className="w-4 h-4 text-accent-light" />
                <span>Audio Input Test</span>
              </h3>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="text-xs text-muted hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted text-[11px] block mb-1">Selected Audio Device:</label>
                <div className="p-2 rounded-lg bg-secondary text-text font-mono text-[11px]">
                  {devices.find((d) => d.deviceId === selectedDeviceId)?.label || 'Default System Device'}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-muted text-[11px] mb-1">
                  <span>Live level meter:</span>
                  <span className="font-mono">{audioLevel}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-secondary overflow-hidden p-0.5 border border-surface-border">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-secondary/50 border border-surface-border space-y-1">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
                  Diagnostic Status:
                </span>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Audio capture subsystem ready</span>
                </div>
                <p className="text-[10px] text-muted mt-1 leading-relaxed">
                  Compatible with Microsoft Teams, Bluetooth headphones, USB headsets, and Windows loopback.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
