import { cookies } from 'next/headers';

export interface User {
  id: number;
  email: string;
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
  ownerId: number;
}

export interface AuthData {
  token: string;
  user: User;
  expires: string;
}

export async function getAuthData(): Promise<AuthData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('daleel_token')?.value;
    const userStr = cookieStore.get('daleel_user')?.value;
    const expires = cookieStore.get('daleel_expires')?.value;

    if (!token || !userStr || !expires) {
      return null;
    }

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
      return null; // Token expired
    }

    return {
      token,
      user,
      expires
    };
  } catch (error) {
    console.error('Error getting auth data:', error);
    return null;
  }
}

export function isTokenExpired(expires: string): boolean {
  const expiryTime = new Date(expires).getTime();
  const currentTime = new Date().getTime();
  return expiryTime <= currentTime;
}

export function getTimeUntilExpiry(expires: string): number {
  const expiryTime = new Date(expires).getTime();
  const currentTime = new Date().getTime();
  return Math.max(0, expiryTime - currentTime);
}
