import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from './components/Navbar';
import LiveTicker from './components/LiveTicker';
import Hero from './components/Hero';
import GameGrid from './components/GameGrid';
import Footer from './components/Footer';
import MultiplayerSpinner from './components/MultiplayerSpinner';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import PlayerHistory from './components/PlayerHistory';
import IPLBetting from './components/IPLBetting';
import SuperSpin from './components/SuperSpin';
import PlinkoDrop from './components/PlinkoDrop';
import MinesGame from './components/MinesGame';
import GlobalNotification from './components/GlobalNotification';
import { BroadcastModal } from './components/BroadcastModal';
import { NewsModal } from './components/NewsModal';
import { Chat } from './components/Chat';
import { TransactionModal } from './components/TransactionModal';
import { Trophy, Zap, AlertCircle, Bell } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function App() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [jackpot, setJackpot] = useState(1284592);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const { user, loading } = useAuth();

  const handleBroadcastClick = () => {
    if (user?.role === 'admin') {
      setShowBroadcast(true);
    } else {
      setShowNews(true);
    }
  };

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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#ff007b] selection:text-white">
      <Navbar 
        onAuthClick={() => setShowAuth(true)} 
        onAdminClick={() => setShowAdmin(true)} 
        onBroadcastClick={handleBroadcastClick}
        onHistoryClick={() => user ? setShowHistory(true) : setShowAuth(true)}
        onTransactionClick={() => user ? setShowTransactions(true) : setShowAuth(true)}
      />
      <GlobalNotification />
      <LiveTicker />
      
      <main className="pb-20">
        <Hero 
          onPlay={() => user ? setActiveGame('multi-spinner') : setShowAuth(true)} 
          onBroadcastClick={handleBroadcastClick}
          isAdmin={user?.role === 'admin'}
        />
        
        <GameGrid onPlayGame={(id) => {
          if (!user) {
            setShowAuth(true);
          } else {
            setActiveGame(id);
          }
        }} />

        {/* Player History Modal Toggle is handled in Navbar */}

        {/* Responsible Gaming Footer */}
        <section className="max-w-4xl mx-auto px-6 py-20 mt-10 border-t border-white/5 opacity-30 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-4" />
            <p className="text-[10px] leading-loose uppercase tracking-[0.2em] font-black italic">
              Gambling can be addictive. Please play responsibly. LUXE ARCADE is committed to player protection and fair play.
            </p>
        </section>
      </main>

      <Footer />

      <Chat />

      {/* Overlays */}
      <AnimatePresence>
        {activeGame === 'multi-spinner' && (
          <MultiplayerSpinner onClose={() => setActiveGame(null)} />
        )}

        {activeGame === 'ipl-probability' && (
          <IPLBetting onClose={() => setActiveGame(null)} />
        )}

        {activeGame === 'super-spin' && (
          <SuperSpin onClose={() => setActiveGame(null)} />
        )}

        {activeGame === 'mega-drop' && (
          <PlinkoDrop onClose={() => setActiveGame(null)} />
        )}

        {activeGame === 'mines' && (
          <MinesGame onClose={() => setActiveGame(null)} />
        )}
        
        {activeGame && !['multi-spinner', 'ipl-probability', 'super-spin', 'mega-drop', 'mines'].includes(activeGame) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 p-8 rounded-2xl border border-white/10 max-w-sm text-center"
            >
               <Trophy className="w-12 h-12 text-casino-gold mx-auto mb-4" />
               <h3 className="text-xl font-bold mb-2">Coming Soon!</h3>
               <p className="text-gray-400 text-sm mb-6">We're still polishing the {activeGame} experience. Play Multiplayer Spinner in the meantime!</p>
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

        {showBroadcast && user?.role === 'admin' && (
          <BroadcastModal onClose={() => setShowBroadcast(false)} />
        )}

        {showNews && (
          <NewsModal onClose={() => setShowNews(false)} />
        )}

        {showHistory && user && (
          <PlayerHistory onClose={() => setShowHistory(false)} />
        )}

        {showTransactions && user && (
          <TransactionModal onClose={() => setShowTransactions(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
