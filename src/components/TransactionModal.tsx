import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowUpCircle, ArrowDownCircle, Instagram, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

interface TransactionModalProps {
  onClose: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [type, setType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const INSTA_LINK = "https://www.instagram.com/arcade_hub_live?igsh=MXJwcnR3bGY3eml5MQ==";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || loading) return;

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'transaction_requests'), {
        userId: user.id,
        username: user.username,
        amount: val,
        type,
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error("Transaction request failed:", err);
      alert("Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-zinc-950 border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-xl font-black uppercase tracking-widest text-white italic">
            Funds Management
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-10">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30"
              >
                <ArrowUpCircle className="w-10 h-10 text-green-500" />
              </motion.div>
              <h3 className="text-2xl font-black mb-2 uppercase italic">Request Sent!</h3>
              <p className="text-gray-400 mb-8 px-4 leading-relaxed">
                Your {type} request has been submitted to the admin. 
                Please DM us on Instagram for instant processing.
              </p>
              <a 
                href={INSTA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white py-4 px-8 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-lg shadow-pink-500/20"
              >
                <Instagram className="w-5 h-5" />
                MSG ON INSTAGRAM
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type Toggle */}
              <div className="flex p-1 bg-zinc-900 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setType('deposit')}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    type === 'deposit' 
                      ? 'bg-green-600 text-white shadow-lg' 
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4 inline-block mr-2" />
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setType('withdraw')}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    type === 'withdraw' 
                      ? 'bg-red-600 text-white shadow-lg' 
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4 inline-block mr-2" />
                  Withdraw
                </button>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">
                  Amount to {type}
                </label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-500 group-focus-within:text-white transition-colors">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-900 border border-white/5 rounded-3xl py-6 pl-12 pr-6 text-2xl font-black text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-800"
                    required
                  />
                </div>
              </div>

              {/* Alert */}
              <div className="flex gap-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                <AlertCircle className="w-6 h-6 text-indigo-400 shrink-0" />
                <p className="text-[10px] text-gray-400 leading-relaxed uppercase tracking-wider font-bold">
                  All requests require manual approval. For faster processing, reach out to our support team on Instagram after submitting.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl text-xs hover:bg-[#ff007b] hover:text-white transition-all shadow-xl disabled:opacity-50"
                  id="submit-transaction-btn"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : `REQUEST ${type.toUpperCase()}`}
                </button>
                
                <a 
                  href={INSTA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 py-4 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-[#ee2a7b] transition-all"
                >
                  <Instagram className="w-4 h-4" />
                  Direct DM Support
                </a>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
