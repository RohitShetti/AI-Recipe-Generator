import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const rawApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
const isPlaceholder = rawApiKey === 'your_gemini_api_key_here' || rawApiKey === '';

export const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  geminiApiKey: rawApiKey,
  isApiKeyConfigured: !isPlaceholder && rawApiKey.length > 5,
  geminiModel: process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : 'gemini-2.5-flash',
  env: process.env.NODE_ENV || 'development'
};
