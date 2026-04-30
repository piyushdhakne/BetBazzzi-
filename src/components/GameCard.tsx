/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Game } from '../types';
import { Play, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface GameCardProps {
  game: Game;
  onPlay: (gameId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onPlay }) => {
  return (
    <motion.div
      id={`game-card-${game.id}`}
      whileHover={game.isComingSoon ? {} : { y: -5 }}
      onClick={() => !game.isComingSoon && onPlay(game.id)}
      className={`group bg-[#161616] rounded-[2rem] overflow-hidden border border-white/5 hover:border-[#ff007b]/30 transition-all cursor-pointer shadow-xl ${game.isComingSoon ? 'cursor-not-allowed opacity-80' : ''}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#0a0a0a]">
        <img 
          src={game.thumbnail} 
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[30%] group-hover:grayscale-0 opacity-80"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity"></div>
        
        {/* Neon Accent */}
        <div className="absolute inset-0 border-[0.5px] border-[#ff007b]/20 group-hover:border-[#ff007b]/60 transition-all pointer-events-none"></div>

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
           {game.isComingSoon ? (
             <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-xl border border-white/10">
                <span className="text-xs font-black text-white uppercase tracking-widest">Coming Soon</span>
             </div>
           ) : (
             <div className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-2xl">
                <Play size={32} className="fill-current ml-1" />
             </div>
           )}
        </div>

        {/* Category Badge */}
        <div className="absolute top-4 left-4">
           <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white border border-white/10">
             {game.category}
           </span>
        </div>

        {/* Game Specific Branding Overlay */}
        {game.id === 'multi-spinner' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-full text-center pointer-events-none px-4">
            <span className="block text-[40px] font-black italic tracking-tighter leading-tight text-white/5 uppercase select-none group-hover:text-white/20 transition-all duration-500">
              SPIN
            </span>
            <span className="block text-[10px] font-black tracking-[0.5em] text-[#ff007b] opacity-20 group-hover:opacity-100 transition-all duration-500">
              MULTIPLIER
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-6">
        <h3 className="font-black text-xl italic tracking-tighter text-white uppercase group-hover:text-[#ff007b] transition-colors mb-2">
           {game.title}
        </h3>
        <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
           <span>Available Stakes</span>
           <span className="text-[#ff007b]">${game.minBet}+</span>
        </div>
      </div>
    </motion.div>
  );
}
