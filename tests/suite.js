import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../server.js';
import {
  recipeRequestSchema,
  recipeResponseValidationSchema
} from '../src/validationSchemas.js';

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    // Bind to random available port
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => {
    server.close(resolve);
  });
});

test('GET /api/health returns health status and configuration info', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(typeof data.apiKeyConfigured, 'boolean');
  assert.equal(typeof data.model, 'string');
  assert.ok(data.serverTime);
});

test('GET / serves index.html with correct branding and form', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('SavorAI'));
  assert.ok(html.includes('recipeForm'));
  assert.ok(html.includes('ingredientInput'));
});

test('GET /style.css returns css with custom properties', async () => {
  const res = await fetch(`${baseUrl}/style.css`);
  assert.equal(res.status, 200);
  const css = await res.text();
  assert.ok(css.includes(':root'));
  assert.ok(css.includes('--primary'));
});

test('GET /app.js returns javascript code', async () => {
  const res = await fetch(`${baseUrl}/app.js`);
  assert.equal(res.status, 200);
  const js = await res.text();
  assert.ok(js.includes('handleGenerateRecipe'));
});

test('POST /api/generate-recipe returns 400 when ingredients array is empty', async () => {
  const res = await fetch(`${baseUrl}/api/generate-recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients: [] })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.code, 'VALIDATION_ERROR');
  assert.ok(data.error.includes('Please provide at least one ingredient'));
});

test('POST /api/generate-recipe returns 400 when ingredient is empty string', async () => {
  const res = await fetch(`${baseUrl}/api/generate-recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients: ['   '] })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.code, 'VALIDATION_ERROR');
});

test('POST /api/generate-recipe returns 400 when ingredients exceed 30 items', async () => {
  const excessiveIngredients = Array.from({ length: 35 }, (_, i) => `item ${i}`);
  const res = await fetch(`${baseUrl}/api/generate-recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients: excessiveIngredients })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.error.includes('up to 30 ingredients'));
});

test('POST /api/generate-recipe returns 500 with friendly message when API key is missing', async () => {
  // If GEMINI_API_KEY is currently placeholder in .env
  const res = await fetch(`${baseUrl}/api/generate-recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients: ['chicken', 'garlic'],
      cuisine: 'Italian'
    })
  });

  // When API key is not yet set, it should return 500 with API_KEY_MISSING
  // Or if set, it will return 200 with recipe. Let's assert based on status:
  const data = await res.json();
  if (res.status === 500) {
    assert.equal(data.code, 'API_KEY_MISSING');
    assert.ok(data.error.includes('Gemini API key is not configured'));
  } else {
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.recipe.title);
  }
});

test('GET /api/unknown returns 404 error with JSON response', async () => {
  const res = await fetch(`${baseUrl}/api/unknown`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.code, 'NOT_FOUND');
});

test('recipeRequestSchema validates valid parameters correctly', () => {
  const valid = recipeRequestSchema.safeParse({
    ingredients: ['pasta', 'olive oil', 'garlic'],
    cuisine: 'Italian',
    diet: 'Vegetarian',
    mealType: 'Dinner',
    maxCookingTime: 'Under 30 minutes',
    cookingSkill: 'Beginner',
    pantryStaplesAllowed: true,
    notes: 'Extra garlicky'
  });

  assert.equal(valid.success, true);
  assert.equal(valid.data.ingredients.length, 3);
  assert.equal(valid.data.cuisine, 'Italian');
});

test('recipeResponseValidationSchema passes valid recipe data', () => {
  const sampleRecipe = {
    title: 'Garlic Butter Spaghetti',
    description: 'A quick and fragrant classic pasta dish infused with garlic and olive oil.',
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 12,
    totalTimeMinutes: 17,
    difficulty: 'Beginner',
    cuisine: 'Italian',
    diet: 'Vegetarian',
    mealType: 'Dinner',
    ingredients: [
      { name: 'Spaghetti', amount: '200g', notes: 'dry' },
      { name: 'Garlic', amount: '4 cloves', notes: 'thinly sliced' },
      { name: 'Olive Oil', amount: '3 tbsp', notes: 'extra virgin' }
    ],
    instructions: [
      { step: 1, instruction: 'Bring a pot of salted water to boil and cook pasta until al dente.', tip: 'Reserve 1/2 cup pasta water' },
      { step: 2, instruction: 'Gently fry sliced garlic in olive oil until golden.', tip: 'Do not burn garlic' },
      { step: 3, instruction: 'Toss cooked pasta in the garlic oil with reserved pasta water.', tip: null }
    ],
    chefTips: ['Garnish with fresh parsley or parmesan if desired.'],
    nutritionEstimate: {
      calories: 420,
      protein: '11g',
      carbs: '65g',
      fat: '14g'
    },
    nutritionDisclaimer: 'Nutritional estimates are algorithmic approximations and will vary based on exact brands.'
  };

  const validation = recipeResponseValidationSchema.safeParse(sampleRecipe);
  assert.equal(validation.success, true);
  assert.equal(validation.data.title, 'Garlic Butter Spaghetti');
  assert.equal(validation.data.ingredients.length, 3);
  assert.equal(validation.data.instructions.length, 3);
});

test('recipeResponseValidationSchema rejects invalid recipe data missing required fields', () => {
  const invalidRecipe = {
    title: 'Missing description and disclaimer',
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    totalTimeMinutes: 15,
    ingredients: [],
    instructions: []
  };

  const validation = recipeResponseValidationSchema.safeParse(invalidRecipe);
  assert.equal(validation.success, false);
});
