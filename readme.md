# SkyTech Secure Site

This package includes:
- your website pages (`index.html`, `purchase.html`, `contact.html`)
- real AI chatbot frontend (`chatbot.js`) with a server-side `/api/chat` endpoint
- secure login with seeded users
- MFA setup and verification using TOTP authenticator apps
- admin dashboard for users and contact submissions
- contact form wired to the backend instead of demo-only behavior
- security headers and rate limiting

## Seeded users
These are included for local testing only:
- Admin / Password
- testuser / Password

Change both passwords before any real deployment.

## Run locally
1. Install Node.js 18+
2. In this folder:
   ```bash
   npm install
   cp .env.example .env
   npm run dev
   ```
3. Open `http://localhost:3000`

## MFA flow
1. Visit `/login.html`
2. Sign in with a seeded user
3. On first login, scan the QR code in an authenticator app
4. Enter the 6-digit code to finish MFA setup
5. Future logins require password + authenticator code

## Admin dashboard
- Login as `Admin`
- Complete MFA setup
- Visit `/admin.html`

The admin dashboard shows:
- all users
- whether MFA is enabled
- contact form submissions

## AI chatbot
To enable real AI chat, add your key to `.env`:
```env
OPENAI_API_KEY=your_key_here
```
The chatbot UI is loaded by `chatbot.js` and calls the backend at `/api/chat`.

## Before production
- change the seeded passwords
- replace `SESSION_SECRET`
- use HTTPS
- set `NODE_ENV=production`
- store data in a real database instead of JSON files
- add password reset and audit logging
