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
  signInAnonymously,
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  onSnapshot,
  setDoc, 
  serverTimestamp,
  increment,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { INITIAL_BALANCE } from './constants';
import { handleFirestoreError, OperationType } from './firebase';

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
  loginWithGoogle: () => Promise<void>;
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
        unsub = onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            const userUnsub = onSnapshot(doc(db, 'users', fbUser.uid), (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setUser({
                  id: fbUser.uid,
                  username: data.username,
                  balance: data.balance,
                  role: data.role,
                  mustLose: data.mustLose || false,
                  isGuest: data.isGuest || false,
                });
              } else {
                // Document might not exist yet during registration or anonymous login
                setUser(null);
              }
              setLoading(false);
              clearTimeout(safetyTimeout);
            }, (err) => {
              console.error("User doc listener error:", err.message, {
                uid: fbUser.uid,
                isAnonymous: fbUser.isAnonymous,
                email: fbUser.email
              });
              setLoading(false);
            });
            
            // Cleanup for nested listener
            const outerUnsub = unsub;
            unsub = () => {
              if (outerUnsub) outerUnsub();
              userUnsub();
            };
          } else {
            setUser(null);
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

  const loginWithGoogle = async () => {
    localStorage.removeItem('arcade_guest_id');
    localStorage.removeItem('arcade_guest_name');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (!userDoc.exists()) {
        const username = fbUser.displayName || fbUser.email?.split('@')[0] || `Player_${Math.floor(Math.random() * 9000) + 1000}`;
        const profile = {
          username: username,
          balance: INITIAL_BALANCE,
          role: 'user' as const,
          isOnline: true,
          lastSeen: serverTimestamp(),
          createdAt: serverTimestamp(),
          mustLose: false,
        };
        await setDoc(doc(db, 'users', fbUser.uid), profile);
      }
    } catch (error: any) {
      console.error("Google Login Error:", error);
      throw error;
    }
  };

  const login = async (id: string, pass: string) => {
    localStorage.removeItem('arcade_guest_id');
    localStorage.removeItem('arcade_guest_name');
    const cleanId = id.trim().toLowerCase();
    const email = cleanId.includes('@') ? cleanId : `${cleanId.replace(/[^a-z0-9]/g, '')}@hub.v3`;
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
    const cleanId = id.trim().toLowerCase();
    if (!cleanId) {
      throw { code: 'auth/invalid-id', message: 'Player ID must contain at least one character.' };
    }
    const email = cleanId.includes('@') ? cleanId : `${cleanId.replace(/[^a-z0-9]/g, '')}@hub.v3`;
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
    try {
      const cred = await signInAnonymously(auth);
      const guestId = cred.user.uid;
      const username = `Guest_${Math.floor(Math.random() * 9000) + 1000}`;
      
      const profile = {
        username: username,
        balance: INITIAL_BALANCE,
        role: 'user' as const,
        isOnline: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
        mustLose: false,
        isGuest: true,
      };

      await setDoc(doc(db, 'users', guestId), profile);
      localStorage.setItem('arcade_guest_id', guestId);
      localStorage.setItem('arcade_guest_name', username);
      
      setUser({
        id: guestId,
        username: username,
        balance: INITIAL_BALANCE,
        role: 'user',
        mustLose: false,
        isGuest: true,
      });
    } catch (error) {
      console.error("Guest login failed", error);
      throw error;
    }
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
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, guestLogin, logout, updateBalanceLocally, promoteToAdmin, setMustLose }}>
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
