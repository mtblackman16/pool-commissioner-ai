# ESPN NCAA Proxy — Cloudflare Worker Deployment Notes (v2.2.0)

**Deployed:** 2026-03-12
**URL:** `https://espn-ncaa-proxy.mark-016.workers.dev`
**Account:** Mark@buildclear.com on Cloudflare
**Status:** ✅ Live, 0 errors, 8 endpoints (scoreboard, rankings, teams, teams/{id}, roster/{id}, summary, standings, health)

## Changelog
- **v2.2.0** (2026-03-12): Standings without `?group=` param now returns conference directory (22 conferences with IDs) instead of hitting ESPN — prevents ChatGPT ResponseTooLargeError on all-conference requests. Version synced across all files.
- **v2.1.0** (2026-03-12): Fixed leaders extraction (grouped by team→categories), teams default limit→400 (362 D1 teams), rankings prev=0→"NR", added /roster/{teamId} endpoint, fixed standings stats extraction (keyed by type), corrected conference IDs (SEC=23, Big 12=8, WCC=29)
- **v1.0.0** (2026-03-12): Initial deploy with 6 endpoints. Standings broken (wrong conf IDs, wrong stat fields). Leaders had empty categories/teams.

---

## Exact Cloudflare Dashboard Navigation (March 2026 UI)

### Left Sidebar Structure
```
Account home
Recents >
Analytics & logs >
Domains
Build
  └─ Compute >
       └─ Workers & Pages    ← CLICK THIS
     Observability
     Workers for Platforms
     Containers [Beta]
     Durable Objects
     Queues
     Workflows
     Browser Rendering
     VPC [Beta]
     Email Service >
     Workers plans
```

### Step-by-Step Deployment

