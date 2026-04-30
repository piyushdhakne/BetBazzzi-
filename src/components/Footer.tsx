/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Diamond, ShieldCheck, Twitter, Github, Linkedin, Apple, CreditCard } from 'lucide-react';

export default function Footer() {
  return (
    <footer id="main-footer" className="bg-casino-dark border-t border-white/5 pt-20 pb-10 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-casino-gold rounded-lg flex items-center justify-center">
                <Diamond className="text-black w-5 h-5" />
              </div>
              <span className="font-display font-extrabold text-xl tracking-tighter text-white">
                LUXEVEGAS
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              The world's most luxurious online gaming destination. Licensed and regulated since 2018.
            </p>
            <div className="flex gap-4">
              {[Twitter, Github, Linkedin].map((Icon, idx) => (
                <a key={idx} href="#" className="p-2 bg-zinc-900 rounded-lg text-gray-400 hover:text-casino-gold transition-colors">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-white mb-6 uppercase tracking-widest text-sm">GAMES</h4>
            <ul className="space-y-4">
              {['Live Casino', 'Video Slots', 'Jackpots', 'Table Games', 'Live Poker'].map((item) => (
                <li key={item}><a href="#" className="text-gray-500 hover:text-white transition-colors text-sm">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-6 uppercase tracking-widest text-sm">COMPANY</h4>
            <ul className="space-y-4">
              {['About Us', 'Responsible Gaming', 'Terms of Service', 'Privacy Policy', 'Affiliates'].map((item) => (
                <li key={item}><a href="#" className="text-gray-500 hover:text-white transition-colors text-sm">{item}</a></li>
              ))}
            </ul>
          </div>

          {/* Compliance & Payments */}
          <div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="text-green-500 w-5 h-5" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Certified Secure</span>
              </div>
              <p className="text-xs text-gray-500">
                128-bit SSL encryption. All games are provably fair and RNG certified.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 grayscale opacity-30">
               <Apple className="w-6 h-6" />
               <CreditCard className="w-6 h-6" />
               <Diamond className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold">
            © 2026 LUXEVEGAS ONLINE CASINO. PLEASE PLAY RESPONSIBLY. 18+ ONLY.
          </p>
          <div className="flex gap-8 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">SELF EXCLUSION</a>
            <a href="#" className="hover:text-white transition-colors">GAMCARE</a>
            <a href="#" className="hover:text-white transition-colors">BEGAMBLEAWARE</a>
          </div>
        </div>
      </div>
      
      {/* Background Graphic */}
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-casino-gold/5 rounded-full blur-[100px]"></div>
    </footer>
  );
}
