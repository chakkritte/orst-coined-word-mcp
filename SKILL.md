---
name: thai-coined-term-lookup
description: Look up the official Royal Society of Thailand coined term (ศัพท์บัญญัติ) for English technical words when writing Thai academic papers, theses, dissertations, research proposals, or journal articles. Use this skill whenever the user is writing Thai academic text and needs the proper coined Thai translation of a technical term — especially in deep learning, computer vision, neural architecture search, knowledge distillation, on-device AI, or other CS/AI fields. Also trigger when the user asks "what's the Thai term for X", "แปล X เป็นไทย", mentions ศัพท์บัญญัติ, Royal Society terminology, ราชบัณฑิตยสภา, wants official Thai technical vocabulary, or is deciding between a native Thai coined term and a transliterated loan word. Use it proactively while drafting Thai thesis chapters, literature reviews, methodology sections, or any Thai research document that involves English technical terms — even if the user doesn't explicitly ask for a lookup, the moment an English technical term appears in Thai academic prose, check it here.
---

# Thai Coined-Term Lookup (ศัพท์บัญญัติ)

This skill looks up the official Thai coined terms from the **Royal Society of Thailand** (ราชบัณฑิตยสภา) coined-word database via the `orst-coined-word` MCP. It is designed for academic writing contexts where precise, officially-recognized terminology matters — theses, dissertations, journal papers, research proposals.

## Why this matters

Thai academic writing has two parallel vocabularies for any given English technical term:

1. **Transliterated loan words** — e.g. *คอมพิวเตอร์*, *ดีปเลิร์นิง*, *นิวรัลเน็ตเวิร์ก*. Casual, ubiquitous in industry and informal writing, but some thesis advisors and journals consider them imprecise or "not proper Thai."
2. **Native coined terms (ศัพท์บัญญัติ)** — e.g. *คณิตกรณ์*, *การเรียนรู้เชิงลึก*. Officially coined by the Royal Society, more formal, and required by many Thai graduate committees and journals.

The Royal Society database is the authoritative source for the second category. When writing Thai academic prose, prefer the coined term when it is well-established in the field; fall back to the transliterated form only when no coined term exists or the coined term is genuinely obscure. This skill helps you make that call per-term, with evidence.

## The three MCP tools

You have three tools in `orst-coined-word`. Use them as follows.

### 1. `lookup_word` — primary lookup

Call this when the user has a specific term in hand (English or Thai) and wants the official coined translation.

Parameters:
- `word` (required) — the term to look up, e.g. `"computer"`, `"deep learning"`, `"คอมพิวเตอร์"`.
- `book_id` (optional) — restrict the search to one subject-field dictionary. Default `"0"` searches all 40 fields. Only set this when the user explicitly asks for a domain-specific meaning (e.g. "computer" in mathematics vs. forestry can differ).

Behavior: returns every subject-field dictionary entry that contains the term, each with one or more Thai translations. A term often returns the *same* translation across multiple domains — that's a strong signal the term is well-established.

### 2. `search_suggestions` — autocomplete / partial match

Call this when the user is unsure of the exact spelling, or when `lookup_word` returned nothing and you want to find nearby terms.

Parameters:
- `query` (required) — partial term, e.g. `"neural"`, `"conv"`, `"distill"`.
- `limit` (optional, default 20) — cap on suggestions.

Behavior: returns live-search style suggestions from the database. Use this to discover the actual indexed form of a term — e.g. the user says "neural network" but the database only has `"neural network model"`, so `search_suggestions("neural")` reveals the correct full form to look up.

### 3. `list_domains` — browse subject fields

Call this when the user wants to know which subject dictionaries are available, or to find the `book_id` for a targeted `lookup_word` call.

Parameters: none.

Behavior: returns the 40 subject-field names (e.g. คณิตศาสตร์, คอมพิวเตอร์และเทคโนโลยีสารสนเทศ, วิทยาศาสตร์, นิเทศศาสตร์). Treat the parsing as best-effort — the response format can vary.

## How to interpret results

### Multiple translations for one term

Many entries return two translations — typically a transliterated form and a native coined form. Example for `computer`:

- คอมพิวเตอร์ (transliterated)
- คณิตกรณ์ (native coined — คณิต "math/calculation" + กรณ์ "instrument")

**Both are officially recognized.** The choice between them is a writing-style decision, not a correctness decision. See the recommendation guidance below.

