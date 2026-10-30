/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Full-stack Express Production Server for ENTANGLE
 * Serves static assets and provides server-side Gemini 3.8 Flash agent gateway.
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.post('/api/gemini/agent', async (req: Request, res: Response) => {
  const { agent, prompt, contents, systemInstruction, tools, responseSchema, responseMimeType, temperature } = req.body;

  const contentPayload = contents || prompt;
  if (!contentPayload) {
    return res.status(400).json({ success: false, error: 'Prompt or contents is required' });
  }

  if (!ai) {
    return res.json({
      success: false,
      error: 'GEMINI_API_KEY not configured on server',
      isFallback: true,
    });
  }

  try {
    const config: any = {
      systemInstruction: systemInstruction || 'You are an operational disaster response agent for Mumbai. Output strictly valid JSON without markdown.',
      temperature: temperature ?? 0.2,
    };

    if (tools) {
      config.tools = tools;
    }

    if (responseMimeType) {
      config.responseMimeType = responseMimeType;
    } else if (responseSchema) {
      config.responseMimeType = 'application/json';
      config.responseSchema = responseSchema;
    }

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contentPayload,
        config,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Agent execution timeout (exceeded 10 seconds)')), 10000)
      ),
    ]);

    return res.json({
      success: true,
      text: response.text,
      functionCalls: response.functionCalls,
      candidates: response.candidates,
      agent,
    });
  } catch (err: any) {
    console.error(`Gemini Agent [${agent}] Error:`, err?.message || err);
    return res.json({
      success: false,
      error: err?.message || 'Agent failed to respond',
      isFallback: true,
    });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ENTANGLE Control Room Server listening on port ${PORT}`);
});
