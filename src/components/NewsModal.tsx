import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Info } from 'lucide-react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface NewsModalProps {
  onClose: () => void;
}

export function NewsModal({ onClose }: NewsModalProps) {
  const [notification, setNotification] = useState<{ message: string; active: boolean } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'notification'), (snap) => {
      if (snap.exists()) {
        setNotification(snap.data() as any);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-zinc-900 w-full max-w-sm rounded-3xl border-2 border-[#22c55e]/30 overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.2)]"
      >
        <div className="p-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[#22c55e]/10 flex items-center justify-center border-4 border-[#22c55e]/20 relative">
              <Bell className="w-10 h-10 text-[#22c55e] animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-[#22c55e] opacity-5 animate-ping"></div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">LATEST NEWS</h3>
            <div className="h-1 w-12 bg-[#22c55e] mx-auto rounded-full" />
          </div>

          <div className="bg-black/40 p-6 rounded-2xl border border-white/5 min-h-[100px] flex items-center justify-center">
            <p className="text-gray-200 font-medium leading-relaxed">
              {notification?.message || "Stay tuned for exciting updates, rewards, and new games!"}
            </p>
          </div>

          <div className="flex items-center gap-2 justify-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <Info className="w-3 h-3" />
            <span>Updated recently</span>
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            UNDERSTOOD
          </button>
        </div>
      </motion.div>
    </div>
  );
}
