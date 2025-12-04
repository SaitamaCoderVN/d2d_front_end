'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserMode = 'developer' | 'backer';

interface UserModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  toggleMode: () => void;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<UserMode>('developer');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage if available
  useEffect(() => {
    const savedMode = localStorage.getItem('d2d_user_mode') as UserMode;
    if (savedMode && (savedMode === 'developer' || savedMode === 'backer')) {
      setMode(savedMode);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('d2d_user_mode', mode);
    }
  }, [mode, isInitialized]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'developer' ? 'backer' : 'developer'));
  };

  return (
    <UserModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  const context = useContext(UserModeContext);
  if (context === undefined) {
    throw new Error('useUserMode must be used within a UserModeProvider');
  }
  return context;
}

