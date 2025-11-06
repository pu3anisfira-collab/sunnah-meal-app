const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
require('dotenv').config();

const API_KEY = process.env.SPOONACULAR_API_KEY;
const dbPath = path.resolve(__dirname, 'db', 'meals.json');

// Ensure database directory exists
async function ensureDbDirectory() {
  const dbDir = path.dirname(dbPath);
  try {
    await fs.access(dbDir);
  } catch {
    await fs.mkdir(dbDir, { recursive: true });
  }
}

// Initialize database file if it doesn't exist
async function initializeDb() {
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, '[]');
  }
}

// ==== CREATE WINDOW ====
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: add an icon
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // win.webContents.openDevTools();
}

app.whenReady().then(async () => {
  await ensureDbDirectory();
  await initializeDb();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ==== HELPER FUNCTION FOR HALAL CHECK ====
function isHalal(recipe) {
  if (!recipe) return false;
  
  const forbidden = [
    'pork', 'bacon', 'ham', 'wine', 'beer', 'alcohol', 
    'lard', 'prosciutto', 'brandy', 'whiskey', 'vodka',
    'rum', 'gin', 'tequila', 'sake', 'champagne', 'cognac'
  ];

  // Check specific fields more carefully
  const fieldsToCheck = [
    recipe.title?.toLowerCase() || '',
    recipe.summary?.toLowerCase() || '',
    recipe.instructions?.toLowerCase() || '',
  ];

  // Check ingredient names more carefully
  const allIngredients = [
    ...(recipe.usedIngredients || []),
    ...(recipe.missedIngredients || []),
    ...(recipe.extendedIngredients || [])
  ];

  const ingredientNames = allIngredients.map(i => i.name?.toLowerCase() || '');
  
  const combinedText = [...fieldsToCheck, ...ingredientNames].join(' ').toLowerCase();
  
  // Check if any forbidden word appears as a whole word 
  return !forbidden.some(haram => {
    const regex = new RegExp(`\\b${haram}\\b`, 'i');
    return regex.test(combinedText);
  });
}

// ==== IPC HANDLERS ====

// Fetch recipes by ingredient
ipcMain.handle('fetch-recipes', async (event, ingredient) => {
  try {
    if (!API_KEY) {
      console.error('Spoonacular API key not found');
      return [];
    }

    const url = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${API_KEY}&ingredients=${encodeURIComponent(ingredient)}&number=10&ranking=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Ensure we return an array
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('API Error fetching recipes:', err);
    
    // Fallback mock data for testing if API fails
    if (ingredient.toLowerCase().includes('date')) {
      return [{
        id: 1,
        title: "Medjool Date Energy Balls",
        image: "https://spoonacular.com/recipeImages/1-312x231.jpg",
        usedIngredients: [
          { name: "dates", amount: 1, unit: "cup" },
          { name: "almonds", amount: 0.5, unit: "cup" }
        ],
        missedIngredients: [
          { name: "coconut", amount: 0.25, unit: "cup" }
        ]
      }];
    }
    
    return [];
  }
});

// Fetch single recipe details
ipcMain.handle('fetch-recipe-details', async (event, recipeId) => {
  try {
    if (!API_KEY) {
      console.error('Spoonacular API key not found');
      return null;
    }

    const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if recipe is halal
    if (!isHalal(data)) {
      console.warn(`Blocked non-halal recipe: ${data.title}`);
      return null;
    }

    return data;
  } 
    catch (err) {
    console.error('Recipe detail fetch error:', err);
    return null;
  }
});

// ==== CRUD HANDLERS ====
ipcMain.handle('read-meals', async () => {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Read meals error:', err);
    return [];
  }
});

// Create handler
ipcMain.handle('add-meal', async (event, meal) => {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    const meals = JSON.parse(data);
    meals.push(meal);
    await fs.writeFile(dbPath, JSON.stringify(meals, null, 2));
    return { success: true };
  } catch (err) {
    console.error('Add meal error:', err);
    return { success: false, error: err.message };
  }
});

// main.js - Delete handler
ipcMain.handle('delete-meal', async (event, mealId) => {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    let meals = JSON.parse(data);
    
    // Convert mealId to number for comparison
    const idToDelete = Number(mealId);
    meals = meals.filter(m => Number(m.id) !== idToDelete);
    
    await fs.writeFile(dbPath, JSON.stringify(meals, null, 2));
    return { success: true };
  } catch (err) {
    console.error('Delete meal error:', err);
    return { success: false, error: err.message };
  }
});

// ==== UPDATED IPC HANDLERS ====

// main.js - Update handler
ipcMain.handle('update-meal', async (event, mealId, updates) => {
  try {
    console.log('Updating meal:', mealId, updates); 
    
    const data = await fs.readFile(dbPath, 'utf8');
    let meals = JSON.parse(data);
    
    // Convert mealId to number for comparison
    const idToUpdate = Number(mealId);
    const mealIndex = meals.findIndex(m => Number(m.id) === idToUpdate);
    
    console.log('Found meal index:', mealIndex); 
    console.log('All meals:', meals); 
    
    if (mealIndex !== -1) {
      meals[mealIndex] = { ...meals[mealIndex], ...updates };
      await fs.writeFile(dbPath, JSON.stringify(meals, null, 2));
      return { success: true };
    }
    
    console.error('Meal not found with ID:', mealId);
    return { success: false, error: 'Meal not found' };
  } catch (err) {
    console.error('Update meal error:', err);
    return { success: false, error: err.message };
  }
});

// Get favorites
ipcMain.handle('get-favorites', async () => {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    const meals = JSON.parse(data);
    return meals.filter(meal => meal.isFavorite);
  } catch (err) {
    console.error('Get favorites error:', err);
    return [];
  }
});

// Toggle favorite - FIXED VERSION
ipcMain.handle('toggle-favorite', async (event, meal) => {
  try {
    console.log('Toggling favorite for meal:', meal); 
    
    const data = await fs.readFile(dbPath, 'utf8');
    let meals = JSON.parse(data);
    
    // Check if meal already exists by recipeId or id
    const existingIndex = meals.findIndex(m => 
      (m.recipeId && m.recipeId === meal.recipeId) || Number(m.id) === Number(meal.id)
    );
    
    console.log('Existing meal index:', existingIndex); 
    
    if (existingIndex !== -1) {
      // Toggle favorite status
      meals[existingIndex].isFavorite = !meals[existingIndex].isFavorite;
      console.log('Toggled favorite status to:', meals[existingIndex].isFavorite); 
    } else {
      // Add new favorite
      meals.push(meal);
      console.log('Added new favorite meal'); 
    }
    
    await fs.writeFile(dbPath, JSON.stringify(meals, null, 2));
    return { success: true };
  } catch (err) {
    console.error('Toggle favorite error:', err);
    return { success: false, error: err.message };
  }
});