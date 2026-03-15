// app.js — Entry point: wires store, router, and UI buttons

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    // Detect user location for map defaults
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (pos) {
        App.Store.setDefaultCenter(pos.coords.latitude, pos.coords.longitude);
      });
    }

    // Load sample data
    App.Store.loadSample();

    // Wire file buttons
    var btnLoad = document.getElementById('btn-load');
    var btnSave = document.getElementById('btn-save');
    var btnImportKml = document.getElementById('btn-import-kml');
    var fileInput = document.getElementById('file-input');
    var kmlInput = document.getElementById('kml-input');

    btnLoad.addEventListener('click', function () {
      if (App.Store.getAll().length > 0) {
        if (!confirm('Loading a file will replace all current data. Continue?')) return;
      }
      fileInput.click();
    });
    btnSave.addEventListener('click', function () {
      if (App.Views.Form && App.Views.Form.isDirty) {
        alert('You have unsaved changes in the form. Save the territory first, then export the JSON.');
        return;
      }
      App.Store.saveToFile();
    });
    btnImportKml.addEventListener('click', function () { kmlInput.click(); });

    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) {
        btnLoad.disabled = true;
        App.Store.loadFromFile(fileInput.files[0]).then(function () {
          fileInput.value = '';
          App.Router.refresh();
        }).catch(function (err) {
          alert('Error loading JSON: ' + err.message);
          fileInput.value = '';
        }).then(function () { btnLoad.disabled = false; });
      }
    });

    kmlInput.addEventListener('change', function () {
      if (kmlInput.files.length > 0) {
        btnImportKml.disabled = true;
        App.Store.importKML(kmlInput.files[0]).then(function () {
          kmlInput.value = '';
          App.Router.refresh();
          alert('KML imported successfully!');
        }).catch(function (err) {
          alert('Error importing KML: ' + err.message);
          kmlInput.value = '';
        }).then(function () { btnImportKml.disabled = false; });
      }
    });

    // Initialize router
    var appContainer = document.getElementById('app');
    App.Router.init(appContainer);
  });
})();