1. **Log in** to [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Left sidebar** → under **Build** → **Compute** → **Workers & Pages**
3. Click **"Create"** button (blue, top area)
4. You'll see options: "Start with Hello World!", "Framework Starter", "Import from GitHub"
   → Click **"Start with Hello World!"**
5. **Name your worker:** `espn-ncaa-proxy` (or any name — this becomes part of the URL)
6. Click **"Deploy"** — this creates the worker with default Hello World code
7. You'll land on a preview page with a code editor on the left and preview on the right
   - ⚠️ **The preview may spin/hang** — this is normal, ignore it
   - ⚠️ **The Play button may be grayed out** — also normal
8. In the code editor (left side):
   - **Select all** (Ctrl+A / Cmd+A) the default Hello World code
   - **Delete it**
   - **Paste** the full worker.js code
9. Click **"Deploy"** (blue button, top right)

### After Deployment — Worker Dashboard

Breadcrumb: `Workers & Pages > espn-ncaa-proxy`

Tabs across the top:
- **Overview** — URL, Metrics (Requests, Errors, CPU Time), Bindings
- **Metrics** — Detailed request analytics
- **Deployments** — Version history
- **Bindings** — Environment variables, KV stores
- **Observability** — Logs
- **Settings** — Routes, triggers, compatibility

Worker URL shown at top: `espn-ncaa-proxy.mark-016.workers.dev`
(Format: `{worker-name}.{account-subdomain}.workers.dev`)

### Testing

Open these URLs in your browser to verify:
- `https://espn-ncaa-proxy.mark-016.workers.dev/health` → Should show endpoint list
- `https://espn-ncaa-proxy.mark-016.workers.dev/scoreboard` → Should show today's games (5KB)
- `https://espn-ncaa-proxy.mark-016.workers.dev/rankings` → Should show AP Top 25 (6KB)
- `https://espn-ncaa-proxy.mark-016.workers.dev/teams/150` → Should show Duke info

⚠️ The ROOT URL (`/`) returns `{"error":"Unknown endpoint..."}` — this is by design. Always use a specific path.

---

## Gotchas We Hit

### 1. Template Literal with # Character
**Error:** `Uncaught SyntaxError: Private field '#$' must be declared in an enclosing class`
**Cause:** Cloudflare's code editor/parser misinterpreted `` `#${variable}` `` as a private class field declaration
**Fix:** Rewrote entire worker to use ES5-compatible syntax:
- No template literals (backticks) → use string concatenation (`+`)
- No optional chaining (`?.`) → use explicit null checks (`a && a.b`)
- No arrow functions (`=>`) → use `function() {}`
- No spread operators (`...`) → use `Object.assign()`
- No `for...of` → use traditional `for` loops

### 2. Preview Spinner
**Issue:** The preview panel on the code editor page keeps spinning and Play button is grayed out
**Cause:** Preview tries to load the root URL (`/`), which returns a 404 JSON response
**Fix:** Ignore it. Deploy anyway. Test by visiting the actual URLs in your browser.

### 3. Root URL Returns Error
**Issue:** Visiting the worker URL without a path shows an error
**Expected behavior:** The worker only handles specific paths (`/scoreboard`, `/rankings`, etc.)
**Fix:** Always use a specific endpoint path. The `/health` endpoint lists all available paths.

---

## Cost

- **Cloudflare Workers Free tier:** 100,000 requests/day
- **This worker's usage:** ~20-50 requests/day during tournament
- **Cost: $0**

---

## Phased Rollout Strategy

### Phase 1: Jake uses Mark's proxy (Day 1 — zero Cloudflare setup)
- Jake's Custom GPT Actions point at `https://espn-ncaa-proxy.mark-016.workers.dev`
- Mark keeps this Worker live through the tournament
- Jake focuses ONLY on: ChatGPT Plus signup + Custom GPT creation + testing
- Zero infrastructure work for Jake on Day 1

### File Inventory (v2.1.0)
All files live in the GitHub repo (`mtblackman16/pool-commissioner-ai`) and are also at `espn-proxy/` locally:

| File | Purpose | Version |
|------|---------|---------|
| `worker.js` | Cloudflare Worker proxy code — deploy this | v2.1.0 |
| `openapi-schema.yaml` | OpenAPI schema — paste into ChatGPT Actions | v2.1.0 |
| `system-prompt.txt` | Custom GPT system prompt — paste into Instructions | v2.1.0 |
| `knowledge-base.md` | Knowledge base — upload to Custom GPT | v2.1.0 |
| `index.html` | Setup guide — GitHub Pages | v2.1.0 |
| `DEPLOYMENT-NOTES.md` | This file (internal) | — |
| `QA-REPORT-v2.1.0.md` | QA validation report (internal) | — |

### Phase 2: Jake migrates to his own proxy (optional, after tournament starts)
- Jake creates a free Cloudflare account
- Follows the deployment guide below to spin up his own Worker
- Updates ONE line in his Custom GPT Actions schema (the server URL)
- Tests with `/health` endpoint
- Now he owns it end-to-end, Mark's Worker becomes backup

### Cloudflare Setup Guide (for Phase 2)

1. Go to [cloudflare.com](https://cloudflare.com) → Sign up (free)
2. Once in dashboard: Left sidebar → **Compute** → **Workers & Pages**
3. Click **"Create"** → **"Start with Hello World!"**
4. Name it: `espn-pool-proxy` (or any name)
5. Click **"Deploy"** (creates placeholder)
6. Click **"Edit Code"** (opens web editor)
7. **Select all** the default code → **Delete** → **Paste** the worker code from the setup page
8. Click **"Deploy"** (top right)
9. ⚠️ The preview panel may spin/hang — **this is normal, ignore it**
10. Your Worker URL appears at the top (like `espn-pool-proxy.jake-123.workers.dev`)
11. Test it: open `YOUR-URL/health` in your browser — should show endpoint list
12. Test scores: open `YOUR-URL/scoreboard` — should show today's games
13. **Update your Custom GPT:** Edit your GPT → Actions → change the server URL to your new Worker URL
14. Test the GPT to make sure it still fetches scores

**Cost:** $0. Free tier = 100,000 requests/day (you'll use ~20).
