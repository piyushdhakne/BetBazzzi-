/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Game {
  id: string;
  title: string;
  description: string;
  category: 'slots' | 'cards' | 'roulette' | 'special';
  thumbnail: string;
  minBet: number;
}

export interface User {
  id: string;
  username: string;
  balance: number;
  avatar: string;
}

export interface WinRecord {
  id: string;
  gameId: string;
  amount: number;
  timestamp: number;
}
