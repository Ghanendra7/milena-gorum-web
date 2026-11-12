# Milena Gorum — Webflow CMS Batch Uploader

Password-protected drag-and-drop batch uploader hosted alongside the Cloudflare Pages assets repo at `/uploader/`.

It leaves `global.css` and all live site JS engines untouched.

---

## Setup (3 minutes)

### 1. Create a Webflow API Token
In Webflow **Site Settings → Apps & Integrations → API Access → Generate API Token**, enable:
- `assets:write`
- `cms:read`
- `cms:write`

### 2. Add Environment Variables in Cloudflare Pages
In **Cloudflare Dashboard → Workers & Pages → `milena-gorum-assets` → Settings → Environment variables** (Production & Preview), add:

| Variable | Required | Value |
| :--- | :--- | :--- |
| `WEBFLOW_API_TOKEN` | Yes | Your Webflow Data API v2 token |
| `UPLOADER_PASSWORD` | Yes | Shared password for Louis |
| `WEBFLOW_SITE_ID` | Optional | Auto-detected if omitted |
| `WEBFLOW_PROJECTS_COLLECTION_ID` | Optional | Auto-detected if omitted |
| `WEBFLOW_MEDIA_COLLECTION_ID` | Optional | Auto-detected if omitted |

> **Recommended extra security:** Enable **Cloudflare Zero Trust → Access** on `https://milena-gorum-assets.pages.dev/uploader*` and `/api/*` restricted to your & Louis's email addresses.

### 3. Deploy & Open
Push to `main` (or trigger a Cloudflare Pages redeploy after setting env vars), then open:

`https://milena-gorum-assets.pages.dev/uploader/`

Click **Field Mapping** in the top bar on first use to verify the auto-detected Webflow field slugs (`Parent`, `Order`, `Image`, `Video ID`, `Fill Screen`, `Focus X/Y`, `Gallery Multi-Ref`).

---

## Local Testing

```bash
cp .dev.vars.example .dev.vars
# Fill in WEBFLOW_API_TOKEN and UPLOADER_PASSWORD in .dev.vars
npx wrangler pages dev .
```

Then open `http://127.0.0.1:8788/uploader/`.

