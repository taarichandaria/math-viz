import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAuthConfigured } from "@/lib/runtime-config";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthConfigured || !prisma) {
    return NextResponse.json({ entry: null });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const entry = await prisma.historyEntry.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      prompt: true,
      explanation: true,
      manimCode: true,
      videoUrl: true,
      createdAt: true,
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    entry: {
      id: entry.id,
      prompt: entry.prompt,
      explanation: entry.explanation,
      manimCode: entry.manimCode,
      videoUrl: entry.videoUrl ? `/api/history/${entry.id}/video` : null,
      createdAt: entry.createdAt,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthConfigured || !prisma) {
    return NextResponse.json({ success: true });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const entry = await prisma.historyEntry.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.historyEntry.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
