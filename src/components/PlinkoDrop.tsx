/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Sparkles, AlertCircle, Target } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, handleFirestoreError, OperationType } from '../AuthContext';

const ROWS = 9;
// Requested multipliers: 0.2x center.
const MULTIPLIERS = [8, 5, 3, 0.8, 0.6, 0.2, 0.6, 0.8, 3, 5, 8];

export default function PlinkoDrop({ onClose }: { onClose: () => void }) {
  const { user, updateBalanceLocally, setMustLose } = useAuth();
  const [bet, setBet] = useState(20);
  const [dropping, setDropping] = useState(false);
  const [ballPath, setBallPath] = useState<number[]>([]);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [globalRigging, setGlobalRigging] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setGlobalRigging(doc.data().riggingLevel ?? 0);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
    return () => unsub();
  }, []);

  const drop = async () => {
    if (dropping || !user || user.balance < bet) {
      if (user && user.balance < bet) setError('Need more funds');
      return;
    }

    setDropping(true);
    setResult(null);
    setError('');

    try {
      await updateBalanceLocally(-bet);

      // Logic:
      // 1. Strict Flagging: 0% win probability.
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
      const isWin = Math.random() < winProbability;
      
      // Select a target index based on win state
      let targetIndex;
      if (user?.mustLose) {
        targetIndex = 4; // Center 0.6x
      } else if (isWin) {
        // High multipliers: 8x, 5x, 3x
        let winIndices = [0, 1, 2, 8, 9, 10];
        
        // Strict block for 100/200 bets: avoid mult >= 3
        if (bet === 100 || bet === 200) {
          winIndices = winIndices.filter(idx => MULTIPLIERS[idx] < 3);
        }
        
        if (winIndices.length > 0) {
          targetIndex = winIndices[Math.floor(Math.random() * winIndices.length)];
        } else {
          targetIndex = 4; // Fallback to 0.6x
        }
      } else {
        // Low multipliers: 0.8x, 0.6x, 0.2x
        const lossIndices = [3, 4, 5, 6, 7];
        targetIndex = lossIndices[Math.floor(Math.random() * lossIndices.length)];
      }

      // Convert targetIndex to horizontal position (-5 to 5)
      const finalPos = targetIndex - 5;
      
      // Generate a path that ends near the target
      let currentPos = 0;
      const newPath = [0];
      
      for (let i = 0; i < ROWS; i++) {
        const rowsRemaining = ROWS - i;
        const distFromTarget = finalPos - currentPos;
        
        // Probability to move towards target
        // Increase pull as we approach the bottom
        const pushStrength = Math.min(Math.abs(distFromTarget) / rowsRemaining, 1);
        const moveTowards = Math.random() < (0.5 + (pushStrength * 0.45));
        
        let move;
        if (moveTowards && distFromTarget !== 0) {
          move = distFromTarget > 0 ? 1 : -1;
        } else {
          move = Math.random() > 0.5 ? 1 : -1;
        }
        
        currentPos += move;
        newPath.push(currentPos);
      }
      
      // Ensure currentPos is within valid index range [0-10] after mapping
      const exactIndex = Math.min(Math.max(Math.round(currentPos + 5), 0), MULTIPLIERS.length - 1);
      const mult = MULTIPLIERS[exactIndex];

      setBallPath(newPath);

      setTimeout(async () => {
        const winAmount = Math.floor(bet * mult);
        if (winAmount > 0) {
          await updateBalanceLocally(winAmount);
          
          // Trigger must-lose if win > 1.7x bet
          if (winAmount > bet * 1.7) {
            await setMustLose();
          }
        }
        setResult(winAmount);
        
        // Log to Global History
        await addDoc(collection(db, 'history'), {
          userId: user.id,
          username: user.username,
          game: 'MegaDrop',
          amount: bet,
          wonAmount: winAmount,
          result: mult,
          win: winAmount >= bet,
          timestamp: serverTimestamp()
        });

        setDropping(false);
      }, ROWS * 300 + 400);

    } catch (err) {
      console.error(err);
      setDropping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-hidden">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-lg md:max-w-5xl max-h-screen md:max-h-[90vh] bg-[#0a0a0a] md:rounded-[2.5rem] border-white/5 md:border flex flex-col md:flex-row overflow-hidden shadow-2xl relative"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-50 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>

        {/* Board Side */}
        <div className="flex-1 p-4 md:p-12 flex flex-col items-center justify-center bg-[#0d0d0d] relative min-h-[350px] md:min-h-[500px] overflow-hidden border-b md:border-b-0 md:border-r border-white/5">
             <div className="relative w-full max-w-sm mt-4 md:mt-0 scale-[0.75] md:scale-100 origin-top">
                {/* Visual Pegs */}
                {[...Array(ROWS + 1)].map((_, r) => (
                   <div key={r} className="flex justify-center gap-6 md:gap-8 mb-5 md:mb-7">
                      {[...Array(r + 1)].map((_, p) => (
                         <div key={p} className="w-1.5 h-1.5 bg-gray-600 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.1)]"></div>
                      ))}
                   </div>
                ))}

                {/* Pinball */}
                <AnimatePresence>
                  {dropping && (
                    <motion.div 
                      key="pinball"
                      initial={{ top: -10, left: '50%' }}
                      animate={{
                        top: ballPath.map((_, i) => `${(i / ROWS) * 100}%`),
                        left: ballPath.map((pos, i) => `calc(50% + ${pos * 18}px)`),
                      }}
                      transition={{ 
                        duration: ROWS * 0.3,
                        times: ballPath.map((_, i) => i / ROWS),
                        ease: "linear" 
                      }}
                      className="absolute w-4 h-4 bg-[#ec4899] rounded-full shadow-[0_0_20px_#ec4899] z-20 -translate-x-1/2 -mt-2"
                    />
                  )}
                </AnimatePresence>
             </div>

             {/* Buckets */}
             <div className="w-full max-w-md flex gap-0.5 mt-auto pt-6 pb-6 md:pb-0 px-2 scale-[0.85] md:scale-100">
                {MULTIPLIERS.map((m, i) => (
                  <div key={i} className={`flex-1 h-8 md:h-10 rounded-md flex items-center justify-center border transition-all ${m >= 1 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20 shadow-inner'}`}>
                     <span className={`text-[8px] md:text-[10px] font-black ${m >= 1 ? 'text-green-500' : 'text-red-500'}`}>{m}x</span>
                  </div>
                ))}
             </div>
        </div>

        {/* Dash Side */}
        <div className="w-full md:w-[380px] p-6 md:p-10 bg-[#0a0a0a] flex flex-col pb-10 md:pb-10">
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-3xl md:text-4xl font-black text-white italic leading-none mb-2 uppercase">MEGA<br/><span className="text-[#ec4899]">DROP</span></h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mb-10 italic">Gravity doesn't lie</p>

            <div className="space-y-6">
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Wager</label>
                 <div className="flex gap-2">
                    {[20, 50, 100, 200].map(val => (
                      <button 
                        key={val}
                        onClick={() => !dropping && setBet(val)}
                        className={`flex-1 py-4 rounded-xl border text-xs font-black transition-all ${bet === val ? 'bg-[#ec4899] border-[#ec4899] text-white shadow-xl' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                      >
                        ${val}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="bg-black/50 p-6 rounded-2xl border border-white/5 min-h-[120px] flex flex-col items-center justify-center text-center">
                <AnimatePresence mode="wait">
                  {result !== null ? (
                    <motion.div 
                      key="result"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-1"
                    >
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Payout</p>
                      <h4 className={`text-5xl font-black italic ${result >= bet ? 'text-green-500' : 'text-red-500'}`}>
                         {result > 0 ? `+${result}` : '0'}
                      </h4>
                      {result > bet && <Sparkles className="w-5 h-5 text-green-500 mx-auto mt-2" />}
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-800">
                       <Target className="w-10 h-10 mb-2 opacity-30" />
                       <p className="text-[10px] font-black uppercase tracking-[0.2em]">Ready for Drop</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {error && (
              <div className="flex items-center justify-center gap-2 text-red-500 bg-red-500/10 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
              </div>
            )}
            <button 
              onClick={drop}
              disabled={dropping}
              className={`w-full py-5 rounded-[1.5rem] flex items-center justify-center gap-4 font-black text-xl tracking-[0.1em] shadow-2xl transition-all active:scale-95 ${dropping ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-[#ec4899] hover:text-white'}`}
            >
              {dropping ? 'DROPPING...' : <><Play className="w-6 h-6 fill-current" /> DROP</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
