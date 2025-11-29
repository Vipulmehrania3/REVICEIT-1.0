import React, { useState, useEffect } from 'react';
import { AppMode, Question, BattleConfig, Player } from '../types';
import { generateBattleQuestions } from '../services/geminiService';
import MathRenderer from './MathRenderer';

interface BattleModeProps {
  onBack: () => void;
}

const BattleMode: React.FC<BattleModeProps> = ({ onBack }) => {
  const [config, setConfig] = useState<BattleConfig>({ questionCount: 5 });
  const [gameState, setGameState] = useState<'SETUP' | 'LOADING' | 'PLAYING' | 'FINISHED'>('SETUP');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [scores, setScores] = useState({ P1: 0, P2: 0 });
  const [winner, setWinner] = useState<Player | 'DRAW' | null>(null);
  
  // Controls round state
  const [locked, setLocked] = useState(false);
  const [lastRoundWinner, setLastRoundWinner] = useState<Player | null>(null);

  const startBattle = async () => {
    setGameState('LOADING');
    const qs = await generateBattleQuestions(config.questionCount);
    if (qs.length > 0) {
      setQuestions(qs);
      setGameState('PLAYING');
    } else {
      setGameState('SETUP');
      alert('Failed to generate questions. Try again.');
    }
  };

  const handleAnswer = (player: Player, selectedIndex: number) => {
    if (locked) return;

    const currentQ = questions[currentQIndex];
    const isCorrect = selectedIndex === currentQ.correctIndex;

    setLocked(true);

    if (isCorrect) {
      setScores(prev => ({ ...prev, [player]: prev[player] + 1 }));
      setLastRoundWinner(player);
      
      // Flash effect handled by UI
      setTimeout(() => nextQuestion(), 2000);
    } else {
      // If wrong, other player gets point or no one? Let's say other player wins round by default for speed
      const otherPlayer = player === 'P1' ? 'P2' : 'P1';
      setScores(prev => ({ ...prev, [otherPlayer]: prev[otherPlayer] + 1 }));
      setLastRoundWinner(otherPlayer);
      setTimeout(() => nextQuestion(), 2000);
    }
  };

  const nextQuestion = () => {
    setLocked(false);
    setLastRoundWinner(null);
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
    if (scores.P1 > scores.P2) setWinner('P1');
    else if (scores.P2 > scores.P1) setWinner('P2');
    else setWinner('DRAW');
    setGameState('FINISHED');
  };

  if (gameState === 'SETUP') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 overflow-y-auto">
        <div className="glass-panel p-8 rounded-2xl w-full max-w-md my-auto">
          <h2 className="text-3xl font-bold mb-6 text-blue-400">Battle Setup</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Number of Questions</label>
            <input
              type="number"
              min="3"
              max="20"
              value={config.questionCount}
              onChange={(e) => setConfig({ questionCount: parseInt(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={startBattle}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Start Duel
          </button>
          <button onClick={onBack} className="w-full mt-4 text-slate-400 hover:text-white">Back</button>
        </div>
      </div>
    );
  }

  if (gameState === 'LOADING') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white overflow-hidden">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl animate-pulse">Summoning Questions...</p>
        </div>
      </div>
    );
  }

  if (gameState === 'FINISHED') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white overflow-y-auto p-6">
        <div className="glass-panel p-10 rounded-3xl text-center my-auto">
          <h1 className="text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            {winner === 'DRAW' ? 'DRAW!' : `${winner === 'P1' ? 'Player 1' : 'Player 2'} WINS!`}
          </h1>
          <div className="flex justify-center gap-12 text-3xl font-bold mb-8">
             <div className="text-blue-400">P1: {scores.P1}</div>
             <div className="text-red-400">P2: {scores.P2}</div>
          </div>
          <button onClick={onBack} className="bg-white text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-slate-200">
            Return to Menu
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];

  // Colors based on result
  const getBgColor = (player: Player) => {
    if (!locked) return 'bg-slate-800';
    if (lastRoundWinner === player) return 'bg-green-600';
    return 'bg-red-900/50';
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 flex flex-col">
      
      {/* PLAYER 2 ZONE (ROTATED 180) */}
      <div className={`flex-1 relative flex flex-col p-4 transform rotate-180 border-b-2 border-slate-700 transition-colors duration-500 ${getBgColor('P2')}`}>
        
        {/* P2 Options (At 'Top' visually for them, so bottom of this container) */}
        <div className="mt-auto grid grid-cols-2 gap-4 mb-4">
           {currentQ.options.map((opt, idx) => (
             <button
               key={idx}
               disabled={locked}
               onClick={() => handleAnswer('P2', idx)}
               className="p-4 bg-slate-700 rounded-xl text-lg font-semibold active:scale-95 transition-transform hover:bg-slate-600 disabled:opacity-50 text-white"
             >
               <MathRenderer text={opt} />
             </button>
           ))}
        </div>

        {/* P2 Question (Centered) */}
        <div className="flex-1 flex flex-col justify-center items-center text-center">
           <span className="text-slate-400 text-sm mb-2 font-mono">QUESTION {currentQIndex + 1}/{questions.length}</span>
           <h2 className="text-2xl font-bold text-white max-w-xl leading-relaxed">
             <MathRenderer text={currentQ.text} />
           </h2>
        </div>

        {/* P2 Score (Sticky corner) */}
        <div className="absolute bottom-4 left-4 bg-red-500 px-4 py-2 rounded-full font-bold shadow-lg">
          P2: {scores.P2}
        </div>
      </div>

      {/* PLAYER 1 ZONE (NORMAL) */}
      <div className={`flex-1 relative flex flex-col p-4 transition-colors duration-500 ${getBgColor('P1')}`}>
        
        {/* P1 Score */}
        <div className="absolute top-4 right-4 bg-blue-500 px-4 py-2 rounded-full font-bold shadow-lg z-10">
          P1: {scores.P1}
        </div>

        {/* P1 Question */}
        <div className="flex-1 flex flex-col justify-center items-center text-center">
           <span className="text-slate-400 text-sm mb-2 font-mono">QUESTION {currentQIndex + 1}/{questions.length}</span>
           <h2 className="text-2xl font-bold text-white max-w-xl leading-relaxed">
              <MathRenderer text={currentQ.text} />
           </h2>
        </div>

        {/* P1 Options */}
        <div className="mt-auto grid grid-cols-2 gap-4">
           {currentQ.options.map((opt, idx) => (
             <button
               key={idx}
               disabled={locked}
               onClick={() => handleAnswer('P1', idx)}
               className="p-4 bg-slate-700 rounded-xl text-lg font-semibold active:scale-95 transition-transform hover:bg-slate-600 disabled:opacity-50 text-white"
             >
                <MathRenderer text={opt} />
             </button>
           ))}
        </div>
      </div>

      {/* Central Axis / Divider */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 pointer-events-none transform -translate-y-1/2 z-20"></div>
    </div>
  );
};

export default BattleMode;