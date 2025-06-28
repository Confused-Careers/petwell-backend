import { config } from 'dotenv';
config();

import OpenAI from 'openai';

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});
export const openaiModel = 'gpt-4.1-mini'; 