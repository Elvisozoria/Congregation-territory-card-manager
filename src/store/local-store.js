import { parse as parseKml } from '../utils/kml-import.js';

// Demo territories traced along real streets in Centro Histórico, Santiago de los Caballeros
const SAMPLE_DATA = {
  territories: [
    {
      id: 1, number: '1', name: 'La Joya', group_name: 'Centro',
      polygon: [
        [-70.7142421, 19.4596383], [-70.7140219, 19.4596124], [-70.7136891, 19.4595746],
        [-70.7131125, 19.4595053], [-70.7125173, 19.4594188],
        [-70.7125691, 19.4590277], [-70.7126262, 19.4585969],
        [-70.7132229, 19.4586727], [-70.7138022, 19.4587458], [-70.7143974, 19.4588071]
      ],
      qr_url: '',
      landmarks: [
        { id: 1, name: 'Colmado Mireya', lat: 19.4591, lng: -70.7133, color: '#EF4444' },
        { id: 2, name: 'Panadería Don Luis', lat: 19.4593, lng: -70.7139, color: '#3B82F6' }
      ]
    },
    {
      id: 2, number: '2', name: 'La Trinitaria', group_name: 'Centro',
      polygon: [
        [-70.7143974, 19.4588071], [-70.7138022, 19.4587458], [-70.7132229, 19.4586727],
        [-70.7126262, 19.4585969], [-70.7120424, 19.4585345], [-70.7114533, 19.4584644],
        [-70.7114912, 19.4582499], [-70.7115854, 19.4574568],
        [-70.7121617, 19.4575243], [-70.7127442, 19.4575955], [-70.7133420, 19.4576780],
        [-70.7139401, 19.4577540], [-70.7145103, 19.4578224]
      ],
      qr_url: '',
      landmarks: [
        { id: 1, name: 'Farmacia San Martín', lat: 19.4581, lng: -70.7128, color: '#EF4444' },
        { id: 2, name: 'Escuela Primaria', lat: 19.4580, lng: -70.7136, color: '#8B5CF6' },
        { id: 3, name: 'Cancha', lat: 19.4583, lng: -70.7121, color: '#10B981' }
      ]
    },
    {
      id: 3, number: '3', name: 'Pueblo Nuevo', group_name: 'Centro',
      polygon: [
        [-70.7133420, 19.4576780], [-70.7127442, 19.4575955], [-70.7121617, 19.4575243],
        [-70.7115854, 19.4574568],
        [-70.7117228, 19.4564598], [-70.7118696, 19.4554680], [-70.7119496, 19.4548228],
        [-70.7125257, 19.4548932], [-70.7131270, 19.4549561], [-70.7137009, 19.4550539],
        [-70.7135876, 19.4557333], [-70.7134661, 19.4566536]
      ],
      qr_url: '',
      landmarks: [
        { id: 1, name: 'Mini Market El Punto', lat: 19.4560, lng: -70.7126, color: '#F59E0B' },
        { id: 2, name: 'Cancha Municipal', lat: 19.4566, lng: -70.7130, color: '#10B981' }
      ]
    }
  ]
};

const STORAGE_KEY = 'territory-cards-data';

