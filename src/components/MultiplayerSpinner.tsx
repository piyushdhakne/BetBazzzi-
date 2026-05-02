import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  addDoc, 
  serverTimestamp,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../firebase';
import { Loader2, Coins, Trophy, X, Users, Timer, Clock, ChevronRight, Wallet } from 'lucide-react';

const WHEEL_COLORS = ['#ff007b', '#1a1a1a'];

export default function MultiplayerSpinner({ onClose }: { onClose: () => void }) {
  const { user, updateBalanceLocally, setMustLose } = useAuth();
  const [gameState, setGameState] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [rotation, setRotation] = useState(0);
  const [isLocalSpinning, setIsLocalSpinning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [winnerMessage, setWinnerMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'game', 'state'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGameState(data);
        
        if (data.status === 'spinning' && !isLocalSpinning) {
          startSpinAnimation(data.result);
        }
        
        if (data.status === 'betting') {
          setSelectedNumber(null);
          setWinnerMessage(null);
          setIsLocalSpinning(false);
        }
      }
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'game/state');
    });

    return unsub;
  }, [isLocalSpinning]);

  useEffect(() => {
    if (!gameState?.roundId) return;
    const unsub = onSnapshot(collection(db, 'rounds', gameState.roundId, 'bets'), (snap) => {
      setBets(snap.docs.map(d => d.data()));
    }, (error) => {
      handleFirestoreError(error, 'list' as any, `rounds/${gameState.roundId}/bets`);
    });
    return () => unsub();
  }, [gameState?.roundId]);

  useEffect(() => {
    if (gameState?.status === 'betting' && gameState?.spinStartTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const start = gameState.spinStartTime.seconds * 1000;
        const diff = Math.max(0, Math.ceil((start - now) / 1000));
        setTimeLeft(diff);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  const startSpinAnimation = (result: number) => {
    setIsLocalSpinning(true);
    const segments = gameState?.wheelSegments || 2;
    const anglePerSegment = 360 / segments;
    const extraSpins = 5;
    const targetAngle = (result * anglePerSegment) + (extraSpins * 360);
    setRotation(prev => prev + targetAngle);

    setTimeout(() => {
      setIsLocalSpinning(false);
      checkWin(result);
    }, 4000);
  };

  const checkWin = async (result: number) => {
    const multiplier = gameState?.payoutMultiplier || 2;
    let isWin = selectedNumber === result && !user?.mustLose;
    
    // Strict block for 100/200 bets: never let them win if multiplier >= 3
    if ((betAmount === 100 || betAmount === 200) && multiplier >= 3) {
      isWin = false;
    }

    const winAmount = isWin ? betAmount * multiplier : 0;

    if (isWin) {
      updateBalanceLocally(winAmount);
      setWinnerMessage(`WINNER! YOU WON $${winAmount}!`);
      
      // Trigger must-lose if win > 1.7x bet
      if (winAmount > betAmount * 1.7) {
        await setMustLose();
      }
    } else if (selectedNumber !== null) {
      setWinnerMessage(`LOST! RESULT WAS ${result}`);
    }

    if (selectedNumber !== null && user) {
      try {
        await addDoc(collection(db, 'history'), {
          userId: user.id,
          username: user.username,
          game: 'Spinner',
          amount: betAmount,
          wonAmount: winAmount,
          result: result,
          win: isWin,
          timestamp: serverTimestamp()
        });
      } catch (e) {
        console.error("History Log Error:", e);
      }
    }
  };

  const placeBet = async () => {
    if (!user || selectedNumber === null || gameState?.status !== 'betting') return;
    if (user.balance < betAmount) return;
    if (user.balance < (gameState?.minPointsToPlay || 0)) return;
    if (betAmount < (gameState?.minBet || 0)) return;

    try {
      await updateBalanceLocally(-betAmount);
      await addDoc(collection(db, 'rounds', gameState.roundId, 'bets'), {
        userId: user.id,
        username: user.username,
        amount: betAmount,
        chosenNumber: selectedNumber,
        roundId: gameState.roundId,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, 'create' as any, `rounds/${gameState.roundId}/bets`);
    }
  };

  const hasPlacedBet = bets.some(b => b.userId === user?.id);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0d0d0d] overflow-y-auto custom-scrollbar flex flex-col">
      {/* Header */}
      <div className="p-6 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="space-y-1">
            <h1 className="text-[#ff007b] text-4xl font-black uppercase tracking-tight leading-none italic">
              SPINNER
            </h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">
              LIVE MULTIPLAYER GAME
            </p>
         </div>

         <div className="flex bg-[#161616] border border-white/5 p-2 rounded-2xl items-center gap-6 pr-6">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-xl bg-[#ff007b]/10 flex items-center justify-center border border-[#ff007b]/20">
                  <span className="text-[#ff007b] font-black text-xl italic">{user?.username?.[0].toUpperCase()}</span>
               </div>
               <div>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest leading-none mb-1">WELCOME BACK,</p>
                  <p className="text-white font-bold tracking-tight">{user?.username}</p>
               </div>
            </div>
            <div className="h-8 w-px bg-white/5"></div>
            <div>
               <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest leading-none mb-1">YOUR BALANCE</p>
               <p className="text-[#ff007b] font-black tracking-tight text-xl">${user?.balance.toLocaleString()}</p>
            </div>
            <button onClick={onClose} className="ml-4 p-2 hover:bg-white/5 rounded-lg transition-colors">
               <X className="w-6 h-6 text-gray-500" />
            </button>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 px-6 md:px-10 pb-10">
         
         <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
            <div className="arcade-card">
               <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Trophy className="w-3 h-3" /> STATISTICS
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                     <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1">Winning Number</p>
                     <p className="text-2xl font-black text-[#ff007b] italic">{gameState?.result ?? '--'}</p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                     <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1">Winning Streak</p>
                     <p className="text-2xl font-black text-white italic">03</p>
                  </div>
               </div>
            </div>
         </div>

         <div className="lg:col-span-9 space-y-8 order-1 lg:order-2">
            <div className="text-center space-y-2">
               <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] italic">Winning Number</p>
               <h2 className="text-8xl font-black text-white italic drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                 {isLocalSpinning ? '?' : (gameState?.result ?? '0')}
               </h2>
            </div>

            <div className="flex justify-center py-6 relative">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-50">
                  <div className="w-10 h-10 bg-white clip-path-pointer shadow-black/50 shadow-2xl"></div>
               </div>
               
               <motion.div 
                 animate={{ rotate: rotation }}
                 transition={{ duration: 4, ease: [0.32, 0, 0.67, 1] }}
                 className="w-72 h-72 md:w-[400px] md:h-[400px] rounded-full relative border-[20px] border-[#161616] p-2 shadow-[0_0_100px_rgba(255,0,123,0.15)] bg-black"
               >
                  <div className="absolute inset-0 rounded-full border border-white/10"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-24 h-24 rounded-full bg-[#ff007b] flex items-center justify-center shadow-[0_0_40px_rgba(255,0,123,0.4)] z-20">
                        <Diamond size={40} className="text-white" />
                     </div>
                  </div>
                  <div 
                    className="w-full h-full rounded-full overflow-hidden"
                    style={{ 
                      background: `conic-gradient(${Array.from({ length: gameState?.wheelSegments || 2 }).map((_, i) => 
                        `${i % 2 === 0 ? '#ff007b' : '#161616'} ${(i * (360 / (gameState?.wheelSegments || 2)))}deg ${((i + 1) * (360 / (gameState?.wheelSegments || 2)))}deg`
                      ).join(', ')})`
                    }}
                  ></div>
                  {Array.from({ length: gameState?.wheelSegments || 2 }).map((_, i) => (
                    <div 
                      key={i}
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-full py-10 flex flex-col justify-between pointer-events-none z-10"
                      style={{ 
                        transform: `translateX(-50%) rotate(${i * (360 / (gameState?.wheelSegments || 2)) + (180 / (gameState?.wheelSegments || 2))}deg)`,
                        paddingTop: (gameState?.wheelSegments || 2) > 10 ? '1rem' : '2.5rem'
                      }}
                    >
                      <span className={`${(gameState?.wheelSegments || 2) > 10 ? 'text-xl' : 'text-5xl'} font-black italic scale-y-125 text-white drop-shadow-lg`}>{i}</span>
                    </div>
                  ))}
               </motion.div>
            </div>

            <div className="arcade-card !rounded-[2.5rem]">
               <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                     <Timer className="w-4 h-4 text-[#ff007b]" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-[#ff007b]">
                        {gameState?.status === 'betting' ? `TIME LEFT: ${timeLeft}s` : gameState?.status?.toUpperCase()}
                     </span>
                  </div>
                  <div className="flex items-center gap-2">
                     <Users className="w-4 h-4 text-gray-500" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        {bets.length} PLAYERS ACTIVE
                     </span>
                  </div>
               </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-8">
                  {Array.from({ length: gameState?.wheelSegments || 2 }).map((_, n) => (
                    <button
                      key={n}
                      onClick={() => !hasPlacedBet && setSelectedNumber(n)}
                      disabled={hasPlacedBet || gameState?.status !== 'betting'}
                      className={`relative h-12 md:h-16 rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden group ${
                        selectedNumber === n
                          ? 'border-[#ff007b] bg-[#ff007b]/10'
                          : 'border-white/5 bg-black/40 hover:border-white/20'
                      } active:scale-95 disabled:opacity-50`}
                    >
                       <span className={`text-sm md:text-xl font-black italic ${selectedNumber === n ? 'text-[#ff007b]' : 'text-gray-700'}`}>
                          {n}
                       </span>
                       {selectedNumber === n && <motion.div layoutId="choice" className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#ff007b] shadow-[0_0_10px_#ff007b]" />}
                    </button>
                  ))}
                </div>

               <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="w-full md:flex-1 relative group">
                     <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#ff007b]" />
                     <input 
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-lg font-black italic outline-none focus:border-[#ff007b]/50 transition-all"
                        placeholder="Bet Amount"
                     />
                  </div>
                  <button 
                    onClick={placeBet}
                    disabled={selectedNumber === null || hasPlacedBet || gameState?.status !== 'betting' || user!.balance < (gameState?.minPointsToPlay || 0)}
                    className="w-full md:flex-[1.5] bg-[#ff007b] text-white font-black py-5 rounded-2xl text-xl uppercase tracking-widest shadow-[0_0_30px_rgba(255,0,123,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {hasPlacedBet ? 'BET CONFIRMED' : 'PLACE BET'}
                  </button>
               </div>

               <AnimatePresence>
                  {winnerMessage && (
                    <motion.div
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className={`mt-4 p-4 rounded-xl text-center font-black italic tracking-widest text-sm ${
                         winnerMessage.includes('WINNER') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                       }`}
                    >
                       {winnerMessage}
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>
         </div>
      </div>
    </div>
  );
}

function Diamond({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M6 3h12l4 6-10 12L2 9z" />
      <path d="M11 3v18" />
      <path d="m5 9 14-1" />
    </svg>
  );
}
