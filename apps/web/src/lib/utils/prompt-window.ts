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
  lineWidth = 52,
  visibleLineCount = 3
): PromptWindow {
  if (!prompt) {
    return { lines: [], visibleLines: [], visibleStartLine: 0 };
  }

  const maxWidth = Math.max(lineWidth, 16);
  const lines: PromptLine[] = [];

  let start = 0;
  while (start < prompt.length) {
    // If the remaining text fits on one line, take it all
    if (start + maxWidth >= prompt.length) {
      lines.push({ start, end: prompt.length, text: prompt.slice(start, prompt.length) });
      break;
    }

    // Look for the last space within the allowed width so we don't split a word
    let end = start + maxWidth;
    const lastSpace = prompt.lastIndexOf(" ", end);

    if (lastSpace > start) {
      // Break right after the space (space stays at end of current line)
      end = lastSpace + 1;
    }
    // else: no space found in range — force-break at maxWidth (very long word)

    lines.push({ start, end, text: prompt.slice(start, end) });
    start = end;
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

  // Shift up only after entering line 3+ (i.e., after completing line 2).
  const visibleStartLine = Math.max(0, currentLineIndex - 1);
  const visibleLines = lines.slice(visibleStartLine, visibleStartLine + visibleLineCount);

  return { lines, visibleLines, visibleStartLine };
}

