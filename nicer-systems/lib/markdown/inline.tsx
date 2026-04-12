/**
 * Minimal, dependency-free inline markdown renderer.
 *
 * Scope (intentionally narrow — supports the patterns the chat agent
 * actually emits):
 *
 * - Paragraph breaks   (blank lines)
 * - Bold               **text**
 * - Italic             *text*
 * - Inline code        `text`
 * - Links              [text](url)
 * - Bullet lists       lines starting with `-` or `*`
 * - Ordered lists      lines starting with `1.`, `2.`, …
 *
 * Anything not in this set falls through as plain text (with original
 * whitespace preserved). The renderer never executes user input as HTML
 * — every output is constructed as React elements, so XSS through the
 * markdown surface is not possible.
 *
 * The chat agent's structured plan content goes through `ChatPlanCard`'s
 * per-section renderers, not this module — this is only for free-form
 * agent message bubbles.
 */
import { Fragment } from "react";

type Block =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

const ORDERED_LIST_RE = /^\s*\d+\.\s+(.*)$/;
const BULLET_LIST_RE = /^\s*[-*]\s+(.*)$/;

/** Group consecutive lines into paragraph / list blocks. */
function tokenize(source: string): Block[] {
  const blocks: Block[] = [];
  // Normalize line endings; split on hard newlines.
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  let current: Block | null = null;

  const flush = () => {
    if (current) {
      blocks.push(current);
      current = null;
    }
  };

  for (const raw of lines) {
    const line = raw;
    const trimmed = line.trim();

    if (trimmed === "") {
      flush();
      continue;
    }

    const ulMatch = line.match(BULLET_LIST_RE);
    if (ulMatch) {
      if (current?.kind !== "ul") {
        flush();
        current = { kind: "ul", items: [] };
      }
      current.items.push(ulMatch[1]);
      continue;
    }

    const olMatch = line.match(ORDERED_LIST_RE);
    if (olMatch) {
      if (current?.kind !== "ol") {
        flush();
        current = { kind: "ol", items: [] };
      }
      current.items.push(olMatch[1]);
      continue;
    }

    if (current?.kind !== "paragraph") {
      flush();
      current = { kind: "paragraph", lines: [] };
    }
    current.lines.push(line);
  }

  flush();
  return blocks;
}

/**
 * Render inline markdown (bold, italic, code, links) within a single line.
 * Returns an array of React nodes.
 */
function renderInline(text: string): React.ReactNode[] {
  // Tokenize by walking the string and matching the next inline marker.
  // Order matters: links contain bracketed text, code is literal, bold
  // must be checked before italic because `**` would otherwise be parsed
  // as two italics.
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  const pushText = (slice: string) => {
    if (slice) nodes.push(slice);
  };

  while (cursor < text.length) {
    // Inline code: `…`
    if (text[cursor] === "`") {
      const end = text.indexOf("`", cursor + 1);
      if (end !== -1) {
        nodes.push(
          <code
            key={`c-${key++}`}
            className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.92em]"
          >
            {text.slice(cursor + 1, end)}
          </code>
        );
        cursor = end + 1;
        continue;
      }
    }

    // Bold: **…**
    if (text[cursor] === "*" && text[cursor + 1] === "*") {
      const end = text.indexOf("**", cursor + 2);
      if (end !== -1) {
        nodes.push(
          <strong key={`b-${key++}`}>
            {renderInline(text.slice(cursor + 2, end))}
          </strong>
        );
        cursor = end + 2;
        continue;
      }
    }

    // Italic: *…* (single asterisk; must not be part of bold which we
    // already handled above)
    if (text[cursor] === "*") {
      const end = text.indexOf("*", cursor + 1);
      if (end !== -1 && end !== cursor + 1) {
        nodes.push(
          <em key={`i-${key++}`}>
            {renderInline(text.slice(cursor + 1, end))}
          </em>
        );
        cursor = end + 1;
        continue;
      }
    }

    // Link: [text](url)
    if (text[cursor] === "[") {
      const closeBracket = text.indexOf("]", cursor + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
        const closeParen = text.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          const label = text.slice(cursor + 1, closeBracket);
          const href = text.slice(closeBracket + 2, closeParen);
          if (isSafeHref(href)) {
            nodes.push(
              <a
                key={`l-${key++}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-current/40 underline-offset-2 hover:decoration-current"
              >
                {renderInline(label)}
              </a>
            );
            cursor = closeParen + 1;
            continue;
          }
        }
      }
    }

    // Plain text: consume until the next potential marker.
    const next = findNextMarker(text, cursor + 1);
    pushText(text.slice(cursor, next));
    cursor = next;
  }

  return nodes;
}

/** Allow http/https/mailto links only. */
function isSafeHref(href: string): boolean {
  if (!href) return false;
  const lower = href.toLowerCase().trim();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("/")
  );
}

function findNextMarker(text: string, from: number): number {
  let next = text.length;
  for (const marker of ["`", "*", "["]) {
    const idx = text.indexOf(marker, from);
    if (idx !== -1 && idx < next) next = idx;
  }
  return next;
}

interface InlineMarkdownProps {
  source: string;
  /** Optional className applied to each paragraph wrapper. */
  paragraphClassName?: string;
}

/**
 * Render a markdown source string. Always returns a Fragment containing
 * paragraph / list blocks. Safe to drop into any text bubble.
 */
export function InlineMarkdown({
  source,
  paragraphClassName,
}: InlineMarkdownProps) {
  const blocks = tokenize(source);

  return (
    <Fragment>
      {blocks.map((block, blockIdx) => {
        if (block.kind === "ul") {
          return (
            <ul
              key={blockIdx}
              className="my-1 list-disc space-y-0.5 pl-5"
            >
              {block.items.map((item, i) => (
                <li key={i}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol
              key={blockIdx}
              className="my-1 list-decimal space-y-0.5 pl-5"
            >
              {block.items.map((item, i) => (
                <li key={i}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        // paragraph: preserve hard line breaks within a paragraph block
        // by joining with <br/> elements rather than collapsing whitespace.
        return (
          <p
            key={blockIdx}
            className={
              paragraphClassName ??
              "whitespace-pre-wrap [&:not(:first-child)]:mt-2"
            }
          >
            {block.lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </Fragment>
  );
}
