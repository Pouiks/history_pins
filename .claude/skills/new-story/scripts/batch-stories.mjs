#!/usr/bin/env node
// batch-stories.mjs — génère plusieurs histoires en cascade depuis un fichier JSON.
//
// Usage (depuis la racine du dépôt) :
//   node .claude/skills/new-story/scripts/batch-stories.mjs [events.json] [options]
//
// Le fichier JSON est un tableau d'événements. Chaque entrée peut être :
//   • une simple chaîne : "La prise de la Bastille"
//   • un objet : { "topic": "...", "period": "1789", "scenes": 5,
//                  "latitude": 48.85, "longitude": 2.36, "locationName": "...",
//                  "style": "..." }   (tous les champs sauf topic sont optionnels)
//   • un manifest complet (avec "scenes": [ { label, textExcerpt, imagePrompt } … ])
//     → utilisé tel quel, sans planification.
// (On accepte aussi { "events": [ … ] }.)
//
// Pour chaque événement : récit + découpage planifiés via OpenAI (sauf manifest
// complet), puis images + voix générées, puis insertion sur la carte.
// Les histoires déjà présentes sont ignorées (sauf --force). Un échec n'arrête
// pas le batch : on passe au suivant.
//
// Options :
//   --plan-only    planifie et affiche les histoires sans générer d'assets
//   --force        régénère et remplace les histoires existantes
//   --skip-images  ne génère pas les images
//   --skip-audio   ne génère pas la voix
//   --quality=...  qualité image : low | medium | high | auto
//   --model=...    modèle OpenAI de planification (défaut : gpt-4o-mini)
//   --limit=N      ne traite que N événements
//   --start=N      commence à l'événement N (1-indexé), utile avec --limit

import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile, planStory, generateStory, slugify, storyExists } from "./new-story.mjs";

const cwd = process.cwd();

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith("--"));
  const flags = new Set(args.filter((a) => a.startsWith("--") && !a.includes("=")));
  const kv = Object.fromEntries(args.filter((a) => a.startsWith("--") && a.includes("=")).map((a) => a.slice(2).split("=")));

  const file = positional[0] || "stories.events.json";
  const planOnly = flags.has("--plan-only");
  const opts = {
    force: flags.has("--force"),
    skipImages: flags.has("--skip-images"),
    skipAudio: flags.has("--skip-audio"),
    quality: kv.quality || "auto",
  };

  await loadEnvFile(path.join(cwd, ".env.local"));
  await loadEnvFile(path.join(cwd, ".env"));

  let events;
  try {
    events = JSON.parse(await readFile(path.join(cwd, file), "utf8"));
  } catch (err) {
    console.error(`\n✖ Impossible de lire ${file} : ${err.message}\n`);
    process.exit(1);
  }
  if (!Array.isArray(events)) {
    if (Array.isArray(events.events)) events = events.events;
    else {
      console.error("\n✖ Le JSON doit être un tableau d'événements (ou { \"events\": [ … ] }).\n");
      process.exit(1);
    }
  }

  // Sous-ensemble optionnel : --start (1-indexé) et --limit
  const total = events.length;
  const start = kv.start ? Math.max(1, parseInt(kv.start, 10)) : 1;
  const limit = kv.limit ? Math.max(0, parseInt(kv.limit, 10)) : null;
  events = events.slice(start - 1, limit ? start - 1 + limit : undefined);

  console.log(`\n▶ Batch : ${events.length}/${total} événement(s) depuis ${file}${planOnly ? " (plan-only)" : ""}\n`);

  const results = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const label = typeof ev === "string" ? ev : ev.topic || ev.title || `#${i + 1}`;
    console.log(`\n===== [${i + 1}/${events.length}] ${label} =====`);
    try {
      // Histoire déjà présente : on saute (économise les appels API), sauf --force.
      const presumedSlug = slugify((typeof ev === "object" && (ev.slug || ev.title)) || label);
      if (!opts.force && (await storyExists(presumedSlug))) {
        console.log(`  ↷ '${presumedSlug}' déjà présente — ignorée.`);
        results.push({ label, slug: presumedSlug, status: "skipped" });
        continue;
      }

      const isFullManifest = ev && typeof ev === "object" && Array.isArray(ev.scenes);
      const manifest = isFullManifest
        ? ev
        : await planStory(ev, {
            model: kv.model,
            scenes: kv.scenes ? parseInt(kv.scenes, 10) : undefined,
          });
      console.log(`  Plan : « ${manifest.title} » (${manifest.slug}) · ${manifest.scenes.length} scènes · ${manifest.latitude}, ${manifest.longitude}`);

      if (planOnly) {
        results.push({ label, slug: manifest.slug, status: "planned" });
        continue;
      }

      const r = await generateStory(manifest, { ...opts, cacheDir: null });
      results.push({ label, slug: manifest.slug, status: r.skipped ? "skipped" : "ok" });
      console.log(`  ✓ ${manifest.slug}`);
    } catch (err) {
      console.error(`  ✖ Échec « ${label} » : ${err.message}`);
      results.push({ label, status: "error", error: err.message });
    }
  }

  const by = (s) => results.filter((r) => r.status === s).length;
  console.log(`\n▶ Batch terminé : ${by("ok")} générée(s), ${by("planned")} planifiée(s), ${by("skipped")} ignorée(s), ${by("error")} échec(s).`);
  const fails = results.filter((r) => r.status === "error");
  if (fails.length) console.log("  Échecs : " + fails.map((f) => f.label).join(", "));
  if (!planOnly && by("ok") > 0) console.log("\n▶ Lance `npm run build` pour valider la compilation.");
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
