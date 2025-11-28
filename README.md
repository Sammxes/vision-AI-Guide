# 👁️ Vision AI Guide

## Empowering the Visually Impaired with Hybrid AI.

> An accessibility tool powered by a dual-architecture system: Gemini Flash for speed and Gemini Pro for reasoning.

## 💡 What is this?
This prototype empowers visually impaired users to understand their environment in real-time. It uses the device's camera to narrate the world, acting as a digital guide.

## 🚀 The Innovation: Hybrid Architecture
To solve the trade-off between latency and precision, we implemented a "two-brain" system:

1.  **Gemini 2.5 Flash (Speed):** Handles rapid object detection and immediate voice feedback for fluid navigation and safety.
2.  **Gemini 3.0 Pro (Reasoning):** Activates for deep analysis, reading complex text (OCR), or interpreting high-context situations where detail matters more than speed.

## 🛠️ Tech Stack
* **Frontend:** React + Vite (Smooth UX)
* **Backend:** Node.js (Secure API handling)
* **AI:** Google Gemini 2.5 Flash & 3.0 Pro models
* **Audio:** Web Speech API / TTS
* **Live:** WebSocket integration for real-time interaction.

---<div align="center">
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
