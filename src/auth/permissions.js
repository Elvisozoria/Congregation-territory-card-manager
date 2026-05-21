export function canEditTerritory(profile, territory) {
  if (!profile) return true; // offline mode, no restrictions
  if (profile.role === 'admin') return true;
  return territory.assignedTo === profile.uid;
}

export function canDeleteTerritory(profile) {
  if (!profile) return true; // offline mode
  return profile.role === 'admin';
}

export function canManageUsers(profile) {
  if (!profile) return false;
  return profile.role === 'admin';
}
