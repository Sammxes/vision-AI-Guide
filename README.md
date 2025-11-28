# 👁️ Vision AI Guide

## Empowering the Visually Impaired with Hybrid AI.

> An accessibility tool powered by a dual-architecture system: Gemini Flash for speed and Gemini Pro for reasoning.

## 💡 What is this?
This prototype empowers visually impaired users to understand their environment in real-time. It uses the device's camera to narrate the world, acting as a digital guide.
---
## 🚀 The Innovation: Hybrid Architecture
The project features a multi-faceted approach to accessibility:

1.  **Gemini 2.5 Flash (Speed):** Handles rapid object detection and immediate voice feedback for fluid navigation.
2.  **Gemini 3 Pro (Reasoning):** Used for complex tasks, decision-making, and contextual analysis.
3.  **🛒 Voice Commerce & Memory Module:** The system supports voice-activated e-commerce (buying recognized items) and uses a persistent memory module to securely store personal data (medications, clothing sizes) and set voice reminders.
4.  **🚨 Autonomous Safety Protocol:** The AI constantly monitors the user for accidents (falls, impacts) and autonomously initiates an emergency call (911/contacts) if the user is incapacitated.

---
## 🕹️ How to Interact (Usage Guide)

The Vision AI Guide is designed for a seamless, hands-free experience:

1.  **Launch:** After completing the setup steps below, open your browser and grant permissions for the **Camera, Microphone, and Location**.
2.  **Core Feature: Precision Context.** Geolocation data (latitude/longitude) is utilized to provide precise, contextual guidance relevant to the user's exact coordinates.
3.  **Activation:** The application is always listening for activation.
4.  **Core Command:** Press the central activation button on the screen and clearly ask your question (e.g., *"What is in front of me?"* or *"Read the sign"*).
5.  **Response:** Gemini 2.5 Flash provides immediate voice feedback for quick guidance.
6.  **Safety Override:** The AI maintains continuous monitoring; the emergency protocol is always active, even if the user is unable to speak.
---
## 🛠️ Tech Stack
* **Frontend:** React + Vite (Smooth UX)
* **Backend:** Node.js (Secure API handling)
* **AI:** Google Gemini 2.5 Flash & 3.0 Pro models
* **Audio:** Web Speech API / TTS
* **Live:** WebSocket integration for real-time interaction.
---
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
