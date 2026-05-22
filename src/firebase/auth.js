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

export async function registerCongregation(congregationName) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const existingProfile = await getDoc(doc(db, 'users', user.uid));
  if (existingProfile.exists()) {
    return { uid: user.uid, congregationId: existingProfile.data().congregationId };
  }

  const congRef = await addDoc(collection(db, 'congregations'), {
    name: congregationName,
    createdBy: user.uid,
    createdAt: serverTimestamp()
  });

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

  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    displayName: inviteData.displayName || user.displayName || user.email,
    congregationId: inviteData.congregationId,
    role: inviteData.role || 'member',
    mustChangePassword: false,
    createdAt: serverTimestamp()
  });

  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(invite.ref);

  return inviteData;
}