export function createLocalStore() {
  let data = { territories: [], history: [], globalLandmarks: [] };
  let listeners = [];
  let defaultCenter = [0, 0];

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* quota exceeded */ }
  }

  function notify() {
    persist();
    listeners.forEach(function (fn) { fn(); });
  }

  // Restore from localStorage on creation
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.territories && Array.isArray(parsed.territories)) {
        data = parsed;
        // Ensure arrays exist (migration from old format)
        if (!Array.isArray(data.history)) data.history = [];
        if (!Array.isArray(data.globalLandmarks)) data.globalLandmarks = [];
      }
    }
  } catch (e) { /* ignore parse errors */ }

  function nextId(items) {
    if (items.length === 0) return 1;
    return items.reduce(function (max, i) { return i.id > max ? i.id : max; }, 0) + 1;
  }

  return {
    onChange(fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (f) { return f !== fn; });
      };
    },

    loadSample() {
      data = JSON.parse(JSON.stringify(SAMPLE_DATA));
      notify();
    },

    getAll() {
      return data.territories;
    },

    getById(id) {
      return data.territories.find(function (t) { return t.id === id; }) || null;
    },

    createTerritory(attrs) {
      const territory = {
        id: nextId(data.territories),
        number: attrs.number || '',
        name: attrs.name || '',
        group_name: attrs.group_name || '',
        polygon: attrs.polygon || [],
        qr_url: attrs.qr_url || '',
        notes: attrs.notes || '',
        landmarks: [],
        blocks: []
      };
      data.territories.push(territory);
      notify();
      return territory;
    },

    updateTerritory(id, attrs) {
      const territory = this.getById(id);
      if (!territory) return null;
      if (attrs.number !== undefined) territory.number = attrs.number;
      if (attrs.name !== undefined) territory.name = attrs.name;
      if (attrs.group_name !== undefined) territory.group_name = attrs.group_name;
      if (attrs.polygon !== undefined) territory.polygon = attrs.polygon;
      if (attrs.qr_url !== undefined) territory.qr_url = attrs.qr_url;
      if (attrs.notes !== undefined) territory.notes = attrs.notes;
      notify();
      return territory;
    },

    deleteTerritory(id) {
      data.territories = data.territories.filter(function (t) { return t.id !== id; });
      data.history = data.history.filter(function (h) { return h.territoryId !== id; });
      notify();
    },

    addLandmark(territoryId, attrs) {
      const territory = this.getById(territoryId);
      if (!territory) return null;
      const landmark = {
        id: nextId(territory.landmarks),
        name: attrs.name,
        description: attrs.description || '',
        lat: attrs.lat,
        lng: attrs.lng,
        color: attrs.color || '#3B82F6'
      };
      territory.landmarks.push(landmark);
      notify();
      return landmark;
    },

    deleteLandmark(territoryId, landmarkId) {
      const territory = this.getById(territoryId);
      if (!territory) return;
      territory.landmarks = territory.landmarks.filter(function (l) { return l.id !== landmarkId; });
      notify();
    },

    // --- Blocks (manzanas) ---

    addBlock(territoryId, attrs) {
      const territory = this.getById(territoryId);
      if (!territory) return null;
      if (!territory.blocks) territory.blocks = [];
      const block = {
        id: nextId(territory.blocks),
        number: attrs.number || '',
        polygon: attrs.polygon || []
      };
      territory.blocks.push(block);
      notify();
      return block;
    },

    deleteBlock(territoryId, blockId) {
      const territory = this.getById(territoryId);
      if (!territory || !territory.blocks) return;
      territory.blocks = territory.blocks.filter(function (b) { return b.id !== blockId; });
      notify();
    },

    // --- Global Landmarks ---

    getGlobalLandmarks() {
      return data.globalLandmarks;
    },

    addGlobalLandmark(attrs) {
      const landmark = {
        id: nextId(data.globalLandmarks),
        name: attrs.name,
        description: attrs.description || '',
        lat: attrs.lat,
        lng: attrs.lng,
        color: attrs.color || '#9CA3AF'
      };
      data.globalLandmarks.push(landmark);
      notify();
      return landmark;
    },

    deleteGlobalLandmark(id) {
      data.globalLandmarks = data.globalLandmarks.filter(function (l) { return l.id !== id; });
      notify();
    },

    // --- History ---

    getAllHistory() {
      return data.history;
    },

    getHistoryForTerritory(territoryId) {
      return data.history
        .filter(function (h) { return h.territoryId === territoryId; })
        .sort(function (a, b) { return b.startDate.localeCompare(a.startDate); });
    },

    getActiveAssignment(territoryId) {
      return data.history.find(function (h) {
        return h.territoryId === territoryId && (h.type === 'assignment' || !h.type) && h.status === 'active';
      }) || null;
    },

    addHistoryEntry(entry) {
      const historyEntry = {
        id: nextId(data.history),
        territoryId: entry.territoryId,
        startDate: entry.startDate || '',
        endDate: entry.endDate || null,
        person: entry.person || '',
        notes: entry.notes || '',
        type: entry.type || 'assignment',
        status: entry.status || 'active',
        createdAt: new Date().toISOString()
      };
      data.history.push(historyEntry);
      notify();
      return historyEntry;
    },

    updateHistoryEntry(id, attrs) {
      const entry = data.history.find(function (h) { return h.id === id; });
      if (!entry) return null;
      if (attrs.startDate !== undefined) entry.startDate = attrs.startDate;
      if (attrs.endDate !== undefined) entry.endDate = attrs.endDate;
      if (attrs.person !== undefined) entry.person = attrs.person;
      if (attrs.notes !== undefined) entry.notes = attrs.notes;
      if (attrs.type !== undefined) entry.type = attrs.type;
      if (attrs.status !== undefined) entry.status = attrs.status;
      notify();
      return entry;
    },

    deleteHistoryEntry(id) {
      data.history = data.history.filter(function (h) { return h.id !== id; });
      notify();
    },

    loadFromFile(file) {
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.territories && Array.isArray(parsed.territories)) {
              parsed.territories.forEach(function (t) {
                if (typeof t.id !== 'number') t.id = parseInt(t.id, 10) || 0;
                if (!Array.isArray(t.landmarks)) t.landmarks = [];
                if (t.number === undefined) t.number = '';
                if (t.name === undefined) t.name = '';
                if (t.qr_url === undefined) t.qr_url = '';
              });
              if (!Array.isArray(parsed.history)) parsed.history = [];
              if (!Array.isArray(parsed.globalLandmarks)) parsed.globalLandmarks = [];
              data = parsed;
              notify();
              resolve();
            } else {
              reject(new Error('Invalid JSON format: missing territories array'));
            }
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = function () { reject(reader.error); };
        reader.readAsText(file);
      });
    },

    saveToFile() {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'territories.json';
      link.href = url;
      link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    },

    importKML(file) {
      const self = this;
      return parseKml(file).then(function (imported) {
        imported.forEach(function (t) {
          const existing = data.territories.find(function (e) { return e.number === t.number; });
          if (existing) {
            existing.name = t.name;
            existing.group_name = t.group_name;
            existing.polygon = t.polygon;
          } else {
            t.id = nextId(data.territories);
            t.qr_url = '';
            t.landmarks = [];
            data.territories.push(t);
          }
        });
        notify();
      });
    },

    reset() {
      data = { territories: [], history: [], globalLandmarks: [] };
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      notify();
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
    }
  };
}
