'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface User {
  id: number;
  email: string;
  ownerId: number;
  fullName: {
    en: string;
    ar: string;
  };
  roles: Array<{
    id: number;
    name: {
      en: string;
      ar: string;
    };
    scope: string;
  }>;
  isActive: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  ownerId: number | null;
  token: string | null;
  expires: string | null;
  isLoading: boolean;
}

export function useAuth() {
  const router = useRouter();

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    ownerId: null,
    token: null,
    expires: null,
    isLoading: true
  });

  useEffect(() => {
    // Check localStorage for stored auth data
    const token = localStorage.getItem('daleel_token');
    const userStr = localStorage.getItem('daleel_user');
    const ownerId = localStorage.getItem('daleel_ownerId');
    const expires = localStorage.getItem('daleel_expires');

    if (token && userStr && ownerId) {
      try {
        const user = JSON.parse(userStr);
        setAuthState({
          isAuthenticated: true,
          user,
          ownerId: parseInt(ownerId) || 1413, // fallback to default ownerId
          token,
          expires,
          isLoading: false
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Clear invalid data
        localStorage.removeItem('daleel_token');
        localStorage.removeItem('daleel_user');
        localStorage.removeItem('daleel_ownerId');
        localStorage.removeItem('daleel_expires');
        setAuthState({
          isAuthenticated: false,
          user: null,
          ownerId: null,
          token: null,
          expires: null,
          isLoading: false
        });
      }
    } else {
      setAuthState({
        isAuthenticated: false,
        user: null,
        ownerId: null,
        token: null,
        expires: null,
        isLoading: false
      });
    }
  }, []);

  const logout = async () => {
    // Clear localStorage
    localStorage.removeItem('daleel_token');
    localStorage.removeItem('daleel_user');
    localStorage.removeItem('daleel_ownerId');
    localStorage.removeItem('daleel_expires');
    
    // Reset auth state
    setAuthState({
      isAuthenticated: false,
      user: null,
      ownerId: null,
      token: null,
      expires: null,
      isLoading: false
    });
    
    router.push('/login');
  };

  const getTimeUntilExpiry = (): number => {
    if (!authState.expires) return 0;
    const expiryTime = new Date(authState.expires).getTime();
    const currentTime = new Date().getTime();
    return Math.max(0, expiryTime - currentTime);
  };

  const isTokenExpired = (): boolean => {
    if (!authState.expires) return true;
    return getTimeUntilExpiry() <= 0;
  };

  return {
    ...authState,
    logout,
    getTimeUntilExpiry,
    isTokenExpired
  };
}