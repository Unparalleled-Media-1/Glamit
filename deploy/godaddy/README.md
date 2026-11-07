# www.glamit.beauty — cPanel deployment package

This package runs the existing approved GLAM application as static HTML/CSS/JavaScript, with the authenticated account core served by the original Supabase project. It requires HTTPS static-file hosting, supported by the user's confirmed GoDaddy cPanel / Web Hosting plan. It does not require Node or Python on the web host.

The account source includes primary phone/SMS OTP, optional Google/Apple/Facebook PKCE and secure account linking, profile display-name editing and durable routine CRUD. SMS and social providers remain disabled until configured and tested; existing-user password sign-in remains an optional compatibility path. Auth tokens remain in app memory across navigation. Browser-stored styling plans are separate from account records. AI, private-image processing, merchant publication, booking and payment execution remain unavailable; reference images and products are not live results or inventory.

## Build and validation

Supply the original project's **public anon or publishable key** through `NEXT_PUBLIC_SUPABASE_ANON_KEY` or the existing server build environment's `SUPABASE_ANON_KEY`. Never supply a service-role, database or Stripe server credential as the public build key. The build validates key type/project before writing the bundle. No `.env` file is required or included.

```
npm run test:public-config
npm run typecheck:godaddy
npm run build:godaddy
npm run test:godaddy
```

The output is `dist/godaddy-web`. `build.json` identifies its source commit; `.htaccess` provides Apache routes/security headers. Explicit route directories also support direct page loads. `api/capabilities.json` advertises only the connected account core, with AI and commercial execution disabled. The existing offline design-review export remains a separate build.

## Live Supabase configuration verified

- Project: `bkkmsbxrxkqaveymcrgi`; application migration `0013_passwordless_accounts`.
- Auth site URL: `https://www.glamit.beauty`.
- Edge secret name: `GLAM_ALLOWED_ORIGINS`; allowed origins are the canonical website and the previously allowed GitHub Pages origin.
- Real website-origin preflight: HTTP204, exact allow-origin header. Untrusted origin: HTTP403.
- Phone/Google/Apple/Facebook remain disabled. Exact web callback `/auth/callback` and native `glamai://auth/callback` are prepared. Real SMS/OAuth callbacks and recovery delivery remain unverified.
- See [authentication rollout and regression report](../../docs/authentication/PASSWORDLESS_AUTH_REPORT.md).

## Upload procedure

1. Use cPanel's domain settings/API to identify the document root for `glamit.beauty`; do not assume `public_html` if this is an addon domain. Preserve a recoverable copy of existing website files and `.htaccess` outside the live document root before replacement.
2. Upload the archive contents to that approved document root, including dotfiles. Upload versioned assets and routes first, and the root `index.html` last. Preserve the backup until the public domain and account journey have passed verification. Do not delete unrelated hosting files or alter DNS as part of this file deployment.
3. Verify HTTPS, Home, direct `/profile/`, static assets, sign-in/profile update/routine CRUD/sign-out and browser console/network status through `https://www.glamit.beauty`. Validate mobile scrolling and navigation. A local package test is not proof of publication on GoDaddy.

Automated upload is pending the cPanel server URL, `GLAM_CPANEL_USER` and `GLAM_CPANEL_API_TOKEN` in secure environment settings, plus the server's applied network grant. The prepared ZIP is reviewable; **no hosting files or DNS have been changed**.
