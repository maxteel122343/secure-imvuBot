const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { chromium } = require('playwright');
const path = require('path');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Tesseract = require('tesseract.js');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Available Gemini Models
const AVAILABLE_MODELS = {
    'flash-latest': 'gemini-flash-latest',
    'flash-2.5': 'gemini-2.5-flash',
    'pro-latest': 'gemini-pro-latest',
    'flash-lite': 'gemini-flash-lite-latest'
};

// Initialize Gemini (can be updated by user)
let genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
let currentModelName = 'flash-latest';
let model = genAI.getGenerativeModel({
    model: AVAILABLE_MODELS[currentModelName]
});
let hasValidApiKey = !!process.env.GEMINI_API_KEY;

// Function to update API key
function updateApiKey(newKey) {
    try {
        if (!newKey || newKey.trim() === '') {
            return { success: false, error: 'API key cannot be empty' };
        }
        genAI = new GoogleGenerativeAI(newKey);
        model = genAI.getGenerativeModel({
            model: AVAILABLE_MODELS[currentModelName]
        });
        hasValidApiKey = true;
        console.log('[API] Key updated successfully');
        return { success: true, message: 'API key updated successfully' };
    } catch (e) {
        console.error('[API] Error updating key:', e.message);
        return { success: false, error: e.message };
    }
}

// Function to change model
function changeModel(modelKey) {
    if (AVAILABLE_MODELS[modelKey]) {
        currentModelName = modelKey;
        model = genAI.getGenerativeModel({
            model: AVAILABLE_MODELS[modelKey]
        });
        console.log(`[Model] Switched to: ${AVAILABLE_MODELS[modelKey]}`);
        return { success: true, model: AVAILABLE_MODELS[modelKey] };
    }
    return { success: false, error: 'Model not found' };
}

// Load System Prompt
const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'system_prompt.md'), 'utf8');

console.log('Starting server initialization...');
console.log(`Using AI Model: ${AVAILABLE_MODELS[currentModelName]} + Local OCR`);
console.log(`API Key configured: ${hasValidApiKey ? 'Yes' : 'No - Please add via interface'}`);

let browser;
let page;
let screenshotInterval;

// Configuration
const PORT = 3000;
const SCREENSHOT_INTERVAL_MS = 1000;
const TARGET_URL = 'https://www.google.com';

// --- OCR HELPER ---
async function extractTextFromImage(imageBuffer) {
    try {
        console.log('[OCR] Extracting text from screenshot...');
        const result = await Tesseract.recognize(imageBuffer, 'por+eng', {
            logger: () => { }
        });

        const text = result.data.text.trim();
        console.log(`[OCR] Extracted ${text.length} characters`);
        return text;
    } catch (e) {
        console.error(`[OCR] Error: ${e.message}`);
        return '';
    }
}

// --- AI AGENT WITH OCR ---
async function processCommandWithAI(command, screenshotBuffer) {
    console.log(`[AI] Processing command: "${command}"`);

    if (!hasValidApiKey) {
        return {
            plan: "⚠️ API key não configurada. Por favor, insira sua API key na interface.",
            vision_analysis: "No API key",
            steps: []
        };
    }

    try {
        const ocrText = await extractTextFromImage(screenshotBuffer);

        const imagePart = {
            inlineData: {
                data: screenshotBuffer.toString('base64'),
                mimeType: "image/jpeg",
            },
        };

        const prompt = `${SYSTEM_PROMPT}

USER COMMAND: "${command}"

OCR TEXT DETECTED ON SCREEN:
${ocrText}

Analyze the attached screenshot, the OCR text, and the user command.
Use the OCR text to help identify button labels and text fields.
Return ONLY a valid JSON response following the format specified in the system instructions above.`;

        const result = await model.generateContent([prompt, imagePart]);

        const responseText = result.response.text();
        console.log(`[AI] Raw Response: ${responseText}`);

        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }

        return JSON.parse(jsonText);

    } catch (e) {
        console.error(`[AI] Error: ${e.message}`);

        if (e.message.includes('quota') || e.message.includes('429')) {
            return {
                plan: "⚠️ API quota excedida. Tente outro modelo ou aguarde 1 minuto.",
                vision_analysis: "Quota limit reached.",
                steps: []
            };
        }

        if (e.message.includes('API key')) {
            return {
                plan: "⚠️ API key inválida. Verifique sua chave.",
                vision_analysis: "Invalid API key.",
                steps: []
            };
        }

        return {
            plan: "Error: " + e.message,
            vision_analysis: "Failed to analyze.",
            steps: []
        };
    }
}

