#!/usr/bin/env node
// new-story.mjs — génère les assets d'une histoire et l'insère dans
// src/content/stories.ts. Utilisable en CLI (un manifest) ou importé comme
// module (generateStory / planStory) par batch-stories.mjs.
//
//   • Images : OpenAI gpt-image-1 (une par scène)
//   • Voix   : ElevenLabs (un clip mp3 par scène, voix française)
//   • Timings: durée réelle des clips audio (sinon estimés)
//
// Usage CLI (depuis la racine du dépôt) :
//   node .claude/skills/new-story/scripts/new-story.mjs <manifest.json> [options]
//
// Options :
//   --force        régénère images + audio et remplace l'entrée existante
//   --skip-images  ne génère pas les images
//   --skip-audio   ne génère pas la voix
//   --dry-run      n'appelle aucune API (timings estimés + snippet + insertion)
//   --no-insert    n'insère pas l'entrée dans src/content/stories.ts
//   --quality=...  qualité image : low | medium | high | auto (défaut : auto)
//
// Variables d'environnement (lues depuis .env.local puis .env) :
//   OPENAI_API_KEY                            (images + planification)
//   ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID  (voix)

import { readFile, writeFile, mkdir, access, rm } from "node:fs/promises";
import { constants as FS } from "node:fs";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

/**
 * Convertit un buffer PNG en fichier WebP (qualité web) via ffmpeg.
 * Garde les assets légers (déployables sur Git/Vercel) sans perte visible.
 */
async function writeWebpFromPng(pngBuffer, outAbs) {
  const tmp = outAbs.replace(/\.webp$/i, ".src.png");
  await writeFile(tmp, pngBuffer);
  try {
    await execFileAsync("ffmpeg", [
      "-y", "-loglevel", "error", "-i", tmp,
      "-c:v", "libwebp", "-quality", "80", "-compression_level", "6",
      outAbs,
    ]);
  } finally {
    await rm(tmp, { force: true });
  }
}

const WORDS_PER_SEC = 2.5;
const MIN_SCENE_SEC = 6;
const IMAGE_SIZE = "1536x1024";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const ELEVEN_MODEL = "eleven_multilingual_v2";
const ELEVEN_FORMAT = "mp3_44100_128";
const PLAN_MODEL = process.env.STORY_PLAN_MODEL || "gpt-4o-mini";
const MAX_RETRIES = 2;
// ElevenLabs gratuit = 2 requêtes concurrentes max. Surclassable via env si plan payant.
const AUDIO_CONCURRENCY = Number(process.env.STORY_AUDIO_CONCURRENCY) || 2;
const IMAGE_CONCURRENCY = Number(process.env.STORY_IMAGE_CONCURRENCY) || 4;
// Suffixe anti-défauts ajouté à chaque prompt d'image (texte parasite, objets modernes…).
const IMAGE_NEGATIVE =
  "No text, no letters, no words, no captions, no title, no watermark, no signature, " +
  "no modern objects, no frame, no border.";

const cwd = process.cwd();

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

