/**
 * Text formatting utilities for converting standard Latin text (A-Z, a-z, 0-9)
 * to and from Unicode Mathematical Alphanumeric symbols for LinkedIn posts.
 *
 * Mirrored from automations/lib/textFormatting.js — dependency-free, runs client-side only.
 */

const bA = 0x1d400,
  ba = 0x1d41a,
  b0 = 0x1d7ce;
const iA = 0x1d434,
  ia = 0x1d44e,
  biA = 0x1d468,
  bia = 0x1d482;

export type FormatStyle = "bold" | "italic" | "boldItalic";

function getCodePoint(ch: string): number {
  return ch.codePointAt(0) ?? 0;
}

function toBold(ch: string): string {
  const cp = getCodePoint(ch);
  if (cp >= 65 && cp <= 90) return String.fromCodePoint(bA + (cp - 65));
  if (cp >= 97 && cp <= 122) return String.fromCodePoint(ba + (cp - 97));
  if (cp >= 48 && cp <= 57) return String.fromCodePoint(b0 + (cp - 48));
  const plain = toPlainChar(ch);
  if (plain !== ch) return toBold(plain);
  return ch;
}

function toItalic(ch: string): string {
  const cp = getCodePoint(ch);
  if (cp >= 65 && cp <= 90) return String.fromCodePoint(iA + (cp - 65));
  if (cp >= 97 && cp <= 122) {
    if (cp === 104) return String.fromCodePoint(0x210e); // 'h' → ℎ
    return String.fromCodePoint(ia + (cp - 97));
  }
  const plain = toPlainChar(ch);
  if (plain !== ch) return toItalic(plain);
  return ch;
}

function toBoldItalic(ch: string): string {
  const cp = getCodePoint(ch);
  if (cp >= 65 && cp <= 90) return String.fromCodePoint(biA + (cp - 65));
  if (cp >= 97 && cp <= 122) return String.fromCodePoint(bia + (cp - 97));
  if (cp >= 48 && cp <= 57) return String.fromCodePoint(b0 + (cp - 48));
  const plain = toPlainChar(ch);
  if (plain !== ch) return toBoldItalic(plain);
  return ch;
}

function toPlainChar(ch: string): string {
  const cp = getCodePoint(ch);
  if (cp >= bA && cp <= bA + 25) return String.fromCharCode(65 + (cp - bA));
  if (cp >= ba && cp <= ba + 25) return String.fromCharCode(97 + (cp - ba));
  if (cp >= b0 && cp <= b0 + 9) return String.fromCharCode(48 + (cp - b0));
  if (cp >= iA && cp <= iA + 25) return String.fromCharCode(65 + (cp - iA));
  if (cp === 0x210e) return "h";
  if (cp >= ia && cp <= ia + 25) return String.fromCharCode(97 + (cp - ia));
  if (cp >= biA && cp <= biA + 25) return String.fromCharCode(65 + (cp - biA));
  if (cp >= bia && cp <= bia + 25) return String.fromCharCode(97 + (cp - bia));
  return ch;
}

function isBoldChar(ch: string): boolean {
  const cp = getCodePoint(ch);
  return (cp >= bA && cp <= bA + 25) || (cp >= ba && cp <= ba + 25) || (cp >= b0 && cp <= b0 + 9);
}

function isItalicChar(ch: string): boolean {
  const cp = getCodePoint(ch);
  return (
    (cp >= iA && cp <= iA + 25) ||
    cp === 0x210e ||
    (cp >= ia && cp <= ia + 25) ||
    (cp >= 48 && cp <= 57)
  );
}

function isBoldItalicChar(ch: string): boolean {
  const cp = getCodePoint(ch);
  return (
    (cp >= biA && cp <= biA + 25) ||
    (cp >= bia && cp <= bia + 25) ||
    (cp >= b0 && cp <= b0 + 9)
  );
}

function isFormattable(ch: string): boolean {
  const cp = getCodePoint(ch);
  if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122) || (cp >= 48 && cp <= 57)) return true;
  return isBoldChar(ch) || isItalicChar(ch) || isBoldItalicChar(ch);
}

function isInStyle(ch: string, style: FormatStyle): boolean {
  if (style === "bold") return isBoldChar(ch);
  if (style === "italic") return isItalicChar(ch);
  if (style === "boldItalic") return isBoldItalicChar(ch);
  return false;
}

/**
 * Toggles rich-text formatting for a given string.
 * - If ALL formattable characters are already in the target style → reverts to plain.
 * - Otherwise → applies the forward mapping for that style.
 * Non-formattable characters (spaces, punctuation, non-Latin) are left unchanged.
 */
export function toggleFormat(text: string, style: FormatStyle): string {
  const chars = Array.from(text);
  const formattables = chars.filter(isFormattable);
  if (formattables.length === 0) return text;

  const allInStyle = formattables.every((ch) => isInStyle(ch, style));

  return chars
    .map((ch) => {
      if (!isFormattable(ch)) return ch;
      if (allInStyle) return toPlainChar(ch);
      if (style === "bold") return toBold(ch);
      if (style === "italic") return toItalic(ch);
      if (style === "boldItalic") return toBoldItalic(ch);
      return ch;
    })
    .join("");
}
