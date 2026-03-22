import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAuthConfigured } from "@/lib/runtime-config";
import {
  createDataVideoUrl,
  decodeVideoBase64,
  downloadVideoAsBase64,
  getInlineVideoBase64,
  getInlineVideoContentType,
  getRemoteVideoUrl,
} from "@/lib/video";

function createVideoResponse(
  videoBytes: Buffer,
  contentType: string,
  id: string
) {
  return new NextResponse(new Uint8Array(videoBytes), {
    headers: {
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="mathviz-${id}.mp4"`,
      "Content-Length": videoBytes.byteLength.toString(),
      "Content-Type": contentType,
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthConfigured || !prisma) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const entry = await prisma.historyEntry.findUnique({
    where: { id },
    select: {
      userId: true,
      videoUrl: true,
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const inlineVideoBase64 = getInlineVideoBase64(entry.videoUrl);
  if (inlineVideoBase64) {
    return createVideoResponse(
      decodeVideoBase64(inlineVideoBase64),
      getInlineVideoContentType(entry.videoUrl),
      id
    );
  }

  const remoteVideoUrl = getRemoteVideoUrl(entry.videoUrl);
  if (!remoteVideoUrl) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  try {
    const downloaded = await downloadVideoAsBase64(remoteVideoUrl);

    await prisma.historyEntry.update({
      where: { id },
      data: {
        videoUrl: createDataVideoUrl(downloaded.base64, downloaded.contentType),
      },
    });

    return createVideoResponse(
      decodeVideoBase64(downloaded.base64),
      downloaded.contentType,
      id
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load saved video";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
