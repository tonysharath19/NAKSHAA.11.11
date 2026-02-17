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

app.use(cors());
app.use(express.json());

// 🔮 Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected 🔥");
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
  });

// Root route
app.get("/", (req, res) => {
  res.send("Nakshaa Backend Running 🔮");
});

// Test API route
app.get("/api/test", (req, res) => {
  res.json({ message: "API working properly 🚀" });
});

// Insert dummy horoscope
app.get("/api/insert-test", async (req, res) => {
  try {
    const newHoroscope = new Horoscope({
      date: "2026-02-16",
      sign: "aries",
      life: "This is life guidance.",
      career: "This is career guidance.",
      health: "This is health guidance.",
      wealth: "This is wealth guidance.",
      love: "This is love guidance.",
      luckyNumber: "7",
      luckyColor: "Royal Blue",
      affirmation: "This is how it looks."
    });

    await newHoroscope.save();

    res.json({ message: "Test horoscope saved successfully 🔮" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get horoscope by sign (latest for today)
app.get("/api/horoscope/:sign", async (req, res) => {
  try {
    const { sign } = req.params;

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];
    console.log("Fetch route date:", today);
    let horoscope = await Horoscope.findOne({
  sign: sign.toLowerCase(),
  date: today
});

// If not found for today, get latest available
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


    if (!horoscope) {
      return res.status(404).json({
        message: "Horoscope not found for today."
      });
    }

    res.json(horoscope);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔮 Generate Daily Horoscope (All 12 Signs)
app.get("/api/generate", async (req, res) => {
  try {

    const today = new Date().toISOString().split("T")[0];

    // Prevent duplicate generation
    const existing = await Horoscope.findOne({ date: today });
    if (existing) {
      return res.json({ message: "Horoscope already generated for today 🔮" });
    }

const prompt = `
Generate today's horoscope for all 12 zodiac signs.

CRITICAL RULES:
- Return ONLY valid raw JSON.
- No explanation.
- No markdown.
- No extra text.
- JSON must parse correctly.
- Each of the fields (life, career, health, wealth, love) must contain EXACTLY TWO sentences.
- Each field must contain exactly TWO periods.
- No more than two sentences.
- Do not repeat themes across signs.
- Each zodiac must feel completely different in tone and focus.
- Use sign personality traits to differentiate content.
- Avoid generic advice.
- Avoid repeating structure across signs.

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
  },
  "taurus": {...},
  "gemini": {...},
  "cancer": {...},
  "leo": {...},
  "virgo": {...},
  "libra": {...},
  "scorpio": {...},
  "sagittarius": {...},
  "capricorn": {...},
  "aquarius": {...},
  "pisces": {...}
}

Lucky number must be between 1 and 9.
Lucky color must be realistic.
Affirmation must be ONE short sentence under 8 words.
`;


    const completion = await groq.chat.completions.create({
  model: "llama-3.1-8b-instant",
  messages: [{ role: "user", content: prompt }],
  temperature: 0.6,      // slightly higher for uniqueness
  max_tokens: 6000
});



    const aiText = completion.choices[0].message.content;

    // Extract JSON from AI response safely
const jsonMatch = aiText.match(/\{[\s\S]*\}/);

if (!jsonMatch) {
  throw new Error("No valid JSON found in AI response");
}

const parsed = JSON.parse(jsonMatch[0]);

    for (let sign in parsed) {
      await Horoscope.create({
        date: today,
        sign: sign,
        ...parsed[sign]
      });
    }
// 🧹 Delete previous day's horoscopes
await Horoscope.deleteMany({ date: { $ne: today } });
console.log("Old horoscopes deleted.");

    res.json({ message: "Today's horoscopes generated successfully 🔥" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/models", async (req, res) => {
  try {
    const models = await groq.models.list();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔥 Auto Generate Horoscope Every Day at 12:01 AM
cron.schedule("1 0 * * *", async () => {
console.log("Cron triggered at:", new Date());
  console.log("⏳ Running scheduled horoscope generation...");

  try {
    const today = new Date().toISOString().split("T")[0];

    const existing = await Horoscope.findOne({ date: today });

    if (!existing) {
      console.log("Generating today's horoscope...");
      await fetch(`http://localhost:${PORT}/api/generate`);
    } else {
      console.log("Horoscope already exists for today.");
    }

  } catch (error) {
    console.error("Cron Error:", error.message);
  }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
