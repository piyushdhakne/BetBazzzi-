/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GAMES } from '../constants';
import { GameCard } from './GameCard';
import { Search, Filter } from 'lucide-react';

interface GameGridProps {
  onPlayGame: (gameId: string) => void;
}

export default function GameGrid({ onPlayGame }: GameGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  const categories = ['all', 'slots', 'cards', 'roulette'];
  
  const filteredGames = activeCategory === 'all' 
    ? GAMES 
    : GAMES.filter(g => g.category === activeCategory);

  return (
    <section id="games-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h2 className="font-display font-bold text-4xl mb-2">PREMIUM LOBBY</h2>
          <div className="flex gap-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-sm font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${
                  activeCategory === cat ? 'border-casino-gold text-casino-gold' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search games..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-casino-gold/50"
            />
          </div>
          <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-full text-gray-400">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredGames.map((game) => (
          <GameCard key={game.id} game={game} onPlay={onPlayGame} />
        ))}
      </div>
    </section>
  );
}
