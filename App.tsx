import React, { useState } from 'react';
import MainMenu from './components/MainMenu';
import BattleMode from './components/BattleMode';
import PracticeMode from './components/PracticeMode';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.MENU);

  const renderContent = () => {
    switch (mode) {
      case AppMode.MENU:
        return <MainMenu onModeSelect={setMode} />;
      
      case AppMode.BATTLE_SETUP:
      case AppMode.BATTLE_GAME:
        return <BattleMode onBack={() => setMode(AppMode.MENU)} />;
      
      case AppMode.PRACTICE_SETUP:
      case AppMode.PRACTICE_GAME:
        return <PracticeMode onBack={() => setMode(AppMode.MENU)} />;
      
      default:
        return <MainMenu onModeSelect={setMode} />;
    }
  };

  return (
    <div className="antialiased w-full h-screen overflow-hidden bg-slate-900">
      {renderContent()}
    </div>
  );
};

export default App;