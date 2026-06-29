#!/usr/bin/env node
// apply-narrations.mjs — applique les narrations réécrites (.narration/out/<slug>.json)
// dans src/content/stories.ts : remplace le textExcerpt FR de chaque scène (l'EN
// reste inchangé). Ne touche PAS les timings (c'est regen-audio.mjs qui les recalcule
// après génération de la nouvelle voix).
//
// Usage :
//   node scripts/apply-narrations.mjs            # applique toutes les narrations
//   node scripts/apply-narrations.mjs <slug...>  # seulement ces histoires

import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const CONTENT = "src/content/stories.ts";
const DIR = ".narration/out";

const esc = (t) =>
  String(t).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const reEsc = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

async function main() {
  const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith("--")));
  let src = await readFile(CONTENT, "utf8");
  let files = (await readdir(DIR)).filter((f) => f.endsWith(".json"));
  if (only.size) files = files.filter((f) => only.has(f.replace(/\.json$/, "")));

  let applied = 0;
  const skipped = [];

  for (const f of files) {
    const d = JSON.parse(await readFile(path.join(DIR, f), "utf8"));
    const slug = d.slug;
    const texts = d.scenes;

    const startRe = new RegExp(`\\n  '${reEsc(slug)}':\\s*\\{`);
    const m = startRe.exec(src);
    if (!m) { skipped.push(`${slug} (entrée introuvable)`); continue; }
    const blockStart = m.index;
    const blockEnd = src.indexOf("\n  },", blockStart);
    if (blockEnd === -1) { skipped.push(`${slug} (fin de bloc introuvable)`); continue; }

    let block = src.slice(blockStart, blockEnd);
    // textExcerpt FR uniquement (textExcerptEn ne matche pas : "textExcerpt:" exige le ':').
    const re = /textExcerpt:\s*`(?:[^`\\]|\\.)*`/g;
    const count = (block.match(re) || []).length;
    if (count !== texts.length) {
      skipped.push(`${slug} (scènes : ${count} dans stories.ts vs ${texts.length} narration)`);
      continue;
    }
    let i = 0;
    block = block.replace(re, () => `textExcerpt: \`${esc(texts[i++])}\``);
    src = src.slice(0, blockStart) + block + src.slice(blockEnd);
    applied++;
  }

  await writeFile(CONTENT, src);
  console.log(`✓ Narrations appliquées : ${applied}/${files.length}`);
  if (skipped.length) console.log("Ignorées :\n  " + skipped.join("\n  "));
  if (skipped.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e?.stack || String(e)); process.exit(1); });
