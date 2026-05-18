// Mints a long-lived bearer JWT for the mobile app. Accepts the same
// identifier+password the web sign-in does (username or email), validates
// against the shared auth DB, and returns a token signed with NEXTAUTH_SECRET.

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { authPrisma, mintMobileToken } from "@hlf/auth-db";

export const dynamic = "force-dynamic";

type Body = {
  identifier?: string;
  password?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const identifier = body.identifier?.trim();
  const password = body.password;

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Missing identifier or password" },
      { status: 400 },
    );
  }

  const isEmail = identifier.includes("@");
  const user = await authPrisma.user.findUnique({
    where: isEmail
      ? { email: identifier.toLowerCase() }
      : { username: identifier },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const { token, expiresAt } = mintMobileToken({
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.isAdmin,
  });

  return NextResponse.json({
    token,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      avatarUrl: user.avatarUrl,
    },
  });
}
