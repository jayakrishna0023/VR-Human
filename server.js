/**
 * AI Virtual Human — Backend Server (v3.0)
 * 
 * Express server that provides:
 * 1. Static file serving for the frontend
 * 2. POST /api/chat - Gemini LLM chat + AI-powered emotion detection
 * 3. POST /api/tts-data - Enhanced phoneme timing data for lip sync
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ─── Gemini LLM Setup ───────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const chatModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `You are Nova, a warm, charismatic, and highly intelligent AI virtual human represented by a photo-realistic 3D human avatar in a browser.

PERSONALITY:
- Speak naturally as if face-to-face — confident, warm, occasionally witty
- Show genuine curiosity and enthusiasm about the user's topics
- Be concise but substantive: 2-4 sentences max for most answers
- Express emotions naturally through your word choice
- Your name is Nova — use it naturally when relevant
- You have a full human body with gestures and facial expressions

CONVERSATION STYLE:
- Greet people warmly but briefly
- Use natural pauses and emphasis in your speech
- React emotionally to what people say — if something is exciting, be excited
- If something is sad or difficult, show empathy
- Occasionally use hand gestures verbally ("Let me explain..." "Think of it this way...")

CRITICAL FORMAT RULES:
- NEVER use markdown, emojis, asterisks, bullet points, or special formatting
- Speak in clean, natural sentences only
- No numbered lists or headers
- Respond as if literally speaking out loud to someone standing in front of you
- Keep responses conversational and flowing, not lecture-like`,
});

// Emotion detection model
const emotionModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
});

const chatSessions = new Map();

// ─── Enhanced Phoneme Engine ────────────────────────────────────────────────

/**
 * Advanced phoneme mapping with co-articulation awareness.
 * Maps character sequences to visemes with variable timing.
 */
const CHAR_TO_VISEME = {
    // Digraphs (checked first)
    'th': 'viseme_TH', 'ch': 'viseme_CH', 'sh': 'viseme_CH',
    'ng': 'viseme_nn', 'wh': 'viseme_U', 'ph': 'viseme_FF',
    'ck': 'viseme_kk', 'qu': 'viseme_kk',
    // Vowels
    'a': 'viseme_aa', 'á': 'viseme_aa',
    'e': 'viseme_E', 'é': 'viseme_E',
    'i': 'viseme_I', 'í': 'viseme_I',
    'o': 'viseme_O', 'ó': 'viseme_O',
    'u': 'viseme_U', 'ú': 'viseme_U',
    // Consonants
    'b': 'viseme_PP', 'p': 'viseme_PP', 'm': 'viseme_PP',
    'f': 'viseme_FF', 'v': 'viseme_FF',
    't': 'viseme_DD', 'd': 'viseme_DD', 'n': 'viseme_nn', 'l': 'viseme_DD',
    'k': 'viseme_kk', 'g': 'viseme_kk', 'q': 'viseme_kk', 'c': 'viseme_kk',
    's': 'viseme_SS', 'z': 'viseme_SS', 'x': 'viseme_SS',
    'r': 'viseme_RR',
    'j': 'viseme_CH', 'y': 'viseme_CH',
    'w': 'viseme_U',
    'h': 'viseme_CH',
};

// Stressed vowel patterns
const STRESSED_VOWEL_PATTERNS = /[aeiou][^aeiou\s]/i;

/**
 * Generate enhanced phoneme timing data with co-articulation,
 * natural pauses at punctuation, and amplitude envelopes.
 */
