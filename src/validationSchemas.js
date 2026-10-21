import { z } from 'zod';

/**
 * Validation schema for recipe generation requests from frontend
 */
export const recipeRequestSchema = z.object({
  ingredients: z
    .array(
      z.string()
        .trim()
        .min(1, 'Ingredient name cannot be empty')
        .max(100, 'Ingredient name must be under 100 characters')
    )
    .min(1, 'Please provide at least one ingredient')
    .max(30, 'You can provide up to 30 ingredients'),
  cuisine: z.string().trim().max(60).default('Any'),
  diet: z.string().trim().max(60).default('Any'),
  mealType: z.string().trim().max(60).default('Any'),
  maxCookingTime: z.string().trim().max(60).default('Any'),
  cookingSkill: z.string().trim().max(60).default('Intermediate'),
  pantryStaplesAllowed: z.boolean().default(true),
  notes: z.string().trim().max(300).optional().default('')
});

/**
 * Gemini JSON Response Schema (OpenAPI format used by @google/genai)
 */
export const geminiRecipeResponseSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'The appetizing, creative title of the recipe'
    },
    description: {
      type: 'string',
      description: 'A 1 to 2 sentence appetizing description of the dish'
    },
    servings: {
      type: 'integer',
      description: 'Number of servings, between 1 and 8'
    },
    prepTimeMinutes: {
      type: 'integer',
      description: 'Preparation time in minutes'
    },
    cookTimeMinutes: {
      type: 'integer',
      description: 'Cooking time in minutes'
    },
    totalTimeMinutes: {
      type: 'integer',
      description: 'Total time in minutes (prep + cook)'
    },
    difficulty: {
      type: 'string',
      description: 'Skill level: Beginner, Intermediate, or Advanced'
    },
    cuisine: {
      type: 'string',
      description: 'Cuisine style (e.g. Italian, Mexican, Indian, Mediterranean, etc.)'
    },
    diet: {
      type: 'string',
      description: 'Dietary category (e.g. Vegetarian, Vegan, Gluten-Free, Low-Carb, Balanced)'
    },
    mealType: {
      type: 'string',
      description: 'Meal type (e.g. Breakfast, Lunch, Dinner, Snack, Dessert)'
    },
    ingredients: {
      type: 'array',
      description: 'List of ingredients with exact quantities and preparation notes',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the ingredient (e.g. Garlic, Chicken breast, Olive oil)'
          },
          amount: {
            type: 'string',
            description: 'Accurate quantity with unit (e.g. 2 cloves, 250g, 1 tbsp, 1/2 cup)'
          },
          notes: {
            type: 'string',
            description: 'Optional prep instructions (e.g. minced, room temperature, drained)'
          }
        },
        required: ['name', 'amount']
      }
    },
    instructions: {
      type: 'array',
      description: 'Clear step-by-step instructions in logical cooking order',
      items: {
        type: 'object',
        properties: {
          step: {
            type: 'integer',
            description: 'Step number starting from 1'
          },
          instruction: {
            type: 'string',
            description: 'Detailed, actionable cooking instruction'
          },
          tip: {
            type: 'string',
            description: 'Optional pro-tip or visual cue for this step (e.g. look for golden brown color)'
          }
        },
        required: ['step', 'instruction']
      }
    },
    chefTips: {
      type: 'array',
      description: '2 to 4 chef secrets, ingredient substitutions, or storage tips',
      items: {
        type: 'string'
      }
    },
    nutritionEstimate: {
      type: 'object',
      description: 'Estimated nutritional values per serving',
      properties: {
        calories: {
          type: 'integer',
          description: 'Estimated calories per serving'
        },
        protein: {
          type: 'string',
          description: 'Protein per serving (e.g. 24g)'
        },
        carbs: {
          type: 'string',
          description: 'Carbohydrates per serving (e.g. 38g)'
        },
        fat: {
          type: 'string',
          description: 'Fat per serving (e.g. 14g)'
        }
      },
      required: ['calories', 'protein', 'carbs', 'fat']
    },
    nutritionDisclaimer: {
      type: 'string',
      description: 'Standard disclaimer that nutrition values are algorithmic estimates'
    }
  },
  required: [
    'title',
    'description',
    'servings',
    'prepTimeMinutes',
    'cookTimeMinutes',
    'totalTimeMinutes',
    'difficulty',
    'cuisine',
    'diet',
    'mealType',
    'ingredients',
    'instructions',
    'nutritionDisclaimer'
  ]
};

/**
 * Strict server-side Zod validator for Gemini output
 */
export const recipeResponseValidationSchema = z.object({
  title: z.string().trim().min(2, 'Recipe title is missing or too short'),
  description: z.string().trim().min(5, 'Recipe description is too short'),
  servings: z.number().int().min(1).max(24),
  prepTimeMinutes: z.number().int().nonnegative(),
  cookTimeMinutes: z.number().int().nonnegative(),
  totalTimeMinutes: z.number().int().nonnegative(),
  difficulty: z.string().trim().default('Intermediate'),
  cuisine: z.string().trim().default('General'),
  diet: z.string().trim().default('Standard'),
  mealType: z.string().trim().default('Meal'),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Ingredient name cannot be empty'),
        amount: z.string().trim().min(1, 'Ingredient amount cannot be empty'),
        notes: z.string().trim().nullable().optional().transform(v => v || '')
      })
    )
    .min(1, 'Recipe must have at least one ingredient'),
  instructions: z
    .array(
      z.object({
        step: z.number().int().positive(),
        instruction: z.string().trim().min(3, 'Instruction text is too short'),
        tip: z.string().trim().nullable().optional().transform(v => v || '')
      })
    )
    .min(1, 'Recipe must have at least one step'),
  chefTips: z
    .array(z.string().trim())
    .nullable()
    .optional()
    .transform(v => v || []),
  nutritionEstimate: z
    .object({
      calories: z.number().int().nonnegative().nullable().optional().transform(v => v ?? 0),
      protein: z.string().trim().nullable().optional().transform(v => v || 'N/A'),
      carbs: z.string().trim().nullable().optional().transform(v => v || 'N/A'),
      fat: z.string().trim().nullable().optional().transform(v => v || 'N/A')
    })
    .nullable()
    .optional()
    .transform(v => v || { calories: 0, protein: 'N/A', carbs: 'N/A', fat: 'N/A' }),
  nutritionDisclaimer: z
    .string()
    .trim()
    .min(10, 'Nutrition disclaimer is missing or too short')
});
