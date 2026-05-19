import { PrismaClient } from "./generated/prisma";

const globalForPrisma = globalThis as unknown as { authPrisma: PrismaClient };

export const authPrisma =
  globalForPrisma.authPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.authPrisma = authPrisma;
}

export type { User } from "./generated/prisma";
export { sharedCookieConfig } from "./cookies";
export {
  mintMobileToken,
  verifyMobileToken,
  type MobileUser,
  type MobileTokenPayload,
} from "./mobile-token";
