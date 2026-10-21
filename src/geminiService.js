import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';
import {
  geminiRecipeResponseSchema,
  recipeResponseValidationSchema
} from './validationSchemas.js';

/**
 * Initializes the Google Gen AI client with API key from environment
 */
function getGenAIClient() {
  if (!config.isApiKeyConfigured) {
    const error = new Error(
      'Gemini API key is not configured. Please set GEMINI_API_KEY in your server-side .env file.'
    );
    error.status = 500;
    error.code = 'API_KEY_MISSING';
    throw error;
  }

  return new GoogleGenAI({ apiKey: config.geminiApiKey });
}

/**
 * Constructs the user prompt from sanitized inputs
 */
function buildRecipePrompt(data) {
  const {
    ingredients,
    cuisine,
    diet,
    mealType,
    maxCookingTime,
    cookingSkill,
    pantryStaplesAllowed,
    notes
  } = data;

  const ingredientsList = ingredients.map((item, idx) => `${idx + 1}. ${item}`).join('\n');

  return `
Create an original, delicious, and chef-quality recipe using the following user parameters:

Available Primary Ingredients:
${ingredientsList}

Preferences & Constraints:
- Cuisine Style: ${cuisine || 'Any / Open to chef choice'}
- Dietary Preference: ${diet || 'None / Standard'}
- Meal Category: ${mealType || 'Any'}
- Maximum Cooking Time: ${maxCookingTime || 'No strict limit'}
- Cook Skill Level: ${cookingSkill || 'Intermediate'}
- Pantry Staples Allowed: ${pantryStaplesAllowed ? 'Yes (basic salt, black pepper, cooking oil, and water are allowed in addition to user ingredients)' : 'No (strictly limit ingredients to what the user provided)'}
${notes ? `- Special Requests / Chef Notes: ${notes}` : ''}

Guidelines:
1. Make the user-provided ingredients the core highlight of the recipe.
2. Provide exact measurements with standard units for every ingredient (e.g., "2 tbsp", "200g", "1/2 cup").
3. Write clear, sequentially ordered cooking instructions with specific sensory cues (e.g., "sauté until fragrant and translucent, about 3 minutes").
4. Keep the total preparation and cooking time strictly within the requested maximum cooking time if specified.
5. Provide realistic nutritional estimates per serving and a comprehensive nutrition disclaimer.
6. Return only the structured recipe matching the required JSON schema.
`.trim();
}

/**
 * Generates a recipe using Google Gemini API and validates the output
 *
 * @param {Object} inputData Validated recipe request params
 * @returns {Promise<Object>} Validated structured recipe object
 */
export async function generateRecipe(inputData) {
  const ai = getGenAIClient();
  const prompt = buildRecipePrompt(inputData);

  const systemInstruction = `You are a world-class professional executive chef and certified culinary nutritionist.
You create delicious, realistic, practical, and dependable recipes that make home cooking delightful.
Always respect dietary restrictions, ensure accurate ingredient proportions, and provide actionable step-by-step instructions.
You must strictly return valid JSON that conforms exactly to the provided schema.`;

  // Candidate models to try in case of temporary provider issues or model retirement
  const modelsToTry = Array.from(new Set([
    config.geminiModel,
    'gemini-3.5-flash',
    'gemini-3.8-flash'
  ])).filter(Boolean);

  let response;
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: geminiRecipeResponseSchema,
          temperature: 0.7,
          maxOutputTokens: 2500
        }
      });
      if (response?.text) {
        break; // Successfully received response
      }
    } catch (apiError) {
      lastError = apiError;
      console.warn(`Model ${modelName} failed, trying next fallback if available:`, apiError?.message || apiError);
    }
  }

  if (!response?.text) {
    console.error('Google Gen AI API Error:', lastError);

    // Map common Gemini API error states to clear messages
    const message = lastError?.message || '';
    const status = lastError?.status || lastError?.statusCode || 500;

    const error = new Error();
    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
      error.message = 'The provided Gemini API key is invalid. Please verify your GEMINI_API_KEY in the .env file.';
      error.status = 401;
      error.code = 'INVALID_API_KEY';
    } else if (message.includes('RESOURCE_EXHAUSTED') || message.includes('Quota exceeded') || status === 429) {
      error.message = 'Gemini API free-tier quota exceeded. Please wait a minute before generating another recipe.';
      error.status = 429;
      error.code = 'QUOTA_EXCEEDED';
    } else if (message.includes('NOT_FOUND') || message.includes('models/')) {
      error.message = `The configured Gemini model "${config.geminiModel}" is not available. Please verify GEMINI_MODEL in your .env file.`;
      error.status = 404;
      error.code = 'MODEL_NOT_FOUND';
    } else if (message.includes('UNAVAILABLE') || status === 503) {
      error.message = 'Gemini AI service is currently experiencing high demand. Please try again in a moment.';
      error.status = 503;
      error.code = 'SERVICE_UNAVAILABLE';
    } else {
      error.message = 'Failed to generate recipe from AI service: ' + (lastError?.message || 'Unknown upstream error');
      error.status = 502;
      error.code = 'UPSTREAM_API_ERROR';
    }
    throw error;
  }

  const rawText = response?.text;
  if (!rawText || typeof rawText !== 'string') {
    const error = new Error('The AI model returned an empty response. Please try again.');
    error.status = 502;
    error.code = 'EMPTY_RESPONSE';
    throw error;
  }

  // Parse JSON response
  let parsedJson;
  try {
    parsedJson = JSON.parse(rawText);
  } catch (parseError) {
    console.error('Failed to parse Gemini JSON output:', rawText);
    const error = new Error('The AI model returned an invalid JSON response format.');
    error.status = 502;
    error.code = 'MALFORMED_JSON';
    throw error;
  }

  // Strictly validate parsed JSON with Zod schema
  const validationResult = recipeResponseValidationSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    console.error('Recipe schema validation failed:', validationResult.error.format());
    const error = new Error('The generated recipe did not pass quality validation. Please try regenerating.');
    error.status = 502;
    error.code = 'SCHEMA_VALIDATION_FAILED';
    error.details = validationResult.error.issues;
    throw error;
  }

  return validationResult.data;
}
