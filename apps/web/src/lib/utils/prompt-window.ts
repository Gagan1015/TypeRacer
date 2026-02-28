export type PromptLine = {
  start: number;
  end: number;
  text: string;
};

export type PromptWindow = {
  lines: PromptLine[];
  visibleLines: PromptLine[];
  visibleStartLine: number;
};

export function buildPromptWindow(
  prompt: string,
  typedLength: number,
  lineWidth = 72,
  visibleLineCount = 3
): PromptWindow {
  if (!prompt) {
    return { lines: [], visibleLines: [], visibleStartLine: 0 };
  }

  const maxWidth = Math.max(lineWidth, 20);
  const lines: PromptLine[] = [];
  const minSentenceWidth = Math.max(Math.floor(maxWidth * 0.55), 18);

  function findSentenceBreak(from: number): number | null {
    // Never exceed maxWidth — search backwards from the hard limit
    const searchEnd = Math.min(from + maxWidth, prompt.length - 1);
    const searchStart = Math.min(from + minSentenceWidth, searchEnd);

    for (let index = searchEnd; index >= searchStart; index -= 1) {
      const char = prompt[index];
      if (!char || !/[.!?]/.test(char)) {
        continue;
      }

      const next = prompt[index + 1];
      if (!next || /\s/.test(next)) {
        return index + 1;
      }
    }

    return null;
  }

  let start = 0;
  while (start < prompt.length) {
    if (start + maxWidth >= prompt.length) {
      lines.push({ start, end: prompt.length, text: prompt.slice(start, prompt.length) });
      break;
    }

    let end = start + maxWidth;
    const sentenceBreak = findSentenceBreak(start);

    if (sentenceBreak && sentenceBreak > start) {
      end = sentenceBreak;
    } else {
      let lastWhitespace = -1;

      // Prefer breaking at whitespace so words stay together.
      for (let index = end; index > start; index -= 1) {
        const char = prompt[index];
        if (char && /\s/.test(char)) {
          lastWhitespace = index;
          break;
        }
      }

      if (lastWhitespace > start) {
        // Break before whitespace so line width is not wasted on trailing spaces.
        end = lastWhitespace;
      }
    }

    // Final guard: never break in the middle of a word.
    // If the character at `end` is non-whitespace and so is the one before it,
    // search backwards for the nearest word boundary.
    if (
      end < prompt.length &&
      end > start &&
      prompt[end] !== undefined && !/\s/.test(prompt[end]!) &&
      prompt[end - 1] !== undefined && !/\s/.test(prompt[end - 1]!)
    ) {
      let wordBoundary = -1;
      for (let index = end - 1; index > start; index -= 1) {
        if (/\s/.test(prompt[index]!)) {
          wordBoundary = index;
          break;
        }
      }
      if (wordBoundary > start) {
        end = wordBoundary;
      }
    }

    lines.push({ start, end, text: prompt.slice(start, end) });

    start = end;
    while (start < prompt.length) {
      const char = prompt[start];
      if (!char || !/\s/.test(char)) {
        break;
      }
      start += 1;
    }
  }

  const caret = Math.max(0, Math.min(typedLength, prompt.length));
  let currentLineIndex = Math.max(lines.length - 1, 0);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line && caret <= line.end) {
      currentLineIndex = index;
      break;
    }
  }

  const visibleStartLine = Math.max(0, currentLineIndex - 1);
  const visibleLines = lines.slice(visibleStartLine, visibleStartLine + visibleLineCount);

  return { lines, visibleLines, visibleStartLine };
}
