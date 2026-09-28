# FFGlory App — Combined Release 3.1

Android + Node/Express source combining the previous feature set: authentication, encrypted Android session storage, dashboard, groups/actions, coupons, transactions/history, notification endpoints, admin roles, audit logs, rate limiting, security headers, controlled CORS, health checks, Docker deployment, and server-side FFGlory credentials.

## Android
Open the `android/` folder in Android Studio and sync Gradle. The default emulator backend URL is `http://10.0.2.2:8080`; change it to your HTTPS production backend before release.

## Backend
```text
cd backend
npm install
cp .env.example .env
# fill in the required server-side secrets
npm start
```

Or use Docker Compose from the project root after creating `backend/.env`.

## Security
Never put FFGlory API keys or master keys in the Android app. Use HTTPS in production, a persistent database/session store for multi-instance deployments, and a securely stored Android signing key.

## Build status
The source package and backend syntax were checked in this environment. An APK/AAB was not compiled because the Android SDK/Gradle toolchain is not available here. See `RELEASE-CHECKLIST.md` for the remaining production checks.


## v4.2 stability notes
- Backend returns JSON for malformed JSON/request errors.
- Expired sessions and rate-limit buckets are periodically pruned.
- Password changes invalidate existing sessions.
- Writes use atomic temp-file replacement.
- Android permits local HTTP for emulator development; use HTTPS in production and set the production backend URL.
- The bundled JSON store is suitable for single-instance development/small deployments. For multi-instance production, use a transactional database such as PostgreSQL before horizontal scaling.


## Stability release notes
- Release Android builds disable cleartext HTTP; use HTTPS in production.
- Emulator/local HTTP should only be used for debug builds.
- Backend returns JSON for late-stage CORS/request errors.
- APK/AAB compilation still requires a local Android SDK/Gradle environment.
