import fs from "fs/promises";
import { parseMatchScorecard } from "./matchScorecard.js";

const SCHEMA = {
  inningsSummary: "137/3 (13.2 Ov)",
  batting: [
    {
      name: "Player Name",
      dismissal: "c fielder b bowler or not out",
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      minutes: 0,
    },
  ],
  extras: { total: 0, detail: "wd 0, nb 0" },
  total: { label: "137/3", overs: "13.2 Ov", crr: "10.28" },
  toBat: ["Name One", "Name Two"],
  bowling: [
    { name: "Bowler", overs: "4", maidens: 0, runs: 28, wickets: 1, economy: 7.0 },
  ],
  fallOfWickets: [{ wicket: 1, batter: "Name", score: "60-1", over: "4.6 Ov" }],
};

function extractJsonFromAssistantText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Read a scorecard screenshot and return normalized scorecard JSON for MatchScorecardView.
 * Requires OPENAI_API_KEY on the server.
 */
export async function extractScorecardFromImageFile(filePath, mimeType = "image/jpeg") {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error(
      "Scorecard image parsing is not configured. Set OPENAI_API_KEY in server/.env and restart the API."
    );
    err.code = "SCORECARD_PARSE_DISABLED";
    throw err;
  }

  const buffer = await fs.readFile(filePath);
  const base64 = buffer.toString("base64");
  const mediaType = mimeType || "image/jpeg";
  const model = String(process.env.OPENAI_VISION_MODEL || "gpt-4o-mini").trim();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You read cricket scorecard screenshots (Cricbuzz-style). Return only valid JSON matching the requested schema. Copy names and numbers exactly from the image.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract this team's innings scorecard from the image into JSON with this shape (example values shown):\n${JSON.stringify(
                SCHEMA,
                null,
                2
              )}\n\nRules: include all batters and bowlers visible; use numeric types for stats; empty arrays if a section is missing; inningsSummary should match the score line if shown.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mediaType};base64,${base64}`, detail: "high" },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const err = new Error(`Scorecard image parsing failed (${response.status}). ${detail.slice(0, 200)}`);
    err.code = "SCORECARD_PARSE_FAILED";
    throw err;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? extractJsonFromAssistantText(content) : content;
  const normalized = parseMatchScorecard(parsed);
  if (!normalized) {
    const err = new Error("Could not read scorecard data from this image. Try a clearer screenshot.");
    err.code = "SCORECARD_PARSE_EMPTY";
    throw err;
  }
  return normalized;
}
