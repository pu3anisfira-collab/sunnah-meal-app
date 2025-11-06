// ==== RENDERER PROCESS ====
import { getRandomQuote } from './quotes.js';

// ==== GLOBAL VARIABLES ====
let currentModalRecipe = null;
const pages = {
  home: document.getElementById('home'),
  search: document.getElementById('search'),
  meal: document.getElementById('meal'),
  favorites: document.getElementById('favorites'),
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ==== INITIALIZATION ====
function init() {
  setupNavigation();
  setupSearch();
  loadSavedMeals();
  showPage('home');
}

function setupNavigation() {
  document.getElementById('btn-home').addEventListener('click', () => showPage('home'));
  document.getElementById('btn-search').addEventListener('click', () => showPage('search'));
  document.getElementById('btn-meal').addEventListener('click', () => showPage('meal'));
  document.getElementById('btn-favorites').addEventListener('click', () => showPage('favorites'));
  document.getElementById('go-search').addEventListener('click', () => showPage('search'));
  document.getElementById('go-meal').addEventListener('click', () => showPage('meal'));
}

function setupSearch() {
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  document.getElementById('ingredientInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
}

// ==== CORE FUNCTIONS ====
function showPage(pageName) {
  Object.values(pages).forEach(p => p.classList.add('hidden'));
  pages[pageName].classList.remove('hidden');
  
  if (pageName === 'meal') loadSavedMeals();
  else if (pageName === 'favorites') loadFavorites();
}

function isHalal(recipe) {
  const HARAM_INGREDIENTS = [
  "pork", "bacon", "ham", "alcohol", "wine", "beer", "martini", "rum", 
  "whiskey", "vodka", "gin", "tequila", "brandy", "champagne", "lard",
  "prosciutto", "salami", "pepperoni", "speck", "cognac", "sake"
  ];
  
  if (!recipe) return false;

  const textToCheck = [
    recipe.title?.toLowerCase(),
    recipe.summary?.toLowerCase(),
    recipe.instructions?.toLowerCase(),
    ...(recipe.usedIngredients || []).map(i => i.name?.toLowerCase()),
    ...(recipe.missedIngredients || []).map(i => i.name?.toLowerCase()),
    ...(recipe.extendedIngredients || []).map(i => i.name?.toLowerCase()),
  ].join(' ');

  return !HARAM_INGREDIENTS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(textToCheck);
  });
}

// ==== SEARCH & RECIPES ====
async function handleSearch() {
  const ingredient = document.getElementById('ingredientInput').value.trim().toLowerCase();
  if (!ingredient) return alert('Please enter an ingredient (e.g., dates, honey, milk, barley).');

  // Check if search contains haram ingredients
  const searchIngredients = ingredient.split(/[, ]+/);
  const containsHaram = searchIngredients.some(searchIngredient => 
    HARAM_INGREDIENTS.some(haram => 
      searchIngredient.includes(haram) || haram.includes(searchIngredient)
    )
  );

  if (containsHaram) {
    document.getElementById('results').innerHTML = `
      <div class="no-results">
        <p>No halal recipes found for "${ingredient}".</p>
        <p>Try: <strong>dates, honey, milk, barley, olives, figs, grapes</strong></p>
        <p class="warning">⚠️ This ingredient is not permissible in Islamic dietary laws.</p>
      </div>
    `;
    document.getElementById('totalResults').textContent = '';
    return;
  }

  document.getElementById('results').innerHTML = '<div class="loading">Searching for halal recipes... 🌙</div>';
  document.getElementById('totalResults').textContent = '';

  try {
    const recipes = await window.api.search(ingredient);
    const halalRecipes = (recipes || []).filter(recipe => isHalal(recipe));
    
    if (!halalRecipes.length) {
      document.getElementById('results').innerHTML = `
        <div class="no-results">
          <p>No halal recipes found for "${ingredient}".</p>
          <p>Try: <strong>dates, honey, milk, barley, olives, figs, grapes</strong></p>
        </div>
      `;
      return;
    }

    renderRecipes(halalRecipes);
  } catch (error) {
    document.getElementById('results').innerHTML = `
      <p class="error">Failed to fetch recipes. Please check your connection.</p>
    `;
  }
}

