#!/usr/bin/env python3
"""Parse the extracted Egyptian Civil Code text into structured JSON."""
import json
import re

ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

def to_western(s):
    return s.translate(ARABIC_DIGITS)

def clean(s):
    # strip markdown bold markers and stray whitespace
    s = s.replace("**", "")
    s = re.sub(r"\s+", " ", s).strip()
    return s

with open("/tmp/cc-agent/69236592/project/civil_code_raw.txt", "r", encoding="utf-8") as f:
    lines = [ln.rstrip("\n") for ln in f]

# ---- 1. Collect amendments / footnotes --------------------------------------
amendments = []
amend_re = re.compile(r"^\(([\u0660-\u0669])\)\s*(.*)")  # (١) ...
for ln in lines:
    m = amend_re.match(ln.strip())
    if m:
        txt = clean(m.group(2))
        if txt and ("القانون رقم" in txt or "القرار الجمهوري" in txt or "ملغاة" in txt or "ألغيت" in txt or "معدلة" in txt or "عدلت" in txt):
            amendments.append(txt)

# ---- 2. Walk the lines, build the tree --------------------------------------
# We treat the whole law as a root; structural markers push/pop levels.
# Levels (depth):  تمهيدي/كتاب(0 under قسم) -> باب -> فصل -> مادة
# But "قسم" is above "كتاب". Order:  قانون -> قسم -> كتاب -> باب -> فصل -> مادة

def is_struct(ln_stripped):
    """Return (node_type, title) or None."""
    s = ln_stripped
    c = clean(s)
    if not c:
        return None
    # باب تمهيدي
    if c == "باب تمهيدي" or c.startswith("باب تمهيدي"):
        return ("باب_تمهيدي", c)
    # القسم الأول: ...
    if re.match(r"^القسم (ال(?:أول|ثان[يى]|ثالث|رابع|خامس|سادس|سابع|ثامن|تاسع|عاشر))", c):
        return ("قسم", c)
    # الكتاب الأول: ...
    if re.match(r"^الكتاب (ال(?:أول|ثان[يى]|ثالث|رابع|خامس|سادس))", c):
        return ("كتاب", c)
    # الباب الأول: ...  / الباب الثاني
    if re.match(r"^الباب (ال(?:أول|ثان[يى]|ثالث|رابع|الخامس|خامس|سادس|سابع|ثامن))", c):
        return ("باب", c)
    # (الفصل الأول)  / **الفصل الثالث**
    if re.match(r"^\(?الفصل ", c):
        return ("فصل", c)
    return None

article_re = re.compile(r"^\*?\*?مادة\s*\(([\u0660-\u0669]+)\)\*?\*?:?\s*$")
range_re = re.compile(r"^\*?\*?المواد من\s*\(([\u0660-\u0669]+)\)\s*الى\s*\(([\u0660-\u0669]+)\)\*?\*?:?\s*$")

root = {"node_type": "قانون", "title": "القانون المدني المصري رقم 131 لسنة 1948", "children": []}
# stack of (node, depth-rank). rank: قسم=1, كتاب=2, باب_تمهيدي/باب=3, فصل=4
rank_map = {"قسم": 1, "كتاب": 2, "باب_تمهيدي": 3, "باب": 3, "فصل": 4}
stack = [(root, 0)]

def push(node):
    # pop until parent rank < node rank
    r = rank_map[node["node_type"]]
    while stack and stack[-1][1] >= r:
        stack.pop()
    parent = stack[-1][0]
    parent["children"].append(node)
    stack.append((node, r))

i = 0
N = len(lines)
# skip until we hit the first real content marker (باب تمهيدي)
# but keep the issuing-articles (المادة الأولى / الثانية) as preamble
preamble_articles = []
in_preamble = True

