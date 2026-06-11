import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with custom User-Agent for telemetry
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. AI functionality will degrade gracefully.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// REST endpoint for dynamic AI Match Commentary
app.post("/api/commentary", async (req, res) => {
  try {
    const { fighters, currentEvents, round, crowdMeter } = req.body;
    
    // Fallback if API key is not configured or mock is used
    if (!process.env.GEMINI_API_KEY) {
      const fallbackReplies = [
        "OH! Fighter 1 lands a massive punch! The noise is deafening in the arena!",
        "UNBELIEVABLE! Fighter 2 slips the attack and counters with a swift judo sweep!",
        "Wait, here comes Fighter 3! A colossal 140kg body slam that shakes the steel cage!",
        "Double leg takedown attempted by the Slavic maestro! He is showing pure technique!",
        "Fighter 1 combs his blonde hair back and smiles, raising his arms to pump up the crowd! What theatrical display!",
        "Fighter 3, Kim, is absorbing strikes like a solid brick wall! Absolute power lifter resilience!"
      ];
      const randomReply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
      return res.json({
        commentary: randomReply + ` (Crowd: ${crowdMeter || 80}% - Round ${round || 1})`,
        headline: "STADIUM CLIPS",
        energy: "HIGH",
        systemGenerated: true
      });
    }

    const client = getGeminiClient();
    
    const prompt = `You are the legendary main ringside commentator for an epic, high-octane triple-threat MMA/boxing match inside a packed, roaring sports arena. 
The current match state is:
- Round: ${round || 1}
- Crowd Excitement Meter: ${crowdMeter || 80}%
- Fighter 1: Very Tall 79-year-old Caucasian, 1.90m, 102kg, distinct orange skin, blonde combed back hair, wearing red shorts. (Athletic but aged showman build)
- Fighter 2: Slavic 73-year-old, 1.70m, 72kg, intense icy gaze, blue shorts. (Lean, ultra-athletic judo master)
- Fighter 3: Heavy-set 42-year-old Asian, 1.70m, 140kg, black shorts. (Colossal sumo powerlifter build)

Recent action events that just occurred inside the ring physically:
${(currentEvents || []).map((e: string, i: number) => `${i+1}. ${e}`).join("\n")}

Write a short, highly energetic, punchy, dramatic live-commentary update describing these exact moves in a photorealistic, cinematic style. 
Use sports commentary lingo ("What a shot!", "He slips it!", "Down he goes!"). Highlight their physical differences (the sumo's gravity, the Slavic fighter's calculating tactical sweeps, the tall American's showmanship and reach).
Keep it under 3-4 sentences. Also produce an epic short sports headline.

You must reply with JSON matching this structure:
{
  "commentary": "The commentary paragraphs...",
  "headline": "A short dramatic high-octane news headline...",
  "energy": "LOW" | "MEDIUM" | "HIGH"
}`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            commentary: { type: Type.STRING, description: "Highly cinematic commentary describing the recent moves." },
            headline: { type: Type.STRING, description: "A punchy, dramatic MMA broadcast headline." },
            energy: { type: Type.STRING, description: "Low, Medium or High energy recommendation based on the action." }
          },
          required: ["commentary", "headline", "energy"]
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.error("Gemini Commentary Error:", err);
    res.status(500).json({ error: "Failed to generate AI commentary stream." });
  }
});

// Configure Vite middleware in development or serve static assets in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Triple Threat Server] running inside container at http://0.0.0.0:${PORT}`);
  });
}

startServer();
