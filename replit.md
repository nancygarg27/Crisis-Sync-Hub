# RAPID — Crisis Response System

A rapid crisis-response system for hospitality venues (hotels, malls, transit hubs). Coordinates guests, on-site staff, and dispatchers in real time during emergencies.

## Features
- **Guest emergency reporting** with text, voice (Web Speech API), or camera (getUserMedia) input
- **AI classification** via Gemini 2.5 Flash — detects category, severity, language, gives instructions in the guest's language
- **Silent SOS** — 3-second press-and-hold panic button
- **Floor map heatmap** — rooms with active incidents pulse red, intensity by severity
- **Staff dashboard** — dispatch/track/resolve incidents with ETA
- **Live status tracker** — Zomato-style timeline (alert received → dispatched → en route → resolved), polls every 3s
- **Auto-translation summary** for staff (English) regardless of input language
- **Incident log** — timestamped events for insurance/legal

## Stack
- **Frontend**: `artifacts/rapid` — React + Vite + wouter + TanStack Query + Tailwind/shadcn
- **Backend**: `artifacts/api-server` — Express + in-memory store (no DB; this is a demo/prototype)
- **AI**: `lib/integrations-gemini-ai` — Gemini via Replit AI Integrations proxy (`gemini-2.5-flash`, JSON schema mode)
- **API spec**: `lib/api-spec/openapi.yaml` — source of truth, generates `@workspace/api-zod` and `@workspace/api-client-react` hooks

## Routes (frontend)
- `/` — Guest reporting + Silent SOS
- `/alert/:id` — Guest's live status tracker
- `/floor-map` — Visual heatmap by floor
- `/staff` — Dispatcher dashboard + incident log

## API endpoints
- `POST /api/incidents/classify` — text or image → classification
- `POST /api/incidents` — create incident
- `POST /api/incidents/silent-sos` — silent panic button
- `GET /api/incidents` / `GET /api/incidents/:id`
- `POST /api/incidents/:id/status` — advance status, assign staff, set ETA
- `GET /api/floor-map` — venue layout (Aurora Grand Hotel mock)
- `GET /api/staff` — staff list with availability
