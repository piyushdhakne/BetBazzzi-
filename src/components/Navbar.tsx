/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Diamond, Coins, UserCircle, Menu, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';

interface NavbarProps {
  onAuthClick: () => void;
  onAdminClick: () => void;
}

export default function Navbar({ onAuthClick, onAdminClick }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <nav id="main-nav" className="sticky top-0 z-50 bg-casino-bg/80 backdrop-blur-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-tr from-casino-gold to-casino-gold-light rounded-lg flex items-center justify-center shadow-lg transform rotate-3">
              <Diamond className="text-black w-6 h-6" />
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tighter bg-gradient-to-r from-white to-casino-gold bg-clip-text text-transparent">
              LUXEVEGAS
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Games', 'Promotions', 'VIP', 'Support'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <button 
                    onClick={onAdminClick}
                    className="p-2 text-casino-gold hover:bg-casino-gold/10 rounded-full transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                  </button>
                )}
                <motion.div 
                  id="balance-display"
                  whileHover={{ scale: 1.05 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-full py-2 px-4 flex items-center gap-2"
                >
                  <Coins className="text-casino-gold w-4 h-4" />
                  <span className="text-sm font-bold text-casino-gold tabular-nums">
                    ${user.balance.toLocaleString()}
                  </span>
                </motion.div>
                
                <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                  <UserCircle className="w-6 h-6" />
                  <span className="hidden sm:inline">{user.username.toUpperCase()}</span>
                </div>

                <button 
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button 
                onClick={onAuthClick}
                className="btn-gold !py-2 !px-6 text-sm"
              >
                LOGIN
              </button>
            )}
            
            <button className="md:hidden p-2 text-gray-400">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
