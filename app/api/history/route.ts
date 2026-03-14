import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAuthConfigured } from "@/lib/runtime-config";

const MAX_HISTORY = 50;

export async function GET() {
  if (!isAuthConfigured || !prisma) {
    return NextResponse.json({ entries: [] });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.historyEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY,
    select: {
      id: true,
      prompt: true,
      explanation: true,
      manimCode: true,
      videoUrl: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  if (!isAuthConfigured || !prisma) {
    return NextResponse.json({ entry: null }, { status: 200 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { prompt, explanation, manimCode, videoUrl } = body;

  if (!prompt || !explanation || !manimCode) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const entry = await prisma.historyEntry.create({
    data: {
      userId: session.user.id,
      prompt,
      explanation,
      manimCode,
      videoUrl: videoUrl || null,
    },
  });

  // Enforce per-user max history cap
  const count = await prisma.historyEntry.count({
    where: { userId: session.user.id },
  });
  if (count > MAX_HISTORY) {
    const oldest = await prisma.historyEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      take: count - MAX_HISTORY,
      select: { id: true },
    });
    await prisma.historyEntry.deleteMany({
      where: { id: { in: oldest.map((e: { id: string }) => e.id) } },
    });
  }

  return NextResponse.json({ entry }, { status: 201 });
}
