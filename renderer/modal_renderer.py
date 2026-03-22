"""
MathViz Manim Renderer — Modal.com serverless deployment.

Deploy with:
    pip install modal
    modal deploy renderer/modal_renderer.py

This creates a serverless web endpoint that runs Manim code and returns base64 video.
No Docker needed — Modal handles the container image.
"""

import modal

# Define the container image with all Manim dependencies
manim_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        # Manim system dependencies
        "build-essential",
        "libcairo2-dev",
        "libpango1.0-dev",
        "ffmpeg",
        # LaTeX for math rendering
        "texlive-latex-base",
        "texlive-fonts-recommended",
        "texlive-latex-recommended",
        "texlive-latex-extra",
        "texlive-fonts-extra",
        "texlive-science",
        "dvisvgm",
    )
    .pip_install(
        "manim==0.18.1",
        "fastapi[standard]",
    )
)

app = modal.App("mathviz-renderer", image=manim_image)


@app.function(timeout=120, memory=2048, keep_warm=1)
@modal.web_endpoint(method="POST")
def render(request: dict):
    """Receive Manim code, render it, return base64 video."""
    import base64
    import os
    import subprocess
    import tempfile
    import uuid

    code = request.get("code", "")
    if not code:
        return {"success": False, "error": "No code provided"}

    job_id = uuid.uuid4().hex[:12]

    with tempfile.TemporaryDirectory(prefix=f"manim_{job_id}_") as tmpdir:
        scene_path = os.path.join(tmpdir, "scene.py")

        with open(scene_path, "w") as f:
            f.write(code)

        try:
            result = subprocess.run(
                [
                    "manim",
                    "render",
                    "-ql",
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
            return {
                "success": False,
                "error": "Rendering timed out after 90 seconds. Try a simpler animation.",
            }

        if result.returncode != 0:
            error_msg = result.stderr or result.stdout
            if len(error_msg) > 2000:
                error_msg = error_msg[:2000] + "\n... (truncated)"
            return {"success": False, "error": error_msg}

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
            return {
                "success": False,
                "error": f"Manim completed but no video file was produced.\n"
                         f"stdout: {result.stdout[:500]}\nstderr: {result.stderr[:500]}",
            }

        with open(video_path, "rb") as vf:
            video_bytes = vf.read()

        video_b64 = base64.b64encode(video_bytes).decode("utf-8")
        return {"success": True, "video_base64": video_b64}


@app.function()
@modal.web_endpoint(method="GET")
def health():
    """Health check endpoint."""
    return {"status": "ok"}
