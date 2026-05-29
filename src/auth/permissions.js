// Roles: 'admin' | 'conductor' | 'publisher'
// profile == null → offline mode (sin restricciones) o visitante anónimo (con flag isAnonymous)

export const ROLES = {
  ADMIN: 'admin',
  CONDUCTOR: 'conductor',
  PUBLISHER: 'publisher'
};

function isOffline(profile) {
  return !profile;
}

function isAnonymous(profile) {
  return profile && profile.isAnonymous === true;
}

function roleOf(profile) {
  if (!profile) return null;
  return profile.role;
}

// --- Congregación / usuarios ---

export function canManageUsers(profile) {
  if (isOffline(profile) || isAnonymous(profile)) return false;
  return roleOf(profile) === ROLES.ADMIN;
}

export function canEditCongregation(profile) {
  if (isOffline(profile) || isAnonymous(profile)) return false;
  return roleOf(profile) === ROLES.ADMIN;
}

// --- Territorios: lista ---

export function canViewAllTerritories(profile) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile)) return false;
  const role = roleOf(profile);
  return role === ROLES.ADMIN || role === ROLES.CONDUCTOR;
}

// --- Territorios: detalle ---
// activeAssignment = history entry { assignedToUid, status, type } o null

export function canViewTerritory(profile, _territory, activeAssignment) {
  if (isOffline(profile)) return true;
  // Visitante anónimo solo entra por link público (otra ruta)
  if (isAnonymous(profile)) return false;
  const role = roleOf(profile);
  if (role === ROLES.ADMIN || role === ROLES.CONDUCTOR) return true;
  if (role === ROLES.PUBLISHER) {
    return !!(activeAssignment && activeAssignment.assignedToUid === profile.uid);
  }
  return false;
}

export function canCreateTerritory(profile) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile)) return false;
  return roleOf(profile) === ROLES.ADMIN;
}

export function canEditTerritory(profile) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile)) return false;
  return roleOf(profile) === ROLES.ADMIN;
}

export function canDeleteTerritory(profile) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile)) return false;
  return roleOf(profile) === ROLES.ADMIN;
}

export function canEditTerritoryNotes(profile) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile)) return false;
  return roleOf(profile) === ROLES.ADMIN;
}

// --- Landmarks / manzanas ---

export function canEditLandmarks(profile) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile)) return false;
  return roleOf(profile) === ROLES.ADMIN;
}

export function canEditBlocks(profile) {
  return canEditLandmarks(profile);
}

// --- Asignaciones / historial ---

export function canAssignTerritory(profile) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile)) return false;
  return roleOf(profile) === ROLES.ADMIN;
}

export function canViewFullHistory(profile) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile)) return false;
  const role = roleOf(profile);
  return role === ROLES.ADMIN || role === ROLES.CONDUCTOR;
}

export function canCompleteAssignment(profile, entry) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile) || !entry) return false;
  const role = roleOf(profile);
  if (role === ROLES.ADMIN) return true;
  if (role === ROLES.CONDUCTOR || role === ROLES.PUBLISHER) {
    return entry.assignedToUid === profile.uid;
  }
  return false;
}

export function canEditHistoryEntry(profile, entry) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile) || !entry) return false;
  const role = roleOf(profile);
  if (role === ROLES.ADMIN) return true;
  // Conductor/publisher solo pueden editar sus propias entradas
  return entry.assignedToUid === profile.uid || entry.createdBy === profile.uid;
}

export function canDeleteHistoryEntry(profile, entry) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile) || !entry) return false;
  return roleOf(profile) === ROLES.ADMIN;
}

// --- Tarjetas / impresión ---

export function canViewPrintAll(profile) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile)) return false;
  const role = roleOf(profile);
  return role === ROLES.ADMIN || role === ROLES.CONDUCTOR;
}

export function canEditCardZoom(profile) {
  if (isOffline(profile)) return true;
  if (isAnonymous(profile)) return false;
  const role = roleOf(profile);
  return role === ROLES.ADMIN || role === ROLES.CONDUCTOR;
}