function renderRecipes(recipes) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  
  document.getElementById('totalResults').textContent = `Found ${recipes.length} halal recipes`;
  document.getElementById('totalResults').style.cssText = 'font-weight: bold; color: #38a169;';

  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.innerHTML = `
      <img src="${recipe.image}" alt="${recipe.title}" class="recipe-image" 
           onerror="this.src='https://via.placeholder.com/300x180/9c6ade/white?text=No+Image'">
      <h3>${truncateText(recipe.title, 50)}</h3>
      <div class="ingredients-info">
        <p><strong>Used:</strong> ${truncateText((recipe.usedIngredients || []).map(i => i.name).join(', ') || 'None', 40)}</p>
        <p><strong>Missing:</strong> ${truncateText((recipe.missedIngredients || []).map(i => i.name).join(', ') || 'None', 40)}</p>
        ${recipe.likes ? `<p><strong>❤️ Likes:</strong> ${recipe.likes}</p>` : ''}
      </div>
      <div class="recipe-actions">
        <button class="view-detail-btn">View Recipe Details</button>
        <button class="add-meal-quick-btn">Add to Meal Plan</button>
      </div>
    `;
    
    card.querySelector('.view-detail-btn').addEventListener('click', () => showRecipeDetails(recipe.id));
    card.querySelector('.add-meal-quick-btn').addEventListener('click', () => showDaySelectorModal(recipe));
    
    resultsDiv.appendChild(card);
  });
}

// ==== RECIPE DETAILS MODAL ====
async function showRecipeDetails(recipeId) {
  try {
    document.getElementById('modalRecipeContent').innerHTML = '<div class="loading">Loading recipe details... 🌙</div>';
    document.getElementById('recipeModal').style.display = 'flex';
    
    const recipe = await window.api.getRecipeDetails(recipeId);
    if (!recipe) throw new Error('Recipe not found or contains non-halal ingredients');
    
    displayRecipeModal(recipe);
  } catch (err) {
    closeRecipeModal();
    alert('Error loading recipe details. Please try again.');
  }
}

function displayRecipeModal(recipe) {
  currentModalRecipe = recipe;
  const modalContent = document.getElementById('modalRecipeContent');
  
  modalContent.innerHTML = `
    <div class="modal-header">
      <h2>${recipe.title || 'No Title'}</h2>
      <button class="modal-close">✕</button>
    </div>
    <img src="${recipe.image || 'https://via.placeholder.com/600x300/9c6ade/white?text=No+Image'}" class="modal-image">
    
    <div class="recipe-detail-card">
      <h3>📊 Nutrition & Info</h3>
      <p><strong>⏱ Ready in:</strong> ${recipe.readyInMinutes || 'N/A'} minutes</p>
      <p><strong>👥 Servings:</strong> ${recipe.servings || 'N/A'}</p>
      <p><strong>❤️ Likes:</strong> ${recipe.aggregateLikes || recipe.likes || 'N/A'}</p>
      <p><strong>🥗 Diets:</strong> ${recipe.diets ? recipe.diets.join(', ') : 'Not specified'}</p>
    </div>

    <div class="recipe-detail-card">
      <h3>🛒 Ingredients (${(recipe.extendedIngredients || []).length})</h3>
      <ul class="ingredients-list">
        ${(recipe.extendedIngredients || []).length ? 
          recipe.extendedIngredients.map(i => `<li>${i.original || i.name}</li>`).join('') : 
          '<li>No ingredients information available</li>'
        }
      </ul>
    </div>

    <div class="recipe-detail-card">
      <h3>📝 Instructions</h3>
      <ol class="instructions-list">
        ${recipe.instructions ? 
          formatInstructionsNumbered(recipe.instructions) : 
          '<li>No instructions available</li>'
        }
      </ol>
    </div>

    ${getSunnahBlessing()}

    <div class="modal-actions">
      <button class="add-to-plan-btn" id="addMealBtn">📅 Add to Meal Plan</button>
      <button class="favorite-btn" id="addFavoriteBtn">♥ Add to Favorites</button>
    </div>
  `;

  modalContent.querySelector('.modal-close').addEventListener('click', closeRecipeModal);
  document.getElementById('addMealBtn').addEventListener('click', () => showDaySelectorModal(recipe));
  document.getElementById('addFavoriteBtn').addEventListener('click', () => addToFavorites(recipe));
  
  document.getElementById('recipeModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('recipeModal')) closeRecipeModal();
  });
}

function closeRecipeModal() {
  document.getElementById('recipeModal').style.display = 'none';
  currentModalRecipe = null;
}

