# FFGlory 4.0 Release Checklist

## Before public launch
- [ ] Put the backend behind HTTPS/reverse proxy.
- [ ] Set `NODE_ENV=production`.
- [ ] Set strong `FFGLORY_API_KEY`, `FFGLORY_MASTER_KEY`, and application/session secrets.
- [ ] Restrict `CORS_ORIGINS` to trusted origins.
- [ ] Replace development `10.0.2.2` backend URL with the production HTTPS URL in the Android app.
- [ ] Use a real persistent database/session store for multiple backend instances.
- [ ] Create and securely store the Android signing key.
- [ ] Run an APK/AAB build from Android Studio and test login, group actions, coupons, transactions, notifications, and admin access.
- [ ] Verify that no secret is committed to source control or packaged into the APK.
