#!/usr/bin/env node
// Liste toutes les histoires (slug, titre, période, lieu) depuis stories.ts.
// Utilitaire de travail (rédaction d'articles, audit de contenu).
//   node scripts/list-stories.mjs           → tableau lisible
//   node scripts/list-stories.mjs --json    → JSON vers stdout

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const src = await readFile(path.join(process.cwd(), 'src/content/stories.ts'), 'utf8');
const body = src.slice(src.indexOf('storyDetails'));

const entry = /\n {2}'([a-z0-9-]+)':\s*\{([\s\S]*?)\n {2}\},/g;
const field = (block, key) => {
  const m = block.match(new RegExp(`${key}:\\s*([\`"])([\\s\\S]*?)\\1`));
  return m ? m[2].trim() : '';
};

const out = [];
let m;
while ((m = entry.exec(body))) {
  out.push({
    slug: m[1],
    title: field(m[2], 'title'),
    period: field(m[2], 'period'),
    locationName: field(m[2], 'locationName'),
  });
}

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(out, null, 1));
} else {
  for (const s of out) console.log(`${s.period.padEnd(16)} | ${s.locationName.padEnd(28)} | ${s.title}  [${s.slug}]`);
  console.log(`\n${out.length} histoires.`);
}
