# 🍳 SavorAI — AI Recipe Generator

An intelligent web application that turns whatever ingredients you have in your kitchen into an authentic, chef-quality recipe tailored to your cuisine, diet, meal type, cooking time, and skill level.

Powered by **Node.js**, **Express**, and the **Google Gemini API** using currently supported models eligible for Google's **Free Tier** (`gemini-2.5-flash`).

---

## ✨ Features

- **Dynamic Ingredient Chips**: Add ingredients easily by typing and pressing <kbd>Enter</kbd> or comma, or click fast suggestions (e.g. *Eggs*, *Garlic*, *Tomatoes*, *Spinach*).
- **Custom Culinary Controls**:
  - **Cuisine**: Italian, Mexican, Indian, Mediterranean, Chinese, Japanese, Thai, French, American, Middle Eastern, etc.
  - **Diet**: Vegetarian, Vegan, Gluten-Free, Dairy-Free, Keto / Low-Carb, Paleo, Halal, Kosher, Pescatarian, or Any.
  - **Meal Type**: Breakfast, Brunch, Lunch, Dinner, Snack, Dessert, Appetizer.
  - **Max Cooking Time**: Under 15m (Express), Under 30m, Under 45m, Under 60m, or No limit.
  - **Cooking Skill**: Beginner, Intermediate, or Advanced.
  - **Pantry Staples Toggle**: Allow or restrict common staples (salt, pepper, cooking oil, water).
  - **Custom Notes**: Request extra spice, one-pot meals, kid-friendly variations, etc.
- **Genuine AI Generation**: Powered by the official Google Gen AI SDK (`@google/genai`) with structured JSON schema enforcement.
- **Rich Recipe Presentation**:
  - Recipe title and appetizing chef description
  - Cuisine, Diet, Meal Type, and Skill badges
  - Preparation, cooking, and total times
  - **Interactive Servings Stepper** (`-` / `+`): Automatically rescales ingredient measurements in real time!
  - **Interactive Ingredient Checklist**: Cross off ingredients as you prepare them in the kitchen.
  - **Numbered Steps**: Sequential instructions with chef indicators and progress checkboxes.
  - **Chef's Pro Tips**: Secret techniques, ingredient substitutions, and storage advice.
  - **Estimated Nutritional Breakdown**: Calories, Protein, Carbs, and Fat per serving.
  - **Nutrition Disclaimer**: Transparent notice regarding automated estimates.
- **Utility Actions**:
  - 🔄 **Regenerate**: Create a fresh variation with the same ingredients.
  - 📋 **Copy Recipe**: Copies clean formatted recipe text to clipboard.
  - 🖨️ **Print / PDF**: Clean, print-friendly stylesheet formatted for physical print or PDF saving.
- **Security & Protection**:
  - API keys are stored strictly on the server in `.env` and are **never** exposed to the frontend.
  - Server-side rate limiting (`express-rate-limit`) to prevent API abuse and stay within free-tier quotas.
  - Strict input validation and AI output validation using **Zod**.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Modern CSS (Custom Properties, Flexbox, Grid, Animations, Print Styles), Vanilla JavaScript (ES6+).
- **Backend**: Node.js (ES Modules), Express 5.
- **AI SDK**: `@google/genai` (Official Google Gen AI JavaScript SDK).
- **AI Model**: `gemini-2.5-flash` (or `gemini-2.0-flash`), both eligible for the Google AI Studio Free Tier.
- **Validation**: Zod (for request validation and Gemini structured output validation).
- **Rate Limiting**: `express-rate-limit`.

---

## 📋 Prerequisites

