'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';

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
  const [cookies, setCookie, removeCookie] = useCookies(['daleel_token', 'daleel_user', 'daleel_expires']);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    ownerId: null,
    token: null,
    expires: null,
    isLoading: true
  });
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('daleel_token');
      const userStr = localStorage.getItem('daleel_user');
      const expires = localStorage.getItem('daleel_expires');

      if (!token || !userStr || !expires) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          ownerId: null,
         
          token: null,
          expires: null,
          isLoading: false
        });
        return;
      }

      try {
        // Parse user data - handle both string and object cases
        let user;
        if (typeof userStr === 'string') {
          user = JSON.parse(userStr);
        } else {
          user = userStr; // Already an object
        }
        
        // Check if token is expired
        const expiryTime = new Date(expires).getTime();
        const currentTime = new Date().getTime();
        
        if (expiryTime <= currentTime) {
          // Token expired, clear storage
          localStorage.removeItem('daleel_token');
          localStorage.removeItem('daleel_user');
          localStorage.removeItem('daleel_expires');
          removeCookie('daleel_session');
          
          setAuthState({
            isAuthenticated: false,
            user: null,
            ownerId: null,
           
            token: null,
            expires: null,
            isLoading: false
          });
          return;
        }

        setAuthState({
          isAuthenticated: true,
          user,
          ownerId: user?.ownerId ?? null,
          token,
          expires,
          isLoading: false
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          ownerId: null,
          token: null,
          expires: null,
          isLoading: false
        });
      }
    };

    checkAuth();

    // Check for token expiry every minute
    const interval = setInterval(checkAuth, 60000);
    
    return () => clearInterval(interval);
  }, [cookies, removeCookie]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('daleel_token');
      localStorage.removeItem('daleel_user');
      localStorage.removeItem('daleel_expires');
      removeCookie('daleel_session');
      setAuthState({
        isAuthenticated: false,
        user: null,
        ownerId: null,
        token: null,
        expires: null,
        isLoading: false
      });
      router.push('/login');
    }
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
