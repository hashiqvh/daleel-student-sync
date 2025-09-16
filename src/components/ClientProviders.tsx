'use client';

import { CookiesProvider } from 'react-cookie';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <CookiesProvider>
      {children}
    </CookiesProvider>
  );
}
