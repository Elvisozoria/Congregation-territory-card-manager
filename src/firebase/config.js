import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA8K-WtUTfPUInsVBj8ANWA5JLgPPzutP4',
  authDomain: 'territory-card-manager.firebaseapp.com',
  projectId: 'territory-card-manager',
  storageBucket: 'territory-card-manager.firebasestorage.app',
  messagingSenderId: '646489945463',
  appId: '1:646489945463:web:f2536c6e0b529edefa1d72'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { firebaseConfig };
