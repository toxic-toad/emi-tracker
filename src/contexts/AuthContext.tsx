import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  user: User | { uid: string; email: string; displayName: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'emi_tracker_local_user';

function getLocalUser() {
  try {
    const data = localStorage.getItem(LOCAL_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setLocalUser(user: { uid: string; email: string; displayName: string } | null) {
  if (user) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_USER_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | { uid: string; email: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseConfigured()) {
      const unsubscribe = onAuthStateChanged(auth!, (fbUser) => {
        setUser(fbUser);
        setLoading(false);
      });
      return unsubscribe;
    }
    const localUser = getLocalUser();
    if (localUser) {
      setUser(localUser);
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isFirebaseConfigured()) {
      try {
        await signInWithEmailAndPassword(auth!, email, password);
        toast.success('Signed in successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to sign in');
        throw error;
      }
    } else {
      const localUser = { uid: 'local', email, displayName: email.split('@')[0] };
      setLocalUser(localUser);
      setUser(localUser);
      toast.success('Signed in successfully (local mode)');
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (isFirebaseConfigured()) {
      try {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        await createUserWithEmailAndPassword(auth!, email, password);
        toast.success('Account created successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to create account');
        throw error;
      }
    } else {
      const localUser = { uid: 'local', email, displayName: email.split('@')[0] };
      setLocalUser(localUser);
      setUser(localUser);
      toast.success('Account created successfully (local mode)');
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (isFirebaseConfigured()) {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth!, provider);
        toast.success('Signed in with Google');
      } catch (error: any) {
        toast.error(error.message || 'Failed to sign in with Google');
        throw error;
      }
    } else {
      const localUser = { uid: 'local_google', email: 'user@local.app', displayName: 'Local User' };
      setLocalUser(localUser);
      setUser(localUser);
      toast.success('Signed in with Google (local mode)');
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (isFirebaseConfigured()) {
      try {
        await sendPasswordResetEmail(auth!, email);
        toast.success('Password reset email sent');
      } catch (error: any) {
        toast.error(error.message || 'Failed to send reset email');
        throw error;
      }
    } else {
      toast.success('Password reset link would be sent (local mode)');
    }
  }, []);

  const signOut = useCallback(async () => {
    if (isFirebaseConfigured()) {
      try {
        await firebaseSignOut(auth!);
        toast.success('Signed out successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to sign out');
        throw error;
      }
    } else {
      setLocalUser(null);
      setUser(null);
      toast.success('Signed out successfully');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithGoogle, signUp, resetPassword, signOut }}>
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
