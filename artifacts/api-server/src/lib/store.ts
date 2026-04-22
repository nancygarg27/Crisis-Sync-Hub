import { randomUUID } from "node:crypto";

export type IncidentCategory =
  | "Fire"
  | "Medical"
  | "Security"
  | "Flood"
  | "Gas Leak"
  | "Electrical"
  | "Other";

export type IncidentSeverity = "Low" | "Medium" | "High" | "Critical";

export type IncidentStatus =
  | "alert_received"
  | "staff_dispatched"
  | "en_route"
  | "resolved";

export type IncidentSource = "text" | "voice" | "image" | "silent_sos";

export interface Classification {
  category: IncidentCategory;
  severity: IncidentSeverity;
  callService: string;
  instructions: string[];
  detectedLanguage: string;
  languageCode: string;
  translatedSummary: string;
  keywords: string[];
}

export interface StatusEvent {
  status: IncidentStatus;
  timestamp: string;
  note?: string;
  staffName?: string;
}

export interface Incident {
  id: string;
  guestName?: string;
  roomId: string;
  roomLabel: string;
  floorId: string;
  message?: string;
  source: IncidentSource;
  classification: Classification;
  status: IncidentStatus;
  timeline: StatusEvent[];
  assignedStaffId?: string;
  etaSeconds?: number;
  createdAt: string;
  silent: boolean;
}

