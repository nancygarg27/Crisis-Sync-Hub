# RAPID - Crisis Response System

A rapid crisis-response system for hospitality venues such as hotels, malls, and transit hubs. It coordinates guests, on-site staff, and dispatchers in real time during emergencies.

## Features
- **Guest emergency reporting** with text, voice (Web Speech API), or camera (getUserMedia) input
- **AI classification** via Gemini 2.5 Flash that detects category, severity, language, and gives instructions in the guest's language
- **Silent SOS** with a 3-second press-and-hold panic button
- **Floor map heatmap** where rooms with active incidents pulse red by severity
- **Staff dashboard** to dispatch, track, and resolve incidents with ETA
- **Live status tracker** with a timeline: alert received -> dispatched -> en route -> resolved
- **Auto-translation summary** for staff in English regardless of guest language
- **Incident log** with timestamped events for insurance and legal follow-up

## Stack
- **Frontend**: `artifacts/rapid` - React + Vite + wouter + TanStack Query + Tailwind/shadcn
- **Backend**: `artifacts/api-server` - Express + in-memory store for demo mode
- **AI**: `lib/integrations-gemini-ai` - Gemini integration proxy (`gemini-2.5-flash`, JSON schema mode)
- **API spec**: `lib/api-spec/openapi.yaml` - source of truth that generates `@workspace/api-zod` and `@workspace/api-client-react`

## Routes
- `/` - Guest reporting + Silent SOS
- `/alert/:id` - Guest live status tracker
- `/floor-map` - Visual heatmap by floor
- `/staff` - Dispatcher dashboard + incident log

## API endpoints
- `POST /api/incidents/classify` - text or image to incident classification
- `POST /api/incidents` - create incident
- `POST /api/incidents/silent-sos` - silent panic button
- `GET /api/incidents`
- `GET /api/incidents/:id`
- `POST /api/incidents/:id/status` - advance status, assign staff, set ETA
- `GET /api/floor-map` - venue layout mock
- `GET /api/staff` - staff list with availability
