#!/usr/bin/env node
// render-video.mjs — assemble une histoire en MP4 vertical (TikTok 1080x1920).
// Images plein cadre + Ken Burns, narration normalisée (-14 LUFS), sous-titres,
// filigrane discret et carte de fin sobre (logo + nom de l'app).
//
// Usage (depuis la racine du dépôt) :
//   node scripts/render-video.mjs <slug> [--lang=fr|en] [--force]
//   node scripts/render-video.mjs --all [--lang=fr|en] [--force]
//
// Sortie : exports/<slug>.<lang>.mp4   (nécessite ffmpeg + ffprobe dans le PATH)

import { readFile, writeFile, mkdir, rm, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const exec = promisify(execFile);
const W = 1080, H = 1920, FPS = 30;
const END_DUR = 3; // durée de la carte de fin (s)
const MIN_SEC = Number(process.env.MIN_VIDEO_SEC) || 40; // plancher : on ne rend pas en dessous
const HANDLE = process.env.TIKTOK_HANDLE || "@histofrance";
const LOGO = path.resolve("public/brand/logo.png");
const TAGLINE = {
  fr: "L'histoire de France, récit par récit",
  en: "The history of France, story by story",
};

function die(m) { console.error("\n✖ " + m + "\n"); process.exit(1); }

async function loadStories() {
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const src = await readFile("src/content/stories.ts", "utf8");
      const i = src.indexOf("storyDetails: Record<string, StoryDetail> =");
      const braceStart = src.indexOf("{", i);
      const end = src.indexOf("\n};", braceStart);
      return (0, eval)("(" + src.slice(braceStart, end + 2) + ")");
    } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 600)); }
  }
  throw lastErr;
}

async function ffprobeDuration(file) {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
  return parseFloat(stdout.trim());
}

