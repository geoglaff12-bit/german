import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API: AI Preflop range generator
app.post('/api/ai/generate-range', async (req, res) => {
  try {
    const { prompt, actionName } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Промпт не может быть пустым.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'API ключ (GEMINI_API_KEY) не настроен. Пожалуйста, укажите его в Secrets.',
      });
    }

    // Initialize modern Gemini client
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `
      You are an expert poker theoretician and GTO coach. Your task is to generate a professional preflop poker range in a 13x13 grid format representing Texas Hold'em starting hands.
      The user is building a range for the action: "${actionName || 'Raise'}".
      Based on the prompt: "${prompt}", compute which hands belong in this preflop range and with what frequency (weight/probability from 1 to 100, where 100 is always and smaller values represent mixed strategy).
      
      You MUST return your answer in JSON format containing:
      1. "combos": An object mapping valid 2-3 character Hold'em hand combos to their percentage frequency (integer 1 to 100).
         - Pairs must be e.g., "AA", "KK", "TT", "22"
         - Suited cards must end with 's', e.g., "AKs", "AQs", "T9s", "54s" (always higher rank first, e.g. "AKs" not "KAs")
         - Offsuit cards must end with 'o', e.g., "AKo", "AQo", "JTo", "87o" (always higher rank first, e.g. "AKo" not "KAo")
         - Do NOT include any cards with 0 weight. Only include cards in the range.
      2. "explanation": A concise strategic explanation (written in fluent Russian) justifying why these hands are selected for this action in this situation (referencing position, blockers, stack size, and playability).
      3. "notation": A standard simplified preflop poker notation summary of the range (e.g., "99+, AJs+, AQo+, KTs, QJs").
      
      Output ONLY valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Calculate preflop range for: ${prompt}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            combos: {
              type: Type.OBJECT,
              description: 'Map of hand combo (e.g. AA, AQs, AQo) to weight (1-100)',
            },
            explanation: {
              type: Type.STRING,
              description: 'Concise explanation of the range in Russian language.',
            },
            notation: {
              type: Type.STRING,
              description: 'Standard shorthand notation summary (e.g. 88+, ATs+, ATo+)',
            },
          },
          required: ['combos', 'explanation', 'notation'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Модель вернула пустой ответ.');
    }

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating AI range:', error);
    res.status(500).json({ error: error.message || 'Ошибка генерации ИИ.' });
  }
});

// Serve Frontend / Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
