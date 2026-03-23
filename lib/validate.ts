/**
 * Pre-render validation for Manim code.
 * Catches common issues before wasting a render cycle.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const DEPRECATED_APIS = [
  { pattern: /\bShowCreation\b/, fix: "Use Create instead of ShowCreation" },
  { pattern: /\bTextMobject\b/, fix: "Use Text instead of TextMobject" },
  { pattern: /\bTexMobject\b/, fix: "Use MathTex instead of TexMobject" },
  { pattern: /\bApplyMethod\b/, fix: "Use .animate syntax instead of ApplyMethod" },
  { pattern: /\bShowPassingFlash\b/, fix: "Use Indicate instead of ShowPassingFlash" },
  { pattern: /\bFadeInFromDown\b/, fix: "Use FadeIn(obj, shift=DOWN) instead of FadeInFromDown" },
  { pattern: /\bFadeOutAndShift\b/, fix: "Use FadeOut(obj, shift=direction) instead of FadeOutAndShift" },
];

const FORBIDDEN_IMPORTS = [
  /\bimport\s+os\b/,
  /\bimport\s+sys\b/,
  /\bimport\s+subprocess\b/,
  /\bfrom\s+PIL\b/,
  /\bimport\s+cv2\b/,
  /\bimport\s+requests\b/,
  /\bopen\s*\(/,
];

const RISKY_PATTERNS = [
  {
    pattern: /\balways_redraw\b/,
    fix: "Avoid always_redraw; use static objects or a single Transform instead.",
  },
  {
    pattern: /\bValueTracker\b/,
    fix: "Avoid ValueTracker; it often produces slow renders in this app.",
  },
  {
    pattern: /\bTracedPath\b/,
    fix: "Avoid TracedPath; use a static diagram or a single highlighted point instead.",
  },
  {
    pattern: /\.add_updater\b/,
    fix: "Avoid add_updater; use explicit self.play() steps instead.",
  },
  {
    pattern: /\bThreeDScene\b/,
    fix: "Use Scene instead of ThreeDScene; 3D scenes are too slow for this app.",
  },
];

const MAX_MATHTEX_OBJECTS = 6;
const MAX_PLAY_CALLS = 16;
const MAX_WAIT_CALLS = 12;
const MAX_GRAPH_OBJECTS = 2;

export function validateManimCode(code: string): ValidationResult {
  const errors: string[] = [];

  // Check basic structure
  if (!code.includes("from manim import")) {
    errors.push("Missing 'from manim import *' statement.");
  }

  if (!/class\s+MainScene\s*\(\s*Scene\s*\)/.test(code)) {
    errors.push("Missing 'class MainScene(Scene):' definition. The scene class must be named exactly MainScene.");
  }

  if (!/def\s+construct\s*\(\s*self\s*\)/.test(code)) {
    errors.push("Missing 'def construct(self):' method in MainScene.");
  }

  // Check for deprecated APIs
  for (const { pattern, fix } of DEPRECATED_APIS) {
    if (pattern.test(code)) {
      errors.push(fix);
    }
  }

  // Check for forbidden imports/operations
  for (const pattern of FORBIDDEN_IMPORTS) {
    if (pattern.test(code)) {
      errors.push(`Forbidden operation detected: ${pattern.source}. Do not use external modules or file operations.`);
    }
  }

  for (const { pattern, fix } of RISKY_PATTERNS) {
    if (pattern.test(code)) {
      errors.push(fix);
    }
  }

  // Check for non-raw strings in MathTex/Tex calls (the #1 failure cause)
  // More precise: find MathTex/Tex calls and check each string arg
  const texCalls = code.matchAll(/(?:MathTex|(?<!\w)Tex)\s*\(([^)]+)\)/g);
  for (const match of texCalls) {
    const args = match[1];
    // Find string arguments that contain backslash-letter but aren't raw strings
    const stringArgs = args.matchAll(/(?<!r)(["'])(?:(?!\1).)*\\\w(?:(?!\1).)*\1/g);
    for (const strMatch of stringArgs) {
      // Skip if it's just \n or \t (common Python escapes, not LaTeX)
      if (/^["'][^"']*\\[nt][^"']*["']$/.test(strMatch[0])) continue;
      errors.push(
        `Non-raw string with LaTeX in MathTex/Tex call: ${strMatch[0].slice(0, 50)}... Use raw strings: r"..." for all LaTeX content.`
      );
      break; // One warning is enough
    }
  }

  const mathTexCount = [
    ...(code.match(/\bMathTex\s*\(/g) || []),
    ...(code.match(/(?<!\w)\bTex\s*\(/g) || []),
  ].length;
  if (mathTexCount > MAX_MATHTEX_OBJECTS) {
    errors.push(
      `Scene is too complex: found ${mathTexCount} MathTex/Tex objects. Keep it to ${MAX_MATHTEX_OBJECTS} or fewer.`
    );
  }

  const playCallCount = (code.match(/\bself\.play\s*\(/g) || []).length;
  if (playCallCount > MAX_PLAY_CALLS) {
    errors.push(
      `Scene is too complex: found ${playCallCount} self.play() calls. Keep it to ${MAX_PLAY_CALLS} or fewer.`
    );
  }

  const waitCallCount = (code.match(/\bself\.wait\s*\(/g) || []).length;
  if (waitCallCount > MAX_WAIT_CALLS) {
    errors.push(
      `Scene is too complex: found ${waitCallCount} self.wait() calls. Keep it to ${MAX_WAIT_CALLS} or fewer.`
    );
  }

  const graphObjectCount = [
    ...(code.match(/\bAxes\s*\(/g) || []),
    ...(code.match(/\bNumberPlane\s*\(/g) || []),
    ...(code.match(/\bFunctionGraph\s*\(/g) || []),
    ...(code.match(/\.plot\s*\(/g) || []),
  ].length;
  if (graphObjectCount > MAX_GRAPH_OBJECTS) {
    errors.push(
      `Scene is too complex: found ${graphObjectCount} graph/axes constructions. Keep it to ${MAX_GRAPH_OBJECTS} or fewer.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
