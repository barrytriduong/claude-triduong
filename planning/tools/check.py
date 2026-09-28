import re, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from collections import Counter, defaultdict
from data_a1_a2 import A1, A2
from data_b1_b2 import B1, B2
from overrides import apply
ALL = apply(A1 + A2 + B1 + B2)
log = open(os.path.join(HERE, '..', 'vocabulary-log.md')).read().split('## Planned (reserved)')[0]  # only EP01–EP04 rows
logged = set()
for m in re.finditer(r'^\| ([^|]+?) \| (?:adjective|noun|verb|phrasal verb|phrase|preposition|adverb)', log, re.M):
    logged.add(m.group(1).strip().lower())
logged |= {'hero'}  # used as a lesson word on the live Terry Fox page
used_people = {('Wilma Rudolph','A2'),('Wangari Maathai','B1'),('Terry Fox','A2'),('Helen Keller','A1')}
used_structs = {"could / couldn't + verb (ability in the past)"}
errs = []
print('counts', {l: sum(e['level']==l for e in ALL) for l in ['A1','A2','B1','B2']}, 'total', len(ALL))
seen = {}
for e in ALL:
    k = (e['person'], e['level'])
    if k in seen or k in used_people: errs.append(f"person repeated at same level: {k}")
    seen[k] = 1
    if len(e['words']) != 5: errs.append(f"{e['person']}: {len(e['words'])} words")
    if len(e['extras']) != 3: errs.append(f"{e['person']}: {len(e['extras'])} extras")
by_person = Counter(e['person'] for e in ALL)
print('repeats:', [p for p, c in by_person.items() if c > 1])
where = defaultdict(list)
for e in ALL:
    for w in e['words']:
        where[w.split('|')[0].lower()].append(e['person'] + ' (video)')
    for w in e['extras']:
        where[w.lower()].append(e['person'] + ' (lesson)')
for w, ps in where.items():
    if len(ps) > 1: errs.append(f"duplicate word '{w}': {ps}")
    if w in logged: errs.append(f"already in log '{w}': {ps}")
sc = Counter(e['structure'].lower() for e in ALL)
for s, c in sc.items():
    if c > 1: errs.append(f"duplicate structure: {s}")
for s in used_structs:
    if s.lower() in sc: errs.append(f"structure already used: {s}")
print('\n'.join(errs) if errs else 'NO PROBLEMS')
print(len(errs), 'problems')
