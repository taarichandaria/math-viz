import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAuthConfigured } from "@/lib/runtime-config";

export async function DELETE() {
  if (!isAuthConfigured || !prisma) {
    return NextResponse.json({ success: true });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.historyEntry.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
