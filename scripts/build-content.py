#!/usr/bin/env python3
"""Builds the app's bundled Quran content and the ayah_meta seed for Supabase.

Source: github.com/fawazahmed0/quran-api (Unlicense for the dataset; each text keeps its
own author's rights: Arabic text via Tanzil / Quran Academy, translations by their translators).
Usage: python3 scripts/build-content.py <path-to-quran-api> <out-dir> <sql-out>
"""
import json, re, sys
src, out, sql_out = sys.argv[1], sys.argv[2], sys.argv[3]
ed = lambda n: [v['text'] for v in json.load(open(f'{src}/editions/{n}.json'))['quran']]
info = json.load(open(f'{src}/info.json'))

ar, simple = ed('ara-quranacademy'), ed('ara-quransimple')
tr = {'sq_ahmeti': ed('sqi-sherifahmeti'), 'sq_nahi': ed('sqi-hassannahi'), 'translit': ed('ara-quran-la')}
assert len(ar) == len(simple) == 6236 and all(len(v) == 6236 for v in tr.values())

LETTER = re.compile(r'[ء-غف-يٱ]')
letters = [len(LETTER.findall(t)) for t in simple]

chapters, page, juz = [], [], []
for c in info['chapters']:
    chapters.append({'n': c['chapter'], 'name': c['name'], 'ar': c['arabicname'], 'en': c['englishname'],
                     'count': len(c['verses']), 'place': c['revelation']})
    for v in c['verses']:
        page.append(v['page']); juz.append(v['juz'])
assert len(page) == 6236 and max(page) == 604 and max(juz) == 30

json.dump({'chapters': chapters, 'page': page, 'juz': juz, 'letters': letters},
          open(f'{out}/meta.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(ar, open(f'{out}/ar.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for k, v in tr.items():
    json.dump([re.sub(r'\s+', ' ', t).strip() for t in v], open(f'{out}/{k}.json', 'w'), ensure_ascii=False, separators=(',', ':'))

# Supabase seed for ayah_meta
per_page = {}
for p in page: per_page[p] = per_page.get(p, 0) + 1
rows, key = [], 0
for c in chapters:
    for a in range(1, c['count'] + 1):
        key += 1
        p = page[key - 1]
        rows.append(f"({key},{c['n']},{a},{p},{juz[key-1]},{letters[key-1]},{1/per_page[p]:.6f})")
with open(sql_out, 'w') as f:
    f.write('-- Seed: verse metadata (6236 rows). Letters counted on the plain Tanzil text, diacritics removed.\n')
    f.write('insert into ayah_meta (ayah_key, surah, ayah, page, juz, letters, page_share) values\n')
    f.write(',\n'.join(rows) + '\non conflict (ayah_key) do nothing;\n')
print('verses', key, 'letters total', sum(letters), 'Fatiha letters', sum(letters[:7]))