function assTime(t) {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60), cs = Math.round((t - Math.floor(t)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function wrap(text, max = 32) {
  const words = String(text).replace(/[{}]/g, "").split(/\s+/);
  const lines = []; let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.join("\\N");
}

// Ken Burns plein cadre : couvre 1080x1920 puis zoom lent (base 2x = net).
function kenBurns(frames, dark = false) {
  const eq = dark ? ",eq=brightness=-0.42:saturation=0.6" : "";
  return `scale=${2 * W}:${2 * H}:force_original_aspect_ratio=increase,crop=${2 * W}:${2 * H},` +
    `zoompan=z='min(1+0.0007*on,1.2)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS}` +
    `${eq},setsar=1,format=yuv420p`;
}

const assHead = () => `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Arial,54,&H00FFFFFF,&H00000000,&H64000000,1,1,4,1,2,90,90,440,1
Style: Mark,Arial,30,&H8CFFFFFF,&H8C000000,&H00000000,0,1,1,0,9,44,44,40,1
Style: EndName,Georgia,88,&H00FFFFFF,&H00202020,&H64000000,1,1,2,2,5,0,0,0,1
Style: EndTag,Arial,38,&H00D2C7B4,&H00000000,&H00000000,0,1,0,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

async function renderStory(slug, story, lang, force) {
  const en = lang === "en";
  const out = path.join("exports", `${slug}.${lang}.mp4`);
  if (existsSync(out) && !force) { console.log(`  ↷ ${slug} [${lang}] : déjà rendue.`); return out; }

  // Plancher de qualité : on ne produit pas de vidéo trop courte (narration trop maigre).
  if (typeof story.durationSec === "number" && story.durationSec > 0 && story.durationSec < MIN_SEC) {
    console.log(`  ⤬ ${slug} [${lang}] : ${story.durationSec.toFixed(1)}s < ${MIN_SEC}s — ignorée (trop courte).`);
    return null;
  }

  const tmp = path.join("exports", ".tmp", `${slug}-${lang}`);
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  await mkdir("exports", { recursive: true });

  console.log(`\n▶ ${slug} [${lang}] — ${story.scenes.length} scènes`);
  const segs = [], dialogues = [];
  let cursor = 0, lastImg = null;

  for (let i = 0; i < story.scenes.length; i++) {
    const sc = story.scenes[i];
    const img = sc.imageUrl ? path.join("public", sc.imageUrl) : null;
    const audRel = en ? (sc.audioUrlEn || sc.audioUrl) : sc.audioUrl;
    const aud = audRel ? path.join("public", audRel) : null;
    if (!img || !existsSync(img)) die(`image manquante scène ${i + 1} (${slug})`);
    if (!aud || !existsSync(aud)) die(`audio manquant scène ${i + 1} (${slug})`);
    lastImg = img;

    const dur = await ffprobeDuration(aud);
    const frames = Math.max(2, Math.round(dur * FPS));
    const seg = path.join(tmp, `seg${String(i + 1).padStart(2, "0")}.mp4`);
    await exec("ffmpeg", ["-y", "-i", img, "-i", aud, "-filter_complex", `[0:v]${kenBurns(frames)}[v]`,
      "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
      "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2", "-shortest", seg]);
    segs.push(seg);

    const text = en ? (sc.textExcerptEn || sc.textExcerpt) : sc.textExcerpt;
    if (text) dialogues.push(`Dialogue: 0,${assTime(cursor)},${assTime(cursor + dur)},Sub,,0,0,0,,${wrap(text)}`);
    cursor += dur;
    console.log(`  • scène ${i + 1} ✓ ${dur.toFixed(1)}s`);
  }

  // Carte de fin (image assombrie + CTA)
  const endSeg = path.join(tmp, "seg_end.mp4");
  await exec("ffmpeg", ["-y", "-i", lastImg, "-f", "lavfi", "-t", String(END_DUR), "-i", "anullsrc=r=44100:cl=stereo",
    "-filter_complex", `[0:v]${kenBurns(Math.round(END_DUR * FPS), true)}[v]`, "-map", "[v]", "-map", "1:a",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2", "-t", String(END_DUR), endSeg]);
  segs.push(endSeg);

  const total = cursor + END_DUR;
  // Filigrane discret : seulement pendant les scènes (la carte de fin a déjà sa marque).
  dialogues.push(`Dialogue: 0,${assTime(0)},${assTime(cursor)},Mark,,0,0,0,,${HANDLE}`);
  // Carte de fin sobre : nom de l'app + accroche (le logo est incrusté en overlay image).
  const tagline = TAGLINE[lang] || TAGLINE.fr;
  dialogues.push(`Dialogue: 0,${assTime(cursor)},${assTime(total)},EndName,,0,0,0,,{\\an5\\pos(540,1190)\\fad(350,0)}HistoFrance`);
  dialogues.push(`Dialogue: 0,${assTime(cursor)},${assTime(total)},EndTag,,0,0,0,,{\\an5\\pos(540,1280)\\fad(500,0)}${tagline}`);

  await writeFile(path.join(tmp, "list.txt"), segs.map(s => `file '${path.basename(s)}'`).join("\n"), "utf8");
  await writeFile(path.join(tmp, "subs.ass"), assHead() + dialogues.join("\n") + "\n", "utf8");

  // Concat (copie), puis logo de fin (overlay sur la carte) + sous-titres + normalisation (-14 LUFS).
  await exec("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "joined.mp4"], { cwd: tmp });
  await exec("ffmpeg", ["-y", "-i", "joined.mp4", "-i", LOGO,
    "-filter_complex",
    `[1:v]scale=300:300[lg];[0:v][lg]overlay=(main_w-overlay_w)/2:760:enable='gte(t,${cursor.toFixed(3)})'[bg];[bg]ass=subs.ass[v]`,
    "-map", "[v]", "-map", "0:a",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
    "-af", "loudnorm=I=-14:TP=-1:LRA=11", "-c:a", "aac", "-b:a", "160k", "final.mp4"], { cwd: tmp });

  await copyFile(path.join(tmp, "final.mp4"), out);
  await rm(tmp, { recursive: true, force: true });
  console.log(`  ✓ ${out}  (${total.toFixed(1)}s)`);
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const lang = (args.find(a => a.startsWith("--lang=")) || "--lang=fr").split("=")[1];
  const all = args.includes("--all");
  const force = args.includes("--force");
  const slug = args.find(a => !a.startsWith("--"));
  if (!all && !slug) die("Usage: node scripts/render-video.mjs <slug> [--lang=fr|en] [--force]  |  --all");

  const stories = await loadStories();
  const targets = all ? Object.keys(stories) : [slug];
  if (!all && !stories[slug]) die(`Histoire '${slug}' introuvable.`);

  for (const s of targets) {
    try { await renderStory(s, stories[s], lang, force); }
    catch (e) { console.error(`  ✖ ${s} : ${e.message}`); }
  }
  console.log("\n▶ Terminé.");
}

main().catch(e => die(e?.stack || String(e)));
