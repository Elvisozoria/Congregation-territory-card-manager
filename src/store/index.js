import { createLocalStore } from './local-store.js';

let currentStore = null;

export function getMode() {
  return localStorage.getItem('app-mode'); // 'offline' | 'online' | null
}

export function setMode(mode) {
  localStorage.setItem('app-mode', mode);
}

export function getStore() {
  if (!currentStore) {
    currentStore = createLocalStore();
  }
  return currentStore;
}

export function initStore() {
  const mode = getMode();
  // For now, only local store. Firebase store will be added in Phase 3.
  currentStore = createLocalStore();
  return Promise.resolve();
}
