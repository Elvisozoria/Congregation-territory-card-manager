export default {
  _label: 'ES',
  _name: 'Español',

  // Navbar
  nav: {
    brand: 'Tarjetas de Territorio',
    printAll: 'Imprimir',
    loadJson: 'Cargar JSON',
    saveJson: 'Guardar JSON',
    importKml: 'Importar KML',
    reset: 'Reiniciar'
  },

  // Welcome screen
  welcome: {
    title: 'Aún no tienes territorios',
    subtitle: 'Comienza creando tu primer territorio o cargando datos existentes.',
    createTerritory: 'Crear Territorio',
    loadDemo: 'Cargar Demo',
    loadJson: 'Cargar archivo JSON',
    importKml: 'Importar KML/KMZ'
  },

  // Index view
  index: {
    title: 'Territorios',
    newTerritory: 'Nuevo Territorio',
    colNumber: '#',
    colName: 'Nombre',
    colGroup: 'Grupo',
    colLandmarks: 'Puntos',
    btnCard: 'Tarjeta',
    btnEdit: 'Editar',
    btnDelete: 'Eliminar'
  },

  // Show view
  show: {
    btnCard: 'Tarjeta',
    btnEdit: 'Editar',
    btnBack: 'Volver',
    clickToAdd: 'Haz clic en el mapa para agregar un punto de referencia',
    landmarks: 'Puntos de Referencia',
    noLandmarks: 'Sin puntos de referencia aún. Haz clic en el mapa para agregar uno.',
    deleteLandmark: 'Eliminar',
    deleteTerritory: 'Eliminar este territorio',
    promptLandmarkName: 'Nombre del punto de referencia:',
    confirmDeleteLandmark: '¿Eliminar este punto de referencia?',
    confirmDeleteTerritory: '¿Eliminar el territorio "{name}"? Esta acción no se puede deshacer.',
    // History
    history: 'Historial de Trabajo',
    noHistory: 'Sin registros de trabajo aún.',
    addHistory: 'Agregar Registro',
    historyPerson: 'Persona',
    historyStartDate: 'Fecha de inicio',
    historyEndDate: 'Fecha de fin',
    historyNotes: 'Notas',
    historyInProgress: 'En progreso',
    historySave: 'Guardar',
    historyCancel: 'Cancelar',
    historyEdit: 'Editar',
    historyDelete: 'Eliminar',
    confirmDeleteHistory: '¿Eliminar este registro de trabajo?',
    // Territory notes
    notes: 'Notas',
    // Landmark form (inline)
    addLandmarkTitle: 'Nueva Referencia',
    addLandmarkName: 'Nombre',
    addLandmarkDesc: 'Descripción (opcional)',
    addLandmarkSave: 'Guardar',
    addLandmarkCancel: 'Cancelar',
    scopeLocal: 'Solo este territorio',
    scopeGlobal: 'Todos los territorios',
    globalBadge: 'Global',
    // Blocks (manzanas)
    blocks: 'Manzanas',
    noBlocks: 'Sin manzanas dibujadas aún.',
    addBlock: 'Dibujar Manzana',
    blockNumber: 'Número de manzana:',
    deleteBlock: 'Eliminar',
    confirmDeleteBlock: '¿Eliminar esta manzana?',
    drawBlockHint: 'Dibuja el polígono de la manzana en el mapa. Haz clic en el primer punto para cerrar.',
    // Assignment
    assignTerritory: 'Asignar Territorio',
    assignedTo: 'Asignado a {person}',
    assignedSince: 'desde {date}',
    markCompleted: 'Completado',
    markReturned: 'Devolver',
    available: 'Disponible',
    assignPerson: 'Nombre de la persona:',
    // History types & status
    typeAssignment: 'Asignación',
    typePreaching: 'Predicación',
    statusActive: 'Activo',
    statusCompleted: 'Completado',
    statusReturned: 'Devuelto',
    historyType: 'Tipo',
    historyStatus: 'Estado'
  },

  // Form view
  form: {
    titleNew: 'Nuevo Territorio',
    titleEdit: 'Editar Territorio',
    cancel: 'Cancelar',
    fieldNumber: 'Número',
    fieldName: 'Nombre',
    fieldGroup: 'Grupo',
    fieldQr: 'Enlace QR (opcional)',
    fieldNotes: 'Notas / Referencias de acceso',
    fieldNotesPlaceholder: 'Instrucciones para llegar, referencias generales...',
    drawInstruction: 'Haz clic en el <strong>ícono del pentágono</strong> en el mapa, luego haz clic en puntos para dibujar el límite del territorio. Haz clic en el primer punto de nuevo para cerrar la forma.',
    save: 'Guardar Territorio',
    deleteTerritory: 'Eliminar este territorio',
    confirmDelete: '¿Eliminar el territorio "{name}"? Esta acción no se puede deshacer.',
    errorNumber: 'El número es requerido',
    errorName: 'El nombre es requerido',
    errorQrFormat: 'El enlace QR debe comenzar con http:// o https://',
    errorDuplicate: 'El número de territorio "{number}" ya existe',
    draftFound: 'Se encontró un borrador guardado automáticamente. ¿Deseas restaurarlo?'
  },

  // Card view
  card: {
    downloadPng: 'Descargar PNG',
    print: 'Imprimir',
    back: 'Volver'
  },

  // Print view
  print: {
    title: 'Todas las Tarjetas ({count})',
    printAll: 'Imprimir Todo',
    downloadAll: 'Descargar PNGs',
    back: 'Volver'
  },

  // Confirmations & alerts
  confirm: {
    loadReplace: 'Cargar un archivo reemplazará todos los datos actuales. ¿Continuar?',
    reset: 'Esto eliminará todos los datos de territorio almacenados en este navegador. Tus archivos JSON exportados no se verán afectados. ¿Continuar?',
    unsavedChanges: 'Tienes cambios sin guardar. ¿Salir de esta página?',
    deleteTerritory: '¿Eliminar el territorio "{number} - {name}"?'
  },

  // Mode selection
  modeSelect: {
    title: 'Bienvenido a Tarjetas de Territorio',
    subtitle: 'Elige cómo quieres usar la aplicación.',
    offlineTitle: 'Usar sin conexión',
    offlineDesc: 'Los datos se guardan en tu navegador. Puedes exportar e importar JSON.',
    onlineTitle: 'Crear cuenta',
    onlineDesc: 'Datos en la nube, compartidos con tu congregación.'
  },

  // Auth
  auth: {
    loginTitle: 'Iniciar Sesión',
    loginButton: 'Iniciar Sesión',
    loginError: 'Correo o contraseña incorrectos.',
    registerTitle: 'Registrar Congregación',
    registerButton: 'Crear Cuenta',
    registerError: 'Error al crear la cuenta.',
    registerLink: 'Registrar nueva congregación',
    loginLink: '¿Ya tienes cuenta? Inicia sesión',
    useOffline: 'Usar sin conexión',
    email: 'Correo electrónico',
    password: 'Contraseña',
    displayName: 'Nombre',
    congregationName: 'Nombre de la congregación',
    emailInUse: 'Este correo ya está registrado.',
    weakPassword: 'La contraseña debe tener al menos 6 caracteres.',
    changePasswordTitle: 'Cambiar Contraseña',
    changePasswordDesc: 'Debes cambiar tu contraseña temporal antes de continuar.',
    changePasswordButton: 'Cambiar Contraseña',
    changePasswordError: 'Error al cambiar la contraseña. Intenta cerrar sesión y entrar de nuevo.',
    newPassword: 'Nueva contraseña',
    confirmPassword: 'Confirmar contraseña',
    passwordMismatch: 'Las contraseñas no coinciden.',
    noPermission: 'No tienes permiso para ver esta página.'
  },

  // Admin panel
  admin: {
    title: 'Panel de Administración',
    congregationInfo: 'Información de la Congregación',
    congregationId: 'ID de congregación',
    members: 'Miembros',
    noMembers: 'No hay miembros.',
    loading: 'Cargando...',
    loadError: 'Error al cargar miembros.',
    createUser: 'Crear Usuario',
    createUserButton: 'Crear Usuario',
    createUserError: 'Error al crear el usuario.',
    userCreated: 'Usuario creado exitosamente',
    shareCredentials: 'Comparte estas credenciales con el usuario (WhatsApp, en persona, etc.)',
    tempPassword: 'Contraseña temporal',
    role: 'Rol',
    roleMember: 'Miembro',
    roleAdmin: 'Administrador'
  },

  // Settings
  settings: {
    title: 'Configuración',
    currentMode: 'Modo actual',
    modeOffline: 'Sin conexión (datos locales)',
    modeOnline: 'En línea (datos en la nube)',
    switchToOnline: 'Cambiar a modo en línea',
    profile: 'Perfil',
    passwordChanged: 'Contraseña cambiada exitosamente.',
    logout: 'Cerrar Sesión',
    migrateTitle: 'Migrar datos a la nube',
    migrateDesc: 'Si te registras en modo en línea, podrás subir tus datos locales a la nube.'
  },

  // Alerts
  alert: {
    unsavedForm: 'Tienes cambios sin guardar en el formulario. Guarda el territorio primero, luego exporta el JSON.',
    kmlSuccess: '¡KML importado exitosamente!',
    errorLoadJson: 'Error al cargar JSON: ',
    errorImportKml: 'Error al importar KML: ',
    notFound: 'Territorio no encontrado.',
    renderError: 'Algo salió mal al mostrar esta página.',
    backToHome: 'Volver al Inicio'
  }
};
