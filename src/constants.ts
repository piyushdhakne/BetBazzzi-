/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Game } from './types';

export const INITIAL_BALANCE = 1000;

export const GAMES: Game[] = [
  {
    id: 'neon-slots',
    title: 'Neon Strike Slots',
    description: 'High-voltage slot action with massive multipliers.',
    category: 'slots',
    thumbnail: 'https://images.unsplash.com/photo-1518133835878-5a93cc3f89e5?auto=format&fit=crop&q=80&w=800',
    minBet: 10,
  },
  {
    id: 'royal-blackjack',
    title: 'Royal Blackjack',
    description: 'Classic table game. Beat the dealer and hit 21.',
    category: 'cards',
    thumbnail: 'https://images.unsplash.com/photo-1512411478144-8451197825a1?auto=format&fit=crop&q=80&w=800',
    minBet: 25,
  },
  {
    id: 'cyber-roulette',
    title: 'Cyber Roulette',
    description: 'Spin the wheel in a neon-drenched future.',
    category: 'roulette',
    thumbnail: 'https://images.unsplash.com/photo-1596838132731-163820252119?auto=format&fit=crop&q=80&w=800',
    minBet: 5,
  },
  {
    id: 'poker-elite',
    title: 'Elite Hold\'em',
    description: 'Test your nerves against high-stakes competition.',
    category: 'cards',
    thumbnail: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&q=80&w=800',
    minBet: 50,
  },
  {
    id: 'gold-mine-slots',
    title: 'Gold Mine Rush',
    description: 'Dig deep for legendary payouts in our newest slot.',
    category: 'slots',
    thumbnail: 'https://images.unsplash.com/photo-1511130523583-05990264f338?auto=format&fit=crop&q=80&w=800',
    minBet: 20,
  },
  {
    id: 'baccarat-luxe',
    title: 'Luxe Baccarat',
    description: 'Elegant and simple. The high-roller choice.',
    category: 'cards',
    thumbnail: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&q=80&w=800',
    minBet: 100,
  }
];
