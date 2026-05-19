import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import prisma from "@/server/prisma";
import { z } from "zod";
import { paramsByType } from "@/lib/alerts/types";

const patchBody = z.object({
  enabled: z.boolean().optional(),
  params: z.unknown().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, ctx: Params) {
  const { user } = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const existing = await prisma.alertConfig.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parse = patchBody.safeParse(await request.json().catch(() => null));
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const patch = parse.data;

  let validatedParams: unknown | undefined;
  if (patch.params !== undefined) {
    const schema = paramsByType[existing.type];
    const r = schema.safeParse(patch.params);
    if (!r.success) {
      return NextResponse.json({ error: "Invalid params for type", details: r.error.issues }, { status: 400 });
    }
    validatedParams = r.data;
  }

  const updated = await prisma.alertConfig.update({
    where: { id },
    data: {
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      ...(validatedParams !== undefined
        ? { params: validatedParams as object }
        : {}),
    },
  });
  return NextResponse.json({ config: updated });
}

export async function DELETE(request: Request, ctx: Params) {
  const { user } = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const existing = await prisma.alertConfig.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.alertConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
