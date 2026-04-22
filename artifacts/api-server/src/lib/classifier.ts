import { ai } from "@workspace/integrations-gemini-ai";
import type { Classification } from "./store";
import { logger } from "./logger";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: ["Fire", "Medical", "Security", "Flood", "Gas Leak", "Electrical", "Other"],
    },
    severity: {
      type: "string",
      enum: ["Low", "Medium", "High", "Critical"],
    },
    callService: { type: "string" },
    instructions: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 3,
    },
    detectedLanguage: { type: "string" },
    languageCode: { type: "string" },
    translatedSummary: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
  },
  required: [
    "category",
    "severity",
    "callService",
    "instructions",
    "detectedLanguage",
    "languageCode",
    "translatedSummary",
    "keywords",
  ],
};

const SYSTEM_PROMPT = `You are an emergency response triage AI for a hospitality venue (hotel, mall, airport, transit hub).

You will receive either a guest's message (any language) or an image of an incident.

Your job:
1. Detect the language of the guest's message (if provided). Set detectedLanguage to the human-readable name (e.g. "Hindi", "French", "Mandarin", "English") and languageCode to the BCP-47 code (e.g. "hi", "fr", "zh", "en"). For images with no text, set detectedLanguage="English", languageCode="en".
2. Classify the crisis: pick exactly one category from [Fire, Medical, Security, Flood, Gas Leak, Electrical, Other].
3. Set severity: Low / Medium / High / Critical based on imminent risk to life.
4. callService: name the most appropriate first-responder service. Pick the BEST match for the situation:
   - Fire/smoke -> "Fire Brigade"
   - Injury, unconscious, bleeding, chest pain, fainting, cardiac, breathing -> "Ambulance"
   - Threat, intruder, stalker, theft, assault, panic SOS -> "Police"
   - Water leak, plumbing -> "Maintenance"
   - Gas smell -> "Gas Authority"
   - Electrical short, sparks, blackout -> "Electricians"
   - If multiple, pick the most life-critical first.
5. instructions: write exactly 2 to 3 short, specific actions the guest should take RIGHT NOW. CRITICAL: write these instructions in the SAME language the guest used (matching languageCode). For images, write in English.
6. translatedSummary: a one-sentence English summary of the situation (always English, regardless of input language).
7. keywords: 2-5 short trigger words that drove your decision (smoke, blood, intruder, gas, sparks, paani, etc.).

Respond ONLY with valid JSON matching the schema. No markdown, no commentary.`;

function coerceClassification(raw: unknown): Classification {
  if (!raw || typeof raw !== "object") {
    throw new Error("Classifier returned non-object payload");
  }
  const o = raw as Record<string, unknown>;
  const validCategories = [
    "Fire",
    "Medical",
    "Security",
    "Flood",
    "Gas Leak",
    "Electrical",
    "Other",
  ] as const;
  const validSev = ["Low", "Medium", "High", "Critical"] as const;
  const category = validCategories.includes(o["category"] as never)
    ? (o["category"] as Classification["category"])
    : "Other";
  const severity = validSev.includes(o["severity"] as never)
    ? (o["severity"] as Classification["severity"])
    : "Medium";
  const instructions = Array.isArray(o["instructions"])
    ? (o["instructions"] as unknown[]).map((x) => String(x)).slice(0, 3)
    : [];
  const keywords = Array.isArray(o["keywords"])
    ? (o["keywords"] as unknown[]).map((x) => String(x)).slice(0, 6)
    : [];
  return {
    category,
    severity,
    callService: String(o["callService"] ?? "Maintenance"),
    instructions:
      instructions.length >= 2
        ? instructions
        : ["Move to a safe area.", "Wait for staff to arrive."],
    detectedLanguage: String(o["detectedLanguage"] ?? "English"),
    languageCode: String(o["languageCode"] ?? "en"),
    translatedSummary: String(o["translatedSummary"] ?? ""),
    keywords,
  };
}

export async function classifyMessage(message: string): Promise<Classification> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: SYSTEM_PROMPT },
          { text: `Guest message:\n"""${message}"""` },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 8192,
    },
  });
  const text = response.text ?? "{}";
  try {
    return coerceClassification(JSON.parse(text));
  } catch (err) {
    logger.error({ err, text }, "Failed to parse classifier output");
    throw new Error("Failed to parse classifier output");
  }
}

export async function classifyImage(imageBase64: string): Promise<Classification> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 8192,
    },
  });
  const text = response.text ?? "{}";
  try {
    return coerceClassification(JSON.parse(text));
  } catch (err) {
    logger.error({ err, text }, "Failed to parse classifier output");
    throw new Error("Failed to parse classifier output");
  }
}

export function silentSosClassification(): Classification {
  return {
    category: "Security",
    severity: "Critical",
    callService: "Police",
    instructions: [
      "Stay where you are if it is safe.",
      "Help is on the way silently.",
    ],
    detectedLanguage: "English",
    languageCode: "en",
    translatedSummary: "Silent panic SOS triggered by guest.",
    keywords: ["silent_sos", "panic"],
  };
}
