/* eslint-disable no-console */
/**
 * Brand-voice grep — scans the codebase for forbidden words/phrases from
 * file 21_BRAND_SYSTEM.md ("Forbidden words consolidated list") and the
 * "no exclamation marks" rule.
 *
 * Run via: npm run check:brand
 * CI gates this on every PR (file 27).
 */
import { promises as fs } from 'fs';
import * as path from 'path';

// Canonical forbidden-word list from file 21 (lint-enforced union).
const FORBIDDEN_WORDS: ReadonlyArray<string> = [
  'amazing',
  'incredible',
  'transformation',
  'glow',
  'glowing',
  'glow up',
  'miracle',
  'breakthrough',
  'best version',
  'your best self',
  'radiant',
  'fight',
  'combat',
  'defeat',
  'reverse',
  'restore',
  'regain',
  'anti-aging',
  'aging issue',
  'problem area',
  'youthful',
  'youthful-ize',
  'self-care journey',
  'wellness journey',
  'crushed',
  'crushing',
  'killing',
  'savage',
  'queen',
  'slay',
  'yass',
];

// Anti-pattern phrases (file 22 + 36 + 39 + 41 + 46 + 47).
const FORBIDDEN_PHRASES: ReadonlyArray<string> = [
  'oops',
  'whoops',
  'sorry,',
  'we miss you',
  "don't break",
  'looksmaxx',
  'mewing',
];

// Files we DO scan.
const ROOTS = ['app', 'src', 'modules'];
// Path globs we DON'T scan.
const SKIP = ['node_modules', '__tests__', '.test.', '.spec.', '/build/', '/dist/'];

const TEXT_LITERAL = /(['"`])((?:\\.|(?!\1).)*?)\1/g;

interface Hit {
  file: string;
  line: number;
  literal: string;
  reason: string;
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (SKIP.some((s) => full.includes(s))) continue;
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      yield full;
    }
  }
}

function scanLine(line: string, file: string, lineNo: number): Hit[] {
  const hits: Hit[] = [];
  let match: RegExpExecArray | null;
  TEXT_LITERAL.lastIndex = 0;
  while ((match = TEXT_LITERAL.exec(line)) !== null) {
    const text = match[2] ?? '';
    if (text.length < 2) continue;
    const lower = text.toLowerCase();
    for (const word of FORBIDDEN_WORDS) {
      const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(lower)) {
        hits.push({ file, line: lineNo, literal: text, reason: `forbidden word: "${word}"` });
      }
    }
    for (const phrase of FORBIDDEN_PHRASES) {
      if (lower.includes(phrase)) {
        hits.push({ file, line: lineNo, literal: text, reason: `forbidden phrase: "${phrase}"` });
      }
    }
    if (text.includes('!') && !file.includes('checkBrandVoice')) {
      // Don't flag template-only or technical strings ending in non-text contexts.
      // We restrict to strings with letters and a trailing/embedded '!'.
      if (/[A-Za-z].*!/.test(text)) {
        hits.push({
          file,
          line: lineNo,
          literal: text,
          reason: 'exclamation mark in user-facing copy',
        });
      }
    }
  }
  return hits;
}

async function main() {
  const root = process.cwd();
  const allHits: Hit[] = [];
  for (const r of ROOTS) {
    const start = path.join(root, r);
    for await (const file of walk(start)) {
      const text = await fs.readFile(file, 'utf8');
      const lines = text.split('\n');
      lines.forEach((l, i) => {
        if (l.includes('// brand:allow')) return;
        allHits.push(...scanLine(l, path.relative(root, file), i + 1));
      });
    }
  }
  if (allHits.length === 0) {
    console.log('Brand voice check: clean.');
    return;
  }
  console.log(`Brand voice check: ${allHits.length} potential issue(s):`);
  for (const h of allHits) {
    console.log(`  ${h.file}:${h.line}  ${h.reason}  →  ${JSON.stringify(h.literal)}`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
