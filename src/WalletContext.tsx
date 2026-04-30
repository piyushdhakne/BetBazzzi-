/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { INITIAL_BALANCE } from './constants';

interface WalletContextType {
  balance: number;
  updateBalance: (amount: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(INITIAL_BALANCE);

  const updateBalance = (amount: number) => {
    setBalance((prev) => Math.max(0, prev + amount));
  };

  return (
    <WalletContext.Provider value={{ balance, updateBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
