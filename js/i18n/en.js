window.App = window.App || {};
window.App.I18n = window.App.I18n || {};
window.App.I18n.languages = window.App.I18n.languages || {};

window.App.I18n.languages.en = {
  _label: 'EN',
  _name: 'English',

  // Navbar
  nav: {
    brand: 'Territory Cards',
    printAll: 'Print All',
    loadJson: 'Load JSON',
    saveJson: 'Save JSON',
    importKml: 'Import KML',
    reset: 'Reset'
  },

  // Welcome screen
  welcome: {
    title: 'No territories yet',
    subtitle: 'Get started by creating your first territory or loading existing data.',
    createTerritory: 'Create Territory',
    loadDemo: 'Load Demo',
    loadJson: 'Load JSON file',
    importKml: 'Import KML/KMZ'
  },

  // Index view
  index: {
    title: 'Territories',
    newTerritory: 'New Territory',
    colNumber: '#',
    colName: 'Name',
    colGroup: 'Group',
    colLandmarks: 'Landmarks',
    btnCard: 'Card',
    btnEdit: 'Edit',
    btnDelete: 'Delete'
  },

  // Show view
  show: {
    btnCard: 'Card',
    btnEdit: 'Edit',
    btnBack: 'Back',
    clickToAdd: 'Click on the map to add a landmark',
    landmarks: 'Landmarks',
    noLandmarks: 'No landmarks yet. Click the map to add one.',
    deleteLandmark: 'Delete',
    deleteTerritory: 'Delete this territory',
    promptLandmarkName: 'Landmark name:',
    confirmDeleteLandmark: 'Delete this landmark?',
    confirmDeleteTerritory: 'Delete territory "{name}"? This cannot be undone.'
  },

  // Form view
  form: {
    titleNew: 'New Territory',
    titleEdit: 'Edit Territory',
    cancel: 'Cancel',
    fieldNumber: 'Number',
    fieldName: 'Name',
    fieldGroup: 'Group',
    fieldQr: 'QR Link (optional)',
    drawInstruction: 'Click the <strong>pentagon icon</strong> on the map, then click points to draw your territory boundary. Click the first point again to close the shape.',
    save: 'Save Territory',
    deleteTerritory: 'Delete this territory',
    confirmDelete: 'Delete territory "{name}"? This cannot be undone.',
    errorNumber: 'Number is required',
    errorName: 'Name is required',
    errorQrFormat: 'QR Link must start with http:// or https://',
    errorDuplicate: 'Territory number "{number}" already exists'
  },

  // Card view
  card: {
    downloadPng: 'Download PNG',
    print: 'Print',
    back: 'Back'
  },

  // Print view
  print: {
    title: 'All Territory Cards ({count})',
    printAll: 'Print All',
    downloadAll: 'Download All PNGs',
    back: 'Back'
  },

  // Confirmations & alerts
  confirm: {
    loadReplace: 'Loading a file will replace all current data. Continue?',
    reset: 'This will clear all territory data stored in this browser. Your exported JSON files are not affected. Continue?',
    unsavedChanges: 'You have unsaved changes. Leave this page?',
    deleteTerritory: 'Delete territory "{number} - {name}"?'
  },

  // Alerts
  alert: {
    unsavedForm: 'You have unsaved changes in the form. Save the territory first, then export the JSON.',
    kmlSuccess: 'KML imported successfully!',
    errorLoadJson: 'Error loading JSON: ',
    errorImportKml: 'Error importing KML: ',
    notFound: 'Territory not found.',
    renderError: 'Something went wrong rendering this page.',
    backToHome: 'Back to Home'
  }
};
