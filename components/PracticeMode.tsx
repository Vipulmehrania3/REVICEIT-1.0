import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Subject, PracticeConfig, Question } from '../types';
import { NEET_SYLLABUS } from '../constants';
import { generatePracticeQuestions } from '../services/geminiService';
import MathRenderer from './MathRenderer';

interface PracticeModeProps {
  onBack: () => void;
}

const PracticeMode: React.FC<PracticeModeProps> = ({ onBack }) => {
  const [step, setStep] = useState(1); // 1: Subject, 2: Chapter, 3: Config, 4: Quiz, 5: Result
  const [config, setConfig] = useState<PracticeConfig>({
    subject: Subject.BOTANY,
    chapters: [],
    questionCount: 10,
    customPrompt: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]); // User selected indices
  const [timeTaken, setTimeTaken] = useState<number[]>([]); // Seconds per question
  
  // Quiz State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
  
  // Timer Refs
  const questionStartTimeRef = useRef<number>(Date.now());
  const autoAdvanceTimerRef = useRef<any>(null);
  const [currentTimerDisplay, setCurrentTimerDisplay] = useState(0); // Just for UI display

  // Touch/Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Derived state for chapters based on subject
  const availableChapters = useMemo(() => 
    NEET_SYLLABUS.filter(c => c.subject === config.subject),
  [config.subject]);

  // Live timer update
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === 4) {
      interval = setInterval(() => {
        const now = Date.now();
        setCurrentTimerDisplay(Math.floor((now - questionStartTimeRef.current) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, currentQIndex]);

  // Cleanup auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  const toggleChapter = (chapName: string) => {
    setConfig(prev => {
      const exists = prev.chapters.includes(chapName);
      if (exists) return { ...prev, chapters: prev.chapters.filter(c => c !== chapName) };
      return { ...prev, chapters: [...prev.chapters, chapName] };
    });
  };

  const startPractice = async () => {
    setLoading(true);
    setQuestions([]);
    const qs = await generatePracticeQuestions(
      config.subject,
      config.chapters,
      config.questionCount,
      config.customPrompt
    );
    setLoading(false);
    
    if (qs && qs.length > 0) {
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(-1));
      setTimeTaken(new Array(qs.length).fill(0));
      setCurrentQIndex(0);
      questionStartTimeRef.current = Date.now();
      setStep(4);
    } else {
      setStep(4); // Will trigger error view
    }
  };

  const recordTime = () => {
    const now = Date.now();
    const duration = Math.floor((now - questionStartTimeRef.current) / 1000);
    
    setTimeTaken(prev => {
      const newTimes = [...prev];
      newTimes[currentQIndex] = (newTimes[currentQIndex] || 0) + duration;
      return newTimes;
    });
  };

  const clearAutoAdvance = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  const goToNext = () => {
    clearAutoAdvance(); // Stop any pending auto-advance
    recordTime();
    if (currentQIndex < questions.length - 1) {
      setSlideDir('right');
      setCurrentQIndex(prev => prev + 1);
      questionStartTimeRef.current = Date.now();
    } else {
      setStep(5);
    }
  };

  const goToPrev = () => {
    clearAutoAdvance(); // Stop any pending auto-advance
    recordTime(); // Still record time spent even if going back
    if (currentQIndex > 0) {
      setSlideDir('left');
      setCurrentQIndex(prev => prev - 1);
      questionStartTimeRef.current = Date.now();
    }
  };

  const handleSelectAnswer = (optIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQIndex] = optIdx;
    setAnswers(newAnswers);

    // Auto-advance logic
    if (currentQIndex < questions.length - 1) {
      clearAutoAdvance();
      // Delay to show selection state briefly
      autoAdvanceTimerRef.current = setTimeout(() => {
        goToNext();
      }, 600);
    }
  };

  // Swipe Handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrev();
    }
  };

  const calculateScore = () => {
    return questions.reduce((acc, q, idx) => acc + (q.correctIndex === answers[idx] ? 1 : 0), 0);
  };

  // --- RENDER STEPS ---

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center text-white overflow-hidden">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg animate-pulse">Generating {config.subject} Questions...</p>
      </div>
    );
  }

  // Step 1: Subject Selection
  if (step === 1) {
    return (
      <div className="h-screen w-full bg-slate-900 text-white p-6 flex flex-col items-center overflow-y-auto">
        <h2 className="text-3xl font-bold mb-8 text-indigo-400 mt-10">Select Subject</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-10">
          {Object.values(Subject).map((sub) => (
            <button
              key={sub}
              onClick={() => { setConfig({ ...config, subject: sub, chapters: [] }); setStep(2); }}
              className="glass-panel p-8 rounded-xl text-2xl font-bold hover:bg-white/10 transition-all border-l-4 border-indigo-500 text-left"
            >
              {sub}
            </button>
          ))}
        </div>
        <button onClick={onBack} className="text-slate-400 hover:text-white pb-10">Exit</button>
      </div>
    );
  }

  // Step 2: Chapter Selection
  if (step === 2) {
    return (
      <div className="h-screen w-full bg-slate-900 text-white p-6 flex flex-col overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col pb-10">
          <div className="flex justify-between items-center mb-6 mt-4">
            <h2 className="text-2xl font-bold text-indigo-300">Select Chapters: {config.subject}</h2>
            <button onClick={() => setStep(1)} className="text-sm text-slate-400">Change Subject</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableChapters.map((chap) => (
              <button
                key={chap.id}
                onClick={() => toggleChapter(chap.name)}
                className={`p-4 rounded-lg text-left text-sm transition-colors border ${
                  config.chapters.includes(chap.name)
                    ? 'bg-indigo-600 border-indigo-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {chap.name}
              </button>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-700 pt-6 flex justify-between items-center sticky bottom-0 bg-slate-900/95 p-4 rounded-t-xl backdrop-blur-sm">
            <span className="text-slate-400">{config.chapters.length > 0 ? `${config.chapters.length} selected` : 'All chapters'}</span>
            <button
              onClick={() => setStep(3)}
              className="bg-white text-indigo-900 px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform"
            >
              Next: Configure
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Configuration
  if (step === 3) {
    return (
      <div className="h-screen w-full bg-slate-900 text-white flex items-center justify-center p-6 overflow-y-auto">
        <div className="glass-panel p-8 rounded-2xl w-full max-w-lg space-y-6 my-auto">
          <h2 className="text-2xl font-bold text-indigo-400">Customize Practice</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">Number of Questions</label>
            <input
              type="range" min="5" max="30" step="5"
              value={config.questionCount}
              onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) })}
              className="w-full accent-indigo-500"
            />
            <div className="text-right text-indigo-300 font-mono">{config.questionCount} Questions</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Prompt Modifier (Optional)</label>
            <textarea
              placeholder="e.g., 'Focus on assertion-reason questions', 'Include PYQs from 2020-2023', 'Make it very hard'"
              value={config.customPrompt}
              onChange={(e) => setConfig({ ...config, customPrompt: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 h-24 text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={() => setStep(2)} className="flex-1 py-3 border border-slate-600 rounded-lg hover:bg-slate-800">Back</button>
            <button onClick={startPractice} className="flex-1 py-3 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500">Start Exam</button>
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Results Dashboard
  if (step === 5) {
     const score = calculateScore();
     return (
       <div className="h-screen w-full bg-slate-900 text-white p-4 md:p-8 overflow-y-auto">
         <div className="max-w-4xl mx-auto space-y-8 pb-10">
            {/* Header / Score Card */}
            <div className="glass-panel p-8 rounded-2xl text-center relative overflow-hidden mt-4">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
               <h2 className="text-3xl font-bold text-slate-100 mb-2">Exam Results</h2>
               <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-4">
                 {score} / {questions.length}
               </div>
               <p className="text-slate-400 text-sm">Review your answers and explanations below.</p>
               <div className="flex gap-4 justify-center mt-6">
                 <button onClick={onBack} className="px-6 py-2 border border-slate-600 rounded-full hover:bg-slate-800 text-sm">Return to Menu</button>
                 <button onClick={() => setStep(1)} className="px-6 py-2 bg-indigo-600 rounded-full font-bold hover:bg-indigo-500 text-sm">Practice Again</button>
               </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-6">
              {questions.map((q, idx) => {
                const isCorrect = q.correctIndex === answers[idx];
                const skipped = answers[idx] === -1;
                return (
                  <div key={q.id} className={`glass-panel p-6 rounded-xl border-l-4 ${isCorrect ? 'border-green-500' : skipped ? 'border-yellow-500' : 'border-red-500'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-mono text-slate-500">Q{idx + 1} • {timeTaken[idx]}s</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${isCorrect ? 'bg-green-900 text-green-200' : skipped ? 'bg-yellow-900 text-yellow-200' : 'bg-red-900 text-red-200'}`}>
                        {isCorrect ? 'CORRECT' : skipped ? 'SKIPPED' : 'INCORRECT'}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-4 text-slate-100"><MathRenderer text={q.text} /></h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = answers[idx] === optIdx;
                        const isRightAnswer = q.correctIndex === optIdx;
                        let optionClass = "p-3 rounded-lg text-sm border ";
                        
                        if (isRightAnswer) optionClass += "border-green-500 bg-green-900/20 text-green-100";
                        else if (isSelected) optionClass += "border-red-500 bg-red-900/20 text-red-100";
                        else optionClass += "border-slate-700 bg-slate-800/50 text-slate-400";

                        return (
                          <div key={optIdx} className={optionClass}>
                            <div className="flex gap-2">
                              <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                              <MathRenderer text={opt} />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-lg">
                      <h4 className="text-xs uppercase tracking-wider text-indigo-400 font-bold mb-2">NCERT Explanation</h4>
                      <p className="text-sm text-slate-300 leading-relaxed"><MathRenderer text={q.explanation} /></p>
                    </div>
                  </div>
                );
              })}
            </div>
         </div>
       </div>
     )
  }

  // Step 4: Quiz (Carousel View) with Error Handling
  if (questions.length === 0) {
    return (
      <div className="h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="glass-panel p-8 rounded-xl text-center max-w-md">
          <h3 className="text-xl font-bold mb-2">Oops!</h3>
          <p className="text-slate-400 mb-6">We couldn't generate valid questions. Try adjusting your parameters.</p>
          <button onClick={() => setStep(3)} className="px-6 py-3 bg-indigo-600 rounded-lg font-bold">Try Again</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];
  const currentAns = answers[currentQIndex];

  return (
    <div className="h-screen w-full bg-slate-950 text-white flex flex-col relative overflow-hidden">
      {/* Top Bar */}
      <div className="px-6 py-4 flex justify-between items-center z-10 bg-slate-900/80 backdrop-blur-md sticky top-0">
        <button onClick={() => { if(confirm("Quit exam? Progress will be lost.")) onBack(); }} className="text-slate-400 hover:text-white text-sm">Quit</button>
        <div className="flex flex-col items-center">
           <span className="text-xs text-slate-500 uppercase tracking-widest">Time</span>
           <span className="font-mono text-indigo-300 font-bold">{Math.floor(currentTimerDisplay / 60)}:{(currentTimerDisplay % 60).toString().padStart(2, '0')}</span>
        </div>
        <div className="font-mono font-bold text-slate-300">
          {currentQIndex + 1} <span className="text-slate-600">/</span> {questions.length}
        </div>
      </div>

      {/* Main Content / Carousel Area */}
      <div 
        className="flex-1 flex flex-col items-center justify-start pt-8 p-6 w-full max-w-2xl mx-auto touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div 
          key={currentQIndex} 
          className={`w-full glass-panel p-6 md:p-8 rounded-2xl shadow-2xl ${slideDir === 'right' ? 'slide-in-right' : 'slide-in-left'}`}
        >
          {/* Question Text */}
          <div className="mb-8 min-h-[60px]">
            <h2 className="text-xl md:text-2xl font-bold leading-relaxed text-slate-100">
              <MathRenderer text={currentQ.text} />
            </h2>
          </div>

          {/* Options */}
          <div className="grid gap-4">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = currentAns === optIdx;
              
              let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 group ";
              
              if (isSelected) {
                btnClass += "bg-indigo-600/20 border-indigo-500 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.3)]";
              } else {
                btnClass += "bg-slate-800/40 border-slate-700 hover:bg-slate-700 hover:border-slate-500 text-slate-300";
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectAnswer(optIdx)}
                  className={btnClass}
                >
                  <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border ${
                    isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600 text-slate-500 group-hover:border-slate-400'
                  }`}>
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="text-base font-medium">
                    <MathRenderer text={opt} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Navigation Controls */}
        <div className="mt-8 flex items-center justify-between w-full max-w-2xl px-4">
           <button 
             onClick={goToPrev} 
             disabled={currentQIndex === 0} 
             className="px-6 py-3 rounded-lg border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors flex items-center gap-2"
           >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
             Previous
           </button>

           {currentQIndex === questions.length - 1 ? (
              <button 
                onClick={() => { recordTime(); setStep(5); }} 
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg hover:shadow-green-500/20 transition-all flex items-center gap-2"
              >
                Submit Exam
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </button>
           ) : (
             <button 
               onClick={goToNext} 
               className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-2"
             >
               {currentAns !== -1 ? 'Next Question' : 'Skip'}
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
             </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default PracticeMode;