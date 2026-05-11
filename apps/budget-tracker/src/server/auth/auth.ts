import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { authPrisma, sharedCookieConfig } from "@hlf/auth-db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Username or email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifier = credentials.identifier.trim();
        const isEmail = identifier.includes("@");

        const user = await authPrisma.user.findUnique({
          where: isEmail
            ? { email: identifier.toLowerCase() }
            : { username: identifier },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          bio: user.bio ?? undefined,
          avatarUrl: user.avatarUrl ?? undefined,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 30,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.username = user.username as string;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.email = user.email;
        token.avatarUrl = user.avatarUrl;
        token.bio = user.bio;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.sub) {
        session.user = {
          id: token.sub,
          username: token.username as string,
          firstName: token.firstName as string,
          lastName: token.lastName as string,
          email: token.email as string,
          bio: token.bio as string,
          avatarUrl: token.avatarUrl as string,
          isAdmin: token.isAdmin as boolean,
        };
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  cookies: sharedCookieConfig(),

  secret: process.env.NEXTAUTH_SECRET,
};

export async function auth() {
  return await getServerSession(authOptions);
}
