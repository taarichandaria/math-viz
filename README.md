# MathViz

Describe a math concept in plain English and get an animated video explanation powered by [Manim](https://www.manim.community/) and Claude.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![Claude](https://img.shields.io/badge/Claude-Anthropic-blueviolet) ![Manim](https://img.shields.io/badge/Manim-Community-blue)

---

## How It Works

1. **You describe a concept** — e.g. "Explain the intuition behind eigenvalues"
2. **Claude generates Manim code + a narration** — a complete Python animation script and a timestamped written explanation
3. **The renderer executes the Manim code** — producing an MP4 video
4. **You watch the result** — the video plays in-browser with the narration synced alongside it

```
[Browser] → [Next.js API] → [Claude] → Manim code + explanation
                           → [Renderer] → MP4 video
```

The system covers topics across Calculus, Linear Algebra, Topology, Differential Equations, Number Theory, and more.

---

## Features

- **AI-generated animations** — Claude writes Manim code tailored to the concept, with automatic retry on render failures
- **Synchronized narration** — timestamped explanations that follow along with the animation
- **LaTeX rendering** — mathematical notation rendered inline via KaTeX
- **Code viewer** — inspect the generated Manim source code for any visualization
- **User accounts & history** — sign in to save and revisit past generations
- **Graceful error handling** — automatic retries, resolution fallbacks, and clear error messages when renders fail

---

## Architecture

| Component | Tech | Purpose |
|-----------|------|---------|
| Frontend | Next.js 15, React 19, Tailwind CSS | UI, video player, narration display |
| AI | Anthropic Claude API | Generates Manim code and written explanations |
| Renderer | Python (FastAPI) + Manim Community Edition | Executes Manim code and returns MP4 videos |
| Auth | NextAuth.js | User accounts and session management |
| Database | SQLite via Prisma | Stores user history |

---

## Project Structure

```
app/                  → Next.js pages and API routes
  api/generate/       → Main generation endpoint
  history/            → Past visualizations
lib/
  claude.ts           → Claude API integration and prompt construction
  prompts.ts          → System prompts for Manim code generation
  renderer.ts         → Client for the Manim rendering service
prisma/               → Database schema
renderer/
  render_server.py    → FastAPI server that executes Manim code
  modal_renderer.py   → Modal.com deployment variant
  Dockerfile          → Container image with Manim + dependencies
```
