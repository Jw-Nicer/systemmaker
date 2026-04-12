import { test, describe } from "vitest";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { InlineMarkdown } from "@/lib/markdown/inline";

function render(source: string): string {
  return renderToStaticMarkup(createElement(InlineMarkdown, { source }));
}

describe("InlineMarkdown", () => {
  // Paragraphs
  test("renders a single line as a paragraph", () => {
    assert.equal(render("Hello world"), '<p class="whitespace-pre-wrap [&amp;:not(:first-child)]:mt-2">Hello world</p>');
  });

  test("blank lines create separate paragraphs", () => {
    const html = render("First\n\nSecond");
    assert.ok(html.includes("First"));
    assert.ok(html.includes("Second"));
    // Two <p> tags
    assert.equal((html.match(/<p /g) ?? []).length, 2);
  });

  // Bold
  test("renders **bold** text", () => {
    const html = render("This is **bold** text");
    assert.ok(html.includes("<strong>bold</strong>"));
  });

  // Italic
  test("renders *italic* text", () => {
    const html = render("This is *italic* text");
    assert.ok(html.includes("<em>italic</em>"));
  });

  // Inline code
  test("renders `code` text", () => {
    const html = render("Run `npm install`");
    assert.ok(html.includes("<code"));
    assert.ok(html.includes("npm install"));
  });

  // Links
  test("renders [text](url) links", () => {
    const html = render("Visit [Nicer Systems](https://nicersystems.com)");
    assert.ok(html.includes('href="https://nicersystems.com"'));
    assert.ok(html.includes("Nicer Systems"));
    assert.ok(html.includes('target="_blank"'));
  });

  test("rejects javascript: links (no <a> tag rendered)", () => {
    const html = render("Click [here](javascript:alert(1))");
    // The raw text still appears as literal content — safe because it's
    // inside a text node, never in an href attribute.
    assert.ok(!html.includes("<a"), "should not render an <a> tag for unsafe href");
  });

  // Bullet lists
  test("renders bullet lists (- items)", () => {
    const html = render("- First\n- Second\n- Third");
    assert.ok(html.includes("<ul"));
    assert.equal((html.match(/<li>/g) ?? []).length, 3);
  });

  test("renders bullet lists (* items)", () => {
    const html = render("* Alpha\n* Beta");
    assert.ok(html.includes("<ul"));
    assert.equal((html.match(/<li>/g) ?? []).length, 2);
  });

  // Ordered lists
  test("renders ordered lists", () => {
    const html = render("1. Step one\n2. Step two\n3. Step three");
    assert.ok(html.includes("<ol"));
    assert.equal((html.match(/<li>/g) ?? []).length, 3);
  });

  // Mixed content
  test("renders mixed paragraphs and lists", () => {
    const html = render("Intro paragraph\n\n- Item A\n- Item B\n\nClosing text");
    assert.equal((html.match(/<p /g) ?? []).length, 2);
    assert.ok(html.includes("<ul"));
    assert.equal((html.match(/<li>/g) ?? []).length, 2);
  });

  // Nested inline
  test("renders bold inside italic and vice versa", () => {
    const html = render("This is **bold with *italic* inside**");
    assert.ok(html.includes("<strong>"));
    assert.ok(html.includes("<em>"));
  });

  // Empty input
  test("renders empty string without error", () => {
    const html = render("");
    assert.equal(html, "");
  });

  // Plain text pass-through
  test("passes through text without markers as plain paragraph", () => {
    const html = render("Just some normal text here");
    assert.ok(html.includes("Just some normal text here"));
  });
});
