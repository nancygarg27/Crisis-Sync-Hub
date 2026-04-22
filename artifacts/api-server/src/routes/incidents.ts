import { Router, type IRouter } from "express";
import {
  ClassifyIncidentBody,
  CreateIncidentBody,
  CreateSilentSosBody,
  UpdateIncidentStatusBody,
} from "@workspace/api-zod";
import {
  createIncident,
  getIncident,
  listIncidents,
  updateIncidentStatus,
  type Classification,
} from "../lib/store";
import {
  classifyImage,
  classifyMessage,
  silentSosClassification,
} from "../lib/classifier";

const router: IRouter = Router();

router.post("/incidents/classify", async (req, res) => {
  const parsed = ClassifyIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    let classification: Classification;
    if (parsed.data.message) {
      classification = await classifyMessage(parsed.data.message);
    } else if (parsed.data.imageBase64) {
      classification = await classifyImage(parsed.data.imageBase64);
    } else {
      res.status(400).json({ error: "Provide message or imageBase64" });
      return;
    }
    res.json(classification);
  } catch (err) {
    req.log.error({ err }, "Classification failed");
    res.status(500).json({ error: "Classification failed" });
  }
});

router.get("/incidents", (_req, res) => {
  res.json(listIncidents());
});

router.post("/incidents", (req, res) => {
  const parsed = CreateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid incident body" });
    return;
  }
  try {
    const incident = createIncident({
      guestName: parsed.data.guestName,
      roomId: parsed.data.roomId,
      message: parsed.data.message,
      source: parsed.data.source as never,
      classification: parsed.data.classification as never,
    });
    res.status(201).json(incident);
  } catch (err) {
    req.log.error({ err }, "Create incident failed");
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/incidents/silent-sos", (req, res) => {
  const parsed = CreateSilentSosBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid SOS body" });
    return;
  }
  try {
    const incident = createIncident({
      guestName: parsed.data.guestName,
      roomId: parsed.data.roomId,
      source: "silent_sos",
      classification: silentSosClassification(),
      silent: true,
    });
    res.status(201).json(incident);
  } catch (err) {
    req.log.error({ err }, "Silent SOS failed");
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/incidents/:id", (req, res) => {
  const incident = getIncident(req.params.id);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(incident);
});

router.post("/incidents/:id/status", (req, res) => {
  const parsed = UpdateIncidentStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid status body" });
    return;
  }
  const incident = updateIncidentStatus(req.params.id, {
    status: parsed.data.status as never,
    staffId: parsed.data.staffId,
    etaSeconds: parsed.data.etaSeconds,
    note: parsed.data.note,
  });
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(incident);
});

export default router;
