export default {
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
    confirmDeleteTerritory: 'Delete territory "{name}"? This cannot be undone.',
    // History
    history: 'Work History',
    noHistory: 'No work records yet.',
    addHistory: 'Add Record',
    historyPerson: 'Person',
    historyStartDate: 'Start date',
    historyEndDate: 'End date',
    historyNotes: 'Notes',
    historyInProgress: 'In progress',
    historySave: 'Save',
    historyCancel: 'Cancel',
    historyEdit: 'Edit',
    historyDelete: 'Delete',
    confirmDeleteHistory: 'Delete this work record?'
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

  // Mode selection
  modeSelect: {
    title: 'Welcome to Territory Cards',
    subtitle: 'Choose how you want to use the app.',
    offlineTitle: 'Use offline',
    offlineDesc: 'Data stays in your browser. Export and import JSON to share.',
    onlineTitle: 'Create account',
    onlineDesc: 'Cloud data, shared with your congregation.'
  },

  // Auth
  auth: {
    loginTitle: 'Sign In',
    loginButton: 'Sign In',
    loginError: 'Invalid email or password.',
    registerTitle: 'Register Congregation',
    registerButton: 'Create Account',
    registerError: 'Failed to create account.',
    registerLink: 'Register new congregation',
    loginLink: 'Already have an account? Sign in',
    useOffline: 'Use offline',
    email: 'Email',
    password: 'Password',
    displayName: 'Name',
    congregationName: 'Congregation name',
    emailInUse: 'This email is already registered.',
    weakPassword: 'Password must be at least 6 characters.',
    changePasswordTitle: 'Change Password',
    changePasswordDesc: 'You must change your temporary password before continuing.',
    changePasswordButton: 'Change Password',
    changePasswordError: 'Failed to change password. Try signing out and back in.',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    passwordMismatch: 'Passwords do not match.',
    noPermission: 'You do not have permission to view this page.'
  },

  // Admin panel
  admin: {
    title: 'Admin Panel',
    congregationInfo: 'Congregation Info',
    congregationId: 'Congregation ID',
    members: 'Members',
    noMembers: 'No members.',
    loading: 'Loading...',
    loadError: 'Failed to load members.',
    createUser: 'Create User',
    createUserButton: 'Create User',
    createUserError: 'Failed to create user.',
    userCreated: 'User created successfully',
    shareCredentials: 'Share these credentials with the user (WhatsApp, in person, etc.)',
    tempPassword: 'Temporary password',
    role: 'Role',
    roleMember: 'Member',
    roleAdmin: 'Admin'
  },

  // Settings
  settings: {
    title: 'Settings',
    currentMode: 'Current mode',
    modeOffline: 'Offline (local data)',
    modeOnline: 'Online (cloud data)',
    switchToOnline: 'Switch to online mode',
    profile: 'Profile',
    passwordChanged: 'Password changed successfully.',
    logout: 'Sign Out',
    migrateTitle: 'Migrate data to cloud',
    migrateDesc: 'If you register for online mode, you can upload your local data to the cloud.'
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
