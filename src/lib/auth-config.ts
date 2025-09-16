import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
/* eslint-disable @typescript-eslint/no-explicit-any */

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'daleel-credentials',
      credentials: {
        username: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // Call the Daleel API for authentication
          const response = await fetch(`${process.env.DALEEL_API_BASE_URL}/api/Auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password
            })
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();
          
          if (data.token && data.user) {
            return {
              id: data.user.id.toString(),
              email: data.user.email,
              name: data.user.fullName?.en || data.user.email,
              token: data.token,
              expires: data.expires,
              ownerId: data.user.ownerId,
              roles: data.user.roles,
              isActive: data.user.isActive
            };
          }

          return null;
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (user) {
        token.accessToken = user.token;
        token.expires = user.expires;
        token.ownerId = user.ownerId;
        token.roles = user.roles;
        token.isActive = user.isActive;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.accessToken = token.accessToken as string;
        session.expires = token.expires as string;
        session.user.ownerId = token.ownerId as number;
        session.user.roles = token.roles as any[];
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
