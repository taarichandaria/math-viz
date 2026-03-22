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
        # OpenGL headless rendering via Xvfb
        "xvfb",
        "libgl1-mesa-glx",
        "libegl1-mesa",
        "libgles2-mesa",
    )
    .pip_install(
        "manim==0.18.1",
        "fastapi[standard]",
    )
    .run_commands(
        # Pre-warm LaTeX: compile common TeX packages so format files are
        # baked into the container image, avoiding first-run latency.
        "python3 -c '"
        "from manim import MathTex, Tex, Text; "
        "MathTex(r\"\\\\int_0^1 x^2 \\\\, dx = \\\\frac{1}{3}\"); "
        "MathTex(r\"\\\\sum_{n=1}^{\\\\infty} \\\\frac{1}{n^2}\"); "
        "Tex(r\"Hello\"); "
        "Text(\"warmup\")"
        "' || true",
    )
)

app = modal.App("mathviz-renderer", image=manim_image)


@app.function(timeout=120, memory=2048, keep_warm=1, gpu="T4")
@modal.web_endpoint(method="POST")
def render(request: dict):
    """Receive Manim code, render it, return base64 video."""
    import base64
    import glob
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

        # Share a persistent TeX cache across renders on warm containers.
        # Manim stores compiled LaTeX SVGs in {media_dir}/Tex/ using
        # content-addressed filenames, so concurrent writes are safe.
        tex_cache = "/tmp/manim_tex_cache"
        os.makedirs(tex_cache, exist_ok=True)
        os.symlink(tex_cache, os.path.join(tmpdir, "Tex"))

        # Use ffmpeg ultrafast preset — trades file size for encoding speed.
        cfg_path = os.path.join(tmpdir, "manim.cfg")
        with open(cfg_path, "w") as f:
            f.write("[CLI]\n")
            f.write("ffmpeg_extra_args = -preset ultrafast\n")

        # Try OpenGL renderer (GPU-accelerated) first via xvfb for headless
        # display, then fall back to Cairo if OpenGL fails.
        opengl_cmd = [
            "xvfb-run", "-a",
            "manim", "render",
            "--renderer=opengl", "--write_to_movie",
            "-ql",
            "--format", "mp4",
            "--media_dir", tmpdir,
            scene_path,
            "MainScene",
        ]
        cairo_cmd = [
            "manim", "render",
            "-ql",
            "--format", "mp4",
            "--media_dir", tmpdir,
            scene_path,
            "MainScene",
        ]

        result = None
        for cmd in [opengl_cmd, cairo_cmd]:
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=90,
                    cwd=tmpdir,
                )
                if result.returncode == 0:
                    break
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
        video_files = glob.glob(os.path.join(tmpdir, "**/*.mp4"), recursive=True)
        if not video_files:
            return {
                "success": False,
                "error": f"Manim completed but no video file was produced.\n"
                         f"stdout: {result.stdout[:500]}\nstderr: {result.stderr[:500]}",
            }

        with open(video_files[0], "rb") as vf:
            video_bytes = vf.read()

        video_b64 = base64.b64encode(video_bytes).decode("utf-8")
        return {"success": True, "video_base64": video_b64}


@app.function()
@modal.web_endpoint(method="GET")
def health():
    """Health check endpoint."""
    return {"status": "ok"}
