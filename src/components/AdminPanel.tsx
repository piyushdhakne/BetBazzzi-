/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  collection, 
  query, 
  getDocs, 
  updateDoc, 
  doc, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp,
  onSnapshot,
  setDoc,
  increment,
  where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { X, Users, Activity, DollarSign, Settings, Play, Target, ShieldCheck, Save, RotateCcw, ChevronLeft, LayoutDashboard, Trophy, Plus, Check } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../AuthContext';

interface UserData {
  id: string;
  username: string;
  balance: number;
  role: string;
  isOnline?: boolean;
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'spinner' | 'ipl' | 'system' | 'history' | 'players'>('history');
  
  // System State
  const [riggingLevel, setRiggingLevel] = useState(0);
  const [houseEdge, setHouseEdge] = useState(1);
  const [betHistory, setBetHistory] = useState<any[]>([]);

  // Spinner State
  const [forcedResult, setForcedResult] = useState<string>('');
  const [minBet, setMinBet] = useState(10);
  const [minPoints, setMinPoints] = useState(10);
  const [wheelSegments, setWheelSegments] = useState(2);
  const [payoutMultiplier, setPayoutMultiplier] = useState(2);
  const [userEdits, setUserEdits] = useState<Record<string, number>>({});

  // IPL State
  const [iplQuestions, setIPLQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState('');
  const [newMultiplier, setNewMultiplier] = useState(2);
  const [isCreatingIPL, setIsCreatingIPL] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);

  useEffect(() => {
    fetchUsers();
    
    // Global Config
    const configUnsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setRiggingLevel(data.riggingLevel ?? 0);
        setHouseEdge(data.houseEdge ?? 1);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    // History
    const historyUnsub = onSnapshot(query(collection(db, 'history'), orderBy('timestamp', 'desc'), limit(50)), (snap) => {
      setBetHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'history');
    });

    const unsub = onSnapshot(doc(db, 'game', 'state'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGameState(data);
        setMinBet(data.minBet || 10);
        setMinPoints(data.minPointsToPlay || 10);
        setWheelSegments(data.wheelSegments || 2);
        setPayoutMultiplier(data.payoutMultiplier || 2);
      }
    }, (error) => {
      handleFirestoreError(error, 'get' as any, 'game/state');
    });

