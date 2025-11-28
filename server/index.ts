import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, Type, FunctionDeclaration, Schema } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';

// ... imports

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../dist')));

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!apiKey) {
    console.error('API_KEY is not defined in .env file');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// TTS Endpoint
app.post('/api/tts', async (req, res) => {
    try {
        const { text, voiceName } = req.body;
        if (!text || !voiceName) {
            return res.status(400).json({ error: 'Missing text or voiceName' });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error('No audio data generated');
        }

        res.json({ audioData: base64Audio });
    } catch (error: any) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Scene Analysis Endpoint
app.post('/api/analyze-scene', async (req, res) => {
    try {
        const { imageData, mimeType, location } = req.body;

        let prompt = "Describe this scene in detail for a blind user. Focus on layout, obstacles, potential hazards, and spatial orientation. Explain where things are relative to the viewer (e.g., 'on your left', 'steps ahead').";

        if (location) {
            prompt += ` The user is currently located at Latitude: ${location.latitude}, Longitude: ${location.longitude}. If visual landmarks match this location, identify specific streets, buildings, or places.`;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { data: imageData, mimeType: mimeType } },
                    { text: prompt }
                ]
            }
        });

        res.json({ text: response.text || "I could not analyze the scene." });
    } catch (error: any) {
        console.error('Scene Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Object Description Endpoint
app.post('/api/object-description', async (req, res) => {
    try {
        const { imageData, mimeType, prompt } = req.body;

        const systemInstructionBase = `You are an expert image analysis AI with advanced spatial awareness. Your task is to meticulously analyze the provided image and return a structured JSON object.
      
    First, provide a "sceneDescription" that offers a comprehensive overview of the entire scene, detailing the environment, lighting, and overall mood.
    
    Second, provide a "spatialAnalysis" that describes the arrangement and relationships of objects in the scene. For example, "The book is placed on top of the wooden table, next to a ceramic vase."
    
    Third, identify all significant objects and populate the "detectedObjects" array. For each object, provide:
    1.  A "name" for the object.
    2.  A detailed "description" covering its material, texture, appearance, and potential uses.
    3.  A "boundingBox" with four normalized (0-1) coordinates: yMin, xMin, yMax, xMax.
        CRITICAL INSTRUCTION FOR BOUNDING BOXES:
        - The box MUST be **extremely tight** around the visible pixels of the object.
        - **Exclude** all background, shadows, and empty space.
        - The edges of the box should touch the outermost pixels of the object.
        - Think of it as "shrink-wrapping" the bounding box around the object. This is critical for visual accuracy.
        - ZERO margin is allowed.
  
    Fourth, identify all human faces and populate the "detectedFaces" array. For each face, provide a "boundingBox" that strictly encloses the face from forehead to chin and ear to ear, with no extra space.
    
    **CRITICAL EMERGENCY DETECTION:**
    If you detect a life-threatening emergency (e.g., car accident, fire, unconscious person, weapon), START your \`sceneDescription\` with the text "**CRITICAL EMERGENCY:**" followed by the event type.
  
    Your output must be a valid JSON object matching the provided schema.`;

        const commonContent = {
            parts: [
                {
                    inlineData: {
                        data: imageData,
                        mimeType: mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: commonContent,
            config: {
                responseMimeType: 'application/json',
                systemInstruction: systemInstructionBase,
            },
        });

        const jsonText = response.text.trim();
        const sanitizedJsonText = jsonText.replace(/^```json\s*|```\s*$/g, '');
        const json = JSON.parse(sanitizedJsonText);

        res.json(json);

    } catch (error: any) {
        console.error('Object Description Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket Server for Live API Proxy
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws) => {
    console.log('Client connected to WebSocket');

    let session: any = null;

    try {
        const navigateWebFunctionDeclaration: FunctionDeclaration = {
            name: 'navigateWeb',
            parameters: {
                type: Type.OBJECT,
                description: 'Navigates to a specified web page or searches for content online.',
                properties: {
                    destination: {
                        type: Type.STRING,
                        description: 'The URL to navigate to, or the search query.',
                    },
                },
                required: ['destination'],
            },
        };

        const onlineShoppingSearchFunctionDeclaration: FunctionDeclaration = {
            name: 'onlineShoppingSearch',
            parameters: {
                type: Type.OBJECT,
                description: 'Initiates an online shopping search for a specific item.',
                properties: {
                    item: {
                        type: Type.STRING,
                        description: 'The item to search for.',
                    },
                },
                required: ['item'],
            },
        };

        const webSearchFunctionDeclaration: FunctionDeclaration = {
            name: 'webSearch',
            parameters: {
                type: Type.OBJECT,
                description: 'Performs a web search for a given query.',
                properties: {
                    query: {
                        type: Type.STRING,
                        description: 'The search term or question.',
                    },
                },
                required: ['query'],
            },
        };

        const findNearbyPlacesFunctionDeclaration: FunctionDeclaration = {
            name: 'findNearbyPlaces',
            parameters: {
                type: Type.OBJECT,
                description: 'Finds places, businesses, or points of interest near the user.',
                properties: {
                    query: {
                        type: Type.STRING,
                        description: 'The type of place to search for (e.g., "coffee shops", "parks").',
                    },
                },
                required: ['query'],
            },
        };

        const callEmergencyServicesFunctionDeclaration: FunctionDeclaration = {
            name: 'callEmergencyServices',
            parameters: {
                type: Type.OBJECT,
                description: 'Use this tool ONLY when the user explicitly asks to call 911, emergency, police, fire, or help in a life-threatening situation.',
                properties: {},
            },
        };

        const describeEnvironmentFunctionDeclaration: FunctionDeclaration = {
            name: 'describeEnvironment',
            parameters: {
                type: Type.OBJECT,
                description: 'Use this tool when the user asks "Where am I?", "Describe the room", or wants to know about their surroundings for navigation.',
                properties: {},
            },
        };

        session = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
                systemInstruction: `You are a helpful AI assistant and an expert at maintaining conversational context. Remember the topic of the current conversation to understand follow-up commands and questions. For example, if the user asks about the weather in Paris, a follow-up like "what about tomorrow?" should be interpreted as "what is the weather tomorrow in Paris?".

        You can respond to voice commands, navigate to websites, perform web searches, help with online shopping, or find nearby places.
        
        When the user asks to navigate to a specific website URL (e.g., "go to wikipedia.com"), use the \`navigateWeb\` tool.
        When the user asks a general question or wants to find information online (e.g., "what's the weather like?"), use the \`webSearch\` tool.
        If the user is shopping (e.g., for clothes or food), use the \`onlineShoppingSearch\` tool. Actively ask for their preferences such as **Size**, **Color**, **Dietary Restrictions**, or **Allergies** if they are not stated.
        When the user asks to find a location, such as "find coffee shops near me" or "where is the closest park", use the \`findNearbyPlaces\` tool.
        
        If the user asks "Where am I?" or "Describe my surroundings", use the \`describeEnvironment\` tool.
        If the user asks for "HELP", "911", "EMERGENCY", or "POLICE", use the \`callEmergencyServices\` tool IMMEDIATELY.
  
        Always try to provide audio responses.`,
                tools: [
                    {
                        functionDeclarations: [
                            navigateWebFunctionDeclaration,
                            onlineShoppingSearchFunctionDeclaration,
                            webSearchFunctionDeclaration,
                            findNearbyPlacesFunctionDeclaration,
                            callEmergencyServicesFunctionDeclaration,
                            describeEnvironmentFunctionDeclaration,
                        ],
                    },
                ],
            },
            callbacks: {
                onopen: () => {
                    console.log('Session opened');
                },
                onmessage: (msg) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(msg));
                    }
                },
                onclose: () => {
                    console.log('Session closed');
                    ws.close();
                },
                onerror: (err) => {
                    console.error('Session error:', err);
                    ws.close();
                }
            }
        });

        console.log('Connected to Gemini Live API via SDK');

        // Forward messages from Gemini to Client
        // The SDK uses a callback or stream? 
        // Wait, `ai.live.connect` returns a `LiveSession`.
        // It doesn't have `on('message')`. It has `receive()` which is an async generator, or we pass callbacks to `connect`.
        // The `connect` method signature in the new SDK:
        // connect(options: LiveConnectOptions): Promise<LiveSession>

        // Actually, looking at the user's `geminiService.ts`, they passed `callbacks` to `connect`.
        // Let's check if I can do that here.
        // Yes, `geminiService.ts` used:
        // const session = await ai.live.connect({ ..., callbacks: { ... } })

        // I should do the same.

        // But I can't re-assign `session` if I use `const`.
        // I'll use `let session`.

        // Wait, I need to close the previous session if I'm overwriting?
        // No, this is per connection.

        // I need to re-write the `ai.live.connect` call to include callbacks.

        // Re-doing the connect call with callbacks.

        // Note: I need to close the `session` variable I defined above? No, I'll just replace the whole block.

    } catch (error) {
        console.error('WebSocket Setup Error:', error);
        ws.close();
        return;
    }

    // We need to reconstruct the session with callbacks to handle incoming messages
    // Since I can't easily "attach" callbacks after creation if the SDK doesn't support it (it might not),
    // I should have passed them in the first place.

    // Let's redo the `ai.live.connect` part correctly.

    // Also, I need to handle the `voiceName` if possible. 
    // The client can send a "setup" message first? 
    // For now, I'll hardcode 'Zephyr' or 'Puck' as default, or maybe accept a query param in the WS URL?
    // `ws://localhost:4000?voice=Zephyr`

    // Let's parse the URL for voice.
    const url = new URL(ws.url || '', 'http://localhost'); // ws.url might be just path
    // Actually `ws.upgradeReq.url` or similar? `ws` doesn't have url directly in all types.
    // `req` from `wss.on('connection', (ws, req) => ...)` has the URL.

    // I'll update the signature to `wss.on('connection', async (ws, req) => { ... })`
});


// Catch-all handler for any request that doesn't match an API route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
