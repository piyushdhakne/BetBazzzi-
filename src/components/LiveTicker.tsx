/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getLiveIPLUpdate } from '../services/geminiService';
import { Zap } from 'lucide-react';

export default function LiveTicker() {
  const [msg, setMsg] = useState("Loading live IPL updates...");

  useEffect(() => {
    const update = async () => {
      const news = await getLiveIPLUpdate();
      setMsg(news);
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#ff007b]/10 border-y border-[#ff007b]/20 py-2 overflow-hidden shadow-[inset_0_0_20px_rgba(255,0,123,0.1)]">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[#ff007b] text-white px-3 py-0.5 rounded text-[10px] font-black uppercase tracking-widest animate-pulse shrink-0">
          <Zap className="w-3 h-3 fill-current" />
          Live
        </div>
        
        <div className="relative flex-1 overflow-hidden h-4">
          <AnimatePresence mode="wait">
            <motion.p 
              key={msg}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest absolute inset-0 text-center md:text-left"
            >
              {msg}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] shrink-0">
          Powered by <span className="text-white">Google Gemini</span>
        </div>
      </div>
    </div>
  );
}
