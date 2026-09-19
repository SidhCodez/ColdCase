import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface LLMCallParams<T> {
  provider: 'groq' | 'gemini';
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodSchema<T>;
  cacheKey: string;
  mockFallback?: T;
}

export class LLMClient {
  private groq?: Groq;
  private genAI?: GoogleGenAI;
  private cacheDir: string;

  constructor(cacheDir: string = '.cache/llm') {
    this.cacheDir = cacheDir;
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && groqKey !== 'placeholder') {
      this.groq = new Groq({ apiKey: groqKey });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey !== 'placeholder') {
      this.genAI = new GoogleGenAI({ apiKey: geminiKey });
    }
  }

  private getCachePath(key: string): string {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return path.join(this.cacheDir, `${hash}.json`);
  }

  async callJSON<T>(params: LLMCallParams<T>): Promise<T> {
    const cachePath = this.getCachePath(params.cacheKey);

    // Check disk cache first
    if (fs.existsSync(cachePath)) {
      try {
        const cachedRaw = fs.readFileSync(cachePath, 'utf-8');
        const parsedJson = JSON.parse(cachedRaw);
        return params.schema.parse(parsedJson);
      } catch {
        // Invalid cache, continue to fetch
      }
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        let rawContent = '';

        if (params.provider === 'groq' && this.groq) {
          const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
          const completion = await this.groq.chat.completions.create({
            messages: [
              { role: 'system', content: params.systemPrompt },
              { role: 'user', content: params.userPrompt },
            ],
            model,
            temperature: 0.1,
            response_format: { type: 'json_object' },
          });
          rawContent = completion.choices[0]?.message?.content || '{}';
        } else if (params.provider === 'gemini' && this.genAI) {
          const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
          const response = await this.genAI.models.generateContent({
            model,
            contents: [
              { role: 'user', parts: [{ text: `${params.systemPrompt}\n\n${params.userPrompt}` }] },
            ],
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          });
          rawContent = response.text || '{}';
        } else if (params.mockFallback) {
          // Offline / Dry Run mock fallback
          const validated = params.schema.parse(params.mockFallback);
          fs.writeFileSync(cachePath, JSON.stringify(validated, null, 2));
          return validated;
        } else {
          throw new Error(`LLM provider ${params.provider} is not configured and no mock fallback provided.`);
        }

        // Clean markdown code blocks if present
        let cleanJsonStr = rawContent.trim();
        if (cleanJsonStr.startsWith('```json')) {
          cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJsonStr.startsWith('```')) {
          cleanJsonStr = cleanJsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const jsonObj = JSON.parse(cleanJsonStr);
        const validated = params.schema.parse(jsonObj);

        // Cache successful validated result
        fs.writeFileSync(cachePath, JSON.stringify(validated, null, 2));
        return validated;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    if (params.mockFallback) {
      const validated = params.schema.parse(params.mockFallback);
      fs.writeFileSync(cachePath, JSON.stringify(validated, null, 2));
      return validated;
    }

    throw new Error(`LLM call failed after 3 attempts: ${lastError?.message}`);
  }
}
