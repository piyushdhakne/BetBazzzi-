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
  signInWithPopup,
  GoogleAuthProvider,
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
    let unsub: (() => void) | undefined;
    
    // Safety timeout to ensure loading screen doesn't stay forever
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const guestId = localStorage.getItem('arcade_guest_id');
    const guestUsername = localStorage.getItem('arcade_guest_name');
    
    const initAuth = async () => {
      try {
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
              clearTimeout(safetyTimeout);
              return;
            }
          } catch (e) {
            console.error("Guest session init failed", e);
          }
        }

        unsub = onAuthStateChanged(auth, async (fbUser) => {
          try {
            if (fbUser) {
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
                // If document is missing but user has an admin email, we can temporarily set them as admin
                // so the login logic can create the document
                const email = fbUser.email || '';
                const isAdminEmail = email === 'admin@hub.v3' || email === '1234@hub.v3' || email === '12345@hub.v3';
                
                if (isAdminEmail) {
                   setUser({
                     id: fbUser.uid,
                     username: email.split('@')[0],
                     balance: 10,
                     role: 'admin',
                     mustLose: false,
                     isGuest: false,
                   });
                } else {
                  setUser(null);
                }
              }
            } else {
              setUser(null);
            }
          } catch (error) {
            console.error("Auth state user doc fetch failed", error);
            setUser(null);
          } finally {
            setLoading(false);
            clearTimeout(safetyTimeout);
          }
        });
      } catch (error) {
        console.error("Auth initialization failed", error);
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    };

    initAuth();

    return () => {
      if (unsub) unsub();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const normalizePassword = (pass: string) => {
    // Firebase requires 6 chars. If user enters less, we pad it consistently
    if (pass.length < 6) {
      return `${pass}_arcade_hub`; // pad to satisfy Firebase
    }
    return pass;
  };

  const login = async (id: string, pass: string) => {
    localStorage.removeItem('arcade_guest_id');
    localStorage.removeItem('arcade_guest_name');
    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${cleanId}@hub.v3`;
    const normalizedPass = normalizePassword(pass);
    try {
      await signInWithEmailAndPassword(auth, email, normalizedPass);
    } catch (err: any) {
      console.error("Firebase Login Error:", err.code, err.message);
      // Special case for the requested admin account: if login fails, attempt to register it
      if ((cleanId === '1234' || cleanId === '12345' || cleanId === 'admin') && (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email')) {
        try {
          await register(id, pass);
          return;
        } catch (regErr) {
          console.error("Auto-registration failed:", regErr);
        }
      }
      throw err;
    }
    
    // Auto-promote if it's the special admin account
    const isAdminId = cleanId === 'admin' || cleanId === '1234' || cleanId === '12345';
    if (isAdminId) {
      try {
        const uid = auth.currentUser?.uid;
        if (uid) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (!userDoc.exists()) {
            // Document missing, create it
            const profile = {
              username: id.trim(),
              balance: INITIAL_BALANCE,
              role: 'admin' as const,
              isOnline: true,
              lastSeen: serverTimestamp(),
              createdAt: serverTimestamp(),
              mustLose: false,
            };
            await setDoc(doc(db, 'users', uid), profile);
            setUser({
              id: uid,
              username: id.trim(),
              balance: INITIAL_BALANCE,
              role: 'admin',
              mustLose: false,
              isGuest: false,
            });
          } else if (userDoc.data().role !== 'admin') {
            await updateDoc(doc(db, 'users', uid), { role: 'admin' });
          }
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
    if (!cleanId) {
      throw { code: 'auth/invalid-id', message: 'Player ID must contain at least one alphanumeric character.' };
    }
    const email = `${cleanId}@hub.v3`;
    const normalizedPass = normalizePassword(pass);
    
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, normalizedPass);
      
      const isAdminId = cleanId === 'admin' || cleanId === '1234' || cleanId === '12345';
      const role: 'user' | 'admin' = isAdminId ? 'admin' : 'user';

      const profile = {
        username: id.trim(),
        balance: INITIAL_BALANCE,
        role: role,
        isOnline: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
        mustLose: false,
      };

      await setDoc(doc(db, 'users', cred.user.uid), profile);
      setUser({
        id: cred.user.uid,
        username: id.trim(),
        balance: INITIAL_BALANCE,
        role: role,
        mustLose: false,
        isGuest: false,
      });
    } catch (error: any) {
      console.error("Firebase Register Error:", error.code, error.message);
      throw error;
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
