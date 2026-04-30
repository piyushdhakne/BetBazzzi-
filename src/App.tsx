import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import GameGrid from './components/GameGrid';
import Footer from './components/Footer';
import SlotMachine from './components/SlotMachine';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import { Trophy, Zap, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function App() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [jackpot, setJackpot] = useState(1284592);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const { user, loading } = useAuth();

  // Simulated live jackpot ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setJackpot(prev => prev + Math.floor(Math.random() * 5));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-casino-bg flex items-center justify-center">
        <Zap className="w-12 h-12 text-casino-gold animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Mini Top Ticker */}
      <div className="bg-casino-gold text-black py-1 overflow-hidden whitespace-nowrap">
        <div className="flex animate-marquee gap-10 items-center">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-3 h-3" />
              LATEST WINNER: PLAYER_{Math.floor(Math.random() * 9999)} WON $432 on ROYAL BLACKJACK!
              <Zap className="w-3 h-3 text-red-600 fill-current" />
            </span>
          ))}
        </div>
      </div>

      <Navbar 
        onAuthClick={() => setShowAuth(true)} 
        onAdminClick={() => setShowAdmin(true)} 
      />
      
      <main>
        <Hero />
        
        {/* Jackpot Section */}
        <section className="relative z-20 -mt-16 sm:-mt-24">
          <div className="max-w-4xl mx-auto px-4">
            <div className="glass-card p-8 text-center bg-zinc-950/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-casino-gold/20">
              <span className="text-casino-gold text-xs font-bold uppercase tracking-[0.3em] mb-2 block">CUMULATIVE PROGRESSIVE JACKPOT</span>
              <div className="font-display font-black text-5xl md:text-7xl text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                ${jackpot.toLocaleString()}
              </div>
            </div>
          </div>
        </section>

        <GameGrid onPlayGame={(id) => {
          if (!user) {
            setShowAuth(true);
          } else {
            setActiveGame(id);
          }
        }} />

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: '💎', title: 'Loyalty Rewards', desc: 'Every bet counts towards your VIP status and exclusive cashback offers.' },
              { icon: '⚡', title: 'Instant Withdrawals', desc: 'Get your winnings in minutes with our automated payment gateway.' },
              { icon: '🎧', title: '24/7 Support', desc: 'Our dedicated concierge is always available to assist with your journey.' }
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-display font-bold text-xl mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-zinc-900/50 py-10">
          <div className="max-w-4xl mx-auto px-4 flex items-center gap-6 text-gray-500">
            <AlertCircle className="w-12 h-12 flex-shrink-0 opacity-20" />
            <p className="text-xs leading-loose uppercase tracking-widest font-bold">
              Gambling can be addictive. Please play responsibly. Our tools allow you to set limits, take breaks, or self-exclude. LuxeVegas is committed to player protection.
            </p>
          </div>
        </section>
      </main>

      <Footer />

      {/* Overlays */}
      <AnimatePresence>
        {activeGame === 'neon-slots' && (
          <SlotMachine onClose={() => setActiveGame(null)} />
        )}
        
        {activeGame && activeGame !== 'neon-slots' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 p-8 rounded-2xl border border-white/10 max-w-sm text-center"
            >
               <Trophy className="w-12 h-12 text-casino-gold mx-auto mb-4" />
               <h3 className="text-xl font-bold mb-2">Coming Soon!</h3>
               <p className="text-gray-400 text-sm mb-6">We're still polishing the {activeGame} experience. Play Neon Strike Slots in the meantime!</p>
               <button onClick={() => setActiveGame(null)} className="btn-gold w-full py-2 text-sm">BACK TO LOBBY</button>
            </motion.div>
          </div>
        )}

        {showAuth && (
          <AuthModal onClose={() => setShowAuth(false)} />
        )}

        {showAdmin && user?.role === 'admin' && (
          <AdminPanel onClose={() => setShowAdmin(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
