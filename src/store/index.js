import { createLocalStore } from './local-store.js';

let currentStore = null;
let currentUserProfile = null;
let storeReadyCallbacks = [];
let storeReady = false;

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

export function getUserProfile() {
  return currentUserProfile;
}

export function setUserProfile(profile) {
  currentUserProfile = profile;
}

export function isStoreReady() {
  return storeReady;
}

export function onStoreReady(fn) {
  if (storeReady) {
    fn();
  } else {
    storeReadyCallbacks.push(fn);
  }
}

function notifyStoreReady() {
  storeReady = true;
  storeReadyCallbacks.forEach(function (fn) { fn(); });
  storeReadyCallbacks = [];
}

export async function initStore() {
  // Reset ready state for re-initialization (e.g., after login)
  storeReady = false;
  const mode = getMode();

  if (mode === 'online') {
    try {
      const { onAuthChange, getCurrentUserProfile } = await import('../firebase/auth.js');
      const { createFirestoreStore } = await import('../firebase/firestore-store.js');

      return new Promise(function (resolve) {
        onAuthChange(async function (user) {
          if (user) {
            try {
              // Check for pending invite first
              const { checkAndApplyInvite } = await import('../firebase/auth.js');
              await checkAndApplyInvite();

              const profile = await getCurrentUserProfile();
              if (profile && profile.congregationId) {
                currentUserProfile = profile;
                if (currentStore && currentStore.destroy) currentStore.destroy();
                currentStore = await createFirestoreStore(user, profile.congregationId);
              } else {
                // User is authenticated but has no profile yet (needs registration)
                currentUserProfile = { uid: user.uid, needsRegistration: true, email: user.email, displayName: user.displayName };
              }
            } catch (err) {
              console.error('Failed to init Firestore store:', err);
              currentUserProfile = { uid: user.uid, needsRegistration: true, email: user.email, displayName: user.displayName };
            }
          } else {
            currentUserProfile = null;
            if (currentStore && currentStore.destroy) currentStore.destroy();
            currentStore = null;
          }
          if (!storeReady) {
            notifyStoreReady();
            resolve();
          }
        });
      });
    } catch (err) {
      console.error('Failed to load Firebase:', err);
      currentStore = createLocalStore();
      notifyStoreReady();
    }
  } else {
    currentStore = createLocalStore();
    notifyStoreReady();
  }
}

export async function migrateLocalToCloud() {
  const localStore = createLocalStore();
  const territories = localStore.getAll();
  const historyEntries = localStore.getAllHistory();
  const localGlobals = localStore.getGlobalLandmarks();
  const cloudStore = getStore();

  const idMap = {};

  for (const t of territories) {
    const { id, ...attrs } = t;
    const created = await cloudStore.createTerritory(attrs);
    idMap[id] = created.id;
  }

  for (const h of historyEntries) {
    const newTerritoryId = idMap[h.territoryId] || h.territoryId;
    await cloudStore.addHistoryEntry({
      territoryId: newTerritoryId,
      startDate: h.startDate,
      endDate: h.endDate,
      person: h.person,
      notes: h.notes,
      type: h.type || 'assignment',
      status: h.status || 'active'
    });
  }

  for (const gl of localGlobals) {
    await cloudStore.addGlobalLandmark({
      name: gl.name,
      description: gl.description || '',
      lat: gl.lat,
      lng: gl.lng,
      color: gl.color
    });
  }

  localStore.reset();

  return { territories: territories.length, history: historyEntries.length, globalLandmarks: localGlobals.length };
}
