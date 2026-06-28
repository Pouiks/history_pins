#!/usr/bin/env python3
"""
Convertit un fichier Excel « <ville>_a_traiter.xlsx » en « <ville>.events.json »,
au format attendu par batch-stories.mjs :
  [{ topic, slug, locationName, latitude, longitude, period }, ...]

Sans dépendance externe : lit le .xlsx (un zip de XML) via la lib standard.
Les colonnes sont repérées par le NOM de l'en-tête (Lieu / Lat / Lng / Période /
Histoire), donc l'ordre des colonnes peut changer d'un fichier à l'autre.

Usage :
  python scripts/xlsx-to-events.py montpellier_a_traiter.xlsx [sortie.events.json]
"""
import sys, os, re, json, zipfile, unicodedata
import xml.etree.ElementTree as ET

# Console Windows en cp1252 : forcer l'UTF-8 pour les messages.
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'


def slugify(s: str) -> str:
    """Identique au slugify() du pipeline (new-story.mjs)."""
    s = unicodedata.normalize('NFD', str(s))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = re.sub(r'^-+|-+$', '', s)
    return s[:60]


def col_index(ref: str) -> int:
    letters = ''.join(c for c in ref if c.isalpha())
    n = 0
    for c in letters:
        n = n * 26 + (ord(c) - 64)
    return n - 1


def read_rows(xlsx_path: str):
    z = zipfile.ZipFile(xlsx_path)
    shared = []
    try:
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall(f'{NS}si'):
            shared.append(''.join(t.text or '' for t in si.iter(f'{NS}t')))
    except KeyError:
        pass
    sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = []
    for row in sheet.iter(f'{NS}row'):
        cells = {}
        for c in row.findall(f'{NS}c'):
            ref = c.get('r')
            t = c.get('t')
            v = c.find(f'{NS}v')
            inl = c.find(f'{NS}is')
            if v is not None:
                val = shared[int(v.text)] if t == 's' else (v.text or '')
            elif inl is not None:
                val = ''.join(x.text or '' for x in inl.iter(f'{NS}t'))
            else:
                val = ''
            cells[col_index(ref)] = (val or '').strip()
        if cells:
            m = max(cells)
            rows.append([cells.get(i, '') for i in range(m + 1)])
    return rows


def find_header(rows):
    """Repère la ligne d'en-tête et renvoie (index, mapping nom→colonne)."""
    for i, r in enumerate(rows):
        low = [c.lower() for c in r]
        joined = ' | '.join(low)
        if 'lieu' in joined and ('lat' in low or any('lat' == c for c in low)) \
                and any('lng' in c or 'lon' in c for c in low):
            mapping = {}
            for j, c in enumerate(low):
                if 'histoire' in c or 'anecdote' in c:
                    mapping.setdefault('topic', j)
                elif c == 'lieu' or c.startswith('lieu'):
                    mapping.setdefault('locationName', j)
                elif c == 'lat':
                    mapping.setdefault('latitude', j)
                elif c == 'lng' or c.startswith('lon'):
                    mapping.setdefault('longitude', j)
                elif 'riode' in c and 'chapitre' not in c and 'th' not in c:
                    # vraie colonne « Période » (pas « Chapitre (période — thème) »)
                    mapping.setdefault('period', j)
            return i, mapping
    raise SystemExit('Aucune ligne d\'en-tête reconnue (attendu : Histoire, Lieu, Lat, Lng, Période).')


def num(v):
    if v is None or v == '':
        return None
    try:
        return float(str(v).replace(',', '.'))
    except ValueError:
        return None


def main():
    if len(sys.argv) < 2:
        raise SystemExit('Usage: python scripts/xlsx-to-events.py <fichier.xlsx> [sortie.events.json]')
    inp = sys.argv[1]
    if len(sys.argv) >= 3:
        out = sys.argv[2]
    else:
        base = os.path.basename(inp)
        base = re.sub(r'(_a_traiter)?\.xlsx?$', '', base, flags=re.I)
        out = f'{slugify(base)}.events.json'

    rows = read_rows(inp)
    hi, m = find_header(rows)
    required = ('topic', 'locationName', 'latitude', 'longitude', 'period')
    missing = [k for k in required if k not in m]
    if missing:
        raise SystemExit(f'Colonnes manquantes dans l\'en-tête : {missing} (trouvées : {m})')

    events, seen = [], set()
    skipped = 0
    for r in rows[hi + 1:]:
        topic = r[m['topic']].strip() if m['topic'] < len(r) else ''
        if not topic:
            continue
        lat = num(r[m['latitude']]) if m['latitude'] < len(r) else None
        lng = num(r[m['longitude']]) if m['longitude'] < len(r) else None
        if lat is None or lng is None:
            skipped += 1
            continue
        slug = slugify(topic)
        if slug in seen:
            skipped += 1
            continue
        seen.add(slug)
        events.append({
            'topic': topic,
            'slug': slug,
            'locationName': (r[m['locationName']].strip() if m['locationName'] < len(r) else ''),
            'latitude': round(lat, 6),
            'longitude': round(lng, 6),
            'period': (r[m['period']].strip() if m['period'] < len(r) else ''),
        })

    with open(out, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
    print(f'OK : {len(events)} histoires → {out}' + (f' ({skipped} ignorées)' if skipped else ''))


if __name__ == '__main__':
    main()
