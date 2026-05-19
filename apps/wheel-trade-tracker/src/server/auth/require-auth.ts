// Unified auth check supporting either the web session cookie (NextAuth) or
// the mobile bearer JWT. Drop-in replacement for `auth()` in user-scoped
// routes that mobile needs to call.
//
// Web sessions get `getEffectiveUserId` applied (admin impersonation honored).
// Mobile bearer tokens never impersonate — `user.id` is the user who actually
// signed in on the device.

import { verifyMobileToken } from "@hlf/auth-db";
import { auth } from "./auth";
import { getEffectiveUserId } from "./getEffectiveUserId";

export type AuthedUser = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
};

export type AuthResult =
  | { user: AuthedUser; source: "web" | "mobile" }
  | { user: null; source: null };

export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) {
      const user = verifyMobileToken(match[1]);
      if (!user) return { user: null, source: null };
      return { user, source: "mobile" };
    }
  }

  const session = await auth();
  if (!session?.user?.id) return { user: null, source: null };

  const id = await getEffectiveUserId(
    session.user.id,
    session.user.isAdmin ?? false,
  );

  return {
    user: {
      id,
      email: session.user.email ?? "",
      username: session.user.username ?? "",
      firstName: session.user.firstName ?? "",
      lastName: session.user.lastName ?? "",
      isAdmin: session.user.isAdmin ?? false,
    },
    source: "web",
  };
}