// --- BROWSER CONTROL ---
async function startBrowser() {
    console.log('[Browser] Launching...');
    browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();

    try {
        await page.goto(TARGET_URL);
        console.log(`[Browser] Navigated to ${TARGET_URL}`);
    } catch (e) {
        console.error(`[Browser] Error navigating: ${e.message}`);
    }
}

async function executeSteps(steps) {
    if (!page) return;

    for (const step of steps) {
        console.log(`[Action] ${step.action}`, step);
        try {
            switch (step.action) {
                case 'move_mouse':
                    await page.mouse.move(step.x, step.y);
                    break;
                case 'click':
                    await page.mouse.click(step.x, step.y);
                    break;
                case 'type_text':
                    await page.keyboard.type(step.content);
                    break;
                case 'keyboard_press':
                    await page.keyboard.press(step.key);
                    break;
                case 'scroll':
                    await page.mouse.wheel(0, step.amount);
                    break;
                case 'wait':
                    await page.waitForTimeout(step.ms);
                    break;
            }
        } catch (e) {
            console.error(`[Action Error] ${e.message}`);
        }
    }
}

async function captureAndBroadcast() {
    if (!page) return;

    try {
        const screenshot = await page.screenshot({
            type: 'jpeg',
            quality: 60
        });

        const payload = JSON.stringify({
            type: 'screenshot',
            data: screenshot.toString('base64')
        });

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    } catch (e) {
        console.error(`[Screenshot] Error: ${e.message}`);
    }
}

// --- WEBSOCKET HANDLER ---
wss.on('connection', (ws) => {
    console.log('[WS] Client connected');

    // Send initial info
    ws.send(JSON.stringify({
        type: 'model_info',
        current: currentModelName,
        available: Object.keys(AVAILABLE_MODELS),
        hasApiKey: hasValidApiKey
    }));

    ws.on('message', async (message) => {
        try {
            const parsed = JSON.parse(message);

            // Handle API key update
            if (parsed.type === 'update_api_key') {
                const result = updateApiKey(parsed.apiKey);
                ws.send(JSON.stringify({
                    type: 'api_key_updated',
                    ...result
                }));
                return;
            }

            // Handle model change request
            if (parsed.type === 'change_model') {
                const result = changeModel(parsed.model);
                ws.send(JSON.stringify({
                    type: 'model_changed',
                    ...result,
                    current: currentModelName
                }));
                return;
            }

            if (parsed.type === 'command') {
                console.log(`[Command] Received: ${parsed.text}`);

                ws.send(JSON.stringify({ type: 'status', message: 'AI is thinking...' }));

                const screenshot = await page.screenshot({ type: 'jpeg', quality: 50 });

                const aiResponse = await processCommandWithAI(parsed.text, screenshot);

                ws.send(JSON.stringify({
                    type: 'log',
                    message: `Plan: ${aiResponse.plan}`
                }));

                ws.send(JSON.stringify({ type: 'status', message: 'Executing actions...' }));
                await executeSteps(aiResponse.steps);

                ws.send(JSON.stringify({ type: 'status', message: 'Ready' }));
            }
        } catch (e) {
            console.error(`[WS] Error processing message: ${e.message}`);
            ws.send(JSON.stringify({ type: 'error', message: e.message }));
        }
    });
});

async function init() {
    await startBrowser();

    screenshotInterval = setInterval(captureAndBroadcast, SCREENSHOT_INTERVAL_MS);

    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log('Features: Gemini AI + Tesseract OCR + Model Selection + API Key Management');
    });
}

init();