    const iplUnsub = onSnapshot(query(collection(db, 'ipl_questions'), orderBy('createdAt', 'desc')), (snap) => {
      setIPLQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((q: any) => q.status !== 'cancelled'));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ipl_questions');
    });

    return () => { unsub(); iplUnsub(); configUnsub(); historyUnsub(); };
  }, []);

  const updateGlobalConfig = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        riggingLevel,
        houseEdge,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, 'write' as any, 'settings/global');
    }
  };

  const createIPLQuestion = async () => {
    if (!newQuestion || !newOptions) return;
    const options = newOptions.split(',').map(o => o.trim()).filter(o => o !== '');
    if (options.length < 2) {
      alert("At least 2 options required, comma separated.");
      return;
    }

    setIsCreatingIPL(true);
    try {
      await addDoc(collection(db, 'ipl_questions'), {
        question: newQuestion,
        options,
        multiplier: newMultiplier,
        status: 'active',
        createdAt: serverTimestamp()
      });
      setNewQuestion('');
      setNewOptions('');
    } catch (err) {
      handleFirestoreError(err, 'write' as any, 'ipl_questions');
    } finally {
      setIsCreatingIPL(false);
    }
  };

  const handleAiSuggest = async () => {
    setIsAiSuggesting(true);
    try {
      const { suggestIPLQuestion } = await import('../services/geminiService');
      const suggestion = await suggestIPLQuestion();
      if (suggestion) {
        setNewQuestion(suggestion.question);
        setNewOptions(suggestion.options.join(', '));
        setNewMultiplier(suggestion.multiplier);
      } else {
        alert("AI could not scout a market right now. Try again in a few seconds.");
      }
    } catch (err) {
      console.error("AI Suggest Error:", err);
      alert("Failed to connect to AI Scout. Check your connection.");
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const settleIPLQuestion = async (questionId: string, correctAnswer: string) => {
    try {
      const qRef = doc(db, 'ipl_questions', questionId);
      await updateDoc(qRef, {
        status: 'settled',
        correctAnswer
      });

      // Fetch all bets for this question
      const betsSnap = await getDocs(query(collection(db, 'ipl_bets'), where('questionId', '==', questionId), where('status', '==', 'pending')));
      
      const question = iplQuestions.find(q => q.id === questionId);
      const mult = question?.multiplier || 2;

      for (const betDoc of betsSnap.docs) {
        const betData = betDoc.data();
        const betId = betDoc.id;
        const isWin = betData.option === correctAnswer;
        
        const betRef = doc(db, 'ipl_bets', betId);
        const userRef = doc(db, 'users', betData.userId);

        if (isWin) {
          const winAmount = betData.amount * mult;
          await updateDoc(betRef, { status: 'won' });
          await updateDoc(userRef, { balance: increment(winAmount) });
          
          await addDoc(collection(db, 'history'), {
            userId: betData.userId,
            username: betData.username,
            game: 'IPL Betting',
            amount: betData.amount,
            wonAmount: winAmount,
            result: mult,
            win: true,
            timestamp: serverTimestamp()
          });
        } else {
          await updateDoc(betRef, { status: 'lost' });
          
          await addDoc(collection(db, 'history'), {
            userId: betData.userId,
            username: betData.username,
            game: 'IPL Betting',
            amount: betData.amount,
            wonAmount: 0,
            result: 0,
            win: false,
            timestamp: serverTimestamp()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, 'write' as any, 'settle_ipl');
    }
  };

  const deleteIPLQuestion = async (id: string) => {
    try {
      await updateDoc(doc(db, 'ipl_questions', id), { status: 'cancelled' });
      
      // OPTIONAL: Refund pending bets if you want to be extra thorough
      const betsSnap = await getDocs(query(collection(db, 'ipl_bets'), where('questionId', '==', id), where('status', '==', 'pending')));
      for (const betDoc of betsSnap.docs) {
        const betData = betDoc.data();
        await updateDoc(doc(db, 'users', betData.userId), { balance: increment(betData.amount) });
        await updateDoc(doc(db, 'ipl_bets', betDoc.id), { status: 'cancelled' });
      }
    } catch (err) {
      handleFirestoreError(err, 'update' as any, `ipl_questions/${id}`);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(100)));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserData)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateGameState = async (updates: any) => {
    const stateRef = doc(db, 'game', 'state');
    try {
      await updateDoc(stateRef, updates);
    } catch (error) {
       handleFirestoreError(error, 'update' as any, 'game/state');
    }
  };

  const startSpin = async () => {
    if (gameState?.status !== 'idle' && gameState?.status !== 'betting') return;
    
    let result = 0;
    if (forcedResult !== '') {
      result = parseInt(forcedResult);
    } else {
      // Advanced Rigging: Only if riggingLevel is notably high
      const riggingChance = riggingLevel / 100;
      const shouldRig = riggingLevel > 10 && Math.random() < riggingChance;
      const segments = gameState?.wheelSegments || 2;
      const mult = gameState?.payoutMultiplier || 2;

      if (shouldRig) {
        // Calculate liabilities for each segment
        const segments = gameState?.wheelSegments || 2;
        const mult = gameState?.payoutMultiplier || 2;
        const liabilities = new Array(segments).fill(0);
        
        try {
          const betsSnap = await getDocs(collection(db, 'rounds', gameState.roundId, 'bets'));
          
          if (betsSnap.empty) {
            result = Math.floor(Math.random() * segments);
          } else {
            betsSnap.docs.forEach(doc => {
              const bet = doc.data();
              if (bet.chosenNumber < segments) {
                liabilities[bet.chosenNumber] += (bet.amount * mult);
              }
            });

            // Find the segment with the MINIMUM liability
            let minLiability = Infinity;
            let minLiabilitySegments: number[] = [];

            liabilities.forEach((l, i) => {
              if (l < minLiability) {
                minLiability = l;
                minLiabilitySegments = [i];
              } else if (l === minLiability) {
                minLiabilitySegments.push(i);
              }
            });

            // Pick one of the segments that has minimum liability
            result = minLiabilitySegments[Math.floor(Math.random() * minLiabilitySegments.length)];
          }
        } catch (e) {
          console.error("Rigging Error:", e);
          result = Math.floor(Math.random() * segments);
        }
      } else {
        result = Math.floor(Math.random() * (gameState?.wheelSegments || 2));
      }
    }
    
    await updateGameState({
      status: 'spinning',
      result: result,
      forcedResult: null
    });
    setForcedResult('');

    setTimeout(async () => {
       await updateGameState({
         status: 'betting',
         roundId: `round_${Date.now()}`,
         spinStartTime: new Date(Date.now() + 30000)
       });
    }, 6000);
  };

  const handleAdjustBalance = async (userId: string) => {
    const newBalance = userEdits[userId];
    if (newBalance === undefined) return;

    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, { balance: newBalance });
      const newUserEdits = { ...userEdits };
      delete newUserEdits[userId];
      setUserEdits(newUserEdits);
      fetchUsers();
    } catch (error) {
       handleFirestoreError(error, 'update' as any, `users/${userId}`);
    }
  };

  const initializeGame = async () => {
    const stateRef = doc(db, 'game', 'state');
    try {
      await setDoc(stateRef, {
        status: 'idle',
        minBet: 10,
        minPointsToPlay: 10,
        wheelSegments: 2,
        payoutMultiplier: 2,
        result: 0,
        roundId: 'init',
        spinStartTime: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, 'write' as any, 'game/state');
    }
  };

  if (!gameState && !loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-casino-bg flex items-center justify-center p-10">
        <div className="text-center">
           <Settings className="w-16 h-16 text-casino-gold mx-auto mb-6" />
           <h1 className="text-2xl font-bold mb-4">Initialize Game Engine</h1>
           <p className="text-gray-400 mb-8 max-w-sm">The multiplayer game state has not been initialized yet.</p>
           <button id="init-game-btn" onClick={initializeGame} className="btn-gold px-10 py-3">INITIALIZE NOW</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-casino-bg p-4 md:p-10 overflow-y-auto custom-scrollbar">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between">
           <div className="space-y-1">
              <button onClick={onClose} className="flex items-center gap-1 text-gray-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors mb-2">
                <ChevronLeft className="w-4 h-4" /> Back to Game
              </button>
              <h1 className="text-4xl font-black text-[#ff007b] uppercase leading-none">ADMIN<br/>CONTROL</h1>
           </div>
           <div className="flex bg-[#161616] p-1 rounded-xl border border-white/5 overflow-x-auto">
              <button 
                onClick={() => setTab('spinner')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${tab === 'spinner' ? 'bg-[#ff007b] text-white' : 'text-gray-500 hover:text-white'}`}
              >
                Spinner
              </button>
              <button 
                onClick={() => setTab('ipl')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${tab === 'ipl' ? 'bg-[#ff007b] text-white' : 'text-gray-500 hover:text-white'}`}
              >
                IPL
              </button>
              <button 
                onClick={() => setTab('system')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${tab === 'system' ? 'bg-[#ff007b] text-white' : 'text-gray-500 hover:text-white'}`}
              >
                System
              </button>
              <button 
                onClick={() => setTab('history')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${tab === 'history' ? 'bg-[#ff007b] text-white' : 'text-gray-500 hover:text-white'}`}
              >
                History
              </button>
              <button 
                onClick={() => setTab('players')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${tab === 'players' ? 'bg-[#ff007b] text-white' : 'text-gray-500 hover:text-white'}`}
              >
                Players
              </button>
           </div>
        </div>

        {tab === 'spinner' ? (
          <>
            {/* Round Controls */}
            <div className="bg-[#161616] p-8 rounded-[2rem] space-y-6 border border-white/5">
               <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-1">ROUND CONTROLS</h2>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                     Current Status: <span className="text-white font-black uppercase">{gameState?.status}</span>
                  </p>
               </div>
               
               <div className="space-y-3">
                  <button 
                    onClick={startSpin}
                    className="w-full bg-[#ff007b] text-white font-black py-6 rounded-2xl text-xl tracking-[0.2em] shadow-[0_0_30px_rgba(255,0,123,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    SPIN NOW
                  </button>
                  <button 
                    onClick={() => updateGameState({ status: 'betting', roundId: `round_${Date.now()}` })}
                    className="w-full bg-transparent border border-white/10 text-gray-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
                  >
                    <RotateCcw className="w-5 h-5" /> START NEW ROUND
                  </button>
               </div>
            </div>

            {/* Force Result */}
            <div className="bg-[#161616] p-8 rounded-[2rem] space-y-6 border border-white/5">
               <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-1">FORCE RESULT</h2>
                  <p className="text-xs text-gray-500">Secretly rig the next spin.</p>
               </div>
               <div className="flex gap-3">
                  <input 
                     type="number"
                     placeholder="Winning Number"
                     value={forcedResult}
                     onChange={(e) => setForcedResult(e.target.value)}
                     className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#ff007b] outline-none"
                  />
                  <button 
                    onClick={() => startSpin()}
                    className="bg-[#ff007b] px-6 rounded-xl font-bold text-sm"
                  >Set</button>
                  <button 
                    onClick={() => setForcedResult('')}
                    className="bg-[#ff007b] p-3 rounded-xl"
                  ><X className="w-5 h-5" /></button>
               </div>
            </div>

            {/* Game Settings */}
            <div className="bg-[#161616] p-8 rounded-[2rem] space-y-8 border border-white/5">
               <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-1">GAME SETTINGS</h2>
                  <p className="text-xs text-gray-500 font-medium">Changing the wheel segments starts a fresh round automatically.</p>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">MIN BET</label>
                     <input 
                        type="number"
                        value={minBet}
                        onChange={(e) => setMinBet(Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">MIN POINTS TO PLAY</label>
                     <input 
                        type="number"
                        value={minPoints}
                        onChange={(e) => setMinPoints(Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">WHEEL SEGMENTS</label>
                     <input 
                        type="number"
                        value={wheelSegments}
                        onChange={(e) => setWheelSegments(Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm"
                     />
                  </div>
                  <div className="space-y-2 relative">
                     <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">PAYOUT MULTIPLIER</label>
                     <div className="relative">
                        <input 
                            type="number"
                            value={payoutMultiplier}
                            onChange={(e) => setPayoutMultiplier(Number(e.target.value))}
                            className="w-full bg-black border border-white/10 rounded-xl p-4 pr-10 text-sm"
                        />
                        <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                     </div>
                     <p className="text-[10px] text-gray-500 mt-2">e.g. 2 = 2x bet, 3 = 3x bet</p>
                  </div>
               </div>

               <button 
                  onClick={() => updateGameState({ minBet, minPointsToPlay: minPoints, wheelSegments, payoutMultiplier })}
                  className="w-full bg-[#ff007b] text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest"
               >
                  Save Settings
               </button>
            </div>
          </>
        ) : tab === 'ipl' ? (
          <div className="space-y-6">
            {/* Create IPL Question */}
            <div className="bg-[#161616] p-8 rounded-[2rem] space-y-6 border border-white/5">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#ff007b]/10 rounded-xl">
                    <Trophy className="w-6 h-6 text-[#ff007b]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest">NEW IPL PREDICTION</h2>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] italic">Post live markets</p>
                  </div>
               </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Question (e.g. Who will win the toss?)"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#ff007b] outline-none"
                    />
                    <button 
                      onClick={handleAiSuggest}
                      disabled={isAiSuggesting}
                      className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all disabled:opacity-50"
                    >
                      {isAiSuggesting ? 'Thinking...' : 'AI Suggest'}
                    </button>
                  </div>
                  <input 
                    type="text"
                    placeholder="Options (comma separated: MI, SRH)"
                    value={newOptions}
                    onChange={(e) => setNewOptions(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#ff007b] outline-none"
                  />
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                       <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Multiplier</label>
                       <input 
                          type="number"
                          value={newMultiplier}
                          onChange={(e) => setNewMultiplier(Number(e.target.value))}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#ff007b] outline-none"
                       />
                    </div>
                    <button 
                      onClick={createIPLQuestion}
                      disabled={isCreatingIPL}
                      className="flex-[2] bg-[#ff007b] text-white font-black rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all mt-6"
                    >
                      {isCreatingIPL ? 'CREATING...' : 'POST MARKET'}
                    </button>
                  </div>
               </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
               <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-4">Live Markets</h3>
               {iplQuestions.map(q => (
                 <div key={q.id} className="bg-[#161616] p-6 rounded-[2rem] border border-white/5 space-y-4">
                    <div className="flex items-start justify-between">
                       <div>
                          <h4 className="text-sm font-bold text-white uppercase italic">{q.question}</h4>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${q.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-gray-800 text-gray-500'}`}>
                             {q.status}
                          </span>
                       </div>
                       <button 
                         onClick={() => deleteIPLQuestion(q.id)}
                         className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                       >
                         <X className="w-4 h-4" />
                       </button>
                    </div>

                    {q.status === 'active' && (
                      <div className="grid grid-cols-2 gap-2">
                         {q.options.map((opt: string) => (
                           <button 
                             key={opt}
                             onClick={() => settleIPLQuestion(q.id, opt)}
                             className="bg-black/50 border border-white/5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 hover:border-green-500/30 hover:text-green-500 transition-all"
                           >
                             SETTLE: {opt}
                           </button>
                         ))}
                      </div>
                    )}

                    {q.status === 'settled' && (
                      <div className="flex items-center gap-2 text-green-500">
                         <Check className="w-3 h-3" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Correct: {q.correctAnswer}</span>
                      </div>
                    )}
                 </div>
               ))}
            </div>
          </div>
        ) : tab === 'system' ? (
          <div className="space-y-6">
            <div className="bg-[#161616] p-8 rounded-[2rem] space-y-8 border border-white/5">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-1">GLOBAL RIGGING</h2>
                  <p className="text-xs text-gray-500">Adjust the collective luck of all players clandestinely.</p>
                </div>

                <div className="space-y-6">
                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Rigging Level ({riggingLevel}%)</label>
                        <span className="text-[10px] font-black text-[#ff007b]">
                          {riggingLevel < 30 ? 'EASY' : riggingLevel < 60 ? 'MEDIUM' : riggingLevel < 90 ? 'HARD' : 'CYNIC'}
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={riggingLevel}
                        onChange={(e) => setRiggingLevel(Number(e.target.value))}
                        className="w-full accent-[#ff007b] opacity-70 hover:opacity-100 transition-opacity"
                      />
                      <p className="text-[9px] text-gray-600 font-bold uppercase leading-relaxed">
                        Affects spin logic and Plinko gravity bias. Higher values increase house advantage by pushing results toward low multipliers.
                      </p>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">House Edge ({houseEdge}%)</label>
                      <input 
                        type="range"
                        min="0"
                        max="20"
                        value={houseEdge}
                        onChange={(e) => setHouseEdge(Number(e.target.value))}
                        className="w-full accent-[#ff007b] opacity-70 hover:opacity-100 transition-opacity"
                      />
                   </div>

                   <button 
                    onClick={updateGlobalConfig}
                    className="w-full bg-white text-black font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-[#ff007b] hover:text-white transition-all"
                   >
                     Apply System Changes
                   </button>
                </div>
            </div>
          </div>
        ) : tab === 'players' ? (
          <div className="bg-[#161616] p-8 rounded-[2rem] border border-white/5">
             <h2 className="text-sm font-bold uppercase tracking-widest mb-6">PLAYERS</h2>
             
             <div className="space-y-1">
                <div className="grid grid-cols-4 text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-4 px-4">
                   <span>ID</span>
                   <span className="text-center">Status</span>
                   <span className="text-center">Points</span>
                   <span className="text-right">Action</span>
                </div>
                
                <div className="space-y-2">
                   {users.map(u => (
                      <div key={u.id} className="grid grid-cols-4 items-center bg-black/30 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                         <div className="flex flex-col">
                            <span className="font-bold text-sm">{u.username}</span>
                            {u.role === 'admin' && <span className="text-[8px] font-black bg-[#ff007b]/20 text-[#ff007b] px-2 py-0.5 rounded w-fit mt-1 uppercase">Admin</span>}
                         </div>
                         <div className="text-center">
                            <span className={`text-[10px] font-black uppercase ${u.isOnline ? 'text-green-500' : 'text-gray-600'}`}>
                               {u.isOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
                         </div>
                         <div className="flex justify-center">
                            <input 
                               type="number"
                               value={userEdits[u.id] !== undefined ? userEdits[u.id] : u.balance}
                               onChange={(e) => setUserEdits({ ...userEdits, [u.id]: Number(e.target.value) })}
                               className="w-20 bg-black border border-white/10 rounded-lg px-2 py-2 text-xs text-center font-bold outline-none focus:border-purple-500"
                            />
                         </div>
                         <div className="flex justify-end">
                            <button 
                               onClick={() => handleAdjustBalance(u.id)}
                               disabled={userEdits[u.id] === undefined}
                               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                  userEdits[u.id] !== undefined ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500 opacity-50'
                               }`}
                            >
                               <Save className="w-3 h-3" /> Save
                            </button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="bg-[#161616] p-8 rounded-[2rem] border border-white/5">
                <h2 className="text-sm font-bold uppercase tracking-widest mb-6">LIVE BET HISTORY</h2>
                <div className="space-y-2">
                   {betHistory.map((h, i) => (
                     <div key={h.id} className="flex items-center justify-between p-4 bg-black/30 rounded-2xl border border-white/5">
                        <div>
                           <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white">{h.username}</span>
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter bg-white/5 px-2 py-0.5 rounded">{h.game}</span>
                           </div>
                           <p className="text-[9px] text-gray-600 font-bold">
                             {h.timestamp?.seconds ? new Date(h.timestamp.seconds * 1000).toLocaleTimeString() : 'Recently'}
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black text-white">${h.amount} → <span className={h.win ? 'text-green-500' : 'text-red-500'}>${h.wonAmount}</span></p>
                           <p className="text-[8px] font-black text-gray-500 uppercase">{h.result}x</p>
                        </div>
                     </div>
                   ))}
                   {betHistory.length === 0 && (
                     <div className="py-12 flex flex-col items-center justify-center text-gray-700 opacity-30">
                        <Activity className="w-12 h-12 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No bets recorded yet</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}


      </div>
    </div>
  );
}
