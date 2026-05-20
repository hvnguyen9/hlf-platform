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
  | { user: AuthedUser; source: "web" }
  | { user: null; source: null };

export async function requireAuth(_req?: Request): Promise<AuthResult> {
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
