import React from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageSquare,
  Mic,
  FolderArchive,
  Scan,
  GraduationCap,
  HelpCircle,
  CreditCard,
  FileText,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, documents, isRecording } = useApp();

  const navItems = [
    {
      id: 'chat',
      label: 'AI Study Chat',
      icon: MessageSquare,
      badge: null,
    },
    {
      id: 'live',
      label: 'Live Lecture Mode',
      icon: Mic,
      badge: isRecording ? 'LIVE' : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    },
    {
      id: 'knowledge',
      label: 'Knowledge Base',
      icon: FolderArchive,
      badge: documents.length > 0 ? `${documents.length}` : null,
    },
    {
      id: 'screen',
      label: 'Screen Context',
      icon: Scan,
      badge: 'Vision',
    },
    {
      id: 'teach',
      label: 'Teach Me Mode',
      icon: GraduationCap,
      badge: null,
    },
    {
      id: 'quiz',
      label: 'Quiz Generator',
      icon: HelpCircle,
      badge: null,
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: CreditCard,
      badge: null,
    },
    {
      id: 'notes',
      label: 'Study Notes',
      icon: FileText,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-60 bg-surface/70 border-r border-surface-border flex flex-col justify-between p-3 select-none">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-muted/70 uppercase tracking-wider px-3 py-1 mb-1">
          Study Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent text-white shadow-glow'
                  : 'text-muted hover:text-text hover:bg-secondary/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-muted'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                    item.badgeColor ||
                    (isActive
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-secondary text-muted border-surface-border')
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Academic Integrity Notice */}
      <div className="p-3 rounded-xl bg-secondary/40 border border-surface-border text-[11px] text-muted space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-text text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-light" />
          <span>Academic Companion</span>
        </div>
        <p className="leading-relaxed text-[10px] text-muted/80">
          Prioritizes your uploaded syllabus and course notes with strict citations.
        </p>
      </div>
    </aside>
  );
};
