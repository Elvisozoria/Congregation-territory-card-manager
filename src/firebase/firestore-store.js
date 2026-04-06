import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';

export async function createFirestoreStore(user, congregationId) {
  let listeners = [];
  let unsubTerritories = null;
  let unsubHistory = null;
  let territories = [];
  let history = [];
  let defaultCenter = [0, 0];

  const terrCol = collection(db, 'congregations', congregationId, 'territories');
  const histCol = collection(db, 'congregations', congregationId, 'history');

  // Load initial data
  const terrSnap = await getDocs(terrCol);
  territories = terrSnap.docs.map(function (d) {
    return { id: d.id, ...d.data() };
  });

  const histSnap = await getDocs(histCol);
  history = histSnap.docs.map(function (d) {
    return { id: d.id, ...d.data() };
  });

  // Set up real-time listeners
  unsubTerritories = onSnapshot(terrCol, function (snap) {
    territories = snap.docs.map(function (d) {
      return { id: d.id, ...d.data() };
    });
    notify();
  });

  unsubHistory = onSnapshot(histCol, function (snap) {
    history = snap.docs.map(function (d) {
      return { id: d.id, ...d.data() };
    });
    notify();
  });

  function notify() {
    listeners.forEach(function (fn) { fn(); });
  }

  function normalizeTerritoryForWrite(attrs) {
    const obj = {};
    if (attrs.number !== undefined) obj.number = attrs.number;
    if (attrs.name !== undefined) obj.name = attrs.name;
    if (attrs.group_name !== undefined) obj.group_name = attrs.group_name;
    if (attrs.polygon !== undefined) obj.polygon = attrs.polygon;
    if (attrs.qr_url !== undefined) obj.qr_url = attrs.qr_url;
    if (attrs.landmarks !== undefined) obj.landmarks = attrs.landmarks;
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
      // Not applicable in online mode — no-op
    },

    getAll() {
      return territories;
    },

    getById(id) {
      return territories.find(function (t) { return t.id === id; }) || null;
    },

    async createTerritory(attrs) {
      const data = {
        number: attrs.number || '',
        name: attrs.name || '',
        group_name: attrs.group_name || '',
        polygon: attrs.polygon || [],
        qr_url: attrs.qr_url || '',
        landmarks: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(terrCol, data);
      const territory = { id: ref.id, ...data };
      return territory;
    },

    async updateTerritory(id, attrs) {
      const ref = doc(db, 'congregations', congregationId, 'territories', id);
      const updates = normalizeTerritoryForWrite(attrs);
      updates.updatedAt = serverTimestamp();
      await updateDoc(ref, updates);
      return this.getById(id);
    },

    async deleteTerritory(id) {
      const ref = doc(db, 'congregations', congregationId, 'territories', id);
      await deleteDoc(ref);
      // Also delete associated history
      const histEntries = history.filter(function (h) { return h.territoryId === id; });
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
        lat: attrs.lat,
        lng: attrs.lng,
        color: attrs.color || '#3B82F6'
      };
      const updatedLandmarks = [...(territory.landmarks || []), landmark];
      const ref = doc(db, 'congregations', congregationId, 'territories', territoryId);
      await updateDoc(ref, { landmarks: updatedLandmarks });
      return landmark;
    },

    async deleteLandmark(territoryId, landmarkId) {
      const territory = this.getById(territoryId);
      if (!territory) return;
      const updatedLandmarks = (territory.landmarks || []).filter(function (l) {
        return l.id !== landmarkId && String(l.id) !== String(landmarkId);
      });
      const ref = doc(db, 'congregations', congregationId, 'territories', territoryId);
      await updateDoc(ref, { landmarks: updatedLandmarks });
    },

    // --- History ---

    getAllHistory() {
      return history;
    },

    getHistoryForTerritory(territoryId) {
      return history
        .filter(function (h) { return h.territoryId === territoryId; })
        .sort(function (a, b) { return (b.startDate || '').localeCompare(a.startDate || ''); });
    },

    async addHistoryEntry(entry) {
      const data = {
        territoryId: entry.territoryId,
        startDate: entry.startDate || '',
        endDate: entry.endDate || null,
        person: entry.person || '',
        notes: entry.notes || '',
        createdBy: user.uid,
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(histCol, data);
      return { id: ref.id, ...data };
    },

    async updateHistoryEntry(id, attrs) {
      const ref = doc(db, 'congregations', congregationId, 'history', id);
      const updates = {};
      if (attrs.startDate !== undefined) updates.startDate = attrs.startDate;
      if (attrs.endDate !== undefined) updates.endDate = attrs.endDate;
      if (attrs.person !== undefined) updates.person = attrs.person;
      if (attrs.notes !== undefined) updates.notes = attrs.notes;
      await updateDoc(ref, updates);
      return history.find(function (h) { return h.id === id; });
    },

    async deleteHistoryEntry(id) {
      const ref = doc(db, 'congregations', congregationId, 'history', id);
      await deleteDoc(ref);
    },

    // --- File operations (limited in online mode) ---

    loadFromFile() {
      return Promise.reject(new Error('Use import in offline mode'));
    },

    saveToFile() {
      // Export current data as JSON for backup
      const data = { territories, history };
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
      // No-op in online mode — too dangerous
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

    // Cleanup real-time listeners
    destroy() {
      if (unsubTerritories) unsubTerritories();
      if (unsubHistory) unsubHistory();
      listeners = [];
    }
  };
}
