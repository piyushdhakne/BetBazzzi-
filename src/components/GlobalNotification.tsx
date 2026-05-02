
import React, { useEffect, useState } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from 'lucide-react';

export default function GlobalNotification() {
  const [notification, setNotification] = useState<{ message: string; active: boolean } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'notification'), (snap) => {
      if (snap.exists()) {
        setNotification(snap.data() as any);
      }
    }, (err) => {
      // Just log internally, don't crash the whole app for a missing notification bar
      console.warn("Global Notification listener error:", err.message);
    });
    return () => unsub();
  }, []);

  if (!notification || !notification.active || !notification.message) return null;

  return (
    <div className="bg-[#ff007b] text-white py-1.5 border-y border-white/10 relative flex items-center h-8 overflow-hidden">
      {/* Static Label */}
      <div className="flex items-center gap-2 px-4 shrink-0 h-full bg-[#ff007b] z-10 border-r border-white/10 shadow-[5px_0_15px_rgba(255,0,123,1)]">
        <Bell className="w-3.5 h-3.5" />
        <span className="text-[10px] font-black uppercase tracking-widest italic leading-none">NOTICE</span>
      </div>

      {/* Scrolling Content Container */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div className="flex items-center gap-4 whitespace-nowrap animate-marquee">
          <span className="text-xs font-semibold tracking-wide pl-4">
            {notification.message}
          </span>
          <span className="text-xs font-semibold tracking-wide px-20 opacity-50">•</span>
          <span className="text-xs font-semibold tracking-wide">
            {notification.message}
          </span>
          <span className="text-xs font-semibold tracking-wide px-20 opacity-50">•</span>
          <span className="text-xs font-semibold tracking-wide">
            {notification.message}
          </span>
        </div>
      </div>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 30s linear infinite;
          width: max-content;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
