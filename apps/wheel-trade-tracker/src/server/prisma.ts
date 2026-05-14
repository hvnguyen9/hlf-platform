import { PrismaClient } from "@/generated/prisma/client";

// Single PrismaClient for the whole app. Caching it on `globalThis` keeps
// warm serverless instances from leaking new clients across requests.
// Cold starts still create one client per instance — that's expected.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
