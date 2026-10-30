import { GoogleGenAI } from '@google/genai';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

dotenv.config();

function geminiAgentApiPlugin(): Plugin {
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

  return {
    name: 'gemini-agent-api',
    configureServer(server) {
      server.middlewares.use('/api/gemini/agent', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { agent, prompt, contents, systemInstruction, tools, responseSchema, responseMimeType, temperature } = parsed;

            const contentPayload = contents || prompt;
            if (!contentPayload) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Prompt or contents is required' }));
              return;
            }

            if (!ai) {
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: 'GEMINI_API_KEY not configured on server',
                  isFallback: true,
                })
              );
              return;
            }

            const config: any = {
              systemInstruction:
                systemInstruction ||
                'You are an operational disaster response agent for Mumbai. Output strictly valid JSON without markdown.',
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

            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: true,
                text: response.text,
                functionCalls: response.functionCalls,
                candidates: response.candidates,
                agent,
              })
            );
          } catch (err: any) {
            console.error('[Vite Gemini Plugin] Error:', err?.message || err);
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                error: err?.message || 'Agent failed to respond',
                isFallback: true,
              })
            );
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiAgentApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
