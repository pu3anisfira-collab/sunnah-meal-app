// Exposed API methods
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  search: (ingredient) => ipcRenderer.invoke('fetch-recipes', ingredient),
  getRecipeDetails: (recipeId) => ipcRenderer.invoke('fetch-recipe-details', recipeId),
  getMeals: () => ipcRenderer.invoke('read-meals'),
  addMeal: (meal) => ipcRenderer.invoke('add-meal', meal),
  deleteMeal: (id) => ipcRenderer.invoke('delete-meal', id),
  updateMeal: (id, updates) => ipcRenderer.invoke('update-meal', id, updates),
  getFavorites: () => ipcRenderer.invoke('get-favorites'), 
  toggleFavorite: (recipe) => ipcRenderer.invoke('toggle-favorite', recipe), 
});