export function die(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

const pad2 = (n) => String(n).padStart(2, "0");
const countWords = (t) => (t || "").trim().split(/\s+/).filter(Boolean).length;

export function slugify(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function fileExists(p) {
  try {
    await access(p, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function loadEnvFile(file) {
  if (!(await fileExists(file))) return;
  const raw = await readFile(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function escapeTemplate(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

// ---------------------------------------------------------------------------
// Validation du manifest (lève une erreur — capturée en CLI et en batch)
// ---------------------------------------------------------------------------

export function validateManifest(m) {
  const errors = [];
  const need = (cond, msg) => { if (!cond) errors.push(msg); };

  need(typeof m.title === "string" && m.title.trim(), "title manquant");
  need(typeof m.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.slug || ""), "slug manquant ou non kebab-case");
  need(typeof m.scriptText === "string" && m.scriptText.trim(), "scriptText manquant");
  need(typeof m.latitude === "number" && Number.isFinite(m.latitude), "latitude manquante ou invalide");
  need(typeof m.longitude === "number" && Number.isFinite(m.longitude), "longitude manquante ou invalide");
  need(Array.isArray(m.scenes), "scenes doit être un tableau");

  if (Array.isArray(m.scenes)) {
    need(m.scenes.length >= 4 && m.scenes.length <= 9, `nombre de scènes = ${m.scenes.length} (attendu : 4 à 9)`);
    m.scenes.forEach((s, i) => {
      const n = i + 1;
      need(typeof s.label === "string" && s.label.trim(), `scène ${n} : label manquant`);
      need(typeof s.textExcerpt === "string" && s.textExcerpt.trim(), `scène ${n} : textExcerpt manquant`);
      need(typeof s.imagePrompt === "string" && s.imagePrompt.trim(), `scène ${n} : imagePrompt manquant`);
    });
  }

  if (errors.length) throw new Error("Manifest invalide :\n  - " + errors.join("\n  - "));
}

// ---------------------------------------------------------------------------
// Préparation des scènes + timings
// ---------------------------------------------------------------------------

function prepareScenes(m) {
  return m.scenes.map((s, i) => {
    const n = i + 1;
    const est = Math.max(MIN_SCENE_SEC, Math.ceil(countWords(s.textExcerpt) / WORDS_PER_SEC));
    return {
      id: `${m.slug}-scene-${pad2(n)}`,
      label: s.label,
      labelEn: s.labelEn ?? null,
      textExcerpt: s.textExcerpt,
      textExcerptEn: s.textExcerptEn ?? null,
      imageUrl: null,
      audioUrl: null,
      audioUrlEn: null,
      _prompt: (m.style ? `${m.style.trim()}. ` : "") + s.imagePrompt.trim() + " " + IMAGE_NEGATIVE,
      _imageFile: path.join("public", "stories", m.slug, `scene-${pad2(n)}.webp`),
      _audioFile: path.join("public", "stories", m.slug, `scene-${pad2(n)}.mp3`),
      _audioEnFile: path.join("public", "stories", m.slug, `scene-${pad2(n)}.en.mp3`),
      _imageUrlPath: `/stories/${m.slug}/scene-${pad2(n)}.webp`,
      _audioUrlPath: `/stories/${m.slug}/scene-${pad2(n)}.mp3`,
      _audioEnUrlPath: `/stories/${m.slug}/scene-${pad2(n)}.en.mp3`,
      _duration: est,
    };
  });
}

function finalizeTimings(scenes) {
  let cursor = 0;
  for (const s of scenes) {
    s.startSec = cursor;
    s.endSec = Math.round((cursor + s._duration) * 100) / 100;
    cursor = s.endSec;
  }
  return scenes.length ? scenes[scenes.length - 1].endSec : 0;
}

// ---------------------------------------------------------------------------
// Appels API
// ---------------------------------------------------------------------------

// Exécute `worker` sur tous les items avec une concurrence limitée.
// Rejette dès qu'un worker échoue (fail-fast, utile pour stopper sur quota).
async function runPool(items, limit, worker) {
  let i = 0;
  const n = items.length;
  async function run() {
    while (i < n) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, n) }, run));
}

async function withRetries(fn, label) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        const wait = 1500 * (attempt + 1);
        console.warn(`  ⚠ ${label} : tentative ${attempt + 1} échouée (${err.message}). Réessai dans ${wait} ms…`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

async function generateImage({ prompt, quality }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY introuvable.");
  const body = { model: "gpt-image-1", prompt, size: IMAGE_SIZE, n: 1 };
  if (quality && quality !== "auto") body.quality = quality;

  return withRetries(async () => {
    const res = await fetch(OPENAI_IMAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text().catch(() => "")).slice(0, 300)}`);
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error("Réponse OpenAI sans b64_json.");
    return Buffer.from(b64, "base64");
  }, "image");
}

async function generateSpeech({ text }) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY introuvable.");
  if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID introuvable.");
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=${ELEVEN_FORMAT}`;

  return withRetries(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey, Accept: "application/json" },
      body: JSON.stringify({ text, model_id: ELEVEN_MODEL }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text().catch(() => "")).slice(0, 300)}`);
    const json = await res.json();
    const b64 = json?.audio_base64;
    if (!b64) throw new Error("Réponse ElevenLabs sans audio_base64.");
    const ends =
      json?.alignment?.character_end_times_seconds ||
      json?.normalized_alignment?.character_end_times_seconds;
    const durationSec = Array.isArray(ends) && ends.length ? ends[ends.length - 1] : null;
    return { buffer: Buffer.from(b64, "base64"), durationSec };
  }, "voix");
}

// ---------------------------------------------------------------------------
// Géocodage (OpenStreetMap / Nominatim) — coordonnées réelles d'un lieu
// ---------------------------------------------------------------------------

export async function geocode(query) {
  if (!query) return null;
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q=" +
    encodeURIComponent(query);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "histofrance/1.0 (story generator)" },
    });
    if (!res.ok) return null;
    const arr = await res.json();
    if (Array.isArray(arr) && arr.length) {
      const latitude = parseFloat(arr[0].lat);
      const longitude = parseFloat(arr[0].lon);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
  } catch {
    /* réseau indisponible : on retombera sur les coords du LLM */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Planification d'une histoire à partir d'un événement (OpenAI chat → manifest)
// ---------------------------------------------------------------------------

export async function planStory(event, opts = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY introuvable (nécessaire pour planifier le récit).");
  const model = opts.model || PLAN_MODEL;
  const ev = typeof event === "string" ? { topic: event } : event;
  const topic = ev.topic || ev.title;
  if (!topic) throw new Error("Événement sans 'topic' ni 'title'.");
  const nbScenes = Number.isInteger(ev.scenes)
    ? ev.scenes
    : Number.isInteger(opts.scenes)
    ? opts.scenes
    : 7;

  const sys =
    "Tu es un historien français rigoureux et un directeur artistique pour vidéos courtes. " +
    "RÈGLE ABSOLUE : tu n'inventes JAMAIS de noms propres, de dates, d'architectes ni de citations. " +
    "Si un détail précis est incertain, reste générique (« un chef gaulois », « les bâtisseurs ») " +
    "plutôt que d'inventer. Tout fait affirmé doit être vérifiable, aucun anachronisme. " +
    "Tu réponds UNIQUEMENT en JSON valide.";
  const user = [
    `Crée une histoire courte et percutante pour : « ${topic} »` +
      (ev.period ? ` (${ev.period})` : "") +
      (ev.locationName ? `, lieu : ${ev.locationName}` : "") + ".",
    "Pensée pour une vidéo verticale de 25 à 45 secondes (réseaux sociaux).",
    "",
    "Champs JSON attendus :",
    "- title (FR), titleEn (EN)",
    "- locationName (lieu emblématique précis, FR)",
    "- geocodeQuery (lieu UNIQUE géocodable OSM, ex: 'Place de la Bastille, Paris, France')",
    "- latitude, longitude (nombres, en secours)",
    "- period (ex: \"1789\")",
    "- scriptText (FR, court résumé en 2-3 phrases, ~60 mots)",
    "- style (EN, direction artistique COMMUNE à toutes les images : médium, lumière, palette ET l'époque historique correcte, ex: 'historical oil painting, early medieval Merovingian era, warm muted palette')",
    `- scenes : ${nbScenes} objets { label (FR court), labelEn (EN court), textExcerpt (FR), textExcerptEn (EN), imagePrompt (EN) }`,
    "",
    "RÈGLES DE TEXTE (essentiel) :",
    "- Chaque textExcerpt = 1 phrase courte, 8 à 14 mots, percutante. Pas de remplissage.",
    "- SCÈNE 1 = une ACCROCHE (8-15 mots) qui nomme DÈS LE DÉBUT le lieu connu aujourd'hui " +
      "(quartier, monument, place) et crée une tension/surprise. INTERDIT d'ouvrir par « En [année]… » " +
      "ou « [Roi], roi des Francs… ». Gabarits : « Sous [lieu connu], il reste une trace de… », " +
      "« Ce [lieu] que tout le monde connaît cache… », « À [lieu], en [année], l'impensable se produit. »",
    "- DERNIÈRE scène = une chute marquante (surprise, ou résonance avec aujourd'hui). " +
      "JAMAIS de conclusion générique type « un héritage durable ».",
    "- textExcerptEn = traduction anglaise fidèle et naturelle de textExcerpt.",
    "",
    "RÈGLES D'IMAGE (imagePrompt, en anglais) :",
    "- Pour CHAQUE scène, raisonne d'abord : (1) le siècle, (2) le style architectural/vestimentaire " +
      "correct de l'époque, (3) ce qu'il faut bannir — puis écris l'imagePrompt en conséquence.",
    "- Impose le style d'époque correct et INTERDIS explicitement les styles postérieurs. " +
      "Ex (sujet franc VIe s.) : 'early medieval Merovingian setting, pre-Romanesque architecture, " +
      "rounded arches, NO Gothic, no pointed arches, no twin towers, no rose window'.",
    "- Monument identifiable → décris ses VRAIES caractéristiques d'époque " +
      "(ex: 'Romanesque abbey church with a single square bell tower, sober stone facade'), jamais une version inventée.",
    "- Varie la composition entre scènes (plan large, portrait, gros plan, plongée) en gardant le même style.",
  ].filter(Boolean).join("\n");

  const data = await withRetries(async () => {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text().catch(() => "")).slice(0, 300)}`);
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Réponse OpenAI vide.");
    return JSON.parse(content);
  }, "plan");

  // Coordonnées : priorité aux coords explicites de l'événement, puis au
  // géocodage réel du lieu, et seulement en dernier recours aux coords du LLM.
  let latitude = Number(ev.latitude ?? data.latitude);
  let longitude = Number(ev.longitude ?? data.longitude);
  const hasExplicit =
    Number.isFinite(Number(ev.latitude)) && Number.isFinite(Number(ev.longitude));
  if (!hasExplicit) {
    const geo = await geocode(
      ev.geocodeQuery || data.geocodeQuery || ev.locationName || data.locationName
    );
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
    }
  }

  const manifest = {
    title: data.title || topic,
    titleEn: data.titleEn ?? null,
    slug: slugify(ev.slug || data.slug || data.title || topic),
    locationName: ev.locationName ?? data.locationName ?? null,
    latitude,
    longitude,
    period: ev.period ?? data.period ?? null,
    scriptText: data.scriptText,
    style: ev.style ?? data.style,
    scenes: (data.scenes || []).map((s) => ({
      label: s.label,
      labelEn: s.labelEn ?? null,
      textExcerpt: s.textExcerpt,
      textExcerptEn: s.textExcerptEn ?? null,
      imagePrompt: s.imagePrompt,
    })),
  };
  validateManifest(manifest);
  return manifest;
}

// ---------------------------------------------------------------------------
// Snippet TS + insertion dans src/content/stories.ts
// ---------------------------------------------------------------------------

function buildSnippet(m, scenes, durationSec) {
  const sceneLiterals = scenes
    .map((s) =>
      [
        "    {",
        `      id: ${JSON.stringify(s.id)},`,
        `      label: \`${escapeTemplate(s.label)}\`,`,
        `      labelEn: ${s.labelEn ? `\`${escapeTemplate(s.labelEn)}\`` : "null"},`,
        `      startSec: ${s.startSec},`,
        `      endSec: ${s.endSec},`,
        `      imageUrl: ${s.imageUrl ? JSON.stringify(s.imageUrl) : "null"},`,
        `      audioUrl: ${s.audioUrl ? JSON.stringify(s.audioUrl) : "null"},`,
        `      audioUrlEn: ${s.audioUrlEn ? JSON.stringify(s.audioUrlEn) : "null"},`,
        `      textExcerpt: \`${escapeTemplate(s.textExcerpt)}\`,`,
        `      textExcerptEn: ${s.textExcerptEn ? `\`${escapeTemplate(s.textExcerptEn)}\`` : "null"},`,
        "    },",
      ].join("\n")
    )
    .join("\n");

  return [
    "{",
    `  id: ${JSON.stringify(m.slug)},`,
    `  title: \`${escapeTemplate(m.title)}\`,`,
    `  titleEn: ${m.titleEn ? `\`${escapeTemplate(m.titleEn)}\`` : "null"},`,
    `  slug: ${JSON.stringify(m.slug)},`,
    `  locationName: ${m.locationName ? JSON.stringify(m.locationName) : "null"},`,
    `  latitude: ${m.latitude},`,
    `  longitude: ${m.longitude},`,
    `  period: ${m.period ? JSON.stringify(m.period) : "null"},`,
    `  scriptText: \`${escapeTemplate(m.scriptText)}\`,`,
    `  durationSec: ${durationSec},`,
    `  audioUrl: null,`,
    "  scenes: [",
    sceneLiterals,
    "  ],",
    "}",
  ].join("\n");
}

