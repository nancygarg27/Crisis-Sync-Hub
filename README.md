# RAPID Crisis Sync Hub

RAPID is a hotel and venue emergency response prototype with a dark single-page frontend and an optional Firebase-backed realtime state layer.

## What is included

- `prototype.html`
  The fastest demo entry point. Open it directly for a local demo.
- `firebase-config.js`
  Runtime Firebase config for the prototype.
- `firebase.json`
  Firebase Hosting and Firestore config.
- `firebase.rules`
  Firestore rules for the prototype state document.
- `firestore.indexes.json`
  Firestore index config.
- `artifacts/rapid`
  Original React frontend source from the project.
- `artifacts/api-server`
  Existing API-server artifact from the original repo.

## Current prototype flow

1. Guest reports an incident by text, voice shortcut, camera shortcut, or silent SOS.
2. The prototype classifies the incident and recommends the response.
3. The alert appears in `My Alert`, `Floor Map`, and `Staff`.
4. Staff can dispatch, mark en route, and resolve incidents.
5. When Firebase is configured, incidents and staff state sync through Firestore in realtime.

## Run locally without Firebase

Open `prototype.html` directly in a browser.

The app will run in `Local Demo Mode` and persist state in `localStorage`.

## Enable Firebase backend

1. Create a Firebase project.
2. Enable Firestore.
3. Copy `.firebaserc.example` to `.firebaserc` and replace the project id.
4. Edit `firebase-config.js` and paste your real Firebase web config.
5. Deploy Firestore rules and hosting:

```bash
firebase deploy --only hosting,firestore
```

After config is added, the top bar will switch from `Local Demo Mode` to `Firebase Sync Live`.

## Files to push to GitHub

- `prototype.html`
- `firebase.json`
- `firebase.rules`
- `firestore.indexes.json`
- `firebase-config.example.js`
- `firebase-config.js`
- `.firebaserc.example`
- `README.md`
- `artifacts/`
- `attached_assets/`
- `lib/`
- `scripts/`
- root config files like `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, and `tsconfig.base.json`

Do not push local-only folders like `.git/` and `.local/`.

## Important note

`firebase-config.js` is intentionally safe by default. The prototype only connects to Firestore after you add a real Firebase web config.
