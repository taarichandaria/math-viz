"""
Manim render server — receives Python code, executes it with Manim, returns the video.
"""

import base64
import os
import subprocess
import tempfile
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="MathViz Manim Renderer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.environ.get("RENDERER_API_KEY", "")


class RenderRequest(BaseModel):
    code: str


class RenderResponse(BaseModel):
    success: bool
    video_base64: str | None = None
    error: str | None = None


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/render", response_model=RenderResponse)
async def render(request: RenderRequest):
    job_id = uuid.uuid4().hex[:12]

    with tempfile.TemporaryDirectory(prefix=f"manim_{job_id}_") as tmpdir:
        scene_path = os.path.join(tmpdir, "scene.py")

        # Write the code to a temp file
        with open(scene_path, "w") as f:
            f.write(request.code)

        # Run Manim
        try:
            result = subprocess.run(
                [
                    "manim",
                    "render",
                    "-ql",  # low quality for speed (720p)
                    "--format", "mp4",
                    "--media_dir", tmpdir,
                    scene_path,
                    "MainScene",
                ],
                capture_output=True,
                text=True,
                timeout=90,
                cwd=tmpdir,
            )
        except subprocess.TimeoutExpired:
            return RenderResponse(
                success=False,
                error="Rendering timed out after 90 seconds. Try a simpler animation.",
            )

        if result.returncode != 0:
            error_msg = result.stderr or result.stdout
            # Truncate long error messages
            if len(error_msg) > 2000:
                error_msg = error_msg[:2000] + "\n... (truncated)"
            return RenderResponse(success=False, error=error_msg)

        # Find the output video
        video_path = None
        for root, _dirs, files in os.walk(tmpdir):
            for file in files:
                if file.endswith(".mp4"):
                    video_path = os.path.join(root, file)
                    break
            if video_path:
                break

        if not video_path or not os.path.exists(video_path):
            return RenderResponse(
                success=False,
                error="Manim completed but no video file was produced.\n"
                      f"stdout: {result.stdout[:500]}\nstderr: {result.stderr[:500]}",
            )

        # Read and base64-encode the video
        with open(video_path, "rb") as vf:
            video_bytes = vf.read()

        video_b64 = base64.b64encode(video_bytes).decode("utf-8")

        return RenderResponse(success=True, video_base64=video_b64)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
