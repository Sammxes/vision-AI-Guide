<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1BOnfawH6K2yFgRE7MMjN6vHvHIJHIWU_

## Run Locally

**Prerequisites:**  Node.js


1. **Setup Backend:**
   ```bash
   cd server
   npm install
   # Ensure .env file exists in server/ with GEMINI_API_KEY
   npm run dev
   ```

2. **Setup Frontend (New Terminal):**
   ```bash
   # In the root directory
   npm install
   npm run dev
   ```