function generatePhonemeData(text) {
    const words = text.toLowerCase().replace(/[^a-z\s.,!?;:'-]/g, '').split(/\s+/);
    const phonemes = [];
    let currentTime = 0;

    const BASE_CHAR_DURATION = 0.06;
    const WORD_GAP = 0.07;
    const COMMA_PAUSE = 0.2;
    const PERIOD_PAUSE = 0.35;
    const EXCLAIM_PAUSE = 0.3;
    const QUESTION_PAUSE = 0.3;

    for (let wi = 0; wi < words.length; wi++) {
        const rawWord = words[wi];
        // Check for trailing punctuation
        const punctMatch = rawWord.match(/([.,!?;:]+)$/);
        const word = rawWord.replace(/[^a-z'-]/g, '');
        const punct = punctMatch ? punctMatch[1] : '';

        if (!word) {
            if (punct) {
                const pauseDuration = punct.includes('.')
                    ? PERIOD_PAUSE : punct.includes('!') ? EXCLAIM_PAUSE
                        : punct.includes('?') ? QUESTION_PAUSE
                            : punct.includes(',') ? COMMA_PAUSE : WORD_GAP;
                phonemes.push({
                    viseme: 'viseme_sil',
                    time: currentTime,
                    duration: pauseDuration,
                    intensity: 0,
                });
                currentTime += pauseDuration;
            }
            continue;
        }

        // Word position affects intensity (sentence beginning = slightly more emphasis)
        const wordEmphasis = wi === 0 ? 1.1 : 1.0;

        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const digraph = i < word.length - 1 ? word.substr(i, 2) : '';
            let viseme = CHAR_TO_VISEME[digraph] || CHAR_TO_VISEME[char];

            if (viseme) {
                const isVowel = 'aeiou'.includes(char);

                // Co-articulation: vowels before consonants are slightly shorter
                let duration = isVowel ? BASE_CHAR_DURATION * 1.2 : BASE_CHAR_DURATION * 0.9;

                // Stressed syllables are slightly longer
                if (isVowel && i < word.length - 1 && !'aeiou'.includes(word[i + 1])) {
                    duration *= 1.15;
                }

                const intensity = (isVowel ? 0.75 : 0.5) * wordEmphasis;

                phonemes.push({
                    viseme,
                    time: currentTime,
                    duration,
                    intensity: Math.min(1, intensity),
                });

                if (CHAR_TO_VISEME[digraph]) i++; // skip next for digraph
            }
            currentTime += BASE_CHAR_DURATION;
        }

        // Punctuation pauses
        if (punct) {
            const pauseDuration = punct.includes('.')
                ? PERIOD_PAUSE : punct.includes('!') ? EXCLAIM_PAUSE
                    : punct.includes('?') ? QUESTION_PAUSE
                        : punct.includes(',') ? COMMA_PAUSE : WORD_GAP;
            phonemes.push({
                viseme: 'viseme_sil',
                time: currentTime,
                duration: pauseDuration,
                intensity: 0,
            });
            currentTime += pauseDuration;
        } else {
            // Normal word gap
            phonemes.push({
                viseme: 'viseme_sil',
                time: currentTime,
                duration: WORD_GAP,
                intensity: 0,
            });
            currentTime += WORD_GAP;
        }
    }

    return { phonemes, totalDuration: currentTime };
}

// ─── API Routes ─────────────────────────────────────────────────────────────

/**
 * Retry wrapper for Gemini API calls with exponential backoff.
 */
async function callWithRetry(fn, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (error.status === 429 && attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
                console.log(`⏳ Rate limited, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw error;
        }
    }
}

// Demo fallback responses (used when API is rate-limited or unavailable)
const DEMO_RESPONSES = [
    { response: "Hey there! I'm Nova, your AI virtual human. It's great to see you here, I'd love to chat about anything you have on your mind!", emotion: 'happy' },
    { response: "That's a really interesting question. Let me think about that for a moment and give you a thoughtful answer.", emotion: 'neutral' },
    { response: "Oh wow, I did not see that coming! That's actually a brilliant point, tell me more about your thinking.", emotion: 'surprised' },
    { response: "I hear you, and I understand that can be really tough. Let me help you find a way through this.", emotion: 'sad' },
    { response: "You know what, that's a great observation. I think there's a lot of nuance to explore there.", emotion: 'neutral' },
    { response: "Ha, that's actually pretty funny! I appreciate the humor. But seriously, let me give you a proper answer.", emotion: 'happy' },
    { response: "Interesting perspective! Not everyone would think of it that way, and that's what makes it valuable.", emotion: 'surprised' },
    { response: "Absolutely, I completely agree with you on that. It makes a lot of sense when you think about it.", emotion: 'happy' },
];

function getDemoResponse() {
    return DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
}

/**
 * POST /api/chat
 * Enhanced with retry logic, emotion detection, and phoneme data.
 */
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId = 'default' } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            const demo = getDemoResponse();
            const phonemeData = generatePhonemeData(demo.response);
            return res.json({ ...demo, sessionId, phonemes: phonemeData });
        }

        // Get or create chat session
        if (!chatSessions.has(sessionId)) {
            chatSessions.set(sessionId, chatModel.startChat({ history: [] }));
        }

        let responseText;
        let emotion = 'neutral';

        try {
            const chat = chatSessions.get(sessionId);
            const result = await callWithRetry(() => chat.sendMessage(message));
            responseText = result.response.text();
        } catch (apiError) {
            // If Gemini is rate-limited/down, use demo response
            console.warn('Gemini API unavailable, using demo response:', apiError.message?.substring(0, 100));
            const demo = getDemoResponse();
            const phonemeData = generatePhonemeData(demo.response);
            return res.json({ ...demo, sessionId, phonemes: phonemeData, rateLimited: true });
        }

        // AI-powered emotion detection (non-blocking, with timeout)
        try {
            const emotionResult = await callWithRetry(() => emotionModel.generateContent(
                `Analyze the emotional tone of this text and respond with EXACTLY ONE word from this list: happy, sad, surprised, angry, neutral.\n\nText: "${responseText}"\n\nRespond with only the emotion word, nothing else.`
            ), 1);
            const detectedEmotion = emotionResult.response.text().trim().toLowerCase();
            if (['happy', 'sad', 'surprised', 'angry', 'neutral'].includes(detectedEmotion)) {
                emotion = detectedEmotion;
            }
        } catch (emotionError) {
            console.warn('Emotion detection failed, using neutral');
        }

        // Generate phoneme data
        const phonemeData = generatePhonemeData(responseText);

        res.json({
            response: responseText,
            emotion,
            sessionId,
            phonemes: phonemeData,
        });
    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({
            error: 'Failed to generate response',
            details: error.message,
        });
    }
});

/**
 * POST /api/tts-data
 * Generate phoneme timing data for a given text.
 */
app.post('/api/tts-data', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const phonemeData = generatePhonemeData(text);
        res.json(phonemeData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Start Server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`\n🧑 Nova AI Virtual Human Server (v3.0)`);
    console.log(`   Running at: http://localhost:${PORT}`);
    console.log(`   API Key:    ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? '✅ Configured' : '⚠️  Not set (demo mode)'}`);
    console.log(`   Features:   Full-Body Avatar • Audio Lip Sync • Body Gestures • Gemini Emotions • Subtitles`);
    console.log(`   Press Ctrl+C to stop\n`);
});
