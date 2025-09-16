
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
    // For server-side, we'll need to get token from request headers
    // This function will be called from API routes that have access to request
    return null; // This will be handled in individual API routes
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
