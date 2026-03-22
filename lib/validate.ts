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

  // Check for non-raw strings in MathTex/Tex calls (the #1 failure cause)
  // Match MathTex(" or Tex(" NOT preceded by r
  const nonRawLatex = /(?:MathTex|Tex)\s*\(\s*"(?!.*r").*\\[a-zA-Z]/;
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

  return {
    valid: errors.length === 0,
    errors,
  };
}
