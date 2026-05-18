// Unified auth check that supports both the web session cookie (NextAuth) and
// the mobile bearer JWT. Routes that need to be reachable from the mobile app
// call `requireAuth(req)` instead of `getServerSession` directly.

import { getServerSession } from "next-auth";
import { verifyMobileToken, type MobileUser } from "@hlf/auth-db";
import { authOptions } from "./auth";

export type AuthedUser = MobileUser;

export type AuthResult =
  | { user: AuthedUser; source: "web" | "mobile" }
  | { user: null; source: null };

export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) {
      const user = verifyMobileToken(match[1]);
      if (user) return { user, source: "mobile" };
      return { user: null, source: null };
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user) {
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        isAdmin: session.user.isAdmin,
      },
      source: "web",
    };
  }

  return { user: null, source: null };
}
