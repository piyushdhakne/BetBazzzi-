/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Trophy, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, handleFirestoreError, OperationType } from '../AuthContext';

const SEGMENTS = [
  { label: '0x', color: '#1a1a1a', mult: 0, weight: 5 },
  { label: '0.5x', color: '#2a2a2a', mult: 0.5, weight: 10 },
  { label: '1x', color: '#3a3a3a', mult: 1, weight: 40 },
  { label: '2x', color: '#10b981', mult: 2, weight: 25 },
  { label: '3x', color: '#3b82f6', mult: 3, weight: 15 },
  { label: '5x', color: '#f59e0b', mult: 5, weight: 8 },
  { label: 'MAX', color: '#ec4899', mult: 10, weight: 4 },
];

export default function SuperSpin({ onClose }: { onClose: () => void }) {
  const { user, updateBalanceLocally, setMustLose } = useAuth();
  const [bet, setBet] = useState(20);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [globalRigging, setGlobalRigging] = useState(5);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setGlobalRigging(doc.data().riggingLevel ?? 5);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
    return () => unsub();
  }, []);

  const spin = async () => {
    if (spinning || !user || user.balance < bet) {
      if (user && user.balance < bet) setError('Insufficient balance');
      return;
    }

    setSpinning(true);
    setResult(null);
    setError('');

    try {
      await updateBalanceLocally(-bet);

      // Super Spin Logic: 
      // 1. Strict Flagging: 0% win.
      // 2. Bet <= 20: 75% win.
      // 3. Bet > 50: 1/10 (10%) win.
      let winProbability = 0.25;
      if (user?.mustLose) {
        winProbability = 0;
      } else if (bet <= 20) {
        winProbability = 0.75;
      } else if (bet > 50) {
        winProbability = 0.10;
      }

      const shouldWin = Math.random() < winProbability;
      
      let selectedIndex = 0;
      if (user?.mustLose) {
        selectedIndex = 0; // Force total loss
      } else if (shouldWin) {
        // Filter segments with mult >= 1x
        let winIndices = SEGMENTS.map((s, i) => s.mult >= 1 ? i : -1).filter(i => i !== -1);
        
        // Strict block for 100/200 bets: filter out mult >= 3
        if (bet === 100 || bet === 200) {
          winIndices = winIndices.filter(i => SEGMENTS[i].mult < 3);
        }
        
        if (winIndices.length > 0) {
          selectedIndex = winIndices[Math.floor(Math.random() * winIndices.length)];
        } else {
          // If no win indices left (e.g. all available were >= 3), pick a loss
          const lossIndices = SEGMENTS.map((s, i) => s.mult < 1 ? i : -1).filter(i => i !== -1);
          selectedIndex = lossIndices[Math.floor(Math.random() * lossIndices.length)];
        }
      } else {
        // Filter segments with mult < 1x
        const lossIndices = SEGMENTS.map((s, i) => s.mult < 1 ? i : -1).filter(i => i !== -1);
        selectedIndex = lossIndices[Math.floor(Math.random() * lossIndices.length)];
      }

      const segmentWidth = 360 / SEGMENTS.length;
      const targetRotation = rotation + (360 * 8) + (360 - (selectedIndex * segmentWidth)) - (segmentWidth/2);
      setRotation(targetRotation);

      setTimeout(async () => {
        const winAmount = Math.floor(bet * SEGMENTS[selectedIndex].mult);
        if (winAmount > 0) {
          await updateBalanceLocally(winAmount);
          
          // Trigger must-lose if win > 1.7x bet
          if (winAmount > bet * 1.7) {
            await setMustLose();
          }
        }
        
        const res = { ...SEGMENTS[selectedIndex], winAmount };
        setResult(res);
        setHistory(prev => [{ color: SEGMENTS[selectedIndex].color, mult: SEGMENTS[selectedIndex].mult }, ...prev].slice(0, 10));
        
        // Log to Global History
        await addDoc(collection(db, 'history'), {
          userId: user.id,
          username: user.username,
          game: 'SuperSpin',
          amount: bet,
          wonAmount: winAmount,
          result: SEGMENTS[selectedIndex].mult,
          win: winAmount >= bet,
          timestamp: serverTimestamp()
        });

        setSpinning(false);
      }, 5000);

    } catch (err) {
      console.error(err);
      setSpinning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-hidden">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-lg md:max-w-4xl max-h-screen md:max-h-[90vh] bg-[#0a0a0a] md:rounded-[2.5rem] border-white/5 md:border flex flex-col md:flex-row overflow-hidden shadow-2xl relative"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-50 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6 text-gray-500" />
        </button>

        {/* Wheel Side */}
        <div className="flex-1 p-6 md:p-12 flex flex-col items-center justify-center bg-gradient-to-br from-[#111] to-black relative overflow-hidden min-h-[300px] md:min-h-[500px]">
          {/* Wheel Frame */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] md:w-[420px] md:h-[420px] rounded-full border-[8px] md:border-[16px] border-[#151515] ring-1 ring-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"></div>
          
          {/* Top Indicator */}
          <div className="absolute top-[calc(50%-150px)] md:top-[calc(50%-225px)] left-1/2 -translate-x-1/2 z-30 filter drop-shadow-[0_0_10px_#ec4899]">
            <div className="w-8 h-10 bg-[#ec4899] clip-path-poly"></div>
          </div>

          {/* Spin Wheel */}
          <motion.div 
            animate={{ rotate: rotation }}
            transition={{ duration: 5, ease: [0.15, 0, 0.1, 1] }}
            className="w-[240px] h-[240px] md:w-[380px] md:h-[380px] rounded-full relative overflow-hidden shadow-2xl border-4 border-white/10"
            style={{ 
              background: `conic-gradient(${SEGMENTS.map((s, i) => `${s.color} ${(i * (360 / SEGMENTS.length))}deg ${((i + 1) * (360 / SEGMENTS.length))}deg`).join(', ')})`
            }}
          >
            {SEGMENTS.map((s, i) => (
              <div 
                key={i}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 w-full text-center"
                style={{ transform: `translate(-50%, -50%) rotate(${(i * (360 / SEGMENTS.length)) + (180 / SEGMENTS.length)}deg) translateY(-85px) md:translateY(-130px)` }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-[14px] md:text-2xl font-black text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] italic">{s.label}</span>
                </div>
              </div>
            ))}
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-24 md:h-24 bg-[#0a0a0a] rounded-full border-4 border-white/5 flex items-center justify-center shadow-inner z-20 overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-t from-[#ec4899]/20 to-transparent"></div>
               <div className="text-[8px] md:text-[10px] font-black text-[#ec4899] uppercase tracking-tighter relative z-10 italic">CASINO</div>
            </div>
          </motion.div>

          {/* Win Legend */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-1 md:gap-2">
             {SEGMENTS.map((s, i) => (
               <div key={i} className="flex flex-col items-center bg-black/40 backdrop-blur-md px-2 py-1 rounded border border-white/5">
                  <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: s.color }}></div>
                  <span className="text-[8px] font-black text-white">{s.mult}x</span>
               </div>
             ))}
          </div>
        </div>

        {/* Dashboard Side */}
        <div className="w-full md:w-[360px] p-6 md:p-10 bg-[#0a0a0a] flex flex-col border-t md:border-t-0 md:border-l border-white/5 pb-10 md:pb-10">
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-3xl md:text-4xl font-black text-white italic leading-none mb-2 uppercase">SUPER<br/><span className="text-[#ec4899]">SPIN</span></h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mb-10 italic">Luck is for losers</p>

            <div className="space-y-6">
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Wager Amount</label>
                 <div className="grid grid-cols-4 gap-2">
                    {[20, 50, 100, 200].map(val => (
                      <button 
                        key={val}
                        onClick={() => !spinning && setBet(val)}
                        className={`py-3 rounded-xl border text-xs font-black transition-all ${bet === val ? 'bg-[#ec4899] border-[#ec4899] text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                      >
                        ${val}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="bg-black/50 p-6 rounded-2xl border border-white/5 min-h-[120px] flex flex-col items-center justify-center text-center">
                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-1"
                    >
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{result.mult > 0.5 ? 'NOT BAD' : 'HOUSE WINS'}</p>
                      <h4 className={`text-5xl font-black italic ${result.winAmount >= bet ? 'text-green-500' : 'text-red-500'}`}>
                         {result.winAmount > 0 ? `+${result.winAmount}` : 'BUST'}
                      </h4>
                    </motion.div>
                  ) : spinning ? (
                    <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1 }}>
                       <Play className="w-8 h-8 text-white/10 animate-spin" />
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-700">
                       <Trophy className="w-10 h-10 mb-2 opacity-20" />
                       <p className="text-[10px] font-black uppercase tracking-[0.2em]">Ready to Spin</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {/* History Ticker */}
            <div className="flex gap-2 overflow-hidden py-2 border-y border-white/5">
              {history.length > 0 ? history.map((h, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className="px-3 py-1 rounded flex-shrink-0 text-[10px] font-black border"
                  style={{ backgroundColor: `${h.color}20`, borderColor: h.color, color: h.color }}
                >
                  {h.mult}x
                </motion.div>
              )) : (
                <div className="text-[10px] text-gray-700 font-bold uppercase tracking-widest py-1">Recent Results will appear here</div>
              )}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 text-red-500 bg-red-500/10 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
              </div>
            )}
            <button 
              onClick={spin}
              disabled={spinning}
              className={`w-full py-5 rounded-[1.5rem] font-black text-lg tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${spinning ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-[#ec4899] text-white hover:bg-[#ff007b]'}`}
            >
              {spinning ? 'SPINNING...' : 'S P I N'}
            </button>
          </div>
        </div>
      </motion.div>
      <style>{`
        .clip-path-poly { clip-path: polygon(50% 100%, 0 0, 100% 0); }
      `}</style>
    </div>
  );
}
