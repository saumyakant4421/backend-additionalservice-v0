# Additional Service (Movie Marathon Planner)

This microservice provides watch party and movie-marathon features backed by Firestore and TMDB.

## Quick start (local development)

1. Copy `.env.example` to `.env` and set values.
2. Provide Firebase credentials via one of the following (in order of priority):
   - `FIREBASE_SERVICE_ACCOUNT` environment variable (JSON string) — not recommended for production.
   - `GOOGLE_APPLICATION_CREDENTIALS` pointing to a local service account JSON file.
   - A local file `firebase-adminsdk.json` or path set in `FIREBASE_SERVICE_ACCOUNT_PATH`.
   - In production, the service will attempt to load the secret from Google Secret Manager.
3. Install dependencies and run the service:

```powershell
npm install
npm run dev
```

## Deployment notes

- For production on GCP (Cloud Run, GKE, Compute Engine):
  - Prefer storing the Firebase service account JSON in Secret Manager and grant the runtime service account `roles/secretmanager.secretAccessor`.
  - Alternatively, attach a runtime service account to the instance and grant it the necessary Firestore and Secret Manager roles.

- Environment variables supported:
  - `TMDB_API_KEY` (required)
  - `PORT` (optional)
  - `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_PATH` or `GOOGLE_APPLICATION_CREDENTIALS`
  - `SKIP_SECRET_MANAGER=true` to avoid calling Secret Manager.

## Troubleshooting

- If you see `7 PERMISSION_DENIED` when accessing Secret Manager, ensure the runtime identity has `roles/secretmanager.secretAccessor`.
- If startup fails with `The default Firebase app does not exist`, ensure Firebase is initialized before code that calls Firestore. Routes are required after initialization in `index.js` to avoid this.

If you want, I can also:
- Add a Dockerfile or adjust `render.yaml` for deployment.
- Provide exact `gcloud` commands for granting IAM roles to your runtime service account.
