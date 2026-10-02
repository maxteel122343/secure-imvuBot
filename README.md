# 🤖 AI Browser Controller (MVP)

**Control any website using natural language commands powered by Google Gemini AI.**

This project implements **Level 1** of an advanced AI-powered browser automation system that uses computer vision to understand and interact with web interfaces.

---

## ✨ Features

- **🎯 Visual AI Control:** Gemini 1.5 Flash analyzes screenshots and decides where to click
- **🔍 Local OCR:** Tesseract extracts text from screenshots for better accuracy
- **🖱️ Mouse & Keyboard Automation:** Full Playwright integration for precise control
- **📺 Live Streaming:** Real-time screenshot feed at 1 FPS via WebSocket
- **💬 Natural Language:** Type commands like "search for AI" or "click the login button"
- **🧠 Smart Execution:** AI plans multi-step actions and executes them sequentially
- **📊 Action Logging:** See the AI's thought process and execution plan

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Configure API Key
Create a `.env` file:
```
GEMINI_API_KEY=your_api_key_here
```

### 3. Start the Server
```bash
node src/server.js
```

### 4. Open the Interface
Navigate to `http://localhost:3000` in your browser.

---

## 🎮 Usage

### Example Commands
- **"Click on the search box"** - AI finds and clicks the search input
- **"Search for artificial intelligence"** - Types and submits search
- **"Scroll down"** - Scrolls the page
- **"Click the first link"** - Identifies and clicks the top result

### How It Works
1. You type a command in natural language
2. System captures current screenshot
3. Gemini AI analyzes the image + command
4. AI returns JSON with specific actions (coordinates, text, etc.)
5. Playwright executes the actions
6. You see results in real-time

---

## 📁 Project Structure

```
├── src/
│   ├── server.js           # Main backend (Playwright + Gemini + WebSocket)
│   └── system_prompt.md    # AI instruction set
├── public/
│   └── index.html          # Frontend interface
├── .env                    # API keys (not in git)
├── README.md               # This file
└── INTEGRATION_GUIDE.md    # Advanced customization guide
```

---

## ⚙️ Configuration

Edit `src/server.js` to customize:

- **Target Website:** `const TARGET_URL = 'https://...'`
- **Screenshot Rate:** `const SCREENSHOT_INTERVAL_MS = 1000`
- **Browser Visibility:** `headless: true/false`
- **AI Model:** `model: "gemini-1.5-flash"`

---

## 📚 Documentation

- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Complete customization and extension guide
- **[src/system_prompt.md](./src/system_prompt.md)** - AI behavior definition

---

## 🔮 Next Steps (Level 2)

- [ ] Add OCR for better text detection
- [ ] Implement vision anchoring (hotspots)
- [ ] Add action history and rollback
- [ ] Support multiple tabs/pages
- [ ] Build mobile app interface
- [ ] Add voice command support

---

## 🛡️ Security

- ✅ Restricted to configured target URL
- ✅ No file system access
- ✅ Sandboxed browser environment
- ✅ No external navigation allowed

---

## 📄 License

ISC

---

**Built with Playwright, Gemini AI, and WebSockets**
