import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    currentPassword: string; newPassword: string;
  };

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isValid = await bcrypt.compare(body.currentPassword, user.password);
  if (!isValid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const hashed = await bcrypt.hash(body.newPassword, 10);
  await prisma.user.update({ where: { id: auth.userId }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}
