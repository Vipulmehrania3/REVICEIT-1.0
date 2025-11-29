import React from 'react';
import { AppMode } from '../types';

interface MainMenuProps {
  onModeSelect: (mode: AppMode) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onModeSelect }) => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 relative overflow-y-auto">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

      <div className="z-10 text-center space-y-12 max-w-lg w-full py-10">
        <div className="space-y-4">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white tracking-tight drop-shadow-lg">
            REVISE IT
          </h1>
          <p className="text-blue-200 text-lg font-light tracking-wide">
            The Ultimate AI Battle Arena for NEET Aspirants
          </p>
        </div>

        <div className="grid gap-6">
          <button
            onClick={() => onModeSelect(AppMode.BATTLE_SETUP)}
            className="group relative px-8 py-6 glass-panel rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 border-l-4 border-blue-400"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">
                  Battle Arena
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  1v1 Split Screen • Biology NCERT
                </p>
              </div>
              <svg className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => onModeSelect(AppMode.PRACTICE_SETUP)}
            className="group relative px-8 py-6 glass-panel rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 border-l-4 border-indigo-400"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h3 className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                  Practice Lab
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  Subject-wise • Custom Parameters • LaTeX
                </p>
              </div>
              <svg className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      <div className="relative z-10 text-xs text-slate-500 mt-auto pb-4">
        Powered by Gemini 2.5 Flash
      </div>
    </div>
  );
};

export default MainMenu;