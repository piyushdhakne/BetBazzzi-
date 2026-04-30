/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Game } from './types';

export const INITIAL_BALANCE = 10;

export const GAMES: Game[] = [
  {
    id: 'multi-spinner',
    title: 'Multiplayer Spinner',
    description: 'Synchronized live wheel action with other players.',
    category: 'roulette',
    thumbnail: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&q=80&w=800',
    minBet: 10,
  },
  {
    id: 'super-spin',
    title: 'Super Spin',
    description: 'High stakes luxury wheel with massive multipliers.',
    category: 'roulette',
    thumbnail: 'https://images.unsplash.com/photo-1596838132731-dd36a1f3ec72?auto=format&fit=crop&q=80&w=800',
    minBet: 20,
  },
  {
    id: 'mega-drop',
    title: 'Plinko Drop',
    description: 'Watch the ball fall. Win or lose it all instantly.',
    category: 'special',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
    minBet: 10,
  },
  {
    id: 'ipl-probability',
    title: 'Match Prediction',
    description: 'Predict match outcomes and events live.',
    category: 'ipl',
    thumbnail: 'https://images.unsplash.com/photo-1531415074941-6ef21368a284?auto=format&fit=crop&q=80&w=800',
    minBet: 50,
  },
  {
    id: 'ipl-coming-soon',
    title: 'IPL Live Stats',
    description: 'Coming soon - Deep match analytics and live data.',
    category: 'ipl',
    thumbnail: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=800',
    minBet: 0,
    isComingSoon: true
  }
];