- **Node.js**: Version 18.0.0 or higher (v20+ recommended).
- **Google Gemini API Key**: Free to obtain from [Google AI Studio](https://aistudio.google.com/). No credit card required.

---

## 🚀 Installation & Local Setup

### 1. Clone or Download the Repository

```bash
git clone <repository-url>
cd AI-Recipe-Generator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Your Environment File

Copy the example environment file to `.env`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

Open `.env` in your text editor and add your Gemini API key:

```env
# Get your free key at: https://aistudio.google.com/
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Supported model eligible for free tier:
GEMINI_MODEL=gemini-2.5-flash

# Port for local server:
PORT=3000
```

> ⚠️ **Important**: Never commit your `.env` file to version control. The `.gitignore` file already excludes `.env`.

### 4. Run the Application

**Production Mode:**
```bash
npm start
```

**Development Mode (Auto-restarts on file changes):**
```bash
npm run dev
```

### 5. Open in Your Browser

Navigate to:
```
http://localhost:3000
```

---

## 📁 Project Structure

```
AI-Recipe-Generator/
├── .env.example                # Template for environment variables
├── .env                        # Local environment variables (server-only, gitignored)
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies and npm scripts
├── README.md                   # Application documentation
├── server.js                   # Express server entry point & static file server
├── src/
│   ├── config.js               # Environment configuration & validation
│   ├── geminiService.js        # Google Gen AI client & recipe generation logic
│   ├── validationSchemas.js    # Zod schemas for input & Gemini response
│   └── routes/
│       └── recipeRoutes.js     # Health check and recipe generation endpoints
└── public/
    ├── index.html              # HTML structure & semantic markup
    ├── style.css               # Styling, animations, responsive & print media queries
    └── app.js                  # Frontend state management, chips input, API calls, and DOM rendering
```

---

## 🔌 API Endpoints

### 1. `GET /api/health`
Checks server health and verifies whether the Gemini API key is configured.

**Sample Response:**
```json
{
  "status": "ok",
  "apiKeyConfigured": true,
  "model": "gemini-2.5-flash",
  "serverTime": "2026-10-21T14:00:00.000Z"
}
```

### 2. `POST /api/generate-recipe`
Generates a structured recipe based on user input. Protected by rate limiting (20 requests per 15 minutes per IP).

**Request Body (JSON):**
```json
{
  "ingredients": ["eggs", "tomatoes", "garlic", "spinach"],
  "cuisine": "Mediterranean",
  "diet": "Vegetarian",
  "mealType": "Breakfast",
  "maxCookingTime": "Under 30 minutes",
  "cookingSkill": "Intermediate",
  "pantryStaplesAllowed": true,
  "notes": "Prefer skillet method"
}
```

**Response (JSON):**
```json
{
  "success": true,
  "recipe": {
    "title": "Mediterranean Shakshuka with Wilted Spinach",
    "description": "Gently poached eggs in a vibrant spiced tomato-garlic sauce nestled on a bed of fresh spinach.",
    "servings": 2,
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 15,
    "totalTimeMinutes": 25,
    "difficulty": "Intermediate",
    "cuisine": "Mediterranean",
    "diet": "Vegetarian",
    "mealType": "Breakfast",
    "ingredients": [
      { "name": "Large eggs", "amount": "4", "notes": "room temperature" },
      { "name": "Roma tomatoes", "amount": "3 medium", "notes": "diced" },
      { "name": "Fresh spinach", "amount": "2 cups", "notes": "washed and drained" },
      { "name": "Garlic cloves", "amount": "3 cloves", "notes": "finely minced" },
      { "name": "Olive oil", "amount": "2 tbsp", "notes": "extra virgin" },
      { "name": "Salt & black pepper", "amount": "to taste", "notes": "pantry staple" }
    ],
    "instructions": [
      {
        "step": 1,
        "instruction": "Heat olive oil in a wide skillet over medium heat. Add minced garlic and sauté for 1 minute until fragrant.",
        "tip": "Do not burn the garlic; maintain medium-low heat."
      },
      {
        "step": 2,
        "instruction": "Add the diced tomatoes with a pinch of salt. Cook down for 8-10 minutes until a rich, saucy texture forms.",
        "tip": "Press tomatoes with a wooden spoon to release juices."
      },
      {
        "step": 3,
        "instruction": "Fold in the fresh spinach and cook for 2 minutes until wilted into the sauce.",
        "tip": null
      },
      {
        "step": 4,
        "instruction": "Make small wells in the sauce and gently crack each egg into a well. Cover the skillet and simmer for 5-6 minutes until whites are set and yolks remain soft.",
        "tip": "Watch closely to keep yolks runny."
      }
    ],
    "chefTips": [
      "Serve directly from the skillet with warm crusty bread or pita for dipping.",
      "Garnish with fresh parsley or crumbled feta cheese if available."
    ],
    "nutritionEstimate": {
      "calories": 280,
      "protein": "16g",
      "carbs": "12g",
      "fat": "18g"
    },
    "nutritionDisclaimer": "Nutrition information is an automated estimate and may vary based on exact brands, portion sizes, and preparation methods. Consult a healthcare professional for dietary needs."
  }
}
```

---

## 🔒 Free-Tier Guidelines & Rate Limits

- Google AI Studio provides **15 Requests Per Minute (RPM)** and generous token allowances for Flash models on the Free Tier at no cost.
- The backend includes built-in IP rate limiting (20 requests per 15 minutes) to protect against accidental spam and conserve your quota.
- If you encounter a quota limit, the application cleanly informs you with an informative message rather than crashing.

---

## 📄 License

ISC License. Open source for educational and personal use.
