import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: any;
}

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(
      collection(db, 'global_chat'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs.reverse());
    });

    return () => unsub();
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || loading) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'global_chat'), {
        userId: user.id,
        username: user.username,
        text: newMessage.trim().substring(0, 200),
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (err) {
      console.error("Chat send error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 h-96 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col mb-4 border border-gray-100"
            id="chat-window"
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <span className="font-bold tracking-tight">GLOBAL CHAT</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-indigo-700 p-1 rounded-full transition-colors"
                id="close-chat-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
              id="chat-messages"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.userId === user?.id ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-gray-500 mb-0.5 px-1 uppercase font-bold">
                    {msg.username}
                  </span>
                  <div 
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                      msg.userId === user?.id 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border-none"
                disabled={!user}
              />
              <button
                type="submit"
                disabled={!user || !newMessage.trim() || loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-colors disabled:opacity-50"
                id="send-chat-btn"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 group"
        id="toggle-chat-btn"
      >
        <MessageSquare className="w-6 h-6" />
        {!isOpen && <span className="font-bold tracking-tight pr-2">CHAT</span>}
      </motion.button>
    </div>
  );
};
