// form.js — New/Edit territory form with polygon drawing

window.App = window.App || {};
window.App.Views = window.App.Views || {};

(function () {
  window.App.Views.Form = {
    // Expose dirty flag so app.js can warn on Save JSON
    isDirty: false,

    render: function (container, params) {
      var self = this;
      var isEdit = params.id !== null;
      var territory = isEdit ? App.Store.getById(params.id) : null;

      if (isEdit && !territory) {
        container.innerHTML = '<p>Territory not found.</p><a href="#/" class="btn btn-secondary">Back</a>';
        return null;
      }

      var cleanup = null;
      self.isDirty = false;

      // Header
      var header = document.createElement('div');
      header.className = 'header-row';
      header.innerHTML = '<h1>' + (isEdit ? 'Edit Territory' : 'New Territory') + '</h1>' +
        '<a href="' + (isEdit ? '#/territories/' + territory.id : '#/') + '" class="btn btn-secondary">Cancel</a>';
      container.appendChild(header);

      // Form container
      var formContainer = document.createElement('div');
      formContainer.className = 'form-container';

      // Error container
      var errorDiv = document.createElement('div');
      errorDiv.className = 'flash flash-alert';
      errorDiv.style.display = 'none';
      formContainer.appendChild(errorDiv);

      // Form fields
      var form = document.createElement('form');

      form.innerHTML =
        '<div class="form-group">' +
          '<label for="field-number">Number</label>' +
          '<input type="text" id="field-number" placeholder="1A" value="' + escapeAttr(territory ? territory.number : '') + '" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label for="field-name">Name</label>' +
          '<input type="text" id="field-name" placeholder="Los Prados" value="' + escapeAttr(territory ? territory.name : '') + '" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label for="field-group">Group</label>' +
          '<input type="text" id="field-group" placeholder="Oeste" value="' + escapeAttr(territory ? territory.group_name : '') + '" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label for="field-qr">QR Link (optional)</label>' +
          '<input type="url" id="field-qr" placeholder="https://..." value="' + escapeAttr(territory ? territory.qr_url : '') + '" />' +
        '</div>' +
        '<p class="helper-text">Draw the polygon on the map below</p>';

      // Track dirty state on input changes
      form.addEventListener('input', function () { self.isDirty = true; });

      // Map container for polygon draw
      var mapDiv = document.createElement('div');
      mapDiv.className = 'map-container';

      // Hidden input for polygon data
      var hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = 'field-polygon';
      hiddenInput.value = territory ? JSON.stringify(territory.polygon) : '[]';

      // Watch for polygon changes via MutationObserver on hidden input value
      var originalPolygon = hiddenInput.value;
      var polygonObserver = setInterval(function () {
        if (hiddenInput.value !== originalPolygon) {
          self.isDirty = true;
          clearInterval(polygonObserver);
        }
      }, 500);

      form.appendChild(mapDiv);
      form.appendChild(hiddenInput);

      // Submit button
      var submitBtn = document.createElement('button');
      submitBtn.type = 'submit';
      submitBtn.className = 'btn btn-primary';
      submitBtn.style.marginTop = '1rem';
      submitBtn.style.width = '100%';
      submitBtn.textContent = 'Save Territory';
      form.appendChild(submitBtn);

      // Delete button (edit mode only)
      if (isEdit) {
        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.style.marginTop = '0.5rem';
        deleteBtn.style.width = '100%';
        deleteBtn.textContent = 'Delete Territory';
        deleteBtn.addEventListener('click', function () {
          if (confirm('Delete territory "' + territory.number + ' - ' + territory.name + '"? This cannot be undone.')) {
            self.isDirty = false;
            App.Store.deleteTerritory(territory.id);
            window.location.hash = '#/';
          }
        });
        form.appendChild(deleteBtn);
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var number = document.getElementById('field-number').value.trim();
        var name = document.getElementById('field-name').value.trim();
        var group_name = document.getElementById('field-group').value.trim();
        var qr_url = document.getElementById('field-qr').value.trim();
        var polygon = [];

        try {
          polygon = JSON.parse(hiddenInput.value);
        } catch (err) {
          polygon = [];
        }

        // Validate
        var errors = [];
        if (!number) errors.push('Number is required');
        if (!name) errors.push('Name is required');

        // Validate QR URL format if provided
        if (qr_url && !/^https?:\/\//i.test(qr_url)) {
          errors.push('QR Link must start with http:// or https://');
        }

        // Validate unique territory number
        var duplicate = App.Store.getAll().find(function (t) {
          return t.number === number && (!isEdit || t.id !== territory.id);
        });
        if (duplicate) errors.push('Territory number "' + number + '" already exists');

        if (errors.length > 0) {
          errorDiv.innerHTML = '';
          errors.forEach(function (msg) {
            var p = document.createElement('p');
            p.textContent = msg;
            errorDiv.appendChild(p);
          });
          errorDiv.style.display = 'block';
          return;
        }

        var attrs = {
          number: number,
          name: name,
          group_name: group_name,
          qr_url: qr_url,
          polygon: polygon
        };

        self.isDirty = false;
        var result;
        if (isEdit) {
          result = App.Store.updateTerritory(territory.id, attrs);
          window.location.hash = '#/territories/' + territory.id;
        } else {
          result = App.Store.createTerritory(attrs);
          window.location.hash = '#/territories/' + result.id;
        }
      });

      formContainer.appendChild(form);
      container.appendChild(formContainer);

      // Initialize polygon draw
      var existingPolygon = territory ? territory.polygon : [];
      cleanup = App.Components.PolygonDraw.init(mapDiv, hiddenInput, existingPolygon);

      return function () {
        clearInterval(polygonObserver);
        if (cleanup) cleanup();
      };
    }
  };

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
