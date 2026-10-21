/**
 * CookPilot — AI Recipe Generator Frontend Application
 * Vanilla JavaScript (ES6+)
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // Application State
  // =========================================================================
  const state = {
    ingredients: [],
    currentRecipe: null,
    baseServings: 2,
    currentServings: 2,
    isLoading: false,
    apiKeyConfigured: false,
    loadingInterval: null
  };

  const loadingMessages = [
    { title: 'Consulting the AI Chef...', subtitle: 'Analyzing your pantry ingredients and flavor pairings...' },
    { title: 'Balancing the Flavors...', subtitle: 'Applying authentic culinary principles and techniques...' },
    { title: 'Crafting Step-by-Step Instructions...', subtitle: 'Calculating precise cooking temperatures and timings...' },
    { title: 'Estimating Nutrition & Pro-Tips...', subtitle: 'Adding chef secrets and dietary approximations...' },
    { title: 'Plating Your Custom Recipe...', subtitle: 'Almost ready to serve!' }
  ];

  // =========================================================================
  // DOM Elements
  // =========================================================================
  const elements = {
    // Header & Warning
    apiStatusBadge: document.getElementById('apiStatusBadge'),
    apiStatusText: document.getElementById('apiStatusText'),
    apiKeyWarningBanner: document.getElementById('apiKeyWarningBanner'),
    dismissWarningBtn: document.getElementById('dismissWarningBtn'),

    // Form inputs
    recipeForm: document.getElementById('recipeForm'),
    chipsContainer: document.getElementById('chipsContainer'),
    ingredientInput: document.getElementById('ingredientInput'),
    ingredientCount: document.getElementById('ingredientCount'),
    addIngredientBtn: document.getElementById('addIngredientBtn'),
    clearIngredientsBtn: document.getElementById('clearIngredientsBtn'),
    suggestionsList: document.getElementById('suggestionsList'),
    ingredientError: document.getElementById('ingredientError'),

    cuisineSelect: document.getElementById('cuisineSelect'),
    dietSelect: document.getElementById('dietSelect'),
    mealTypeSelect: document.getElementById('mealTypeSelect'),
    timeSelect: document.getElementById('timeSelect'),
    skillSelect: document.getElementById('skillSelect'),
    pantryStaplesCheck: document.getElementById('pantryStaplesCheck'),
    notesInput: document.getElementById('notesInput'),
    generateBtn: document.getElementById('generateBtn'),

    // States
    emptyState: document.getElementById('emptyState'),
    loadingState: document.getElementById('loadingState'),
    loadingTitle: document.getElementById('loadingTitle'),
    loadingSubtitle: document.getElementById('loadingSubtitle'),
    errorState: document.getElementById('errorState'),
    errorTitle: document.getElementById('errorTitle'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    dismissErrorBtn: document.getElementById('dismissErrorBtn'),

    // Recipe Card
    recipeContainer: document.getElementById('recipeContainer'),
    recipeBadges: document.getElementById('recipeBadges'),
    recipeTitle: document.getElementById('recipeTitle'),
    recipeDescription: document.getElementById('recipeDescription'),
    statServings: document.getElementById('statServings'),
    statPrepTime: document.getElementById('statPrepTime'),
    statCookTime: document.getElementById('statCookTime'),
    statTotalTime: document.getElementById('statTotalTime'),
    decreaseServingsBtn: document.getElementById('decreaseServingsBtn'),
    increaseServingsBtn: document.getElementById('increaseServingsBtn'),

    ingredientsList: document.getElementById('ingredientsList'),
    instructionsList: document.getElementById('instructionsList'),
    chefTipsSection: document.getElementById('chefTipsSection'),
    chefTipsList: document.getElementById('chefTipsList'),

    nutrCalories: document.getElementById('nutrCalories'),
    nutrProtein: document.getElementById('nutrProtein'),
    nutrCarbs: document.getElementById('nutrCarbs'),
    nutrFat: document.getElementById('nutrFat'),
    nutritionDisclaimerText: document.getElementById('nutritionDisclaimerText'),

    regenerateBtn: document.getElementById('regenerateBtn'),
    copyRecipeBtn: document.getElementById('copyRecipeBtn'),
    printRecipeBtn: document.getElementById('printRecipeBtn'),
    toast: document.getElementById('toast')
  };

  // =========================================================================
  // Initialize Application
  // =========================================================================
  init();

  function init() {
    setupEventListeners();
    checkApiHealth();
  }

  // =========================================================================
  // API Health Check
  // =========================================================================
  async function checkApiHealth() {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('Health check failed');
      const data = await response.json();

      state.apiKeyConfigured = !!data.apiKeyConfigured;

      if (state.apiKeyConfigured) {
        elements.apiStatusBadge.className = 'status-badge status-ready';
        elements.apiStatusText.textContent = `Gemini Ready (${data.model || 'Flash'})`;
        elements.apiKeyWarningBanner.classList.add('hidden');
      } else {
        elements.apiStatusBadge.className = 'status-badge status-warning';
        elements.apiStatusText.textContent = 'API Key Required';
        elements.apiKeyWarningBanner.classList.remove('hidden');
      }
    } catch (err) {
      console.warn('API health check error:', err);
      elements.apiStatusBadge.className = 'status-badge status-warning';
      elements.apiStatusText.textContent = 'Server Offline';
    }
  }

  // =========================================================================
  // Event Listeners Setup
  // =========================================================================
  function setupEventListeners() {
    // Chips input key handling (Enter or comma)
    elements.ingredientInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addCurrentIngredient();
      } else if (e.key === 'Backspace' && elements.ingredientInput.value === '' && state.ingredients.length > 0) {
        removeIngredient(state.ingredients.length - 1);
      }
    });

    // Support pasting comma-separated items
    elements.ingredientInput.addEventListener('paste', (e) => {
      const pasteData = (e.clipboardData || window.clipboardData).getData('text');
      if (pasteData.includes(',') || pasteData.includes('\n')) {
        e.preventDefault();
        const items = pasteData.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        items.forEach(item => addIngredient(item));
        elements.ingredientInput.value = '';
      }
    });

    // Add button
    elements.addIngredientBtn.addEventListener('click', addCurrentIngredient);

    // Clear all
    elements.clearIngredientsBtn.addEventListener('click', clearAllIngredients);

    // Clicking anywhere in chips container focuses the input
    elements.chipsContainer.addEventListener('click', (e) => {
      if (e.target === elements.chipsContainer) {
        elements.ingredientInput.focus();
      }
    });

    // Quick suggestions chips
    elements.suggestionsList.addEventListener('click', (e) => {
      const button = e.target.closest('.suggestion-chip');
      if (button) {
        const item = button.dataset.ingredient;
        addIngredient(item);
      }
    });

    // Form submit
    elements.recipeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleGenerateRecipe();
    });

    // Keyboard shortcut (Ctrl+Enter / Cmd+Enter)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!state.isLoading) {
          e.preventDefault();
          handleGenerateRecipe();
        }
      }
    });

    // Retry and error dismiss
    elements.retryBtn.addEventListener('click', handleGenerateRecipe);
    elements.dismissErrorBtn.addEventListener('click', showEmptyState);
    elements.dismissWarningBtn.addEventListener('click', () => {
      elements.apiKeyWarningBanner.classList.add('hidden');
    });

    // Regenerate
    elements.regenerateBtn.addEventListener('click', handleGenerateRecipe);

    // Copy to clipboard
    elements.copyRecipeBtn.addEventListener('click', copyRecipeToClipboard);

    // Print
    elements.printRecipeBtn.addEventListener('click', () => {
      window.print();
    });

    // Servings Scaler Steppers
    elements.decreaseServingsBtn.addEventListener('click', () => adjustServings(-1));
    elements.increaseServingsBtn.addEventListener('click', () => adjustServings(1));
  }

  // =========================================================================
  // Ingredient Chips Logic
  // =========================================================================
  function addCurrentIngredient() {
    const rawVal = elements.ingredientInput.value.trim();
    if (rawVal) {
      // Split on comma if user typed "garlic, tomatoes"
      const parts = rawVal.split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(p => addIngredient(p));
      elements.ingredientInput.value = '';
    }
  }

  function addIngredient(name) {
    const sanitized = name.trim();
    if (!sanitized) return;

    // Check duplicates (case-insensitive)
    const exists = state.ingredients.some(
      item => item.toLowerCase() === sanitized.toLowerCase()
    );

    if (exists) {
      showToast(`"${sanitized}" is already added.`);
      return;
    }

    if (state.ingredients.length >= 30) {
      showToast('Maximum 30 ingredients reached.');
      return;
    }

    state.ingredients.push(sanitized);
    renderIngredientChips();
    elements.ingredientError.classList.add('hidden');
    elements.ingredientInput.focus();
  }

  function removeIngredient(index) {
    if (index >= 0 && index < state.ingredients.length) {
      state.ingredients.splice(index, 1);
      renderIngredientChips();
    }
  }

  function clearAllIngredients() {
    state.ingredients = [];
    renderIngredientChips();
    elements.ingredientInput.focus();
  }

  function renderIngredientChips() {
    // Remove existing chip elements (keep input)
    const chips = elements.chipsContainer.querySelectorAll('.chip');
    chips.forEach(c => c.remove());

    state.ingredients.forEach((ingredient, index) => {
      const chipEl = document.createElement('span');
      chipEl.className = 'chip';

      const label = document.createElement('span');
      label.textContent = ingredient;
      chipEl.appendChild(label);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'chip-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.setAttribute('aria-label', `Remove ${ingredient}`);
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeIngredient(index);
      });

      chipEl.appendChild(removeBtn);
      elements.chipsContainer.insertBefore(chipEl, elements.ingredientInput);
    });

    elements.ingredientCount.textContent = `${state.ingredients.length} added`;
  }

  // =========================================================================
  // Recipe Generation Handler
  // =========================================================================
  async function handleGenerateRecipe() {
    if (state.isLoading) return;

    // If there is any uncommitted text in the ingredient input, add it now
    if (elements.ingredientInput.value.trim()) {
      addCurrentIngredient();
    }

    // Input Validation
    if (state.ingredients.length === 0) {
      elements.ingredientError.classList.remove('hidden');
      elements.chipsContainer.focus();
      showToast('Please add at least one ingredient.');
      return;
    }

    elements.ingredientError.classList.add('hidden');

    // Build payload
    const payload = {
      ingredients: state.ingredients,
      cuisine: elements.cuisineSelect.value,
      diet: elements.dietSelect.value,
      mealType: elements.mealTypeSelect.value,
      maxCookingTime: elements.timeSelect.value,
      cookingSkill: elements.skillSelect.value,
      pantryStaplesAllowed: elements.pantryStaplesCheck.checked,
      notes: elements.notesInput.value.trim()
    };

    // Transition to loading state
    setLoadingState(true);

    try {
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'An error occurred while generating the recipe.';
        throw new Error(errorMsg);
      }

      // Success: render the recipe
      state.currentRecipe = data.recipe;
      state.baseServings = data.recipe.servings || 2;
      state.currentServings = state.baseServings;

      renderRecipe(data.recipe);
      showRecipeView();

      showToast('✨ Fresh AI recipe generated!');
    } catch (err) {
      console.error('Generation Error:', err);
      showErrorView(err.message || 'Unable to generate recipe.');
    } finally {
      setLoadingState(false);
    }
  }

  // =========================================================================
  // View State Management
  // =========================================================================
  function setLoadingState(isLoading) {
    state.isLoading = isLoading;
    elements.generateBtn.disabled = isLoading;
    elements.regenerateBtn.disabled = isLoading;

    if (isLoading) {
      elements.emptyState.classList.add('hidden');
      elements.errorState.classList.add('hidden');
      elements.recipeContainer.classList.add('hidden');
      elements.loadingState.classList.remove('hidden');

      // Start dynamic loading message cycler
      let msgIndex = 0;
      updateLoadingMessage(msgIndex);
      state.loadingInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % loadingMessages.length;
        updateLoadingMessage(msgIndex);
      }, 2600);
    } else {
      if (state.loadingInterval) {
        clearInterval(state.loadingInterval);
        state.loadingInterval = null;
      }
      elements.loadingState.classList.add('hidden');
    }
  }

  function updateLoadingMessage(index) {
    const msg = loadingMessages[index];
    if (msg) {
      elements.loadingTitle.textContent = msg.title;
      elements.loadingSubtitle.textContent = msg.subtitle;
    }
  }

  function showEmptyState() {
    elements.loadingState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    elements.recipeContainer.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
  }

  function showErrorView(message) {
    elements.loadingState.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.recipeContainer.classList.add('hidden');
    elements.errorState.classList.remove('hidden');
    elements.errorMessage.textContent = message;
  }

  function showRecipeView() {
    elements.loadingState.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    elements.recipeContainer.classList.remove('hidden');

    // Smooth scroll down to recipe display on mobile devices
    if (window.innerWidth <= 1080) {
      elements.recipeContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // =========================================================================
  // Recipe Rendering & DOM Population
  // =========================================================================
  function renderRecipe(recipe) {
    // 1. Badges
    elements.recipeBadges.innerHTML = '';
    const badges = [
      { text: recipe.cuisine, class: 'badge-cuisine' },
      { text: recipe.diet, class: 'badge-diet' },
      { text: recipe.difficulty, class: 'badge-skill' },
      { text: recipe.mealType, class: 'badge-meal' }
    ];

    badges.forEach(b => {
      if (b.text && b.text !== 'None' && b.text !== 'Any') {
        const badge = document.createElement('span');
        badge.className = `badge ${b.class}`;
        badge.textContent = b.text;
        elements.recipeBadges.appendChild(badge);
      }
    });

    // 2. Title and Description
    elements.recipeTitle.textContent = recipe.title || 'Untitled Recipe';
    elements.recipeDescription.textContent = recipe.description || '';

    // 3. Stats
    elements.statServings.textContent = state.currentServings;
    elements.statPrepTime.textContent = `${recipe.prepTimeMinutes || 0}m`;
    elements.statCookTime.textContent = `${recipe.cookTimeMinutes || 0}m`;
    elements.statTotalTime.textContent = `${recipe.totalTimeMinutes || (recipe.prepTimeMinutes + recipe.cookTimeMinutes) || 0}m`;

    // 4. Ingredients Checklist
    renderIngredientsList();

    // 5. Step-by-Step Instructions
    elements.instructionsList.innerHTML = '';
    const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];

    instructions.forEach((inst, index) => {
      const li = document.createElement('li');
      li.className = 'instruction-item';

      const stepNum = document.createElement('span');
      stepNum.className = 'step-number';
      stepNum.textContent = inst.step || (index + 1);

      const stepBody = document.createElement('div');
      stepBody.className = 'step-body';

      const stepText = document.createElement('p');
      stepText.className = 'step-text';
      stepText.textContent = inst.instruction;
      stepBody.appendChild(stepText);

      if (inst.tip && inst.tip.trim()) {
        const tipEl = document.createElement('div');
        tipEl.className = 'step-tip';
        tipEl.textContent = `💡 Chef Note: ${inst.tip}`;
        stepBody.appendChild(tipEl);
      }

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'step-checkbox';
      checkbox.setAttribute('aria-label', `Mark step ${index + 1} complete`);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          li.classList.add('checked');
        } else {
          li.classList.remove('checked');
        }
      });

      li.appendChild(stepNum);
      li.appendChild(stepBody);
      li.appendChild(checkbox);
      elements.instructionsList.appendChild(li);
    });

    // 6. Chef Pro Tips
    const tips = Array.isArray(recipe.chefTips) ? recipe.chefTips : [];
    if (tips.length > 0) {
      elements.chefTipsSection.classList.remove('hidden');
      elements.chefTipsList.innerHTML = '';
      tips.forEach(tip => {
        const li = document.createElement('li');
        li.textContent = tip;
        elements.chefTipsList.appendChild(li);
      });
    } else {
      elements.chefTipsSection.classList.add('hidden');
    }

    // 7. Nutrition Estimate
    const nutr = recipe.nutritionEstimate || {};
    elements.nutrCalories.textContent = nutr.calories ? `${nutr.calories} kcal` : '--';
    elements.nutrProtein.textContent = nutr.protein || '--';
    elements.nutrCarbs.textContent = nutr.carbs || '--';
    elements.nutrFat.textContent = nutr.fat || '--';

    // 8. Nutrition Disclaimer
    elements.nutritionDisclaimerText.textContent =
      recipe.nutritionDisclaimer ||
      'Nutrition information is an automated estimate and may vary based on exact brands, portion sizes, and preparation methods.';
  }

  // =========================================================================
  // Ingredient Rendering & Scaling
  // =========================================================================
  function renderIngredientsList() {
    if (!state.currentRecipe) return;

    elements.ingredientsList.innerHTML = '';
    const ingredients = Array.isArray(state.currentRecipe.ingredients) ? state.currentRecipe.ingredients : [];
    const scaleFactor = state.currentServings / state.baseServings;

    ingredients.forEach((ing, index) => {
      const li = document.createElement('li');
      li.className = 'ingredient-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'ingredient-checkbox';
      checkbox.id = `ing-${index}`;

      const textWrapper = document.createElement('label');
      textWrapper.className = 'ingredient-text';
      textWrapper.htmlFor = `ing-${index}`;

      const amountSpan = document.createElement('span');
      amountSpan.className = 'ingredient-amount';
      amountSpan.textContent = scaleIngredientAmount(ing.amount, scaleFactor);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'ingredient-name';
      nameSpan.textContent = ing.name;

      textWrapper.appendChild(amountSpan);
      textWrapper.appendChild(nameSpan);

      if (ing.notes && ing.notes.trim()) {
        const notesSpan = document.createElement('span');
        notesSpan.className = 'ingredient-notes';
        notesSpan.textContent = `(${ing.notes.trim()})`;
        textWrapper.appendChild(notesSpan);
      }

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          li.classList.add('checked');
        } else {
          li.classList.remove('checked');
        }
      });

      li.appendChild(checkbox);
      li.appendChild(textWrapper);
      elements.ingredientsList.appendChild(li);
    });
  }

  function adjustServings(delta) {
    const newServings = state.currentServings + delta;
    if (newServings < 1 || newServings > 20) return;

    state.currentServings = newServings;
    elements.statServings.textContent = newServings;
    renderIngredientsList();
  }

  /**
   * Intelligently scales ingredient amounts based on servings ratio
   */
  function scaleIngredientAmount(rawAmount, scaleFactor) {
    if (!rawAmount || scaleFactor === 1) return rawAmount;

    // Matches numbers, fractions like 1/2, or decimals like 1.5
    return rawAmount.replace(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(\.\d+)?)/g, (match) => {
      let num = 0;
      if (match.includes('/')) {
        const parts = match.trim().split(/\s+/);
        if (parts.length === 2) {
          const whole = parseFloat(parts[0]);
          const [num1, num2] = parts[1].split('/').map(Number);
          num = whole + (num1 / num2);
        } else {
          const [num1, num2] = match.split('/').map(Number);
          num = num1 / num2;
        }
      } else {
        num = parseFloat(match);
      }

      if (isNaN(num)) return match;

      const scaled = num * scaleFactor;

      // Format nicely as clean decimal or rounded fraction
      if (Number.isInteger(scaled)) {
        return scaled.toString();
      } else if (Math.abs(scaled - Math.round(scaled * 2) / 2) < 0.05) {
        // Round to nearest 0.5
        const half = Math.round(scaled * 2) / 2;
        return half.toString();
      } else {
        return scaled.toFixed(1).replace(/\.0$/, '');
      }
    });
  }

  // =========================================================================
  // Copy to Clipboard
  // =========================================================================
  async function copyRecipeToClipboard() {
    if (!state.currentRecipe) return;

    const recipe = state.currentRecipe;
    const scaleFactor = state.currentServings / state.baseServings;

    const lines = [
      `🥗 ${recipe.title} (via CookPilot)`,
      `"${recipe.description}"`,
      '',
      `Servings: ${state.currentServings} | Prep: ${recipe.prepTimeMinutes}m | Cook: ${recipe.cookTimeMinutes}m | Total: ${recipe.totalTimeMinutes}m`,
      `Cuisine: ${recipe.cuisine} | Diet: ${recipe.diet} | Skill: ${recipe.difficulty}`,
      '',
      '🛒 INGREDIENTS:'
    ];

    recipe.ingredients.forEach(ing => {
      const amt = scaleIngredientAmount(ing.amount, scaleFactor);
      const note = ing.notes ? ` (${ing.notes})` : '';
      lines.push(`• ${amt} ${ing.name}${note}`);
    });

    lines.push('', '👩‍🍳 INSTRUCTIONS:');
    recipe.instructions.forEach(inst => {
      lines.push(`${inst.step}. ${inst.instruction}`);
      if (inst.tip) {
        lines.push(`   Tip: ${inst.tip}`);
      }
    });

    if (recipe.chefTips && recipe.chefTips.length > 0) {
      lines.push('', '💡 CHEF PRO TIPS:');
      recipe.chefTips.forEach(tip => lines.push(`• ${tip}`));
    }

    if (recipe.nutritionEstimate) {
      const n = recipe.nutritionEstimate;
      lines.push(
        '',
        `🥗 NUTRITION (per serving): ${n.calories || 0} kcal | Protein: ${n.protein || 'N/A'} | Carbs: ${n.carbs || 'N/A'} | Fat: ${n.fat || 'N/A'}`
      );
    }

    lines.push('', `ℹ️ Disclaimer: ${recipe.nutritionDisclaimer || 'Nutrition values are automated estimates.'}`);

    const textToCopy = lines.join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast('📋 Recipe copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy recipe:', err);
      showToast('Could not copy to clipboard.');
    }
  }

  // =========================================================================
  // Toast Notification
  // =========================================================================
  let toastTimeout;
  function showToast(message) {
    clearTimeout(toastTimeout);
    elements.toast.textContent = message;
    elements.toast.classList.remove('hidden');

    toastTimeout = setTimeout(() => {
      elements.toast.classList.add('hidden');
    }, 3200);
  }
});
