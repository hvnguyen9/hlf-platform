// Compat shim: both `db` and `prisma` are the same singleton from ./prisma.
// Older code imported either name from `@/server/db` and we want all paths
// to resolve to one PrismaClient — avoids opening multiple connections on
// serverless cold starts.

export { prisma as db, prisma, default } from "./prisma";
