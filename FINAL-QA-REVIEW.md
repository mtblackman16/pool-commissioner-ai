# FINAL QA REVIEW — Pool Commissioner AI Package

**Reviewer:** Kira (automated QA)
**Date:** 2026-03-12
**Verdict:** ⚠️ **CONDITIONAL PASS — 2 critical issues must be fixed before shipping**

---

## 🔴 CRITICAL ISSUES (must fix before shipping)

### 1. Version Number Mismatch — worker.js is v2.2.0, everything else says v2.1.0

| File | Version Shown |
|------|--------------|
| `worker.js` | **v2.2.0** |
| `openapi-schema.yaml` | v2.1.0 ❌ |
| `index.html` (Instructions badge) | v2.1.0 ❌ |
| `index.html` (embedded schema) | v2.1.0 ❌ |
| `knowledge-base.md` (canonical ref) | v2.1.0 ❌ |
| `DEPLOYMENT-NOTES.md` (title) | v2.1.0 ❌ |
| `DEPLOYMENT-NOTES.md` (file inventory) | v2.1.0 ❌ |
| `system-prompt.txt` | (no version) — N/A |

**Fix:** Either bump all references to v2.2.0, or decide v2.1.0 is the shipping version and revert the worker comment. Consistency is what matters.

### 2. Operation Count Wrong — Says "8" Everywhere, Schema Defines 7

The worker has 8 **endpoints** (including `/health`), but `/health` is NOT in the OpenAPI schema. The schema defines exactly **7 operations**:

1. `getScoreboard` (/scoreboard)
2. `getRankings` (/rankings)
3. `getTeamsList` (/teams)
4. `getTeamDetail` (/teams/{teamId})
5. `getTeamRoster` (/roster/{teamId})
6. `getGameSummary` (/summary)
7. `getStandings` (/standings)

