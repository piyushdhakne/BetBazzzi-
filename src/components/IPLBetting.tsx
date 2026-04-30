/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, handleFirestoreError, OperationType } from '../AuthContext';
import { X, Trophy, Wallet, Clock, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react';

interface IPLQuestion {
  id: string;
  question: string;
  options: string[];
  multiplier: number;
  status: 'active' | 'settled' | 'cancelled';
  correctAnswer?: string;
  createdAt: any;
}

interface IPLBet {
  id: string;
  userId: string;
  username: string;
  questionId: string;
  option: string;
  amount: number;
  status: 'pending' | 'won' | 'lost' | 'refunded';
  timestamp: any;
}

export default function IPLBetting({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<IPLQuestion[]>([]);
  const [myBets, setMyBets] = useState<IPLBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<Record<string, string>>({});
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [placingBet, setPlacingBet] = useState<string | null>(null);

  useEffect(() => {
    // Listen for questions
    const qUnsub = onSnapshot(query(collection(db, 'ipl_questions'), orderBy('createdAt', 'desc')), (snap) => {
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as IPLQuestion)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'ipl_questions');
    });

    // Listen for my bets
    if (user) {
      const bUnsub = onSnapshot(query(collection(db, 'ipl_bets'), where('userId', '==', user.id)), (snap) => {
        setMyBets(snap.docs.map(d => ({ id: d.id, ...d.data() } as IPLBet)));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'ipl_bets');
      });
      return () => { qUnsub(); bUnsub(); };
    }

    return () => qUnsub();
  }, [user]);

  const placeBet = async (questionId: string) => {
    if (!user) return;
    const option = selectedOption[questionId];
    const amountStr = betAmounts[questionId];
    if (!option || !amountStr) return;

    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    if (amount > user.balance) {
      alert("Insufficient balance!");
      return;
    }

    setPlacingBet(questionId);
    try {
      const batch = writeBatch(db);
      
      const betRef = doc(collection(db, 'ipl_bets'));
      batch.set(betRef, {
        userId: user.id,
        username: user.username,
        questionId,
        option,
        amount,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      const userRef = doc(db, 'users', user.id);
      batch.update(userRef, {
        balance: increment(-amount)
      });

      await batch.commit();
      
      // Reset inputs
      setBetAmounts(prev => ({ ...prev, [questionId]: '' }));
      setSelectedOption(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    } catch (err) {
      handleFirestoreError(err, 'write' as any, 'ipl_bets');
    } finally {
      setPlacingBet(null);
    }
  };

  const activeQuestions = questions.filter(q => q.status === 'active');
  const pastQuestions = questions.filter(q => q.status !== 'active');

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-y-auto custom-scrollbar flex flex-col">
       {/* Sticky Header */}
       <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/5 p-6 md:p-8">
         <div className="max-w-xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-4">
             <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
               <ChevronLeft className="w-6 h-6 text-white" />
             </button>
             <div>
               <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">IPL BETTING</h1>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                 <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Live Markets</span>
               </div>
             </div>
           </div>
           {user && (
             <div className="bg-[#161616] px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-3">
               <Wallet className="w-4 h-4 text-[#ff007b]" />
               <span className="text-sm font-black text-white">${user.balance.toLocaleString()}</span>
             </div>
           )}
         </div>
       </header>

       <main className="flex-1 max-w-xl mx-auto w-full p-6 md:p-8 space-y-12 pb-32">
         {/* Active Matches Section */}
         <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Active Predictions</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Clock className="w-8 h-8 text-gray-700 animate-spin" />
              </div>
            ) : activeQuestions.length === 0 ? (
              <div className="bg-[#161616] p-12 rounded-[2rem] border border-white/5 text-center">
                 <AlertCircle className="w-8 h-8 text-gray-700 mx-auto mb-4" />
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-loose">
                    No active markets at the moment.<br/>Admin will post live questions soon.
                 </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {activeQuestions.map(q => {
                  const existingBet = myBets.find(b => b.questionId === q.id && b.status === 'pending');
                  return (
                    <motion.div 
                      key={q.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#161616] p-8 rounded-[2.5rem] border border-white/5 space-y-6 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                         <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-tight max-w-[80%]">
                            {q.question}
                         </h3>
                         <div className="bg-[#ff007b]/10 text-[#ff007b] px-3 py-1 rounded-lg text-xs font-black">
                            {q.multiplier}x
                         </div>
                      </div>

                      {existingBet ? (
                        <div className="bg-black/30 p-6 rounded-2xl border border-[#ff007b]/20 flex items-center justify-between">
                           <div>
                              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Your Bet</p>
                              <p className="text-sm font-bold text-white uppercase">{existingBet.option}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Amount</p>
                              <p className="text-sm font-bold text-[#ff007b]">${existingBet.amount}</p>
                           </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                           <div className="grid grid-cols-2 gap-3">
                              {q.options.map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => setSelectedOption(prev => ({ ...prev, [q.id]: opt }))}
                                  className={`py-4 rounded-2xl text-sm font-black transition-all border-2 ${
                                    selectedOption[q.id] === opt 
                                    ? 'bg-[#ff007b] text-white border-[#ff007b]' 
                                    : 'bg-black text-gray-400 border-white/5 hover:border-white/20'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                           </div>

                           <div className="flex gap-3">
                              <input 
                                type="number"
                                placeholder="Amount"
                                value={betAmounts[q.id] || ''}
                                onChange={(e) => setBetAmounts(prev => ({ ...prev, [q.id]: e.target.value }))}
                                className="flex-1 bg-black border-2 border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-[#ff007b] outline-none transition-all"
                              />
                              <button 
                                onClick={() => placeBet(q.id)}
                                disabled={!selectedOption[q.id] || !betAmounts[q.id] || placingBet === q.id}
                                className="bg-white text-black font-black px-8 rounded-2xl text-xs uppercase tracking-widest hover:bg-[#ff007b] hover:text-white transition-all disabled:opacity-50 disabled:grayscale"
                              >
                                {placingBet === q.id ? 'PLACING...' : 'PLACE BET'}
                              </button>
                           </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
         </section>

         {/* Past Matches Section */}
         {pastQuestions.length > 0 && (
           <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-3">
                  <Trophy className="w-4 h-4" /> Past Results
                </h2>
              </div>

              <div className="space-y-4">
                 {pastQuestions.map(q => {
                   const myBet = myBets.find(b => b.questionId === q.id);
                   return (
                     <div key={q.id} className="bg-[#111111] p-6 rounded-3xl border border-white/5 opacity-80 group hover:opacity-100 transition-all">
                        <div className="flex items-center justify-between mb-4">
                           <h4 className="text-sm font-bold text-gray-300 uppercase italic tracking-tight">{q.question}</h4>
                           <span className="text-[8px] font-black bg-gray-800 text-gray-500 px-2 py-0.5 rounded uppercase tracking-tighter">Settled</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 items-center">
                           <div>
                              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Result</p>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-black text-white uppercase">{q.correctAnswer}</span>
                              </div>
                           </div>
                           
                           {myBet && (
                             <div className="text-right">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Your Bet</p>
                                <span className={`text-sm font-black uppercase ${myBet.status === 'won' ? 'text-green-500' : 'text-red-500'}`}>
                                   {myBet.status === 'won' ? `+$${myBet.amount * q.multiplier}` : `-$${myBet.amount}`}
                                </span>
                             </div>
                           )}
                        </div>
                     </div>
                   )
                 })}
              </div>
           </section>
         )}
       </main>

       {/* Floating Status Footer */}
       <div className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none">
          <div className="max-w-xl mx-auto flex justify-center">
             <div className="bg-[#1a1a1a]/90 backdrop-blur-xl px-10 py-5 rounded-[2rem] border border-white/10 shadow-3xl pointer-events-auto">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic text-center">
                   LIVE IPL PREDICTIONS <span className="text-white mx-3">/</span> UP TO 12X PAYOUTS
                </p>
             </div>
          </div>
       </div>
    </div>
  );
}
