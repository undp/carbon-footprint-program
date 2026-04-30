export interface InsertMarkdownArgs {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  before: string;
  after: string;
  placeholder: string;
  block?: boolean;
  multiline?: boolean;
}

export interface InsertMarkdownResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

const NUMBERED_PREFIX_PATTERN = /^(\d+)\.\s/;

const buildLinePrefix = (before: string, index: number): string => {
  const match = NUMBERED_PREFIX_PATTERN.exec(before);
  if (!match) return before;
  const startNumber = Number(match[1]);
  return `${startNumber + index}. `;
};

export function insertMarkdown({
  value,
  selectionStart,
  selectionEnd,
  before,
  after,
  placeholder,
  block = false,
  multiline = false,
}: InsertMarkdownArgs): InsertMarkdownResult {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const selected = value.slice(start, end);

  const needsLeadingNewline =
    block && start > 0 && value[start - 1] !== "\n" ? "\n" : "";

  if (multiline && selected.length > 0) {
    const lines = selected.split("\n");
    const transformed = lines
      .map((line, index) => `${buildLinePrefix(before, index)}${line}`)
      .join("\n");
    const insertedText = `${needsLeadingNewline}${transformed}${after}`;
    const nextValue = value.slice(0, start) + insertedText + value.slice(end);
    const innerStart = start + needsLeadingNewline.length;
    const innerEnd = innerStart + transformed.length;
    return {
      value: nextValue,
      selectionStart: innerStart,
      selectionEnd: innerEnd,
    };
  }

  const inner = selected.length > 0 ? selected : placeholder;
  const insertedText = `${needsLeadingNewline}${before}${inner}${after}`;
  const nextValue = value.slice(0, start) + insertedText + value.slice(end);

  const innerStart = start + needsLeadingNewline.length + before.length;
  const innerEnd = innerStart + inner.length;

  return {
    value: nextValue,
    selectionStart: innerStart,
    selectionEnd: innerEnd,
  };
}
