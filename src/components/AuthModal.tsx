/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, register, loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Google Login failed. Please ensure popups are allowed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    if (!cleanUsername || !cleanPassword) return;
    
    if (cleanUsername.includes('@')) {
      setError('Please enter a Player ID (e.g. Player_99), not an email address.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        try {
          await login(cleanUsername, cleanPassword);
        } catch (loginErr: any) {
          // Special case: If logging in as Admin with correct pass fails, try registering as Admin
          if (cleanUsername.toLowerCase() === 'admin' && (cleanPassword === 'Admin1234' || cleanPassword === 'admin1234')) {
            try {
              await register(cleanUsername, cleanPassword);
            } catch (regErr: any) {
              if (regErr.code === 'auth/email-already-in-use') {
                 throw loginErr; // Throw original login error if it already exists
              }
              throw regErr;
            }
          } else {
            throw loginErr;
          }
        }
      } else {
        await register(cleanUsername, cleanPassword);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password auth is not enabled in Firebase Console. Please enable it or use Google Login.');
      } else if (err.code === 'auth/invalid-credential') {
        setError(isLogin 
          ? 'Incorrect Player ID or Secret Key. ACTION REQUIRED: Please log into Firebase Console, go to Authentication > Sign-in method, and ENABLE "Email/Password".' 
          : 'Registration failed. ACTION REQUIRED: You MUST ENABLE "Email/Password" authentication in your Firebase Console for registration to work.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Player ID already taken. Login if it is yours.');
      } else if (err.code === 'auth/invalid-id') {
        setError(err.message);
      } else if (err.code === 'auth/weak-password') {
        setError('Secret Key must be at least 4 characters for security.');
      } else if (err.code === 'auth/invalid-email') {
        setError('ID contains invalid characters.');
      } else {
        setError('Registration failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-[#161616] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff007b]/10 rounded-full blur-[60px] -mr-16 -mt-16"></div>
        
        <div className="p-8 md:p-12 relative z-10">
          <div className="flex justify-between items-center mb-10">
            <div className="space-y-1">
               <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">
                 {isLogin ? 'SECURE' : 'JOIN THE'}<br/>
                 <span className="text-[#ff007b]">{isLogin ? 'LOGIN' : 'ARCADE'}</span>
               </h2>
               <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                 {isLogin ? 'Enter your credentials' : 'Create your player ID'}
               </p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl text-gray-700 hover:text-white transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Player ID</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-[#ff007b] transition-colors" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Player_99"
                  className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-[#ff007b]/50 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Secret Key</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-[#ff007b] transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-[#ff007b]/50 transition-all"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-bold uppercase">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white text-black font-black py-5 rounded-2xl text-sm uppercase tracking-widest shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:bg-[#ff007b] hover:text-white transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                isLogin ? 'SECURE ACCESS' : 'CREATE PLAYER ID'
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-4">
             <div className="h-px flex-1 bg-white/5"></div>
             <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">OR</span>
             <div className="h-px flex-1 bg-white/5"></div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
              {isLogin ? "New Player? Register Here" : "Already a Member? Login"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
