/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Diamond, Coins, UserCircle, Menu, LogOut, Shield, Wallet, History, Plus } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';

interface NavbarProps {
  onAuthClick: () => void;
  onAdminClick: () => void;
  onHistoryClick: () => void;
  onTransactionClick: () => void;
}

export default function Navbar({ onAuthClick, onAdminClick, onHistoryClick, onTransactionClick }: NavbarProps) {
  const { user, logout, promoteToAdmin } = useAuth();

  return (
    <nav id="main-nav" className="sticky top-0 z-50 bg-black border-b border-white/5 py-4">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex justify-between items-center h-16">
          {/* Left Section: User Status/Auth (Moved here) */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4 bg-[#161616] p-1 rounded-2xl border border-white/5 shadow-lg">
                <div className="flex items-center gap-2 pl-4 pr-2">
                   <Wallet className="w-4 h-4 text-[#ff007b]" />
                   <span className="text-sm font-black text-white tabular-nums">
                     ${user.balance.toLocaleString()}
                   </span>
                   <button 
                     onClick={onTransactionClick}
                     className="ml-2 w-6 h-6 rounded-full bg-[#ff007b] text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-pink-500/20"
                     id="add-points-btn"
                   >
                      <Plus className="w-3 h-3 text-white" />
                   </button>
                </div>
                
                <div className="h-8 w-px bg-white/10 hidden sm:block"></div>

                <div className="hidden sm:flex items-center gap-3 px-2">
                   <div className="w-8 h-8 rounded-lg bg-[#ff007b]/10 flex items-center justify-center border border-[#ff007b]/20">
                      <span className="text-[#ff007b] font-black text-xs">{user.username[0].toUpperCase()}</span>
                   </div>
                   <span className="text-[10px] font-black uppercase text-gray-400">{user.username}</span>
                </div>

                <div className="flex gap-1 pr-1">
                  {user.role === 'admin' && (
                    <button 
                      onClick={onAdminClick}
                      className="p-2 text-blue-400 hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <Shield className="w-5 h-5" />
                    </button>
                  )}
                  {user.role !== 'admin' && (
                    <button 
                      id="promote-admin-btn"
                      onClick={() => {
                        if(confirm('Make this account an Administrator?')) {
                          promoteToAdmin();
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-white rounded-xl transition-colors"
                      title="Become Admin"
                    >
                      <Shield className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={onHistoryClick}
                    className="p-2 text-gray-500 hover:text-[#ff007b] rounded-xl transition-colors"
                    title="Bet History"
                  >
                    <History className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={logout}
                    className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={onAuthClick}
                className="bg-white text-black font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest hover:bg-[#ff007b] hover:text-white transition-all shadow-xl"
              >
                LOGIN / REGISTER
              </button>
            )}
          </div>

          {/* Center Section: Desktop Nav (Hidden on mobile) */}
          <div className="hidden lg:flex items-center gap-10">
            {['Cricket', 'IPL 2024', 'Casino', 'Support'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`}
                className="text-xs font-black uppercase tracking-[0.15em] text-gray-500 hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          {/* Right Section: Logo */}
          <div className="flex items-center gap-3 cursor-pointer group ml-auto">
            <div className="flex flex-col text-right">
               <span className="font-black text-2xl tracking-tighter leading-none italic text-white group-hover:text-[#ff007b] transition-colors">
                 ARCADE
               </span>
               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] leading-none">
                 HUB
               </span>
            </div>
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)] group-hover:bg-[#ff007b] group-hover:text-white transition-all">
               <Diamond className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