while i < N:
    raw = lines[i]
    s = raw.strip()
    c = clean(s)

    # stop at footer
    if "اترك تعليقاً" in c or "Scroll to Top" in c:
        break

    # ---- issuing articles (المادة الأولى / الثانية) before باب تمهيدي
    if in_preamble and c.startswith("المادة الأولى"):
        text_parts = []
        j = i + 1
        while j < N and not clean(lines[j].strip()) and j < N:
            j += 1
        # gather following non-empty lines until next structural/empty break
        j = i + 1
        # skip blank
        while j < N and not lines[j].strip():
            j += 1
        buf = []
        while j < N:
            t = clean(lines[j].strip())
            if not t:
                break
            if t.startswith("المادة الثانية") or t.startswith("**المادة الثانية") or t == "باب تمهيدي" or "نص التشريع" in t:
                break
            buf.append(t)
            j += 1
        preamble_articles.append({"node_type": "مادة", "number": "إصدارية 1", "content": " ".join(buf)})
        i = j
        continue
    if in_preamble and ("المادة الثانية" in c and "إصدار" not in c and len(c) < 30):
        # collecting body after it
        buf = []
        j = i + 1
        while j < N and not lines[j].strip():
            j += 1
        while j < N:
            t = clean(lines[j].strip())
            if not t:
                break
            if t == "باب تمهيدي" or t.startswith("صدر بقصر"):
                # include "صدر بقصر..." line in content
                buf.append(t)
                j += 1
                # keep going through blanks to next non-blank
                while j < N and not lines[j].strip():
                    j += 1
                break
            buf.append(t)
            j += 1
        preamble_articles.append({"node_type": "مادة", "number": "إصدارية 2", "content": " ".join(buf)})
        i = j
        continue

    # ---- structural markers
    st = is_struct(s)
    if st:
        in_preamble = False
        ntype, title = st
        node = {"node_type": ntype, "title": title, "children": []}
        push(node)
        i += 1
        continue

    # ---- range of repealed articles
    rm = range_re.match(s)
    if rm:
        a = int(to_western(rm.group(1)))
        b = int(to_western(rm.group(2)))
        # collect the (ملغاة) note
        note_lines = []
        j = i + 1
        while j < N and not lines[j].strip():
            j += 1
        while j < N:
            t = clean(lines[j].strip())
            if not t:
                break
            note_lines.append(t)
            j += 1
        note = " ".join(note_lines)
        node = {"node_type": "مادة", "number": f"{a}-{b}", "content": "(ملغاة) " + note, "repealed": True}
        # attach to current فصل/باب
        stack[-1][0]["children"].append(node)
        i = j
        continue

    # ---- single article
    am = article_re.match(s)
    if am:
        num = int(to_western(am.group(1)))
        # gather content lines until next article / struct / footnote-only / blank-blank
        buf = []
        footnotes = []
        j = i + 1
        # skip leading blanks
        while j < N and not lines[j].strip():
            j += 1
        while j < N:
            t = lines[j].strip()
            ct = clean(t)
            if not ct:
                # could be end; but allow one blank then continue? stop on blank
                # peek next non-blank
                k = j + 1
                while k < N and not lines[k].strip():
                    k += 1
                if k >= N:
                    break
                nk = clean(lines[k].strip())
                # if next is a new article or struct, stop
                if article_re.match(lines[k].strip()) or range_re.match(lines[k].strip()) or is_struct(lines[k].strip()) or nk.startswith("المادة") or "اترك تعليقاً" in nk:
                    break
                # otherwise treat blank as paragraph separator
                buf.append("\n")
                j = k
                continue
            # footnote line like (١) ...
            fnm = re.match(r"^\(([\u0660-\u0669])\)\s*(.*)", ct)
            if fnm:
                footnotes.append(clean(fnm.group(2)))
                j += 1
                continue
            # new article / struct -> stop
            if article_re.match(t) or range_re.match(t) or is_struct(t):
                break
            if ct.startswith("المادة الأولى") or ct.startswith("المادة الثانية"):
                break
            buf.append(ct)
            j += 1
        content = " ".join(b for b in buf if b != "\n").replace(" \n ", "\n").strip()
        # collapse multiple spaces
        content = re.sub(r"\s+", " ", content)
        node = {"node_type": "مادة", "number": str(num), "content": content}
        if footnotes:
            node["footnotes"] = footnotes
        stack[-1][0]["children"].append(node)
        i = j
        continue

    i += 1

# ---- 3. Count articles -------------------------------------------------------
def count_articles(node):
    n = 0
    for ch in node.get("children", []):
        if ch["node_type"] == "مادة":
            n += 1
        else:
            n += count_articles(ch)
    return n

def collect_article_nums(node, acc):
    for ch in node.get("children", []):
        if ch["node_type"] == "مادة":
            acc.append(ch["number"])
        else:
            collect_article_nums(ch, acc)
    return acc

total = count_articles(root)
nums = collect_article_nums(root, [])

# dedupe amendments preserving order
seen = set()
uniq_amend = []
for a in amendments:
    if a not in seen:
        seen.add(a)
        uniq_amend.append(a)

out = {
    "law_number": "131",
    "year": 1948,
    "title": "القانون المدني",
    "source": "https://nexuscharter.com/ar/egyptian-civil-law",
    "preamble_issuing_articles": preamble_articles,
    "amendments": uniq_amend,
    "total_articles_parsed": total,
    "structure": [root],
}

with open("/tmp/cc-agent/69236592/project/egyptian_civil_code.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print(f"Articles parsed: {total}")
print(f"First 5 nums: {nums[:5]}")
print(f"Last 10 nums: {nums[-10:]}")
print(f"Amendments: {len(uniq_amend)}")
print(f"Preamble articles: {len(preamble_articles)}")
# find gaps
seen_nums = []
for n in nums:
    if "-" in n:
        a,b = n.split("-")
        seen_nums.extend(range(int(a), int(b)+1))
    elif n.isdigit():
        seen_nums.append(int(n))
seen_set = set(seen_nums)
missing = sorted(set(range(1,1149+1)) - seen_set)
print(f"Missing article numbers (of 1..1149): {len(missing)}")
if missing[:20]:
    print(f"First missing: {missing[:30]}")
