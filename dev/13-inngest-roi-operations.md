# Automatic ROI Operations

## Purpose

Daily ROI is credited automatically through Inngest. The workflow is
provider-neutral: the Next.js application can run on Vercel, Railway,
Hostinger VPS, or another Node.js host with a public HTTPS URL.

The existing authenticated `POST /api/cron/roi` endpoint remains available as
an operational fallback. The normal schedule is owned by Inngest.

## Required Environment Variables

Add these values to every deployed environment that should run jobs:

```env
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

During a signing-key rotation, the old key can temporarily be supplied as:

```env
INNGEST_SIGNING_KEY_FALLBACK=
```

Never commit real keys.

## Production Setup

1. Deploy the application with the Inngest environment variables.
2. In the Inngest dashboard, sync the application using:
   `https://YOUR_DOMAIN/api/inngest`
3. Confirm that `Automatic daily ROI` appears in the function list.
4. Confirm its cron schedule is `12:30 AM Asia/Kolkata`.
5. Trigger the function once from the Inngest dashboard in a non-production
   test environment and inspect `/admin/roi/history`.

Changing hosting providers only requires updating the synced application URL
and adding the same environment variables to the new host.

## Local Development

Run the application, then start the Inngest development server:

```powershell
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Add this to the local `.env` file:

```env
INNGEST_DEV=1
```

Open `http://localhost:8288` to inspect or manually trigger the function. The
local development server does not require production signing keys. Never set
`INNGEST_DEV=1` in a production environment.

## Processing Model

- One run is recorded for each India calendar date.
- The database unique constraints on `roi_runs.run_date` and each investment
  credit make retries idempotent.
- Active investments are loaded in batches of 50.
- At most five users are credited concurrently inside one batch.
- A user's investments are processed sequentially to preserve wallet ordering.
- Failed investments are retried independently up to three workflow passes.
- Inngest retries failed workflow steps up to four times.
- A failed run can be retried from the admin ROI history page.
- A previously completed credit is never credited twice.

## Admin Monitoring

The dashboard and notification bell report:

- scheduled before the daily run;
- processing while a run is active;
- completed with credited and processed counts;
- failed or stalled runs requiring attention;
- a missing run after `2:00 AM IST`.

The automatic run starts at `12:30 AM IST`. A run that remains active for more
than 20 minutes is shown as potentially stalled. The database claim lease is
two hours, preventing a second worker from taking over a legitimate slow run.

## Deployment Checks

After every deployment:

1. Open the Inngest application and confirm the endpoint is reachable.
2. Confirm the function is registered and the latest sync succeeded.
3. Check the admin notification bell after the next scheduled run.
4. Check `/admin/roi/history` for counts and error details.
5. Use the manual admin retry only when the scheduled run failed or is absent.
