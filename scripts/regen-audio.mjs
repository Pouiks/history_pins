#!/usr/bin/env node
// regen-audio.mjs — régénère la voix off (ElevenLabs) de chaque scène à partir du
// textExcerpt FR ACTUEL de src/content/stories.ts, puis recalcule les timings
// (startSec/endSec/durationSec) à partir de la durée réelle des nouveaux clips.
//
// À lancer APRÈS apply-narrations.mjs (qui a mis à jour les textes).
// Règle BLOQUANTE : une histoire n'est mise à jour que si TOUTES ses scènes ont été
// générées (sinon décalages / trous). Les histoires en échec sont signalées, à relancer.
//
// Usage :
//   node scripts/regen-audio.mjs --all            # toutes les histoires (FR)
//   node scripts/regen-audio.mjs <slug...>        # seulement ces histoires
//   STORY_AUDIO_CONCURRENCY=4 (défaut) ajustable selon le plan ElevenLabs
//
// Variables : ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID (.env.local)

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { loadEnvFile } from "../.claude/skills/new-story/scripts/new-story.mjs";

const exec = promisify(execFile);
const CONTENT = "src/content/stories.ts";
const ELEVEN_MODEL = "eleven_multilingual_v2";
const ELEVEN_FORMAT = "mp3_44100_128";
const CONCURRENCY = Number(process.env.STORY_AUDIO_CONCURRENCY) || 4;
const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reEsc = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
const round2 = (n) => Math.round(n * 100) / 100;

function loadStories(src) {
  const i = src.indexOf("storyDetails: Record<string, StoryDetail> =");
  const braceStart = src.indexOf("{", i);
  const end = src.indexOf("\n};", braceStart);
  return (0, eval)("(" + src.slice(braceStart, end + 2) + ")");
}

async function ffprobeDuration(file) {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
  return parseFloat(stdout.trim());
}

async function tts(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY introuvable (.env.local).");
  if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID introuvable (.env.local).");
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=${ELEVEN_FORMAT}`;
  let lastErr;
  for (let a = 0; a < MAX_RETRIES; a++) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": apiKey, Accept: "application/json" },
        body: JSON.stringify({ text, model_id: ELEVEN_MODEL }),
      });
      if (r.ok) {
        const j = await r.json();
        return Buffer.from(j.audio_base64, "base64");
      }
      const body = await r.text();
      lastErr = new Error(`HTTP ${r.status} — ${body.slice(0, 200)}`);
      if (r.status === 429 || r.status >= 500) { await sleep(1500 * (a + 1)); continue; }
      throw lastErr; // erreur non récupérable (quota, auth…)
    } catch (e) {
      lastErr = e;
      await sleep(1200 * (a + 1));
    }
  }
  throw lastErr || new Error("ElevenLabs : échec");
}

async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const idx = next++;
      try { results[idx] = { ok: true, value: await worker(items[idx], idx) }; }
      catch (e) { results[idx] = { ok: false, error: e }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/** Remplace durationSec (histoire) + startSec/endSec (scènes, dans l'ordre) d'un bloc. */
function patchTimings(src, slug, scenes, durationSec) {
  const startRe = new RegExp(`\\n  '${reEsc(slug)}':\\s*\\{`);
  const m = startRe.exec(src);
  if (!m) return src;
  const bs = m.index;
  const be = src.indexOf("\n  },", bs);
  if (be === -1) return src;
  let block = src.slice(bs, be);
  block = block.replace(/durationSec:\s*(?:[\d.]+|null)/, `durationSec: ${durationSec}`);
  let i = 0;
  block = block.replace(/startSec:\s*[\d.]+/g, () => `startSec: ${scenes[i++].startSec}`);
  let j = 0;
  block = block.replace(/endSec:\s*[\d.]+/g, () => `endSec: ${scenes[j++].endSec}`);
  return src.slice(0, bs) + block + src.slice(be);
}

async function main() {
  await loadEnvFile(path.join(process.cwd(), ".env.local"));
  await loadEnvFile(path.join(process.cwd(), ".env"));

  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const only = new Set(args.filter((a) => !a.startsWith("--")));

  let src = await readFile(CONTENT, "utf8");
  const stories = loadStories(src);
  const slugs = (all ? Object.keys(stories) : [...only]).filter((s) => stories[s]);
  if (!slugs.length) { console.error("Aucune histoire ciblée. Usage : --all | <slug...>"); process.exit(1); }

  // Tâches = toutes les (histoire, scène) à régénérer en FR.
  const tasks = [];
  for (const slug of slugs) {
    const sc = stories[slug].scenes;
    sc.forEach((scene, idx) => {
      const text = scene.textExcerpt;
      if (!text || !text.trim()) return;
      tasks.push({ slug, idx, text, file: path.join("public", "stories", slug, `scene-${String(idx + 1).padStart(2, "0")}.mp3`) });
    });
  }

  console.log(`▶ Régénération voix : ${tasks.length} clips, ${slugs.length} histoire(s), concurrence ${CONCURRENCY}\n`);
  const dirs = new Set(tasks.map((t) => path.dirname(t.file)));
  for (const d of dirs) await mkdir(d, { recursive: true });

  let done = 0;
  const res = await runPool(tasks, CONCURRENCY, async (t) => {
    const buf = await tts(t.text);
    await writeFile(t.file, buf);
    const dur = await ffprobeDuration(t.file);
    done++;
    if (done % 20 === 0 || done === tasks.length) console.log(`  … ${done}/${tasks.length}`);
    return dur;
  });

  // Durées par histoire + détection des échecs.
  const durByStory = {};
  const failed = new Set();
  res.forEach((r, k) => {
    const t = tasks[k];
    if (!r.ok) { failed.add(t.slug); console.error(`  ✖ ${t.slug} scène ${t.idx + 1} : ${r.error.message}`); return; }
    (durByStory[t.slug] ||= {})[t.idx] = r.value;
  });

  // Patch des timings — uniquement les histoires complètes (règle bloquante).
  src = await readFile(CONTENT, "utf8");
  let patched = 0;
  for (const slug of slugs) {
    if (failed.has(slug)) continue;
    const n = stories[slug].scenes.length;
    const durs = durByStory[slug] || {};
    if (Object.keys(durs).length !== n) { failed.add(slug); continue; }
    let cursor = 0;
    const scenes = [];
    for (let idx = 0; idx < n; idx++) {
      const start = round2(cursor);
      cursor += durs[idx];
      scenes.push({ startSec: start, endSec: round2(cursor) });
    }
    src = patchTimings(src, slug, scenes, round2(cursor));
    patched++;
  }
  await writeFile(CONTENT, src);

  console.log(`\n▶ Terminé : ${patched}/${slugs.length} histoire(s) régénérée(s) + timings recalculés.`);
  if (failed.size) {
    console.log(`  ⚠ Incomplètes (à relancer) : ${[...failed].join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("  ▶ Lance ensuite : node scripts/render-video.mjs --all --force");
  }
}

main().catch((e) => { console.error(e?.stack || String(e)); process.exit(1); });
