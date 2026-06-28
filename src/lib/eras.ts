// Classement des histoires par grande époque historique, à partir du champ
// `period` (formats variés : "1789", "Ier s.", "52 av. J.-C.", "v. 1000"…).

export interface Era {
  key: string;
  label: string;
  labelEn: string;
  min: number; // année incluse
  max: number; // année exclue
}

export const ERAS: Era[] = [
  { key: 'prehistoire', label: 'Préhistoire', labelEn: 'Prehistory', min: -Infinity, max: -800 },
  { key: 'antiquite', label: 'Antiquité', labelEn: 'Antiquity', min: -800, max: 481 },
  { key: 'moyen-age', label: 'Moyen Âge', labelEn: 'Middle Ages', min: 481, max: 1492 },
  { key: 'renaissance', label: 'Renaissance', labelEn: 'Renaissance', min: 1492, max: 1610 },
  { key: 'moderne', label: 'Temps modernes', labelEn: 'Early Modern era', min: 1610, max: 1789 },
  { key: 'revolution', label: 'Révolution & Empire', labelEn: 'Revolution & Empire', min: 1789, max: 1815 },
  { key: 'xixe', label: 'XIXᵉ siècle', labelEn: '19th century', min: 1815, max: 1914 },
  { key: 'contemporain', label: 'XXᵉ–XXIᵉ', labelEn: '20th–21st century', min: 1914, max: Infinity },
];

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function fromRoman(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]];
    const next = ROMAN[s[i + 1]];
    if (!v) return 0;
    if (next && v < next) n -= v;
    else n += v;
  }
  return n;
}

/**
 * Convertit une période en année approximative (négative = av. J.-C.).
 * Renvoie null si rien d'exploitable.
 */
export function periodToYear(period?: string | null): number | null {
  if (!period) return null;
  const s = period.trim();
  const bc = /av\.?\s*j/i.test(s); // "av. J.-C."

  // 1) Année explicite. On privilégie une année à 4 chiffres (sinon 3, sinon le
  //    premier nombre) pour ne pas confondre le jour avec l'année — ex.
  //    « 14 juillet 1789 » → 1789, pas 14.
  const nums = (s.match(/\d+/g) || []).map((m) => parseInt(m, 10));
  if (nums.length) {
    const d4 = nums.find((n) => n >= 1000 && n <= 2099);
    const d3 = nums.find((n) => n >= 100 && n <= 999);
    const year = d4 ?? d3 ?? nums[0];
    return bc ? -year : year;
  }

  // 2) Siècle = chiffre romain + suffixe ordinal (Ier, Ve, XIVe…), même sans « siècle ».
  const oMatch = s.match(/([IVXLCDM]+)(?:er|ère|ème|nd|e)\b/);
  if (oMatch) {
    const c = fromRoman(oMatch[1]);
    if (c > 0 && c <= 21) return bc ? -(c * 100 - 50) : (c - 1) * 100 + 50;
  }

  // 3) Siècle en chiffres romains suivi d'un 's' (siècle).
  const cMatch = s.match(/([IVXLCDM]+)\s*(?:er|ème|nd|e)?\s*s/i);
  if (cMatch) {
    const c = fromRoman(cMatch[1].toUpperCase());
    if (c > 0 && c <= 21) return bc ? -(c * 100 - 50) : (c - 1) * 100 + 50;
  }

  // 3) Tout chiffre romain isolé (ex. "Ve-IIe av. J.-C.").
  const rMatch = s.match(/\b([IVXLCDM]+)\b/);
  if (rMatch) {
    const c = fromRoman(rMatch[1].toUpperCase());
    if (c > 0 && c <= 21) return bc ? -(c * 100 - 50) : (c - 1) * 100 + 50;
  }

  // 4) Mots-clés de secours.
  const low = s.toLowerCase();
  if (low.includes('préhist') || low.includes('prehist')) return -3000;
  if (low.includes('antiquit')) return -300;
  if (low.includes('moyen')) return 1000;
  if (low.includes('renaissance')) return 1550;
  return null;
}

/** Clé d'époque pour une période donnée ('autre' si indéterminée). */
export function eraOf(period?: string | null): string {
  const y = periodToYear(period);
  if (y == null) return 'autre';
  for (const e of ERAS) if (y >= e.min && y < e.max) return e.key;
  return 'autre';
}

/** Libellé d'époque (FR/EN) pour une période, ou null si indéterminée. */
export function eraLabel(period?: string | null, lang: 'fr' | 'en' = 'fr'): string | null {
  const key = eraOf(period);
  const era = ERAS.find((e) => e.key === key);
  if (!era) return null;
  return lang === 'en' ? era.labelEn : era.label;
}
