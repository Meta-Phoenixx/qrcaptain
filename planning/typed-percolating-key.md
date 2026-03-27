# Plan: Admin Panel for Karen Memorial Gallery

## Context
Admins need a password-protected page to review all gallery photos and remove inappropriate or unwanted ones. Since Vercel's filesystem is read-only at runtime, committed photos can't be physically deleted — instead they're added to a `blocked.json` list stored in Vercel Blob, and the gallery filters them out. Blob-uploaded photos are hard-deleted via `@vercel/blob`'s `del()`.

---

## Credentials Backup
- Write `archived/admin-credentials.txt` locally with login/password
- Add `archived/admin-credentials.txt` to `.gitignore` so it's never pushed to the public GitHub repo

---

## Authentication
- **No database** — credentials hardcoded in `api/admin.js`
  - Username: `HarrisAdmin`  Password: `Harris4Life`
- **Session token**: `{timestamp}.{HMAC-SHA256(timestamp, secret)}` where `secret = 'HarrisAdmin:Harris4Life'`
- Token valid 24 hours, verified on every protected request
- Stored in browser `sessionStorage` — clears on tab close

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `admin.html` | Create — login + photo management UI |
| `api/admin.js` | Create — auth, list, delete actions |
| `api/photos.js` | Modify — filter out blocked photos |
| `serve.mjs` | Modify — add local admin routes (filesystem delete + serve admin.html) |
| `vercel.json` | Modify — add `/admin` and `/api/admin` routes |
| `.gitignore` | Create/modify — exclude `archived/admin-credentials.txt` |
| `archived/admin-credentials.txt` | Create — local credentials backup (gitignored) |

---

## `api/admin.js` — Single endpoint with `?action=` routing

```
POST /api/admin?action=auth    → { username, password } → { success, token }
GET  /api/admin?action=list    → [auth] → { photos: [{src, type, label}] }
POST /api/admin?action=delete  → [auth] { photos: [...] } → { success, deleted, blocked }
GET  /api/admin?action=blocked → [auth] → { blocked: [...] }
```

**Auth flow:**
```js
const ADMIN_USER   = 'HarrisAdmin'
const ADMIN_PASS   = 'Harris4Life'
const TOKEN_SECRET = 'HarrisAdmin:Harris4Life'

function makeToken(ts) {
  const mac = crypto.createHmac('sha256', TOKEN_SECRET).update(String(ts)).digest('hex')
  return `${ts}.${mac}`
}
function verifyToken(token) {
  const [ts, mac] = (token || '').split('.')
  if (!ts || !mac) return false
  if (Date.now() - Number(ts) > 86400000) return false   // 24h expiry
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(ts).digest('hex')
  try { return crypto.timingSafeEqual(Buffer.from(mac,'hex'), Buffer.from(expected,'hex')) }
  catch { return false }
}
```

**Delete logic:**
- Photo src starts with `https://` → Blob photo → call `del(src, { token: blobToken })`
- Photo src is a filename → committed photo → load `admin_blocked.json` from Blob, append filename, re-`put()`
- Return counts: `{ deleted: N (blob), blocked: N (filesystem) }`

**Blocked list (`admin_blocked.json` in Vercel Blob):**
- Simple JSON array of strings: filenames and/or full URLs
- `put('admin_blocked.json', JSON.stringify(arr), { access: 'public', contentType: 'application/json', token })`
- Read with `fetch(blobUrl)` or `head()` + fetch

---

## `api/photos.js` changes

After fetching filesystem + Blob photos, fetch `admin_blocked.json`:
```js
try {
  const { blobs } = await list({ prefix: 'admin_blocked', token: blobToken })
  if (blobs.length) {
    const blocked = await fetch(blobs[0].url).then(r => r.json())
    // Filter from photos array
    photos = photos.filter(p => !blocked.includes(p))
  }
} catch {}
```

---

## `serve.mjs` changes (local dev)

Add routes before the catch-all static handler:
- `GET /admin` → serve `admin.html`
- `GET /api/admin?action=list` → read filesystem photos + return them
- `POST /api/admin?action=auth` → compare hardcoded creds, return token
- `POST /api/admin?action=delete` → for filesystem photos: `fs.unlink()` from `photos/`; for Blob photos: no-op locally (or skip)

Local admin is simpler — only filesystem photos, actual deletion works fine.

---

## `admin.html` — Three states

All brand-matched (dark bg `#07070f`, gold `#c9a96e`, Cormorant Garamond + Inter).

### State 1: Login
- Centered form, Karen header ("Admin Portal" subline)
- Username + password fields (48px+ touch targets)
- "Sign In" button
- Error message on bad credentials

### State 2: Photo Grid
- Header: "Gallery Management" + photo count
- 3-column grid (desktop) / 2-col (tablet) / 1-col (mobile)
- Each photo card:
  - Image thumbnail
  - Filename/label below (truncated)
  - Click to toggle "marked for deletion" (red overlay + ✕ icon)
- Sticky bottom action bar:
  - "X photo(s) selected for removal"
  - "Save Changes" button (gold, disabled when nothing selected)
  - "Select All" / "Clear Selection" link
- "Sign Out" in top right

### State 3: Saving
- Overlay with progress indicator: "Removing X photo(s)…"
- On complete: success message + count, auto-return to grid (refreshed)

---

## `vercel.json` additions

```json
{ "source": "/admin",      "destination": "/admin.html" },
{ "source": "/api/admin",  "destination": "/api/admin"  }
```

---

## Verification

1. `node serve.mjs` locally → visit `http://localhost:3000/admin`
2. Login with wrong password → error shown
3. Login with `HarrisAdmin` / `Harris4Life` → photo grid appears with all photos
4. Mark a few for deletion → "Save Changes" activates
5. Save → photos disappear from grid
6. Visit `http://localhost:3000` → deleted photos no longer appear in slideshow
7. On Vercel production: same flow, Blob photos hard-deleted, committed photos added to `blocked.json`
