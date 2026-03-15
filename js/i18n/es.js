window.App = window.App || {};
window.App.I18n = window.App.I18n || {};
window.App.I18n.languages = window.App.I18n.languages || {};

window.App.I18n.languages.es = {
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
    confirmDeleteTerritory: '¿Eliminar el territorio "{name}"? Esta acción no se puede deshacer.'
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
    drawInstruction: 'Haz clic en el <strong>ícono del pentágono</strong> en el mapa, luego haz clic en puntos para dibujar el límite del territorio. Haz clic en el primer punto de nuevo para cerrar la forma.',
    save: 'Guardar Territorio',
    deleteTerritory: 'Eliminar este territorio',
    confirmDelete: '¿Eliminar el territorio "{name}"? Esta acción no se puede deshacer.',
    errorNumber: 'El número es requerido',
    errorName: 'El nombre es requerido',
    errorQrFormat: 'El enlace QR debe comenzar con http:// o https://',
    errorDuplicate: 'El número de territorio "{number}" ya existe'
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
