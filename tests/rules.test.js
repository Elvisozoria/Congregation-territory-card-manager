/**
 * Pruebas de las reglas de seguridad contra el emulador de Firestore.
 *
 * Se centran en lo unico que de verdad importa aqui: que un usuario pueda
 * llevar varias congregaciones sin poder colarse en una que no es suya.
 *
 * Se ejecutan con:  npm run test:rules
 * (arranca el emulador; sin el, node --test las salta)
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const JARDINES = 'cong-jardines';
const CUMBRE = 'cong-cumbre';
const AJENA = 'cong-ajena';
const ELVIS = 'uid-elvis';
const OTRO = 'uid-otro';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'territory-rules-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080
    }
  });
});

after(async () => {
  if (env) await env.cleanup();
});

async function seed(profile) {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'congregations', JARDINES), { name: 'Jardines del Rey', createdBy: ELVIS });
    await setDoc(doc(db, 'congregations', CUMBRE), { name: 'La Cumbre', createdBy: ELVIS });
    await setDoc(doc(db, 'congregations', AJENA), { name: 'Ajena', createdBy: OTRO });
    await setDoc(doc(db, 'users', ELVIS), profile);
  });
  return env.authenticatedContext(ELVIS).firestore();
}

const conDos = {
  email: 'e@example.com', displayName: 'Elvis',
  congregationId: JARDINES, role: 'admin',
  memberships: { [JARDINES]: 'admin', [CUMBRE]: 'admin' }
};

describe('multi-congregación', () => {
  test('rellena memberships la primera vez con la congregación que ya tenía', async () => {
    const db = await seed({ congregationId: JARDINES, role: 'admin' });
    await assertSucceeds(updateDoc(doc(db, 'users', ELVIS), {
      memberships: { [JARDINES]: 'admin' }
    }));
  });

  test('el relleno no puede inventar un rol distinto del que tenía', async () => {
    const db = await seed({ congregationId: JARDINES, role: 'publisher' });
    await assertFails(updateDoc(doc(db, 'users', ELVIS), {
      memberships: { [JARDINES]: 'admin' }
    }));
  });

  test('el relleno no puede colar una congregación ajena', async () => {
    const db = await seed({ congregationId: JARDINES, role: 'admin' });
    await assertFails(updateDoc(doc(db, 'users', ELVIS), {
      memberships: { [JARDINES]: 'admin', [AJENA]: 'admin' }
    }));
  });

  test('cambia entre las congregaciones que son suyas', async () => {
    const db = await seed(conDos);
    await assertSucceeds(updateDoc(doc(db, 'users', ELVIS), {
      congregationId: CUMBRE, role: 'admin'
    }));
  });

  test('no puede activar una congregación que no está en sus membresías', async () => {
    const db = await seed(conDos);
    await assertFails(updateDoc(doc(db, 'users', ELVIS), {
      congregationId: AJENA, role: 'admin'
    }));
  });

  test('no puede subirse de rol al cambiar de congregación', async () => {
    const db = await seed({
      congregationId: JARDINES, role: 'admin',
      memberships: { [JARDINES]: 'admin', [CUMBRE]: 'publisher' }
    });
    await assertFails(updateDoc(doc(db, 'users', ELVIS), {
      congregationId: CUMBRE, role: 'admin'
    }));
    const db2 = await seed({
      congregationId: JARDINES, role: 'admin',
      memberships: { [JARDINES]: 'admin', [CUMBRE]: 'publisher' }
    });
    await assertSucceeds(updateDoc(doc(db2, 'users', ELVIS), {
      congregationId: CUMBRE, role: 'publisher'
    }));
  });

  test('añade la congregación que acaba de crear y la activa', async () => {
    const db = await seed({
      congregationId: JARDINES, role: 'admin',
      memberships: { [JARDINES]: 'admin' }
    });
    await assertSucceeds(updateDoc(doc(db, 'users', ELVIS), {
      memberships: { [JARDINES]: 'admin', [CUMBRE]: 'admin' },
      congregationId: CUMBRE,
      role: 'admin'
    }));
  });

  test('no puede añadirse a una congregación que creó otra persona', async () => {
    const db = await seed({
      congregationId: JARDINES, role: 'admin',
      memberships: { [JARDINES]: 'admin' }
    });
    await assertFails(updateDoc(doc(db, 'users', ELVIS), {
      memberships: { [JARDINES]: 'admin', [AJENA]: 'admin' },
      congregationId: AJENA,
      role: 'admin'
    }));
  });

  test('no puede cambiar su rol en una congregación mientras añade otra', async () => {
    const db = await seed({
      congregationId: JARDINES, role: 'publisher',
      memberships: { [JARDINES]: 'publisher' }
    });
    await assertFails(updateDoc(doc(db, 'users', ELVIS), {
      memberships: { [JARDINES]: 'admin', [CUMBRE]: 'admin' },
      congregationId: CUMBRE,
      role: 'admin'
    }));
  });

  test('no puede ascenderse a admin en la congregación activa', async () => {
    const db = await seed({
      congregationId: JARDINES, role: 'publisher',
      memberships: { [JARDINES]: 'publisher' }
    });
    await assertFails(updateDoc(doc(db, 'users', ELVIS), { role: 'admin' }));
  });

  test('sigue pudiendo editar su nombre sin tocar nada más', async () => {
    const db = await seed(conDos);
    await assertSucceeds(updateDoc(doc(db, 'users', ELVIS), { displayName: 'Elvis O.' }));
  });
});

describe('territorios de la congregación activa', () => {
  test('lee los de la congregación activa y no los de la otra', async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'congregations', JARDINES), { name: 'Jardines', createdBy: ELVIS });
      await setDoc(doc(db, 'congregations', AJENA), { name: 'Ajena', createdBy: OTRO });
      await setDoc(doc(db, 'congregations', JARDINES, 'territories', 't1'), { number: '1' });
      await setDoc(doc(db, 'congregations', AJENA, 'territories', 't1'), { number: '1' });
      await setDoc(doc(db, 'users', ELVIS), {
        congregationId: JARDINES, role: 'admin',
        memberships: { [JARDINES]: 'admin' }
      });
    });
    const db = env.authenticatedContext(ELVIS).firestore();
    await assertSucceeds(getDoc(doc(db, 'congregations', JARDINES, 'territories', 't1')));
    await assertFails(getDoc(doc(db, 'congregations', AJENA, 'territories', 't1')));
  });
});
