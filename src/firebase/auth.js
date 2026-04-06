import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, firebaseConfig } from './config.js';

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
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
  return { uid: user.uid, ...snap.data() };
}

export async function registerCongregation(email, password, displayName, congregationName) {
  // Create auth user
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });

  // Create congregation document
  const { doc: docRef, collection, addDoc } = await import('firebase/firestore');
  const congRef = await addDoc(collection(db, 'congregations'), {
    name: congregationName,
    createdBy: cred.user.uid,
    createdAt: serverTimestamp()
  });

  // Create user profile
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    displayName,
    congregationId: congRef.id,
    role: 'admin',
    mustChangePassword: false,
    createdAt: serverTimestamp()
  });

  return { uid: cred.user.uid, congregationId: congRef.id };
}

export async function createUserAsAdmin(email, tempPassword, displayName, congregationId, role) {
  // Use a secondary app instance to avoid signing out the admin
  const secondaryApp = initializeApp(firebaseConfig, 'secondary-' + Date.now());
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);

    // Write user profile using the main app's Firestore (admin is still signed in)
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      displayName,
      congregationId,
      role: role || 'member',
      mustChangePassword: true,
      createdAt: serverTimestamp()
    });

    // Sign out of secondary and clean up
    await firebaseSignOut(secondaryAuth);
    await deleteApp(secondaryApp);

    return { uid: cred.user.uid, tempPassword };
  } catch (err) {
    // Clean up on error
    try {
      await firebaseSignOut(secondaryAuth);
      await deleteApp(secondaryApp);
    } catch (e) { /* ignore cleanup errors */ }
    throw err;
  }
}

export async function changePassword(newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await updatePassword(user, newPassword);
  // Clear the mustChangePassword flag
  await setDoc(doc(db, 'users', user.uid), { mustChangePassword: false }, { merge: true });
}
