// app.js — Entry point: wires store, router, and UI buttons

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    // Load sample data
    App.Store.loadSample();

    // Wire file buttons
    var btnLoad = document.getElementById('btn-load');
    var btnSave = document.getElementById('btn-save');
    var btnImportKml = document.getElementById('btn-import-kml');
    var fileInput = document.getElementById('file-input');
    var kmlInput = document.getElementById('kml-input');

    btnLoad.addEventListener('click', function () { fileInput.click(); });
    btnSave.addEventListener('click', function () { App.Store.saveToFile(); });
    btnImportKml.addEventListener('click', function () { kmlInput.click(); });

    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) {
        App.Store.loadFromFile(fileInput.files[0]).then(function () {
          fileInput.value = '';
          App.Router.refresh();
        }).catch(function (err) {
          alert('Error loading JSON: ' + err.message);
          fileInput.value = '';
        });
      }
    });

    kmlInput.addEventListener('change', function () {
      if (kmlInput.files.length > 0) {
        App.Store.importKML(kmlInput.files[0]).then(function () {
          kmlInput.value = '';
          App.Router.refresh();
          alert('KML imported successfully!');
        }).catch(function (err) {
          alert('Error importing KML: ' + err.message);
          kmlInput.value = '';
        });
      }
    });

    // Subscribe store changes to re-render current route
    App.Store.onChange(function () {
      App.Router.refresh();
    });

    // Initialize router
    var appContainer = document.getElementById('app');
    App.Router.init(appContainer);
  });
})();
