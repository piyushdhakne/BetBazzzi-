/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Coins, Trophy, X } from 'lucide-react';
import { useAuth, handleFirestoreError, OperationType } from '../AuthContext';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const SYMBOLS = ['💎', '7️⃣', '🍒', '🔔', '🍋', '🍇', '⭐'];
const REEL_COUNT = 3;

interface SlotMachineProps {
  onClose: () => void;
}

export default function SlotMachine({ onClose }: SlotMachineProps) {
  const { user, updateBalanceLocally } = useAuth();
  const [reels, setReels] = useState(Array(REEL_COUNT).fill(SYMBOLS[0]));
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [bet, setBet] = useState(10);
  const [globalRigging, setGlobalRigging] = useState(5);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setGlobalRigging(doc.data().riggingLevel ?? 5);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
    return () => unsub();
  }, []);

  const balance = user?.balance ?? 0;

  const spin = async () => {
    if (balance < bet || isSpinning || !user) return;
    
    setIsSpinning(true);
    setLastWin(null);
    
    await updateBalanceLocally(-bet);

    setTimeout(async () => {
      // Logic: 3/9 win probability for all bets.
      const winProbability = 3 / 9;
      const shouldWin = Math.random() < winProbability;
      
      let newReels;
      if (shouldWin) {
        // Force a win (at least 2 matching)
        const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        if (Math.random() < 0.3) {
          // 3 Matching
          newReels = [symbol, symbol, symbol];
        } else {
          // 2 Matching
          const other = SYMBOLS.find(s => s !== symbol) || SYMBOLS[0];
          newReels = [symbol, symbol, other].sort(() => Math.random() - 0.5);
        }
      } else {
        // Force a total loss
        const indices = Array.from({length: SYMBOLS.length}, (_, i) => i).sort(() => Math.random() - 0.5);
        newReels = [SYMBOLS[indices[0]], SYMBOLS[indices[1]], SYMBOLS[indices[2]]];
      }

      setReels(newReels);
      setIsSpinning(false);
      
      const winAmount = calculateWin(newReels);
      if (winAmount > 0) {
        setLastWin(winAmount);
        await updateBalanceLocally(winAmount);
      }

      // Record bet in History
      try {
        await addDoc(collection(db, 'history'), {
          userId: user.id,
          username: user.username,
          game: 'Slots',
          amount: bet,
          wonAmount: winAmount,
          result: winAmount / (bet || 1),
          win: winAmount >= bet,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, 'create' as any, 'history');
      }
    }, 1500);
  };

  const calculateWin = (results: string[]) => {
    const unique = new Set(results);
    if (unique.size === 1) {
      return bet * 25; // Massive win for 3 matching symbols
    } else if (unique.size === 2) {
      return Math.floor(bet * 3); // Better reward for 2 matching symbols
    }
    // High chance for a pity win even with no matches to keep balance high
    if (Math.random() < 0.25) return bet;
    return 0;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-zinc-950 border border-casino-gold/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.2)]"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-casino-gold/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-casino-gold rounded-lg flex items-center justify-center">
              <Trophy className="text-black w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl tracking-tight">NEON STRIKE SLOTS</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Max Payout: 10x</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-10 flex flex-col items-center">
          <div className="flex gap-4 mb-10">
            {reels.map((symbol, idx) => (
              <motion.div
                key={idx}
                animate={isSpinning ? { 
                  y: [0, -20, 20, 0],
                  transition: { repeat: Infinity, duration: 0.1 }
                } : { y: 0 }}
                className="w-32 h-44 bg-casino-dark border-2 border-zinc-800 rounded-2xl flex items-center justify-center text-6xl shadow-inner relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40 pointer-events-none"></div>
                {symbol}
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {lastWin && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="mb-8 text-center"
              >
                <div className="text-casino-gold font-display font-black text-5xl mb-2 italic">BIG WIN!</div>
                <div className="text-2xl font-bold flex items-center justify-center gap-2">
                  <Coins className="text-casino-gold w-6 h-6" />
                  +${lastWin}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full max-w-sm flex flex-col gap-6">
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <span className="text-sm font-bold text-gray-400">YOUR BET</span>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setBet(Math.max(10, bet - 10))}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-bold"
                >
                  -
                </button>
                <span className="text-xl font-display font-bold text-casino-gold tabular-nums">${bet}</span>
                <button 
                  onClick={() => setBet(bet + 10)}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={spin}
              disabled={isSpinning || balance < bet}
              className={`w-full py-5 rounded-2xl font-display font-black text-2xl tracking-widest flex items-center justify-center gap-3 transition-all ${
                isSpinning ? 'bg-zinc-800 text-gray-600' : 'btn-gold'
              }`}
            >
              {isSpinning ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  SPINNING...
                </>
              ) : (
                'SPIN'
              )}
            </button>
            
            {balance < bet && !isSpinning && (
              <p className="text-red-500 text-center text-sm font-medium">Insufficient balance!</p>
            )}
            {!user && (
              <p className="text-casino-gold text-center text-sm font-medium">Please login to play!</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
