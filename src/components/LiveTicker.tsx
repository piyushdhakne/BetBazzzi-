/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchIPLNewsHeadlines } from '../services/geminiService';
import { Zap } from 'lucide-react';

export default function LiveTicker() {
  const [headlines, setHeadlines] = useState<string[]>(["Loading live IPL updates..."]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const update = async () => {
      const news = await fetchIPLNewsHeadlines();
      setHeadlines(news);
    };

    update();
    const interval = setInterval(update, 300000); // Update from AI every 5 mins
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (headlines.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % headlines.length);
    }, 6000); // Rotate headlines every 6 seconds
    return () => clearInterval(timer);
  }, [headlines]);

  return (
    <div className="bg-[#ff007b]/10 border-y border-[#ff007b]/20 py-2 overflow-hidden shadow-[inset_0_0_20px_rgba(255,0,123,0.1)] relative z-10">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[#ff007b] text-white px-3 py-0.5 rounded text-[10px] font-black uppercase tracking-widest animate-pulse shrink-0">
          <Zap className="w-3 h-3 fill-current" />
          Live
        </div>
        
        <div className="relative flex-1 h-4 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p 
              key={currentIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-[10px] font-bold text-gray-200 uppercase tracking-widest absolute inset-0 truncate"
            >
              {headlines[currentIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex gap-1">
          {headlines.map((_, i) => (
            <div 
              key={i} 
              className={`w-1 h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-[#ff007b] w-2' : 'bg-gray-800'}`} 
            />
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] shrink-0">
          Powered by <span className="text-white">Google Gemini</span>
        </div>
      </div>
    </div>
  );
}
