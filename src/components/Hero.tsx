/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Play, Bell } from 'lucide-react';

export default function Hero({ onPlay, onBroadcastClick, isAdmin }: { onPlay: () => void; onBroadcastClick?: () => void; isAdmin?: boolean }) {
  return (
    <section id="hero" className="max-w-7xl mx-auto px-6 md:px-10 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onPlay}
        className="relative h-[450px] cursor-pointer group shadow-2xl"
      >
        {/* Rounded Backdrop for Content Clipping */}
        <div className="absolute inset-0 rounded-[3rem] overflow-hidden border border-white/5">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1518173835740-f5d14111d76a?auto=format&fit=crop&q=80&w=2000" 
              alt="Multiplayer Spinner" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all"></div>
          </div>
        </div>

        {/* News/Notification Button for Everyone - Clean circle, breaks out of bounds */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 10 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onBroadcastClick?.();
          }}
          className="absolute -top-6 -right-6 z-30 w-16 h-16 bg-[#22c55e] hover:bg-[#16a34a] border-4 border-black rounded-full flex items-center justify-center transition-all group/notify shadow-[0_10px_30px_rgba(34,197,94,0.6)]"
          title="Latest News"
        >
          <div className="absolute inset-0 rounded-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
          <Bell className="w-7 h-7 text-white animate-bounce" />
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">NEW</span>
          </div>
        </motion.button>

        {/* Content */}
        <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row justify-between items-end gap-6">
           <div className="space-y-4 max-w-lg">
              <span className="inline-block py-1 px-4 rounded-full bg-[#ff007b] text-white text-[10px] font-black tracking-widest uppercase shadow-[0_0_15px_#ff007b]">
                 AVAILABLE NOW
              </span>
              <div className="relative">
                <h1 className="text-7xl md:text-9xl font-black text-white italic tracking-tighter leading-[0.8] uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                   SPIN<span className="text-[#ff007b]">NER</span>
                </h1>
                <div className="absolute -top-4 -right-12 rotate-12">
                   <span className="bg-[#ff007b] text-white text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-tighter shadow-lg">
                      MULTI-PLAYER
                   </span>
                </div>
              </div>
              <p className="text-gray-300 text-sm font-medium leading-relaxed max-w-sm">
                 Join thousands of players in the world's most thrilling real-time multiplier spinner. Win up to 100x your wager instantly!
              </p>
           </div>

           <div className="flex flex-col items-center gap-4">
              <div className="flex -space-x-4 mb-2">
                 {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-12 h-12 rounded-full border-4 border-black bg-zinc-800 flex items-center justify-center font-bold text-xs ring-2 ring-white/5 shadow-xl`}>
                       {i === 3 ? '+8k' : <img src={`https://i.pravatar.cc/100?u=${i}`} className="w-full h-full rounded-full" />}
                    </div>
                 ))}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay();
                }}
                className="bg-white text-black font-black px-12 py-5 rounded-[1.5rem] tracking-widest uppercase hover:bg-[#ff007b] hover:text-white transition-all shadow-2xl flex items-center gap-3 group/btn"
              >
                 <Play className="w-5 h-5 fill-current" />
                 PLAY NOW
              </button>
           </div>
        </div>
      </motion.div>
    </section>
  );
}
