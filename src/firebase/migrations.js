import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './config.js';

// Migra usuarios con role=='member' (esquema viejo) a role=='conductor'.
// Solo afecta usuarios de la congregación del admin que ejecuta.
export async function migrateMembersToConductors(congregationId) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef,
    where('congregationId', '==', congregationId),
    where('role', '==', 'member')
  );
  const snap = await getDocs(q);

  let updated = 0;
  for (const d of snap.docs) {
    await updateDoc(doc(db, 'users', d.id), { role: 'conductor' });
    updated++;
  }
  return { updated };
}

// Normaliza role legado para runtime: 'member' → 'conductor'.
export function normalizeRole(role) {
  if (role === 'member') return 'conductor';
  return role || 'conductor';
}