export interface Room {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Floor {
  id: string;
  label: string;
  level: number;
  rooms: Room[];
}

export interface FloorMap {
  venueName: string;
  floors: Floor[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  available: boolean;
  location: string;
}

const FLOOR_MAP: FloorMap = {
  venueName: "Aurora Grand Hotel",
  floors: [
    {
      id: "floor-1",
      label: "Ground Floor",
      level: 1,
      rooms: [
        { id: "lobby", label: "Lobby", type: "lobby", x: 5, y: 5, width: 35, height: 25 },
        { id: "reception", label: "Reception", type: "reception", x: 40, y: 5, width: 20, height: 15 },
        { id: "restaurant", label: "Restaurant", type: "restaurant", x: 60, y: 5, width: 35, height: 25 },
        { id: "kitchen", label: "Kitchen", type: "kitchen", x: 60, y: 30, width: 20, height: 15 },
        { id: "gym", label: "Fitness Center", type: "gym", x: 5, y: 30, width: 25, height: 20 },
        { id: "pool", label: "Pool Deck", type: "pool", x: 30, y: 30, width: 30, height: 20 },
        { id: "boiler", label: "Boiler Room", type: "utility", x: 80, y: 30, width: 15, height: 15 },
      ],
    },
    {
      id: "floor-2",
      label: "Floor 2",
      level: 2,
      rooms: [
        { id: "201", label: "Room 201", type: "guest_room", x: 5, y: 5, width: 18, height: 20 },
        { id: "202", label: "Room 202", type: "guest_room", x: 23, y: 5, width: 18, height: 20 },
        { id: "203", label: "Room 203", type: "guest_room", x: 41, y: 5, width: 18, height: 20 },
        { id: "204", label: "Room 204", type: "guest_room", x: 59, y: 5, width: 18, height: 20 },
        { id: "205", label: "Room 205", type: "guest_room", x: 77, y: 5, width: 18, height: 20 },
        { id: "hall-2", label: "Corridor 2", type: "corridor", x: 5, y: 25, width: 90, height: 8 },
        { id: "211", label: "Room 211", type: "guest_room", x: 5, y: 33, width: 18, height: 20 },
        { id: "212", label: "Room 212", type: "guest_room", x: 23, y: 33, width: 18, height: 20 },
        { id: "spa", label: "Spa Suite", type: "spa", x: 41, y: 33, width: 36, height: 20 },
        { id: "stairs-2", label: "Stairwell", type: "stairs", x: 77, y: 33, width: 18, height: 20 },
      ],
    },
    {
      id: "floor-3",
      label: "Floor 3",
      level: 3,
      rooms: [
        { id: "301", label: "Room 301", type: "guest_room", x: 5, y: 5, width: 18, height: 20 },
        { id: "302", label: "Room 302", type: "guest_room", x: 23, y: 5, width: 18, height: 20 },
        { id: "303", label: "Room 303", type: "guest_room", x: 41, y: 5, width: 18, height: 20 },
        { id: "304", label: "Room 304", type: "guest_room", x: 59, y: 5, width: 18, height: 20 },
        { id: "305", label: "Suite 305", type: "guest_room", x: 77, y: 5, width: 18, height: 20 },
        { id: "hall-3", label: "Corridor 3", type: "corridor", x: 5, y: 25, width: 90, height: 8 },
        { id: "311", label: "Room 311", type: "guest_room", x: 5, y: 33, width: 18, height: 20 },
        { id: "312", label: "Room 312", type: "guest_room", x: 23, y: 33, width: 18, height: 20 },
        { id: "lounge-3", label: "Sky Lounge", type: "lounge", x: 41, y: 33, width: 36, height: 20 },
        { id: "stairs-3", label: "Stairwell", type: "stairs", x: 77, y: 33, width: 18, height: 20 },
      ],
    },
  ],
};

const STAFF: StaffMember[] = [
  { id: "staff-1", name: "Priya Sharma", role: "Security Lead", available: true, location: "Lobby" },
  { id: "staff-2", name: "Marcus Hill", role: "Floor Manager", available: true, location: "Floor 2" },
  { id: "staff-3", name: "Aiko Tanaka", role: "Medical Officer", available: true, location: "Reception" },
  { id: "staff-4", name: "Rafael Cruz", role: "Maintenance", available: true, location: "Boiler Room" },
  { id: "staff-5", name: "Eva Lindqvist", role: "Concierge", available: false, location: "Floor 3" },
  { id: "staff-6", name: "Jamal Okafor", role: "Fire Warden", available: true, location: "Ground Floor" },
];

const incidents = new Map<string, Incident>();

function findRoom(roomId: string): { room: Room; floor: Floor } | null {
  for (const floor of FLOOR_MAP.floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
    if (room) return { room, floor };
  }
  return null;
}

export function getFloorMap(): FloorMap {
  return FLOOR_MAP;
}

export function listStaff(): StaffMember[] {
  return STAFF;
}

export function getStaff(id: string): StaffMember | undefined {
  return STAFF.find((s) => s.id === id);
}

export function listIncidents(): Incident[] {
  return Array.from(incidents.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getIncident(id: string): Incident | undefined {
  return incidents.get(id);
}

export interface CreateIncidentArgs {
  guestName?: string;
  roomId: string;
  message?: string;
  source: IncidentSource;
  classification: Classification;
  silent?: boolean;
}

export function createIncident(args: CreateIncidentArgs): Incident {
  const found = findRoom(args.roomId);
  if (!found) {
    throw new Error(`Unknown room: ${args.roomId}`);
  }
  const id = randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const incident: Incident = {
    id,
    guestName: args.guestName,
    roomId: args.roomId,
    roomLabel: found.room.label,
    floorId: found.floor.id,
    message: args.message,
    source: args.source,
    classification: args.classification,
    status: "alert_received",
    timeline: [
      {
        status: "alert_received",
        timestamp: now,
        note: args.silent ? "Silent SOS received" : "Alert received",
      },
    ],
    createdAt: now,
    silent: !!args.silent,
  };
  incidents.set(id, incident);
  return incident;
}

export interface UpdateStatusArgs {
  status: IncidentStatus;
  staffId?: string;
  etaSeconds?: number;
  note?: string;
}

export function updateIncidentStatus(
  id: string,
  args: UpdateStatusArgs,
): Incident | undefined {
  const incident = incidents.get(id);
  if (!incident) return undefined;
  const now = new Date().toISOString();
  const staff = args.staffId ? getStaff(args.staffId) : undefined;
  if (args.staffId) incident.assignedStaffId = args.staffId;
  if (typeof args.etaSeconds === "number") incident.etaSeconds = args.etaSeconds;
  incident.status = args.status;
  incident.timeline.push({
    status: args.status,
    timestamp: now,
    note: args.note,
    staffName: staff?.name,
  });
  return incident;
}

// Seed two example incidents so the staff dashboard isn't empty on first load.
function seed() {
  const a = createIncident({
    guestName: "Walk-in Guest",
    roomId: "kitchen",
    message: "Smoke coming from the back of the kitchen near the fryer.",
    source: "text",
    classification: {
      category: "Fire",
      severity: "High",
      callService: "Fire Brigade",
      instructions: [
        "Evacuate the kitchen immediately.",
        "Do not use water on a grease fire.",
      ],
      detectedLanguage: "English",
      languageCode: "en",
      translatedSummary:
        "Smoke coming from the back of the kitchen near the fryer.",
      keywords: ["smoke", "fryer", "kitchen"],
    },
  });
  updateIncidentStatus(a.id, {
    status: "staff_dispatched",
    staffId: "staff-6",
    etaSeconds: 90,
    note: "Fire warden dispatched.",
  });

  createIncident({
    guestName: "Anjali R.",
    roomId: "212",
    message: "Mere kamre mein paani gir raha hai chhat se.",
    source: "text",
    classification: {
      category: "Flood",
      severity: "Medium",
      callService: "Maintenance",
      instructions: [
        "Apne saaman ko kamre ke doosre kone mein le jaayein.",
        "Bijli ke switch ko paani se door rakhein.",
      ],
      detectedLanguage: "Hindi",
      languageCode: "hi",
      translatedSummary: "Water is leaking from the ceiling in my room.",
      keywords: ["paani", "chhat", "leak"],
    },
  });
}

seed();
