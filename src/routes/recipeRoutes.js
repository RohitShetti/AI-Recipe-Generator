import express from 'express';
import rateLimit from 'express-rate-limit';
import { recipeRequestSchema } from '../validationSchemas.js';
import { generateRecipe } from '../geminiService.js';
import { config } from '../config.js';

const router = express.Router();

/**
 * Basic rate limiting to protect free-tier Gemini API quota
 * Allows 20 recipe generation requests per 15 minutes per IP address
 */
const recipeGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many recipe generation requests from this IP. Please wait a few minutes before trying again.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * GET /api/health
 * Public health check and configuration status
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: config.isApiKeyConfigured,
    model: config.geminiModel,
    serverTime: new Date().toISOString()
  });
});

/**
 * POST /api/generate-recipe
 * Validates user preferences, contacts Gemini API, validates structured response,
 * and returns the generated recipe.
 */
router.post('/generate-recipe', recipeGenerationLimiter, async (req, res) => {
  try {
    // 1. Validate request body with Zod
    const validationResult = recipeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      const firstErrorMessage = validationResult.error.issues[0]?.message || 'Invalid input data';
      return res.status(400).json({
        success: false,
        error: firstErrorMessage,
        code: 'VALIDATION_ERROR',
        details: validationResult.error.issues
      });
    }

    const validatedInput = validationResult.data;

    // 2. Check if API key is configured
    if (!config.isApiKeyConfigured) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key is not configured. Please add your GEMINI_API_KEY to the server-side .env file.',
        code: 'API_KEY_MISSING'
      });
    }

    // 3. Generate recipe via Gemini service
    const recipe = await generateRecipe(validatedInput);

    // 4. Return successful structured response
    return res.status(200).json({
      success: true,
      recipe
    });
  } catch (error) {
    const statusCode = error.status || error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message || 'An unexpected error occurred while generating the recipe.',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
});

export default router;
