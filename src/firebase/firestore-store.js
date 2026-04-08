import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';

export async function createFirestoreStore(user, congregationId) {
  let listeners = [];
  let unsubTerritories = null;
  let unsubHistory = null;
  let unsubGlobalLandmarks = null;
  let territories = [];
  let history = [];
  let globalLandmarks = [];
  let defaultCenter = [0, 0];

  const terrCol = collection(db, 'congregations', congregationId, 'territories');
  const histCol = collection(db, 'congregations', congregationId, 'history');
  const glCol = collection(db, 'congregations', congregationId, 'globalLandmarks');

  // Load initial data
  const [terrSnap, histSnap, glSnap] = await Promise.all([
    getDocs(terrCol), getDocs(histCol), getDocs(glCol)
  ]);
  territories = terrSnap.docs.map(function (d) { return territoryFromFirestore({ id: d.id, ...d.data() }); });
  history = histSnap.docs.map(function (d) { return { id: d.id, ...d.data() }; });
  globalLandmarks = glSnap.docs.map(function (d) { return { id: d.id, ...d.data() }; });

  // Set up real-time listeners
  unsubTerritories = onSnapshot(terrCol, function (snap) {
    territories = snap.docs.map(function (d) { return territoryFromFirestore({ id: d.id, ...d.data() }); });
    notify();
  });

  unsubHistory = onSnapshot(histCol, function (snap) {
    history = snap.docs.map(function (d) { return { id: d.id, ...d.data() }; });
    notify();
  });

  unsubGlobalLandmarks = onSnapshot(glCol, function (snap) {
    globalLandmarks = snap.docs.map(function (d) { return { id: d.id, ...d.data() }; });
    notify();
  });

  function notify() {
    listeners.forEach(function (fn) { fn(); });
  }

  // Firestore doesn't support nested arrays. Convert polygon [[lng,lat],...] to [{lng,lat},...]
  function polygonToFirestore(polygon) {
    if (!polygon || !Array.isArray(polygon)) return [];
    return polygon.map(function (coord) {
      if (Array.isArray(coord)) return { lng: coord[0], lat: coord[1] };
      return coord; // already an object
    });
  }

  function polygonFromFirestore(polygon) {
    if (!polygon || !Array.isArray(polygon)) return [];
    return polygon.map(function (coord) {
      if (Array.isArray(coord)) return coord; // already an array
      return [coord.lng, coord.lat];
    });
  }

  function territoryFromFirestore(docData) {
    const t = { ...docData };
    t.polygon = polygonFromFirestore(t.polygon);
    // blocks may also have polygon arrays (legacy) — but now they're points, just ensure format
    return t;
  }

  function normalizeTerritoryForWrite(attrs) {
    const obj = {};
    if (attrs.number !== undefined) obj.number = attrs.number;
    if (attrs.name !== undefined) obj.name = attrs.name;
    if (attrs.group_name !== undefined) obj.group_name = attrs.group_name;
    if (attrs.polygon !== undefined) obj.polygon = polygonToFirestore(attrs.polygon);
    if (attrs.qr_url !== undefined) obj.qr_url = attrs.qr_url;
    if (attrs.notes !== undefined) obj.notes = attrs.notes;
    if (attrs.landmarks !== undefined) obj.landmarks = attrs.landmarks;
    if (attrs.blocks !== undefined) obj.blocks = attrs.blocks;
    return obj;
  }

  return {
    onChange(fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (f) { return f !== fn; });
      };
    },

    loadSample() {
      // No-op in online mode
    },

    getAll() {
      return territories;
    },

    getById(id) {
      return territories.find(function (t) { return t.id === id || String(t.id) === String(id); }) || null;
    },

    async createTerritory(attrs) {
      const data = {
        number: attrs.number || '',
        name: attrs.name || '',
        group_name: attrs.group_name || '',
        polygon: polygonToFirestore(attrs.polygon || []),
        qr_url: attrs.qr_url || '',
        notes: attrs.notes || '',
        landmarks: attrs.landmarks || [],
        blocks: attrs.blocks || [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(terrCol, data);
      return { id: ref.id, ...data };
    },

    async updateTerritory(id, attrs) {
      const ref = doc(db, 'congregations', congregationId, 'territories', String(id));
      const updates = normalizeTerritoryForWrite(attrs);
      updates.updatedAt = serverTimestamp();
      await updateDoc(ref, updates);
      return this.getById(id);
    },

    async deleteTerritory(id) {
      const ref = doc(db, 'congregations', congregationId, 'territories', String(id));
      await deleteDoc(ref);
      const histEntries = history.filter(function (h) { return h.territoryId === id || String(h.territoryId) === String(id); });
      for (const entry of histEntries) {
        await deleteDoc(doc(db, 'congregations', congregationId, 'history', entry.id));
      }
    },

    async addLandmark(territoryId, attrs) {
      const territory = this.getById(territoryId);
      if (!territory) return null;
      const landmark = {
        id: Date.now().toString(),
        name: attrs.name,
        description: attrs.description || '',
        lat: attrs.lat,
        lng: attrs.lng,
        color: attrs.color || '#3B82F6'
      };
      const updatedLandmarks = [...(territory.landmarks || []), landmark];
      const ref = doc(db, 'congregations', congregationId, 'territories', String(territoryId));
      await updateDoc(ref, { landmarks: updatedLandmarks });
      return landmark;
    },

    async deleteLandmark(territoryId, landmarkId) {
      const territory = this.getById(territoryId);
      if (!territory) return;
      const updatedLandmarks = (territory.landmarks || []).filter(function (l) {
        return l.id !== landmarkId && String(l.id) !== String(landmarkId);
      });
      const ref = doc(db, 'congregations', congregationId, 'territories', String(territoryId));
      await updateDoc(ref, { landmarks: updatedLandmarks });
    },

    // --- Blocks (manzanas) ---

    async addBlock(territoryId, attrs) {
      const territory = this.getById(territoryId);
      if (!territory) return null;
      const block = {
        id: Date.now().toString(),
        number: attrs.number || '',
        lat: attrs.lat,
        lng: attrs.lng
      };
      const updatedBlocks = [...(territory.blocks || []), block];
      const ref = doc(db, 'congregations', congregationId, 'territories', String(territoryId));
      await updateDoc(ref, { blocks: updatedBlocks });
      return block;
    },

    async deleteBlock(territoryId, blockId) {
      const territory = this.getById(territoryId);
      if (!territory) return;
      const updatedBlocks = (territory.blocks || []).filter(function (b) {
        return b.id !== blockId && String(b.id) !== String(blockId);
      });
      const ref = doc(db, 'congregations', congregationId, 'territories', String(territoryId));
      await updateDoc(ref, { blocks: updatedBlocks });
    },

    // --- Global Landmarks ---

    getGlobalLandmarks() {
      return globalLandmarks;
    },

    async addGlobalLandmark(attrs) {
      const data = {
        name: attrs.name,
        description: attrs.description || '',
        lat: attrs.lat,
        lng: attrs.lng,
        color: attrs.color || '#9CA3AF',
        createdBy: user.uid,
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(glCol, data);
      return { id: ref.id, ...data };
    },

    async deleteGlobalLandmark(id) {
      const ref = doc(db, 'congregations', congregationId, 'globalLandmarks', String(id));
      await deleteDoc(ref);
    },

    // --- History ---

    getAllHistory() {
      return history;
    },

    getHistoryForTerritory(territoryId) {
      return history
        .filter(function (h) { return h.territoryId === territoryId || String(h.territoryId) === String(territoryId); })
        .sort(function (a, b) { return (b.startDate || '').localeCompare(a.startDate || ''); });
    },

    getActiveAssignment(territoryId) {
      return history.find(function (h) {
        return (h.territoryId === territoryId || String(h.territoryId) === String(territoryId))
          && (h.type === 'assignment' || !h.type) && h.status === 'active';
      }) || null;
    },

    async addHistoryEntry(entry) {
      const data = {
        territoryId: entry.territoryId,
        startDate: entry.startDate || '',
        endDate: entry.endDate || null,
        person: entry.person || '',
        notes: entry.notes || '',
        type: entry.type || 'assignment',
        status: entry.status || 'active',
        createdBy: user.uid,
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(histCol, data);
      return { id: ref.id, ...data };
    },

    async updateHistoryEntry(id, attrs) {
      const ref = doc(db, 'congregations', congregationId, 'history', String(id));
      const updates = {};
      if (attrs.startDate !== undefined) updates.startDate = attrs.startDate;
      if (attrs.endDate !== undefined) updates.endDate = attrs.endDate;
      if (attrs.person !== undefined) updates.person = attrs.person;
      if (attrs.notes !== undefined) updates.notes = attrs.notes;
      if (attrs.type !== undefined) updates.type = attrs.type;
      if (attrs.status !== undefined) updates.status = attrs.status;
      await updateDoc(ref, updates);
      return history.find(function (h) { return h.id === id; });
    },

    async deleteHistoryEntry(id) {
      const ref = doc(db, 'congregations', congregationId, 'history', String(id));
      await deleteDoc(ref);
    },

    // --- File operations ---

    loadFromFile() {
      return Promise.reject(new Error('Use import in offline mode'));
    },

    saveToFile() {
      const data = { territories, history, globalLandmarks };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'territories-backup.json';
      link.href = url;
      link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    },

    importKML() {
      return Promise.reject(new Error('KML import not supported in online mode yet'));
    },

    reset() {
      // No-op in online mode
    },

    googleMapsUrl(territory) {
      if (!territory.polygon || territory.polygon.length === 0) return '';
      const lngs = territory.polygon.map(function (c) { return c[0]; });
      const lats = territory.polygon.map(function (c) { return c[1]; });
      const lat = lats.reduce(function (a, b) { return a + b; }, 0) / lats.length;
      const lng = lngs.reduce(function (a, b) { return a + b; }, 0) / lngs.length;
      return 'https://www.google.com/maps/@' + lat + ',' + lng + ',17z';
    },

    setDefaultCenter(lat, lng) {
      defaultCenter = [lat, lng];
    },

    getDefaultCenter() {
      return defaultCenter;
    },

    destroy() {
      if (unsubTerritories) unsubTerritories();
      if (unsubHistory) unsubHistory();
      if (unsubGlobalLandmarks) unsubGlobalLandmarks();
      listeners = [];
    }
  };
}
