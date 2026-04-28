export interface InsertMarkdownArgs {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  before: string;
  after: string;
  placeholder: string;
  block?: boolean;
}

export interface InsertMarkdownResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export function insertMarkdown({
  value,
  selectionStart,
  selectionEnd,
  before,
  after,
  placeholder,
  block = false,
}: InsertMarkdownArgs): InsertMarkdownResult {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const selected = value.slice(start, end);
  const inner = selected.length > 0 ? selected : placeholder;

  const needsLeadingNewline =
    block && start > 0 && value[start - 1] !== "\n" ? "\n" : "";

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