// ==== MEAL PLANNING ====
function showDaySelectorModal(recipe) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h3>Plan Your Meal 📅</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="day-selector">
        <h4>Choose a day for: <em>"${recipe.title}"</em></h4>
        <div class="days-grid">
          ${DAYS_OF_WEEK.map(day => `
            <button class="day-option" data-day="${day}"><span>${day}</span></button>
          `).join('')}
        </div>
        <div class="custom-day">
          <label>Additional Notes (optional):</label>
          <textarea id="customNotes" placeholder="E.g.: Dinner, Special occasion, etc." rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `;

  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
  
  modal.querySelectorAll('.day-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const notes = document.getElementById('customNotes').value;
      await addToMealPlan(recipe, btn.dataset.day, notes);
      modal.remove();
    });
  });

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// Add meal to planner
async function addToMealPlan(recipe, day = 'Unscheduled', notes = '') {
  try {
    const mealData = {
      id: Date.now(),
      title: recipe.title,
      image: recipe.image,
      day: day,
      notes: notes,
      isFavorite: false,
      details: `${(recipe.extendedIngredients || []).length} ingredients • ${recipe.readyInMinutes || 'Unknown'} mins`,
      recipeId: recipe.id,
      addedDate: new Date().toISOString()
    };

    const result = await window.api.addMeal(mealData);
    if (result.success) {
      alert(`Meal added to ${day}! 🌙`);
      closeRecipeModal();
      loadSavedMeals();
    }
  } catch (err) {
    alert('Failed to add meal to plan. Please try again.');
  }
}

// ==== MEAL MANAGEMENT ====
async function loadSavedMeals() {
  try {
    const meals = await window.api.getMeals();
    const savedMealsDiv = document.getElementById('savedMeals');
    savedMealsDiv.innerHTML = '';

    if (!meals?.length) {
      savedMealsDiv.innerHTML = `
        <div class="empty-state">
          <p>No saved meals yet. 🌙</p>
          <p>Search for recipes and add them to your meal plan!</p>
        </div>
      `;
      return;
    }

    // Group by day
    const mealsByDay = { Unscheduled: [] };
    DAYS_OF_WEEK.forEach(day => mealsByDay[day] = []);
    
    meals.forEach(meal => {
      const day = meal.day && DAYS_OF_WEEK.includes(meal.day) ? meal.day : 'Unscheduled';
      mealsByDay[day].push(meal);
    });

    // Display by day
    Object.entries(mealsByDay).forEach(([day, dayMeals]) => {
      if (dayMeals.length) {
        const daySection = document.createElement('div');
        daySection.className = 'day-section';
        daySection.innerHTML = `
          <h3 class="day-header">${day} <span class="meal-count">(${dayMeals.length} meals)</span></h3>
          <div class="day-meals-grid">
            ${dayMeals.map(meal => `
              <div class="meal-card" data-meal-id="${meal.id}">
                <div class="meal-card-header">
                  <img src="${meal.image}" class="meal-image"
                      onerror="this.src='https://via.placeholder.com/200x120/9c6ade/white?text=No+Image'">
                </div>
                <div class="meal-card-body">
                  <h4>${meal.title}</h4>
                  <p>${meal.details}</p>
                  ${meal.notes ? `<p class="meal-notes">📝 ${meal.notes}</p>` : ''}
                  <p class="meal-date">Added: ${new Date(meal.addedDate).toLocaleDateString()}</p>
                </div>
                <div class="meal-card-actions">
                  <button class="meal-action-btn favorite-btn ${meal.isFavorite ? 'favorited' : ''}">
                    ${meal.isFavorite ? 'Remove Favorite' : 'Add Favorite'}
                  </button>
                  <button class="meal-action-btn edit-btn">Edit</button>
                  <button class="meal-action-btn delete-btn">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        `;

        daySection.querySelectorAll('.meal-card').forEach((card, index) => {
          const meal = dayMeals[index];
          card.querySelector('.favorite-btn').addEventListener('click', () => toggleMealFavorite(meal));
          card.querySelector('.edit-btn').addEventListener('click', () => showEditMealModal(meal));
          card.querySelector('.delete-btn').addEventListener('click', () => deleteMeal(meal.id));
        });

        savedMealsDiv.appendChild(daySection);
      }
    });
  } catch (err) {
    document.getElementById('savedMeals').innerHTML = '<p>Error loading saved meals.</p>';
  }
}

