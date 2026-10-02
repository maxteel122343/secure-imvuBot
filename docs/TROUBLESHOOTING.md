# 🔧 Troubleshooting & Fixes

## Issue: Model Not Found Error

### Problem
```
Error: models/gemini-1.5-flash is not found for API version v1beta
```

### Solution ✅
Changed the model identifier from `gemini-1.5-flash` to `gemini-1.5-flash-latest`

### Code Fix
```javascript
// Before (incorrect)
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
});

// After (correct)
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash-latest"
});
```

### Why This Happened
The Gemini API requires the `-latest` suffix for the current version. The model name format has changed in recent API updates.

---

## Other Common Issues

### 1. API Key Not Working
**Symptom:** Authentication errors  
**Fix:** 
- Verify `.env` file exists
- Check `GEMINI_API_KEY` is correct
- Ensure no extra spaces in the key

### 2. Screenshot Not Showing
**Symptom:** Blank image in UI  
**Fix:**
- Wait 2-3 seconds for first frame
- Check browser console for WebSocket errors
- Verify server is running

### 3. Actions Not Executing
**Symptom:** Commands don't affect the page  
**Fix:**
- Check if page is loaded
- Verify coordinates are valid (0-1280, 0-720)
- Look for errors in server console

### 4. JSON Parse Errors
**Symptom:** "Unexpected token" errors  
**Fix:**
- The code now handles markdown code blocks
- AI responses wrapped in ```json are automatically unwrapped

---

## Current Status: ✅ WORKING

The system is now fully operational with:
- ✅ Correct Gemini model: `gemini-1.5-flash-latest`
- ✅ JSON parsing with markdown handling
- ✅ Error logging for debugging
- ✅ Server running on port 3000

**Test it now at:** http://localhost:3000
