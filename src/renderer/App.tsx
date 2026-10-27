import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './views/ChatView';
import { LiveStudyView } from './views/LiveStudyView';
import { KnowledgeView } from './views/KnowledgeView';
import { ScreenView } from './views/ScreenView';
import { TeachMeView } from './views/TeachMeView';
import { QuizView } from './views/QuizView';
import { FlashcardView } from './views/FlashcardView';
import { NotesView } from './views/NotesView';
import { SettingsView } from './views/SettingsView';
import { FloatingAssistantView } from './views/FloatingAssistantView';
import { OnboardingModal } from './components/OnboardingModal';

const DashboardContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-text">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden bg-background">
          {activeTab === 'chat' && <ChatView />}
          {activeTab === 'live' && <LiveStudyView />}
          {activeTab === 'knowledge' && <KnowledgeView />}
          {activeTab === 'screen' && <ScreenView />}
          {activeTab === 'teach' && <TeachMeView />}
          {activeTab === 'quiz' && <QuizView />}
          {activeTab === 'flashcards' && <FlashcardView />}
          {activeTab === 'notes' && <NotesView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
      <OnboardingModal />
    </div>
  );
};

export const App: React.FC = () => {
  const [isFloating, setIsFloating] = useState(
    window.location.hash.includes('floating')
  );

  useEffect(() => {
    const handleHashChange = () => {
      setIsFloating(window.location.hash.includes('floating'));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (isFloating) {
    return (
      <div className="w-screen h-screen p-2 bg-transparent overflow-hidden">
        <FloatingAssistantView />
      </div>
    );
  }

  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
};
