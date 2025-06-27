import { config } from 'dotenv';
config();

import { GoogleGenerativeAI } from '@google/generative-ai';

export const geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
export const geminiModel = geminiClient.getGenerativeModel({ model: 'gemini-2.5-flash' });