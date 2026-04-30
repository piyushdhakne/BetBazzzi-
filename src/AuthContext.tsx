/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  increment,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { INITIAL_BALANCE } from './constants';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface UserProfile {
  id: string;
  username: string;
  balance: number;
  role: 'user' | 'admin';
  mustLose?: boolean;
  isGuest?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (id: string, pass: string) => Promise<void>;
  register: (id: string, pass: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
  updateBalanceLocally: (amount: number) => Promise<void>;
  promoteToAdmin: () => Promise<void>;
  setMustLose: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for Guest Session first
    const guestId = localStorage.getItem('arcade_guest_id');
    const guestUsername = localStorage.getItem('arcade_guest_name');
    
    const initAuth = async () => {
      if (guestId && guestUsername) {
        try {
          const userDoc = await getDoc(doc(db, 'users', guestId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              id: guestId,
              username: data.username,
              balance: data.balance,
              role: data.role,
              mustLose: data.mustLose || false,
              isGuest: true,
            });
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Guest session init failed", e);
        }
      }

      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUser({
                id: fbUser.uid,
                username: data.username,
                balance: data.balance,
                role: data.role,
                mustLose: data.mustLose || false,
                isGuest: false,
              });
            } else {
              setUser(null);
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}`);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return unsubscribe;
    };

    let unsub: any;
    initAuth().then(u => unsub = u);

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const login = async (id: string, pass: string) => {
    localStorage.removeItem('arcade_guest_id');
    localStorage.removeItem('arcade_guest_name');
    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${cleanId}@arcade.hub`;
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    
    // Auto-promote if it's the special admin account
    if (id.toLowerCase() === 'admin') {
      try {
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        if (userDoc.exists() && userDoc.data().role !== 'admin') {
          await updateDoc(doc(db, 'users', cred.user.uid), { role: 'admin' });
        }
      } catch (e) {
        console.error("Failed to auto-promote admin", e);
      }
    }
  };

  const register = async (id: string, pass: string) => {
    localStorage.removeItem('arcade_guest_id');
    localStorage.removeItem('arcade_guest_name');
    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${cleanId}@arcade.hub`;
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    
    const isSpecialAdmin = id.toLowerCase() === 'admin';
    const role: 'user' | 'admin' = isSpecialAdmin ? 'admin' : 'user';

    const profile = {
      username: id,
      balance: INITIAL_BALANCE,
      role: role,
      isOnline: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
      mustLose: false,
    };

    try {
      await setDoc(doc(db, 'users', cred.user.uid), profile);
      setUser({
        id: cred.user.uid,
        username: id,
        balance: INITIAL_BALANCE,
        role: isSpecialAdmin ? 'admin' : 'user',
        mustLose: false,
        isGuest: false,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${cred.user.uid}`);
    }
  };

  const guestLogin = async () => {
    const randomId = 'guest_' + Math.random().toString(36).substring(2, 11);
    const username = `Guest_${Math.floor(Math.random() * 9000) + 1000}`;
    
    const profile = {
      username: username,
      balance: INITIAL_BALANCE,
      role: 'user',
      isOnline: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
      mustLose: false,
      isGuest: true,
    };

    await setDoc(doc(db, 'users', randomId), profile);
    localStorage.setItem('arcade_guest_id', randomId);
    localStorage.setItem('arcade_guest_name', username);
    
    setUser({
      id: randomId,
      username: username,
      balance: INITIAL_BALANCE,
      role: 'user',
      mustLose: false,
      isGuest: true,
    });
  };

  const logout = async () => {
    localStorage.removeItem('arcade_guest_id');
    localStorage.removeItem('arcade_guest_name');
    await signOut(auth);
  };

  const updateBalanceLocally = async (amount: number) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, { balance: increment(amount) }, { merge: true });
      setUser(prev => prev ? { ...prev, balance: prev.balance + amount } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const promoteToAdmin = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { role: 'admin' });
      setUser(prev => prev ? { ...prev, role: 'admin' } : null);
    } catch (error) {
      // If rules block standard promotion, we might need a special path if we really want 
      // but for now, the user can just register with the special ID.
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const setMustLose = async () => {
    if (!user || user.mustLose) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { mustLose: true });
      setUser(prev => prev ? { ...prev, mustLose: true } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, guestLogin, logout, updateBalanceLocally, promoteToAdmin, setMustLose }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
