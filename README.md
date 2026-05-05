# Invoxa — AI Invoice Extraction

Vertical-slice scaffold: upload PDF → Gemini extracts → editable draft → commit.
Stack: Django 5 + DRF + Postgres + Celery + Redis (backend), Next.js 16 + Tailwind
(frontend, MatDash theme recolored green/yellow), all on docker-compose.

## Run

```bash
docker compose up --build
```

Wait until you see `backend` listening on `:8000` and `frontend` on `:3000`.

- Frontend: http://localhost:3000
- Django admin: http://localhost:8000/admin/  (user: `admin` / pass: `admin`)
- API: http://localhost:8000/api/

## First-time flow

1. Open http://localhost:3000/admin/settings — paste your **Gemini API key**.
   (If you skip this, a built-in fake provider returns demo data so you can
   still see the full flow.)
2. Go to **Upload** → drop one of your PDFs (e.g. `Delmage/Document-7.pdf`).
3. You'll be redirected to the document detail page; it auto-refreshes while
   the Celery worker runs Gemini extraction.
4. Each invoice in the PDF appears as its own tab on the right; PDF preview
   on the left. Edit fields, click **Save**, then **Commit**.
5. Visit **Cost & Usage** to see raw vs billed cost (billed = raw × 1.30).

## Layout

```
backend/           Django project "invoxa"
  apps/organizations
  apps/documents     Document, InvoiceDraft, InvoiceLineDraft + viewsets
  apps/extraction    ExtractionRun + Celery task + prompt
  apps/llm           LlmProvider interface, Gemini + Fake adapters
  apps/settings_app  AppSetting (encrypted) + GET/POST /api/settings/
  apps/billing       /api/billing/summary, /api/billing/runs
frontend/          Next.js (MatDash recolored)
  src/app/(DashboardLayout)/page.tsx       Dashboard
  src/app/(DashboardLayout)/documents/...  List, upload, detail
  src/app/(DashboardLayout)/admin/...      Settings, cost, templates
infra/             (reserved for nginx/systemd/seed)
docker-compose.yml
```

## Notes

- 30% markup is enforced server-side in `apps.extraction.tasks` and surfaced via
  `apps.billing` — frontend only reads `billed_cost_usd`.
- PDFs stored on local disk under the backend container's `/app/media/` (mounted
  on the `mediadata` named volume — VPS-only, no S3/MinIO).
- Celery worker is a separate `worker` service; queues `default` + `extraction`.
- To change the encryption key for stored secrets, set `INVOXA_FERNET_KEY` env
  var (must be a 32-byte url-safe base64 Fernet key).

## Next iteration

- Auth + organizations enforcement
- Template Studio (zero-code template onboarding)
- Re-extract preserving prior runs in audit history
- Nginx + TLS + X-Accel-Redirect for media
- pgbouncer + Postgres tuning
