import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { auth, db } from './config.js';
import { normalizeRole } from './migrations.js';
import { generatePublicId } from '../utils/public-id.js';

const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOut() {
  return firebaseSignOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { uid: user.uid, ...data, role: normalizeRole(data.role) };
}

// Una persona puede llevar los territorios de mas de una congregacion. El
// perfil guarda todas sus membresias en `memberships` ({congregationId: rol}),
// y `congregationId` / `role` son simplemente la ACTIVA. El resto de la app y
// las reglas de seguridad siguen leyendo esos dos campos sin enterarse.

// Los perfiles creados antes de esto solo tienen congregationId y role. Se les
// escribe su membresia actual la primera vez que entran, porque cambiar de
// congregacion exige que la membresia exista.
export async function backfillMemberships() {
  const user = auth.currentUser;
  if (!user) return null;
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.memberships || !data.congregationId) return data.memberships || null;

  const memberships = {};
  memberships[data.congregationId] = normalizeRole(data.role);
  try {
    await updateDoc(ref, { memberships: memberships });
  } catch (e) {
    console.warn('No se pudo escribir memberships:', e);
    return null;
  }
  return memberships;
}

// Congregaciones a las que pertenece el usuario, con su nombre para mostrar.
export async function listMemberships() {
  const user = auth.currentUser;
  if (!user) return [];
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) return [];
  const data = snap.data();
  const memberships = data.memberships || {};
  const ids = Object.keys(memberships);
  if (ids.length === 0 && data.congregationId) ids.push(data.congregationId);

  const out = [];
  for (const id of ids) {
    let name = '';
    try {
      const cong = await getDoc(doc(db, 'congregations', id));
      if (cong.exists()) name = cong.data().name || '';
    } catch (e) { /* sin permiso de lectura: se muestra sin nombre */ }
    out.push({
      congregationId: id,
      name: name,
      role: normalizeRole(memberships[id] || data.role),
      active: id === data.congregationId
    });
  }
  out.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
  return out;
}

// Cambia cual congregacion esta activa. Solo entre las que ya son suyas: las
// reglas rechazan activar una congregacion que no este en memberships.
export async function switchCongregation(congregationId) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('No profile');
  const memberships = snap.data().memberships || {};
  const role = memberships[congregationId];
  if (!role) throw new Error('not-a-member');

  await updateDoc(ref, { congregationId: congregationId, role: normalizeRole(role) });
  return { congregationId: congregationId, role: normalizeRole(role) };
}

export async function registerCongregation(congregationName) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const userRef = doc(db, 'users', user.uid);
  const existingProfile = await getDoc(userRef);

  const congRef = await addDoc(collection(db, 'congregations'), {
    name: congregationName,
    publicId: generatePublicId(),
    createdBy: user.uid,
    createdAt: serverTimestamp()
  });

  if (existingProfile.exists()) {
    // Ya lleva otra congregacion: se le anade esta como admin y pasa a ser la
    // activa. La anterior sigue intacta y puede volver a ella cuando quiera.
    const data = existingProfile.data();
    const memberships = Object.assign({}, data.memberships || {});
    if (!data.memberships && data.congregationId) {
      memberships[data.congregationId] = normalizeRole(data.role);
      await updateDoc(userRef, { memberships: memberships });
    }
    memberships[congRef.id] = 'admin';
    await updateDoc(userRef, {
      memberships: memberships,
      congregationId: congRef.id,
      role: 'admin'
    });
  } else {
    const memberships = {};
    memberships[congRef.id] = 'admin';
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || user.email,
      congregationId: congRef.id,
      role: 'admin',
      memberships: memberships,
      mustChangePassword: false,
      createdAt: serverTimestamp()
    });
  }

  return { uid: user.uid, congregationId: congRef.id };
}

export async function inviteMember(email, displayName, congregationId, role) {
  const inviteRef = await addDoc(collection(db, 'invites'), {
    email: email.toLowerCase(),
    displayName,
    congregationId,
    role: role || 'member',
    createdAt: serverTimestamp()
  });

  return { inviteId: inviteRef.id, email };
}

export async function checkAndApplyInvite() {
  const user = auth.currentUser;
  if (!user || !user.email) return null;

  const { query, where, getDocs } = await import('firebase/firestore');
  const invitesRef = collection(db, 'invites');
  const q = query(invitesRef, where('email', '==', user.email.toLowerCase()));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const invite = snap.docs[0];
  const inviteData = invite.data();

  // Si ya tiene perfil, no se toca: sobrescribirlo le borraria la congregacion
  // que ya lleva. El invite queda sin consumir para que un admin lo resuelva.
  const existing = await getDoc(doc(db, 'users', user.uid));
  if (existing.exists()) {
    console.warn('Invitacion pendiente para un usuario que ya pertenece a una congregacion');
    return null;
  }

  const firstMembership = {};
  firstMembership[inviteData.congregationId] = normalizeRole(inviteData.role);

  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    displayName: inviteData.displayName || user.displayName || user.email,
    congregationId: inviteData.congregationId,
    role: normalizeRole(inviteData.role),
    memberships: firstMembership,
    mustChangePassword: false,
    createdAt: serverTimestamp()
  });

  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(invite.ref);

  return inviteData;
}
