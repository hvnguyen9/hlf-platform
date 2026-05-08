import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";

type AuthSuccess = { ok: true; userId: string };
type AuthFailure = { ok: false; response: NextResponse };
type AuthResult = AuthSuccess | AuthFailure;

export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, userId: session.user.id };
}
