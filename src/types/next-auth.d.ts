import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    expires?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      ownerId?: number;
      roles?: Array<{
        id: number;
        name: {
          en: string;
          ar: string;
        };
        scope: string;
      }>;
      isActive?: boolean;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    token?: string;
    expires?: string;
    ownerId?: number;
    roles?: Array<{
      id: number;
      name: {
        en: string;
        ar: string;
      };
      scope: string;
    }>;
    isActive?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    expires?: string;
    ownerId?: number;
    roles?: Array<{
      id: number;
      name: {
        en: string;
        ar: string;
      };
      scope: string;
    }>;
    isActive?: boolean;
  }
}
