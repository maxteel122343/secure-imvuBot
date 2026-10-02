# 🧪 Quick Test Commands

## Basic Actions

### Clicking
```
Click on the search box
Click the login button
Click the first result
Click on the menu icon
```

### Typing
```
Type "hello world" in the search box
Search for artificial intelligence
Enter my email address
Fill in the username field
```

### Navigation
```
Scroll down
Scroll to the bottom
Go back to previous page
Refresh the page
```

## Complex Multi-Step Tasks

### Search Workflow
```
Click the search box, type "machine learning", and press enter
```

### Form Filling
```
Find the email field, type "test@example.com", then click submit
```

### Reading Content
```
Click the first article and read the title
```

## Testing the AI's Vision

### Element Recognition
```
Find the blue button on the right side
Locate the settings icon
Identify the main heading
```

### Spatial Understanding
```
Click the button in the top right corner
Find the text field in the center
Locate the menu at the bottom
```

## Expected AI Response Format

When you send a command, the AI should respond with:

```json
{
  "plan": "I will click on the search box at coordinates (640, 360), then type 'hello world', and press Enter",
  "vision_analysis": "I can see a Google search page with a search input field in the center",
  "steps": [
    {"action": "click", "x": 640, "y": 360},
    {"action": "type_text", "content": "hello world"},
    {"action": "keyboard_press", "key": "Enter"}
  ]
}
```

## Troubleshooting Commands

If the AI seems confused, try:
- Being more specific: "Click the search input field in the center"
- Breaking it down: "First click the search box" → then "Now type hello"
- Describing visually: "Click the white rectangular box in the middle"

## Performance Tips

- **Simple commands** = faster execution
- **Specific locations** = better accuracy
- **One action at a time** = easier debugging
- **Wait between commands** = let the page load

## What to Watch For

✅ **Good Signs:**
- AI describes what it sees accurately
- Coordinates are within viewport (0-1280, 0-720)
- Actions execute smoothly
- Logs show clear planning

⚠️ **Warning Signs:**
- AI says "Error processing request"
- Coordinates are negative or too large
- No visible action on screen
- Empty steps array

## Advanced Testing

### Test AI's Understanding
```
What do you see on the screen?
Describe the main elements
Where is the search button located?
```

### Test Precision
```
Click exactly on the Google logo
Move mouse to coordinates 100, 200
```

### Test Multi-Step Logic
```
Search for "AI", wait 2 seconds, then click the first result
```

---

**Pro Tip:** Start with simple commands to verify the system works, then gradually increase complexity!
