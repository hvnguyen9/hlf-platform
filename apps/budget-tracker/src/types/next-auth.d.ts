import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      bio?: string;
      avatarUrl?: string;
      isAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    bio?: string;
    avatarUrl?: string;
    isAdmin?: boolean;
  }
}