function buildEntry(slug, snippet) {
  const indented = snippet.split("\n").map((l) => (l ? "  " + l : l)).join("\n");
  return indented.replace(/^ {2}\{/, `  '${slug}': {`) + ",";
}

const CONTENT_REL = path.join("src", "content", "stories.ts");
const STORYDETAILS_MARKER = "export const storyDetails: Record<string, StoryDetail> = {";

function entryExists(src, slug) {
  return new RegExp(`\\n[ \\t]*'${slug}'[ \\t]*:`).test(src);
}

function replaceEntry(src, slug, entry) {
  const start = new RegExp(`\\n  '${slug}': \\{`).exec(src);
  if (!start) return null;
  const closeAt = src.indexOf("\n  },", start.index);
  if (closeAt === -1) return null;
  return src.slice(0, start.index) + "\n" + entry + src.slice(closeAt + "\n  },".length);
}

export async function storyExists(slug) {
  const contentPath = path.join(cwd, CONTENT_REL);
  if (!(await fileExists(contentPath))) return false;
  return entryExists(await readFile(contentPath, "utf8"), slug);
}

async function writeIntoContent(slug, entry, force) {
  const contentPath = path.join(cwd, CONTENT_REL);
  if (!(await fileExists(contentPath))) return { ok: false, reason: `${CONTENT_REL} introuvable` };
  let src = await readFile(contentPath, "utf8");
  const at = src.indexOf(STORYDETAILS_MARKER);
  if (at === -1) return { ok: false, reason: `repère "storyDetails" introuvable` };

  if (entryExists(src, slug)) {
    if (!force) return { ok: false, reason: `entrée '${slug}' déjà présente (--force pour remplacer)` };
    const replaced = replaceEntry(src, slug, entry);
    if (!replaced) return { ok: false, reason: `entrée '${slug}' introuvable pour remplacement` };
    await writeFile(contentPath, replaced, "utf8");
    return { ok: true, mode: "replaced" };
  }
  const pos = at + STORYDETAILS_MARKER.length;
  await writeFile(contentPath, src.slice(0, pos) + "\n" + entry + src.slice(pos), "utf8");
  return { ok: true, mode: "inserted" };
}

// ---------------------------------------------------------------------------
// Génération complète d'une histoire à partir d'un manifest
// ---------------------------------------------------------------------------

export async function generateStory(manifest, opts = {}) {
  const {
    skipImages = false,
    skipAudio = false,
    force = false,
    noInsert = false,
    quality = "auto",
    cacheDir = null,
  } = opts;

  validateManifest(manifest);

  // Idempotence : si déjà présente et pas --force, on ne régénère rien.
  if (!force && !noInsert && (await storyExists(manifest.slug))) {
    console.log(`  ↷ '${manifest.slug}' déjà présente — ignorée (--force pour régénérer).`);
    return { slug: manifest.slug, skipped: true };
  }

  const scenes = prepareScenes(manifest);
  const dir = path.join(cwd, "public", "stories", manifest.slug);

  // Voix d'abord (lots concurrents) : un échec quota arrête AVANT de dépenser en images.
  if (!skipAudio) {
    await mkdir(dir, { recursive: true });
    console.log(`  Voix (ElevenLabs, x${AUDIO_CONCURRENCY})…`);
    const tasks = [];
    for (const s of scenes) {
      tasks.push({ file: s._audioFile, text: s.textExcerpt, scene: s, fr: true });
      if (s.textExcerptEn) {
        tasks.push({ file: s._audioEnFile, text: s.textExcerptEn, scene: s, fr: false });
      }
    }
    await runPool(tasks, AUDIO_CONCURRENCY, async (t) => {
      const abs = path.join(cwd, t.file);
      if ((await fileExists(abs)) && !force) return;
      const { buffer, durationSec } = await generateSpeech({ text: t.text });
      await writeFile(abs, buffer);
      if (t.fr && durationSec) t.scene._duration = durationSec;
      console.log(`    • ${path.basename(t.file)} : ✓ ${(buffer.length / 1024).toFixed(0)} Ko${t.fr && durationSec ? ` · ${durationSec.toFixed(1)}s` : ""}`);
    });
  }
  for (const s of scenes) {
    s.audioUrl = (await fileExists(path.join(cwd, s._audioFile))) ? s._audioUrlPath : null;
    s.audioUrlEn = (await fileExists(path.join(cwd, s._audioEnFile))) ? s._audioEnUrlPath : null;
  }

  if (!skipImages) {
    await mkdir(dir, { recursive: true });
    console.log(`  Images (gpt-image-1, ${IMAGE_SIZE}, x${IMAGE_CONCURRENCY})…`);
    await runPool(scenes, IMAGE_CONCURRENCY, async (s, i) => {
      const abs = path.join(cwd, s._imageFile); // .webp
      if ((await fileExists(abs)) && !force) return;
      const buf = await generateImage({ prompt: s._prompt, quality });
      await writeWebpFromPng(buf, abs); // gpt-image renvoie du PNG → on stocke du WebP léger
      console.log(`    • scene-${pad2(i + 1)}.webp : ✓`);
    });
  }
  for (const s of scenes) {
    s.imageUrl = (await fileExists(path.join(cwd, s._imageFile))) ? s._imageUrlPath : null;
  }

  const durationSec = finalizeTimings(scenes);
  const snippet = buildSnippet(manifest, scenes, durationSec);
  const entry = buildEntry(manifest.slug, snippet);

  if (cacheDir) {
    await writeFile(path.join(cacheDir, `${manifest.slug}.snippet.ts`), entry + "\n", "utf8");
  }

  let written = false;
  if (!noInsert) {
    const res = await writeIntoContent(manifest.slug, entry, force);
    if (res.ok) {
      written = true;
      console.log(`  ✓ Entrée '${manifest.slug}' ${res.mode === "replaced" ? "remplacée" : "insérée"} (${durationSec}s).`);
    } else {
      console.warn(`  ⚠ Non insérée : ${res.reason}.`);
    }
  }

  return { slug: manifest.slug, durationSec, written, entry, skipped: false };
}

// ---------------------------------------------------------------------------
// CLI (un manifest)
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith("--"));
  const flags = new Set(args.filter((a) => a.startsWith("--") && !a.includes("=")));
  const kv = Object.fromEntries(args.filter((a) => a.startsWith("--") && a.includes("=")).map((a) => a.slice(2).split("=")));

  const manifestPath = positional[0];
  if (!manifestPath) die("Chemin du manifest manquant. Usage : node new-story.mjs <manifest.json> [options]");

  await loadEnvFile(path.join(cwd, ".env.local"));
  await loadEnvFile(path.join(cwd, ".env"));

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (err) {
    die(`Impossible de lire/parser le manifest "${manifestPath}" : ${err.message}`);
  }

  const dryRun = flags.has("--dry-run");
  console.log(`\n▶ Histoire : ${manifest.title} (slug: ${manifest.slug})`);
  const r = await generateStory(manifest, {
    skipImages: dryRun || flags.has("--skip-images"),
    skipAudio: dryRun || flags.has("--skip-audio"),
    force: flags.has("--force"),
    noInsert: flags.has("--no-insert"),
    quality: kv.quality || "auto",
    cacheDir: path.dirname(manifestPath),
  });

  if (!r.skipped && !r.written && !flags.has("--no-insert")) {
    console.log("\n----- BEGIN STORY ENTRY -----");
    console.log(r.entry);
    console.log("----- END STORY ENTRY -----");
  }
  console.log("\n▶ Pense à lancer `npm run build` pour valider.");
}

// N'exécute la CLI que si le script est lancé directement (pas à l'import).
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => die(err?.stack || String(err)));
}
