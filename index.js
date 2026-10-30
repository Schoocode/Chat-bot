import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = 'gemini-flash-lite-latest';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));

// Fungsi pemanggil Gemini dengan Retry Otomatis jika Google 503
async function getGeminiStreamWithRetry(contents, maxRetries = 3) {
    let delay = 2000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContentStream({
                model: GEMINI_MODEL,
                contents,
                config: {
                    systemInstruction: `
                        Anda adalah asisten AI yang ramah, cerdas, dan responsif.
                        Jawablah setiap pertanyaan atau sapaan secara wajar, to-the-point, dan tepat sesuai konteks yang ditanyakan user.
                        Jika user hanya menyapa (seperti 'hai' atau 'halo'), balas sapaan secara singkat dan tanyakan apa yang bisa dibantu.
                        Gunakan Bahasa Indonesia yang baik dan mudah dipahami.
                    `
                }
            });
        } catch (err) {
            const is503 = err.status === 503 || (err.message && err.message.includes('503'));
            if (is503 && attempt < maxRetries) {
                console.warn(`[Google 503] Server sedang sibuk. Mencoba ulang otomatis (${attempt}/${maxRetries}) dalam ${delay/1000} detik...`);
                await new Promise(r => setTimeout(r, delay));
                delay *= 1.5;
            } else {
                throw err;
            }
        }
    }
}

app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;

    try {
        if (!Array.isArray(conversation)) {
            throw new Error('Format request salah: "conversation" harus berupa array');
        }

        const contents = conversation.map(({ role, text }) => ({
            role,
            parts: [{ text }]
        }));

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        const responseStream = await getGeminiStreamWithRetry(contents);

        for await (const chunk of responseStream) {
            if (chunk.text) {
                res.write(chunk.text);
            }
        }

        res.end();
    } catch (e) {
        console.error('Error saat memanggil Gemini:', e.message);
        if (!res.headersSent) {
            res.status(500).json({ error: e.message });
        } else {
            res.write(`\n[Server Google sedang sangat padat: ${e.message}]`);
            res.end();
        }
    }
});
