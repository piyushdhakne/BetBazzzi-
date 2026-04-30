/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GAMES } from '../constants';
import { GameCard } from './GameCard';
import { Search, Filter, Trophy, Target, LayoutDashboard, Gift, Swords } from 'lucide-react';

interface GameGridProps {
  onPlayGame: (gameId: string) => void;
}

export default function GameGrid({ onPlayGame }: GameGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  const categories = [
    { id: 'all', label: 'All Games', icon: LayoutDashboard },
    { id: 'ipl', label: 'IPL Betting', icon: Trophy },
    { id: 'cricket', label: 'Cricket', icon: Swords },
    { id: 'casino', label: 'Casino', icon: Target },
    { id: 'promo', label: 'Promotion', icon: Gift },
  ];
  
  const filteredGames = GAMES.filter(game => {
    return activeCategory === 'all' || game.category === activeCategory;
  });

  return (
    <section id="games-section" className="max-w-7xl mx-auto px-6 md:px-10 py-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-12">
         {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-2 transition-all group ${
                  activeCategory === cat.id 
                    ? 'bg-[#ff007b] border-[#ff007b] text-white shadow-[0_10px_30px_rgba(255,0,123,0.3)]' 
                    : 'bg-[#161616] border-white/5 text-gray-500 hover:border-white/10 hover:bg-[#1c1c1c]'
                }`}
              >
                <Icon className={`w-6 h-6 ${activeCategory === cat.id ? 'text-white' : 'text-[#ff007b]'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">{cat.label}</span>
              </button>
            );
         })}
      </div>

      <div className="flex items-center justify-between mb-8">
         <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 italic">Available Games</h2>
         <div className="h-px flex-1 bg-white/5 mx-6"></div>
         <button className="text-[10px] font-black uppercase tracking-widest text-[#ff007b] hover:underline">View All</button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredGames.map((game) => (
          <GameCard key={game.id} game={game} onPlay={onPlayGame} />
        ))}
        {filteredGames.length === 0 && (
          <div className="col-span-full py-20 bg-[#161616] rounded-3xl text-center border border-dashed border-white/10">
             <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No games found in this category</p>
          </div>
        )}
      </div>
    </section>
  );
}
