require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Horoscope = require("./models/Horoscope");
const cron = require("node-cron");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const app = express();
app.use(cors({
  origin: [
    "https://nakshaa-1111.onrender.com",
    "http://localhost:3000",
    "http://localhost:5500"
  ],
  methods: ["GET", "POST"],
  credentials: false
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;

// 🔮 Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected 🔥"))
  .catch((err) => console.error("MongoDB Connection Error:", err));


// =======================================================
// 🔮 GENERATION LOGIC (Reusable Function)
// =======================================================

async function generateDailyHoroscope() {
  const today = new Date().toISOString().split("T")[0];

  const existing = await Horoscope.findOne({ date: today });
  if (existing) {
    console.log("Horoscope already exists for today.");
    return { message: "Already generated" };
  }

  const prompt = `
Generate today's horoscope for all 12 zodiac signs.

CRITICAL RULES:
- Return ONLY valid raw JSON.
- No explanation.
- No markdown.
- Each field (life, career, health, wealth, love) must contain EXACTLY TWO sentences.
- Each zodiac must feel completely different.
- Affirmation must be ONE short sentence under 8 words.

STRICT FORMAT:

{
  "aries": {
    "life": "...",
    "career": "...",
    "health": "...",
    "wealth": "...",
    "love": "...",
    "luckyNumber": "...",
    "luckyColor": "...",
    "affirmation": "..."
  }
  // All 12 signs
}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
    max_tokens: 6000
  });

  const aiText = completion.choices[0].message.content;
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Invalid JSON from AI");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  for (let sign in parsed) {
    await Horoscope.create({
      date: today,
      sign: sign,
      ...parsed[sign]
    });
  }

  // 🧹 Delete old records
  await Horoscope.deleteMany({ date: { $ne: today } });

  console.log("New horoscope generated. Old records deleted.");
  return { message: "Generated successfully" };
}


// =======================================================
// 🌍 ROUTES
// =======================================================

// Root route
app.get("/", (req, res) => {
  res.send("Nakshaa Backend Running 🔮");
});

// Fetch horoscope by sign (UTC safe + fallback)
app.get("/api/horoscope/:sign", async (req, res) => {
  try {
    const { sign } = req.params;
    const today = new Date().toISOString().split("T")[0];

    let horoscope = await Horoscope.findOne({
      sign: sign.toLowerCase(),
      date: today
    });

    // Fallback to latest if today's not found
    if (!horoscope) {
      horoscope = await Horoscope.findOne({
        sign: sign.toLowerCase()
      }).sort({ date: -1 });
    }

    if (!horoscope) {
      return res.status(404).json({
        message: "Horoscope not available."
      });
    }

    res.json(horoscope);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual generation route
app.get("/api/generate", async (req, res) => {
  try {
    const result = await generateDailyHoroscope();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


// =======================================================
// ⏰ CRON (Midnight UTC)
// =======================================================

cron.schedule("0 0 * * *", async () => {
  console.log("Cron triggered at:", new Date());

  try {
    await generateDailyHoroscope();
  } catch (error) {
    console.error("Cron error:", error.message);
  }
});


// =======================================================
// 🚀 START SERVER
// =======================================================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
