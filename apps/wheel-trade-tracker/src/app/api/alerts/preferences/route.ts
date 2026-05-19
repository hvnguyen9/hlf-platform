import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import prisma from "@/server/prisma";
import { z } from "zod";

const patchBody = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  emailAddress: z.string().email().nullable().optional(),
  quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
  quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
  timezone: z.string().min(1).max(64).optional(),
});

async function getOrCreate(userId: string) {
  const existing = await prisma.userAlertPreferences.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userAlertPreferences.create({
    data: { userId, updatedAt: new Date() },
  });
}

export async function GET(request: Request) {
  const { user } = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prefs = await getOrCreate(user.id);
  return NextResponse.json({ preferences: prefs });
}

export async function PATCH(request: Request) {
  const { user } = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parse = patchBody.safeParse(await request.json().catch(() => null));
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  await getOrCreate(user.id);
  const updated = await prisma.userAlertPreferences.update({
    where: { userId: user.id },
    data: parse.data,
  });
  return NextResponse.json({ preferences: updated });
}
