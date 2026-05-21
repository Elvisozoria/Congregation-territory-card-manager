import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { auth, db } from './config.js';

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
  return { uid: user.uid, ...snap.data() };
}

// Sign in with Google and register a new congregation in one step
export async function registerCongregation(congregationName) {
  const cred = await signInWithPopup(auth, googleProvider);
  const user = cred.user;

  // Check if user already has a profile (returning user)
  const existingProfile = await getDoc(doc(db, 'users', user.uid));
  if (existingProfile.exists()) {
    return { uid: user.uid, congregationId: existingProfile.data().congregationId };
  }

  // Create congregation
  const congRef = await addDoc(collection(db, 'congregations'), {
    name: congregationName,
    createdBy: user.uid,
    createdAt: serverTimestamp()
  });

  // Create user profile
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    displayName: user.displayName || user.email,
    congregationId: congRef.id,
    role: 'admin',
    mustChangePassword: false,
    createdAt: serverTimestamp()
  });

  return { uid: user.uid, congregationId: congRef.id };
}

// Sign in with Google and auto-create profile if first time
export async function signInAndEnsureProfile() {
  const cred = await signInWithPopup(auth, googleProvider);
  const user = cred.user;

  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) {
    // First-time Google user without a congregation — they need to register
    return { uid: user.uid, needsRegistration: true };
  }

  return { uid: user.uid, needsRegistration: false, profile: snap.data() };
}

// Admin invites a member: creates a placeholder profile.
// The invited user signs in with Google, and if their email matches, they join.
export async function inviteMember(email, displayName, congregationId, role) {
  // Store an invite doc that will be matched when the user signs in with Google
  const inviteRef = await addDoc(collection(db, 'invites'), {
    email: email.toLowerCase(),
    displayName,
    congregationId,
    role: role || 'member',
    createdAt: serverTimestamp()
  });

  return { inviteId: inviteRef.id, email };
}

// Check if current Google user has a pending invite and apply it
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

  // Create user profile from invite
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    displayName: inviteData.displayName || user.displayName || user.email,
    congregationId: inviteData.congregationId,
    role: inviteData.role || 'member',
    mustChangePassword: false,
    createdAt: serverTimestamp()
  });

  // Delete the invite
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(invite.ref);

  return inviteData;
}
