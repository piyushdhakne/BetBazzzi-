
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Send, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface BroadcastModalProps {
  onClose: () => void;
}

export function BroadcastModal({ onClose }: BroadcastModalProps) {
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCurrent = async () => {
      const snap = await getDoc(doc(db, 'settings', 'notification'));
      if (snap.exists()) {
        const data = snap.data();
        setMessage(data.message || '');
        setActive(data.active ?? true);
      }
    };
    fetchCurrent();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'notification'), {
        message,
        active,
        updatedAt: serverTimestamp()
      }, { merge: true });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error updating broadcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-zinc-900 w-full max-w-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#ff007b]/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff007b]/20 flex items-center justify-center border border-[#ff007b]/30">
              <Send className="w-5 h-5 text-[#ff007b]" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Broadcast Message</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Global Marquee System</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#ff007b]">Marquee Content</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-black/50 border border-white/5 rounded-xl p-4 text-sm focus:border-[#ff007b] focus:ring-1 focus:ring-[#ff007b] transition-all outline-none min-h-[120px] resize-none"
              placeholder="Enter message to display on the scrolling bar..."
              required
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
             <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${active ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`} />
                <span className="text-xs font-bold uppercase tracking-wider">{active ? 'Status: Active' : 'Status: Disabled'}</span>
             </div>
             <button 
              type="button"
              onClick={() => setActive(!active)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white'}`}
             >
                {active ? 'HIDE BAR' : 'SHOW BAR'}
             </button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
             <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
             <p className="text-[10px] text-yellow-500/70 font-medium">This message will be visible to ALL active users instantly.</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#ff007b] py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-pink-500/20 disabled:opacity-50"
          >
            {loading ? 'PUBLISHING...' : 'PUBLISH BROADCAST'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