**Where "8" is wrong:**
- `system-prompt.txt`: "You have live ESPN data via your Actions (8 endpoints)" ❌
- `index.html`: "You should see **8 operations** appear in the list below the schema" ❌ — **Jake will see 7 and think setup failed**
- `knowledge-base.md`: "Your Custom GPT has 8 Actions" ❌, Actions table lists 7 rows ❌
- `DEPLOYMENT-NOTES.md`: "8 endpoints" (OK here since it's counting worker endpoints including /health, but inconsistent with schema)

**Fix:** Change all references to "7 Actions" (or "7 operations") in system prompt, index.html, and knowledge base. The deployment notes can keep "8 endpoints" since that's the worker count including /health. The index.html fix is the most critical — Jake will count operations and panic.

---

## 🟡 MINOR ISSUES (nice to fix, won't block)

### 3. Wispr Flow URL — Display Text vs Href Mismatch
- `index.html`: `<a href="https://wisprflow.ai">wisprflow.com</a>`
- Href goes to `.ai` but display text says `.com`
- **Fix:** Change display text to `wisprflow.ai`

### 4. HTML Structure — Steps D–I Float Outside Section Card
- The `</section>` tag closes after Step 2C (Instructions/system prompt)
- Steps D (Conversation Starters) through I (Create) are orphaned outside the white card container
- They'll render on the bare page background without the styled card border/shadow
- **Fix:** Move `</section>` to after Step 2I

### 5. Conversation Starters Differ Between Knowledge Base and Setup Guide
- **Knowledge base** starter #1: "What should I know before Selection Sunday?"
- **Index.html** starter #1: "What are today's tournament scores?"
- **Knowledge base** starter #3: "Write a recap email (I'll paste standings)"
- **Index.html** starter #3: "Write a recap email (I'll paste pool standings)"
- Not critical since Jake configures from index.html, but the knowledge base should match to avoid confusion if the GPT reads it.

### 6. DEPLOYMENT-NOTES.md Changelog Missing v2.2.0 Entry
- Title says v2.1.0, changelog only has v2.1.0 and v1.0.0 entries
- If worker.js is legitimately v2.2.0, a changelog entry should explain what changed

---

## 🔵 COSMETIC NOTES (optional polish)

### 7. System Prompt — getTeamsList Guidance Says "do NOT pass a limit parameter"
- But the schema has `default: 400` which handles this automatically
- Not wrong, just redundant — the GPT will use 400 by default. Could simplify to "default returns all 362 D1 teams"

### 8. Knowledge Base — "v2.1.0" in Canonical Location Reference
- `knowledge-base.md` says: "Canonical location: espn-proxy/system-prompt.txt (v2.1.0)"
- This version tag will go stale again. Consider removing the version from this reference or saying "see latest version"

### 9. Index.html — "Text Mark" in Troubleshooting
- Last troubleshooting row says "Screenshot it and text Mark"
- This is fine for internal use but slightly informal for a setup guide. Acceptable given the audience (Jake, family).

---

## ✅ CROSS-REFERENCE TABLE

### Version Numbers
| File | Version |
|------|---------|
| worker.js | **v2.2.0** |
| openapi-schema.yaml | v2.1.0 |
| index.html (badge) | v2.1.0 |
| index.html (embedded schema) | v2.1.0 |
| knowledge-base.md | v2.1.0 |
| DEPLOYMENT-NOTES.md | v2.1.0 |

### Proxy URL
| File | URL | Match? |
|------|-----|--------|
| openapi-schema.yaml | `https://espn-ncaa-proxy.mark-016.workers.dev` | ✅ |
| index.html (schema) | `https://espn-ncaa-proxy.mark-016.workers.dev` | ✅ |
| index.html (troubleshooting) | `https://espn-ncaa-proxy.mark-016.workers.dev` | ✅ |
| DEPLOYMENT-NOTES.md | `https://espn-ncaa-proxy.mark-016.workers.dev` | ✅ |
| knowledge-base.md | `https://espn-ncaa-proxy.mark-016.workers.dev` | ✅ |

### Core Conference IDs (SEC, Big 12, WCC, ACC, Big East, Big Ten)
| File | SEC | Big 12 | WCC | ACC | Big East | Big Ten | Match? |
|------|-----|--------|-----|-----|----------|---------|--------|
| system-prompt.txt | 23 | 8 | 29 | 2 | 4 | 7 | ✅ |
| openapi-schema.yaml | 23 | 8 | 29 | 2 | 4 | 7 | ✅ |
| knowledge-base.md | 23 | 8 | 29 | 2 | 4 | 7 | ✅ |
| index.html (embedded) | 23 | 8 | 29 | 2 | 4 | 7 | ✅ |

### Key Team IDs
| Team | system-prompt | schema | knowledge-base | Match? |
|------|--------------|--------|----------------|--------|
| Duke | 150 | 150 | 150 | ✅ |
| UNC | 153 | 153 | 153 | ✅ |
| Kentucky | 96 | 96 | 96 | ✅ |
| Kansas | 2305 | 2305 | 2305 | ✅ |
| Gonzaga | 2250 | 2250 | 2250 | ✅ |
| Houston | 248 | 248 | 248 | ✅ |
| Auburn | 2 | 2 | 2 | ✅ |
| Florida | 57 | 57 | 57 | ✅ |
| Tennessee | 2633 | 2633 | 2633 | ✅ |
| Arizona | 12 | 12 | 12 | ✅ |

### Participant Count
| File | Count | Match? |
|------|-------|--------|
| system-prompt.txt | 26 | ✅ |
| knowledge-base.md | 26 | ✅ |
| index.html | 26 | ✅ |

### Scoring (per round)
| File | Scoring | Max | Match? |
|------|---------|-----|--------|
| system-prompt.txt | 10-20-40-80-160-320 | 1,920 | ✅ |
| knowledge-base.md | 10-20-40-80-160-320 | 1,920 | ✅ |

### Key Dates
| Item | Expected | knowledge-base | index.html | Match? |
|------|----------|---------------|------------|--------|
| Selection Sunday | March 15 | March 15 ✅ | March 15 ✅ | ✅ |
| Bracket Deadline | March 19 12:15 PM ET | March 19 12:15 PM ET ✅ | March 19 12:15 PM ET ✅ | ✅ |

---

## ✅ VERIFIED ITEMS (all pass)

- [x] Proxy URL consistent across all files
- [x] Conference IDs consistent across all files
- [x] Team IDs consistent across all files
- [x] 26 participants — same names in system prompt and knowledge base
- [x] Scoring 10-20-40-80-160-320, max 1,920
- [x] Dates: Selection Sunday March 15, brackets due March 19 12:15 PM ET
- [x] Setup guide step order: 1→2(A-I)→3
- [x] Model recommendation: GPT-5.4 Thinking
- [x] System prompt copy block in index.html matches system-prompt.txt exactly
- [x] OpenAPI schema copy block in index.html matches openapi-schema.yaml exactly
- [x] No phone numbers in index.html
- [x] All TOC anchor links resolve to valid IDs
- [x] Capabilities: Web Search ON, Code Interpreter ON, Apps OFF, Canvas OFF, Image Gen OFF
- [x] Privacy policy URL: https://mtblackman16.github.io/pool-commissioner-ai/
- [x] Deploy Your Own Proxy references correct GitHub repo
- [x] System prompt: voice rules present (Hi everyone- / -Jacob)
- [x] System prompt: verification checkpoint present
- [x] Schema: x-openai-isConsequential: false on all GETs
- [x] Schema: teams default limit=400
- [x] Schema: server URL correct
- [x] Knowledge base: Actions-first pipeline (not paste-first)
- [x] Knowledge base: troubleshooting includes Actions-specific items
- [x] Knowledge base: no stale paste-as-primary references
- [x] Knowledge base: system prompt section points to canonical file

---

## Summary

**2 critical fixes needed** (version sync + operation count 8→7), then this is ready to ship. Everything else — URLs, conference IDs, team IDs, participants, scoring, dates, copy blocks, capabilities, voice rules — is clean and consistent.
