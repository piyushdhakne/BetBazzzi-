/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, X, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../AuthContext';

export default function PlayerHistory({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'history'),
      where('userId', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'history');
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return (
    <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="w-full max-w-xl bg-casino-bg md:rounded-[2rem] border-white/5 border-t md:border shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5">
           <div className="flex items-center gap-3">
              <div className="p-3 bg-[#ff007b]/10 rounded-2xl">
                 <History className="w-5 h-5 text-[#ff007b]" />
              </div>
              <div>
                 <h2 className="text-sm font-black uppercase tracking-[0.2em] italic">BETTING HISTORY</h2>
                 <p className="text-[10px] text-gray-500 font-bold uppercase">Your last 20 sessions</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
           </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
           {loading ? (
             <div className="py-20 flex flex-col items-center justify-center opacity-20">
                <Clock className="w-10 h-10 animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Fetching records...</p>
             </div>
           ) : history.length > 0 ? (
             <AnimatePresence mode="popLayout">
               {history.map((h, i) => (
                 <motion.div 
                   key={h.id}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.05 }}
                   className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group"
                 >
                    <div className="flex items-center gap-4">
                       <div className={`p-3 rounded-xl ${h.win ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {h.win ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                       </div>
                       <div>
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-black uppercase italic text-gray-200">{h.game}</span>
                              {h.username && <span className="text-[10px] font-black uppercase text-casino-gold/50 ml-1">@{h.username}</span>}
                             <span className="text-[8px] font-black px-2 py-0.5 bg-black/40 rounded uppercase text-gray-500 tracking-tighter">{h.result}x</span>
                          </div>
                          <p className="text-[9px] text-gray-600 font-bold mt-0.5">
                            {h.timestamp?.seconds ? new Date(h.timestamp.seconds * 1000).toLocaleString() : 'Recently'}
                          </p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Wager: ${h.amount}</p>
                       <p className={`text-sm font-black italic ${h.win ? 'text-green-500' : 'text-red-500/50'}`}>
                          {h.win ? `+${h.wonAmount}` : `-${h.amount}`}
                       </p>
                    </div>
                 </motion.div>
               ))}
             </AnimatePresence>
           ) : (
             <div className="py-20 flex flex-col items-center justify-center opacity-10">
                <DollarSign className="w-16 h-16 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">No bets placed yet</p>
             </div>
           )}
        </div>

        {/* Footer info */}
        <div className="p-6 bg-black/40 text-[9px] text-center text-gray-700 font-bold uppercase tracking-widest leading-relaxed">
           This history is provided for entertainment purposes only and may have a slight delay in appearing.
        </div>
      </motion.div>
    </div>
  );
}
