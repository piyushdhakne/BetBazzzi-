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
      whileHover={{ y: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative bg-casino-card rounded-2xl overflow-hidden border border-white/5 hover:border-casino-gold/50 transition-colors"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={game.thumbnail} 
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
          <button 
            onClick={() => onPlay(game.id)}
            className="w-14 h-14 bg-casino-gold rounded-full flex items-center justify-center text-black shadow-xl"
          >
            <Play className="fill-current w-6 h-6 ml-1" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-display font-bold text-lg">{game.title}</h3>
          <span className="text-[10px] p-1 rounded bg-zinc-800 text-gray-400 uppercase tracking-widest font-bold">
            {game.category}
          </span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 mb-4">
          {game.description}
        </p>
        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          <span className="text-xs font-medium text-gray-400">Min Bet: <span className="text-casino-gold">${game.minBet}</span></span>
          <button className="text-gray-500 hover:text-white transition-colors">
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
