/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  collection, 
  query, 
  getDocs, 
  updateDoc, 
  doc, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { X, Users, Activity, DollarSign, ArrowUpRight, ArrowDownLeft, ShieldCheck } from 'lucide-react';
import { handleFirestoreError } from '../AuthContext';

interface UserData {
  id: string;
  username: string;
  balance: number;
  role: string;
}

interface LogData {
  id: string;
  action: string;
  timestamp: any;
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
      const logsSnap = await getDocs(query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(20)));
      
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserData)));
      setLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LogData)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustBalance = async (userId: string, amount: number) => {
    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, {
        balance: users.find(u => u.id === userId)!.balance + amount
      });
      
      // Log it
      await addDoc(collection(db, 'system_logs'), {
        action: `Balance adjusted for ${userId} by ${amount}`,
        adminId: auth.currentUser?.uid,
        targetId: userId,
        timestamp: serverTimestamp()
      });
      
      fetchData();
    } catch (error) {
      handleFirestoreError(error, 'update' as any, `users/${userId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-casino-bg p-4 md:p-10 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-casino-gold/10 border border-casino-gold/20 rounded-xl">
              <ShieldCheck className="text-casino-gold w-8 h-8" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl">ADMINISTRATOR CONTROL</h1>
              <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">LuxeVegas Command Center</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Management */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <Users className="text-casino-gold w-5 h-5" />
                <h2 className="font-bold uppercase tracking-widest text-sm">Player Database</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                      <th className="pb-4">Username</th>
                      <th className="pb-4 text-right">Balance</th>
                      <th className="pb-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map(u => (
                      <tr key={u.id} className="text-sm">
                        <td className="py-4 font-mono">{u.username}</td>
                        <td className="py-4 text-right tabular-nums font-bold text-casino-gold">${u.balance.toLocaleString()}</td>
                        <td className="py-4 text-right flex justify-end gap-2">
                          <button 
                            onClick={() => handleAdjustBalance(u.id, 100)}
                            className="p-1 px-2 text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 rounded hover:bg-green-500/20"
                          >
                            +$100
                          </button>
                          <button 
                            onClick={() => handleAdjustBalance(u.id, -100)}
                            className="p-1 px-2 text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20"
                          >
                            -$100
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Activity Logs */}
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 h-full">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="text-casino-gold w-5 h-5" />
                <h2 className="font-bold uppercase tracking-widest text-sm">System Events</h2>
              </div>
              
              <div className="space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="p-3 bg-zinc-950 border border-white/5 rounded-xl text-[10px]">
                    <div className="text-gray-400 mb-1">{new Date(log.timestamp?.seconds * 1000).toLocaleString()}</div>
                    <div className="text-white font-medium">{log.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
