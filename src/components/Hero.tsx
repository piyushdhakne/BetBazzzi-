/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';

export default function Hero() {
  return (
    <section id="hero" className="relative h-[80vh] flex items-center overflow-hidden">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1596838132731-163820252119?auto=format&fit=crop&q=80&w=2000" 
          alt="Casino Interior" 
          className="w-full h-full object-cover opacity-40"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-casino-bg via-transparent to-casino-bg/50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <span className="inline-block py-1 px-3 rounded-full bg-casino-neon-purple/20 text-casino-neon-purple text-xs font-bold tracking-widest uppercase mb-4 border border-casino-neon-purple/30">
            Welcome Bonus: 200% up to $5,000
          </span>
          <h1 className="font-display font-extrabold text-6xl md:text-8xl leading-[0.9] tracking-tighter mb-6">
            WHERE <span className="text-casino-gold">LEGENDS</span> ARE BORN.
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-lg">
            Experience the thrill of high-stakes gaming from the comfort of your home. 
            Join the elite club of LuxeVegas and claim your throne.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="btn-gold flex items-center justify-center gap-2 group">
              <Play className="w-5 h-5 fill-current" />
              PLAY NOW
            </button>
            <button className="px-8 py-3 rounded-full border border-white/20 font-bold hover:bg-white/5 transition-all">
              EXPLORE GAMES
            </button>
          </div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-casino-bg to-transparent"></div>
    </section>
  );
}