### The same term across multiple domains

When a term returns the same translation from 3+ different domains (e.g. `computer` appears in Science, Computer/IT, Mathematics, Forestry), that's a strong signal the term is fully standardized — you can use either form with confidence.

When a term only appears in one narrow domain, treat it as domain-specific and prefer the coined form within that domain.

### No results

If `lookup_word` returns nothing:

1. **Try partial/variant forms.** Drop suffixes like `-tion`, `-ing`, plural `-s`. Try the root (e.g. `"deep learn"` failed — try `"deep learning"`). Try alternate phrasings (`"neural net"` → `"neural network"`).
2. **Call `search_suggestions`** with a word fragment to discover the actual indexed term. The database is sometimes stricter about exact forms than you'd expect.
3. **If still nothing**, tell the user honestly that no official coined term exists in the Royal Society database. Do not invent a translation. Offer the standard transliteration as a fallback and note that it is not a coined term.

## Recommendation guidance for Thai academic writing

When presenting a coined term to the user, use this framework rather than always defaulting to one form:

**Prefer the native coined term** when:
- It is short, intuitive, and already somewhat current in the field (e.g. *การเรียนรู้เชิงลึก* for "deep learning", *การมองเห็นด้วยคอมพิวเตอร์* for "computer vision").
- The user is writing a formal thesis, dissertation, or journal manuscript where committees expect Thai terminology.
- The coined term appears consistently across multiple domains in the database.

**Accept the transliterated form** when:
- The coined term is genuinely obscure or awkward (you'll notice this when a term returns *only* a transliterated form, or when the coined form is very long).
- The term is ubiquitous in industry and the transliterated form is what Thai practitioners actually say (e.g. *คอมพิวเตอร์*, *อัลกอริทึม*, *โมเดล*).
- The coined term would harm readability in a thesis that mixes many such terms.

**Practical pattern**: in a Thai thesis introduction, you often write the coined term on first use with the English term in parentheses, then pick whichever Thai form you'll use consistently thereafter. For example: "การเรียนรู้เชิงลึก (deep learning) เป็น..." then continue with *การเรียนรู้เชิงลึก*.

When the situation is genuinely ambiguous, present both forms, briefly explain the trade-off, and let the user choose based on their committee's or journal's preference.

## Presenting results to the user

Present lookups in a clean, scannable way. The natural format is a short table showing each Thai translation alongside the domains that endorse it, then a one-line recommendation. For example:

```
คำศัพท์บัญญัติสำหรับ "deep learning":

| ราชบัณฑิตยสภา | ศัพท์บัญญัติ | สาขาที่พบ |
|---|---|---|
| นิเทศศาสตร์ | การเรียนรู้เชิงลึก | นิเทศศาสตร์ |

คำแนะนำ: ในงานเขียนเชิงวิชาการ ให้ใช้ **การเรียนรู้เชิงลึก** เป็นคำหลัก (โดยใส่วงเล็บภาษาอังกฤษในการใช้ครั้งแรก) — เป็นศัพท์บัญญัติที่ยอมรับกันทั่วไปในสาขา
```

Always include:
- The Thai term(s) and the source domain(s).
- A brief recommendation — which form to use in academic writing, and why.
- If the term has no coined entry, say so plainly and offer the transliterated fallback.

## When to look up proactively

In Thai academic drafting work, the user will often write English technical terms inline without asking for a lookup. When you see an English technical term appear in Thai academic prose (especially in thesis/dissertation/research-paper contexts), look it up via `lookup_word` before settling on a Thai rendering — even if the user didn't explicitly request it. Surface the coined term and let the user decide. This is the highest-value use of this skill: catching English terms that *could* have a proper Thai coined form but would otherwise just get transliterated by default.

If you're editing or drafting a longer Thai document and encounter many English terms, batch the lookups rather than asking the user one at a time — look up every English technical term in the section, present a small glossary table, then proceed.

## Limitations to keep in mind

- The database covers ~40 subject fields and skews toward established technical vocabulary. Very recent terms (new architectures, new ML paradigms from the last year or two) may not have entries yet.
- Parsing of `list_domains` is best-effort; the response format can vary.
- The coined-term vs. transliteration choice is ultimately the user's. Your job is to surface the official option and give a reasoned recommendation, not to enforce one form.
