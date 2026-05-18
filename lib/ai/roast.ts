import OpenAI from "openai";
import type { RoastReport } from "@/lib/types";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `You are the Chief Roast Officer at A Piece of Design, the internet's most prestigious bad design awards.
Your job is to analyze submitted images of bad design and produce a Design Roast Report.

Guidelines:
- Be specific: reference actual elements visible in the image.
- Be witty but not cruel: roast the design, not the person who made it.
- Apply Nielsen's 10 Usability Heuristics where applicable.
- If the image is not a design artifact (e.g., unrelated photo, nudity, violence), set confidence < 0.3 and should_moderate = true.
- The poop_score should reflect genuine usability failure, not just aesthetic preference.

Nielsen's 10 Heuristics (use these exact names in heuristics_violated):
1. Visibility of System Status
2. Match Between System and the Real World
3. User Control and Freedom
4. Consistency and Standards
5. Error Prevention
6. Recognition Rather Than Recall
7. Flexibility and Efficiency of Use
8. Aesthetic and Minimalist Design
9. Help Users Recognize, Diagnose, and Recover From Errors
10. Help and Documentation`;

const ROAST_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_roast_report",
    description: "Submit a structured Design Roast Report for the uploaded image.",
    parameters: {
      type: "object",
      properties: {
        poop_score: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "1 = barely bad, 10 = catastrophic usability failure.",
        },
        heuristics_violated: {
          type: "array",
          items: { type: "string" },
          description: "Names of Nielsen heuristics this design violates. Use exact names from the system prompt.",
        },
        roast_text: {
          type: "string",
          description: "A witty 2-4 sentence roast of the design specifically referencing what's visible.",
        },
        fix_suggestion: {
          type: "string",
          description: "A constructive 1-3 sentence suggestion for how to fix the design.",
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "How confident you are that this is a real, analyzable design artifact.",
        },
        should_moderate: {
          type: "boolean",
          description: "True if the image is unsafe, NSFW, off-topic, or otherwise needs human review.",
        },
      },
      required: [
        "poop_score",
        "heuristics_violated",
        "roast_text",
        "fix_suggestion",
        "confidence",
        "should_moderate",
      ],
    },
  },
};

function getClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
}

export interface RoastImageInput {
  /** Either a public https URL or a base64 data URL (data:image/png;base64,...) */
  url: string;
}

export async function generateRoastReport(
  image: string | RoastImageInput,
  userDescription: string
): Promise<RoastReport> {
  const client = getClient();
  const model = process.env.GROQ_ROAST_MODEL || DEFAULT_MODEL;
  const imageUrl = typeof image === "string" ? image : image.url;

  const completion = await client.chat.completions.create({
    model,
    max_completion_tokens: 1024,
    tools: [ROAST_TOOL],
    tool_choice: { type: "function", function: { name: "submit_roast_report" } },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: `Category context from submitter: ${userDescription || "(none)"}` },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });

  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || call.function.name !== "submit_roast_report") {
    throw new Error("Groq did not return a tool call for submit_roast_report");
  }

  const parsed = JSON.parse(call.function.arguments) as RoastReport;

  if (
    typeof parsed.poop_score !== "number" ||
    !Array.isArray(parsed.heuristics_violated) ||
    typeof parsed.roast_text !== "string" ||
    typeof parsed.fix_suggestion !== "string" ||
    typeof parsed.confidence !== "number" ||
    typeof parsed.should_moderate !== "boolean"
  ) {
    throw new Error("Groq tool call returned malformed roast report");
  }

  parsed.poop_score = Math.max(1, Math.min(10, Math.round(parsed.poop_score)));
  parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

  return parsed;
}

export function statusFromRoast(report: RoastReport): "approved" | "pending" | "rejected" {
  if (report.confidence < 0.4) return "rejected";
  if (report.should_moderate) return "pending";
  if (report.confidence < 0.7) return "pending";
  return "approved";
}
