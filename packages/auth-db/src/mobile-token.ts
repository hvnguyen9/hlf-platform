// Mobile-app JWT mint/verify. Signs with NEXTAUTH_SECRET so every HLF app
// can verify mobile tokens using the same shared secret it already has.
// The `type: "mobile"` claim distinguishes these from NextAuth's web session
// tokens — they share a signing key but should never be cross-accepted.

import jwt from "jsonwebtoken";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export type MobileTokenPayload = {
  sub: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  type: "mobile";
};

export type MobileUser = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
};

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required to mint or verify mobile tokens");
  }
  return secret;
}

export function mintMobileToken(user: MobileUser): {
  token: string;
  expiresAt: string;
} {
  const payload: Omit<MobileTokenPayload, "iat" | "exp"> = {
    sub: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.isAdmin,
    type: "mobile",
  };

  const token = jwt.sign(payload, getSecret(), {
    algorithm: "HS256",
    expiresIn: TOKEN_TTL_SECONDS,
  });

  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

  return { token, expiresAt };
}

export function verifyMobileToken(token: string): MobileUser | null {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ["HS256"],
    }) as MobileTokenPayload;

    if (decoded.type !== "mobile") return null;

    return {
      id: decoded.sub,
      email: decoded.email,
      username: decoded.username,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      isAdmin: decoded.isAdmin,
    };
  } catch {
    return null;
  }
}