function showEditMealModal(meal) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h3>Edit Meal Plan 📝</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="edit-meal-form">
        <h4>Editing: <em>"${meal.title}"</em></h4>
        <div class="form-group">
          <label>Day:</label>
          <select id="editDay">
            <option value="">Unscheduled</option>
            ${DAYS_OF_WEEK.map(day => `<option value="${day}" ${meal.day === day ? 'selected' : ''}>${day}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Notes:</label>
          <textarea id="editNotes" rows="4">${meal.notes || ''}</textarea>
        </div>
        <div class="modal-actions">
          <button class="cancel-btn">Cancel</button>
          <button class="save-btn">Save Changes</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => modal.remove();
  
  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
  modal.querySelector('.save-btn').addEventListener('click', async () => {
    const updates = {
      day: document.getElementById('editDay').value,
      notes: document.getElementById('editNotes').value
    };
    await updateMeal(meal.id, updates);
    closeModal();
  });

  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.body.appendChild(modal);
}

async function updateMeal(mealId, updates) {
  try {
    const result = await window.api.updateMeal(mealId, updates);
    if (result.success) {
      alert('Meal updated successfully! 🌙');
      loadSavedMeals();
    }
  } catch (err) {
    alert('Failed to update meal. Please try again.');
  }
}

async function deleteMeal(mealId) {
  if (confirm('Remove this meal from your plan?')) {
    try {
      const result = await window.api.deleteMeal(mealId);
      if (result.success) loadSavedMeals();
    } catch (err) {
      alert('Failed to remove meal. Please try again.');
    }
  }
}

// ==== FAVORITES ====
async function toggleMealFavorite(meal) {
  try {
    const result = await window.api.toggleFavorite(meal);
    if (result.success) {
      loadSavedMeals();
      if (!pages.favorites.classList.contains('hidden')) loadFavorites();
    }
  } catch (err) {
    alert('Failed to update favorites. Please try again.');
  }
}

async function addToFavorites(recipe) {
  const favoriteMeal = {
    id: Date.now(),
    title: recipe.title,
    image: recipe.image,
    details: `${(recipe.extendedIngredients || []).length} ingredients • ${recipe.readyInMinutes || 'Unknown'} mins`,
    recipeId: recipe.id,
    addedDate: new Date().toISOString(),
    isFavorite: true
  };
  await toggleMealFavorite(favoriteMeal);
  alert('Added to favorites! 🌙');
  closeRecipeModal();
}

async function loadFavorites() {
  try {
    const favorites = await window.api.getFavorites();
    const favoritesDiv = document.getElementById('favoritesList');
    
    if (!favorites?.length) {
      favoritesDiv.innerHTML = `
        <div class="empty-state">
          <p>No favorite recipes yet. 🌙</p>
          <p>Click the heart icon on meals to add them to favorites!</p>
        </div>
      `;
      return;
    }

    favoritesDiv.innerHTML = favorites.map(meal => `
      <div class="favorite-card">
        <img src="${meal.image}" class="favorite-image"
            onerror="this.src='https://via.placeholder.com/80x80/9c6ade/white?text=No+Image'">
        <div class="favorite-info">
          <h4>${meal.title}</h4>
          <p>${meal.details}</p>
          <button class="remove-favorite-btn meal-action-btn" data-meal-id="${meal.id}">Remove from Favorites</button>
        </div>
      </div>
    `).join('');

    favoritesDiv.querySelectorAll('.remove-favorite-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mealId = parseInt(btn.dataset.mealId);
        const meal = favorites.find(m => m.id === mealId);
        await toggleMealFavorite(meal);
      });
    });
  } catch (err) {
    document.getElementById('favoritesList').innerHTML = '<p>Error loading favorites.</p>';
  }
}

// ==== UTILITY FUNCTIONS ====
function truncateText(text, maxLength) {
  return text?.length > maxLength ? text.substring(0, maxLength) + '...' : text || '';
}

function formatInstructionsNumbered(instructions) {
  if (!instructions) return '<li>No instructions available</li>';
  return instructions
    .replace(/<[^>]*>/g, '')
    .split(/\.\s+|\n+/)
    .filter(step => step.trim().length > 5)
    .map(step => `<li>${step.trim()}${!step.endsWith('.') ? '.' : ''}</li>`)
    .join('');
}

function getSunnahBlessing() {
  const blessings = [
    "🍯 'And your Lord inspired the bees: Make hives in the mountains, trees, and in what they build. Then eat from all the fruits, and follow the ways of your Lord made easy for you.' - Quran 16:68-69",
    "🌿 'The Prophet (ﷺ) said: There is no disease that Allah has created, except that He also has created its treatment.' - Sahih al-Bukhari",
    "🫒 'Eat olive oil and use it on your skin, for it is from a blessed tree.' - Tirmidhi",
    "🍇 'The Prophet (ﷺ) loved grapes and melons.' - Sahih al-Bukhari",
    "🌾 'The Prophet (ﷺ) said: How excellent is the vinegar as a condiment!' - Muslim",
    "🥛 'Whoever is given milk by Allah, let him say: O Allah, bless it for us and give us more of it.' - Tirmidhi"
  ];
  return `<div class="sunnah-blessing"><p>${blessings[Math.floor(Math.random() * blessings.length)]}</p></div>`;
}

// ==== INITIALIZE APP ====
window.addEventListener('DOMContentLoaded', init);
window.closeRecipeModal = closeRecipeModal;