import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchAuthOnce } from '../src/store/index.js';

// Doble del observador de sesión de Firebase: guarda los suscriptores vivos y
// permite disparar un cambio de sesión a mano.
function fakeAuth() {
  const subs = [];
  function subscribe(cb) {
    const entry = { cb, alive: true };
    subs.push(entry);
    return function () { entry.alive = false; };
  }
  async function emit(user) {
    for (const s of subs) {
      if (s.alive) await s.cb(user);
    }
  }
  return { subscribe, emit, alive: () => subs.filter((s) => s.alive).length };
}

test('la primera espera se resuelve al llegar la sesión', async () => {
  const auth = fakeAuth();
  let visto = null;
  const p = watchAuthOnce(auth.subscribe, async (u) => { visto = u; });
  await auth.emit({ uid: 'u1' });
  await p;
  assert.deepEqual(visto, { uid: 'u1' });
});

// Este es el fallo que se vio al cerrar sesión y volver a entrar: quedaban dos
// observadores vivos y la segunda espera no se resolvía nunca.
test('una segunda llamada suelta el observador anterior', async () => {
  const auth = fakeAuth();
  const p1 = watchAuthOnce(auth.subscribe, async () => {});
  await auth.emit({ uid: 'u1' });
  await p1;

  const p2 = watchAuthOnce(auth.subscribe, async () => {});
  assert.equal(auth.alive(), 1, 'solo debe quedar un observador vivo');
  await auth.emit({ uid: 'u2' });
  await p2;
});

test('la segunda espera se resuelve aunque la primera ya lo hubiera hecho', async () => {
  const auth = fakeAuth();
  await (async () => {
    const p = watchAuthOnce(auth.subscribe, async () => {});
    await auth.emit({ uid: 'u1' });
    await p;
  })();

  let resuelta = false;
  const p2 = watchAuthOnce(auth.subscribe, async () => {});
  p2.then(() => { resuelta = true; });
  await auth.emit({ uid: 'u1' });
  await p2;
  assert.equal(resuelta, true);
});

test('se resuelve aunque el manejador falle, para no dejar la pantalla colgada', async () => {
  const auth = fakeAuth();
  const p = watchAuthOnce(auth.subscribe, async () => { throw new Error('firestore caido'); });
  await assert.rejects(() => auth.emit({ uid: 'u1' }));
  await p;
});

test('varios cambios de sesión no vuelven a resolver la misma espera', async () => {
  const auth = fakeAuth();
  let veces = 0;
  const p = watchAuthOnce(auth.subscribe, async () => { veces += 1; });
  await auth.emit({ uid: 'u1' });
  await auth.emit(null);
  await p;
  assert.equal(veces, 2, 'el manejador sigue corriendo en cada cambio');
});
