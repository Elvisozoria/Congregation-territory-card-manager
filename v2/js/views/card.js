// card.js — Printable territory card view

window.App = window.App || {};
window.App.Views = window.App.Views || {};

(function () {
  window.App.Views.Card = {
    render: function (container, params) {
      var territory = App.Store.getById(params.id);
      if (!territory) {
        container.innerHTML = '<p>Territory not found.</p><a href="#/" class="btn btn-secondary">Back</a>';
        return null;
      }

      var cleanup = null;
      var qrUrl = territory.qr_url || '';
      var fileName = territory.number + '-' + territory.name.toLowerCase().replace(/\s+/g, '-');

      // Controls (no-print)
      var controls = document.createElement('div');
      controls.className = 'card-controls no-print';
      controls.innerHTML = '<h2>' + escapeHtml(territory.number) + ' - ' + escapeHtml(territory.name) + '</h2>';

      var downloadBtn = document.createElement('a');
      downloadBtn.href = '#';
      downloadBtn.className = 'btn btn-primary btn-sm';
      downloadBtn.textContent = 'Download PNG';
      downloadBtn.addEventListener('click', function (e) {
        e.preventDefault();
        downloadCard();
      });

      var printBtn = document.createElement('a');
      printBtn.href = '#';
      printBtn.className = 'btn btn-secondary btn-sm';
      printBtn.textContent = 'Print';
      printBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.print();
      });

      var backBtn = document.createElement('a');
      backBtn.href = '#/territories/' + territory.id;
      backBtn.className = 'btn btn-secondary btn-sm';
      backBtn.textContent = 'Back';

      controls.appendChild(downloadBtn);
      controls.appendChild(printBtn);
      controls.appendChild(backBtn);
      container.appendChild(controls);

      // Card
      var card = document.createElement('div');
      card.id = 'territory-card';
      card.className = 'territory-card';

      // Card label
      var label = document.createElement('div');
      label.className = 'card-label';
      label.style.cssText = 'position:absolute;top:8px;left:8px;z-index:1000;background:rgba(255,255,255,0.9);padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.875rem;';
      label.textContent = territory.number + ' - ' + territory.name;
      card.appendChild(label);

      // QR container
      if (qrUrl) {
        var qrContainer = document.createElement('div');
        qrContainer.className = 'qr-container';
        qrContainer.style.cssText = 'position:absolute;bottom:8px;right:8px;z-index:1000;background:white;padding:4px;';
        qrContainer.setAttribute('data-qr-url', qrUrl);
        card.appendChild(qrContainer);
      }

      // Dedicated map div inside the card
      var mapDiv = document.createElement('div');
      mapDiv.className = 'card-map';
      card.appendChild(mapDiv);

      card.style.position = 'relative';
      container.appendChild(card);

      cleanup = App.Components.CardMap.renderCardMap(card, territory);

      function downloadCard() {
        html2canvas(document.getElementById('territory-card'), { scale: 2, useCORS: true }).then(function (canvas) {
          var link = document.createElement('a');
          link.download = fileName + '.png';
          link.href = canvas.toDataURL();
          link.click();
        });
      }

      return function () {
        if (cleanup) cleanup();
      };
    }
  };

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
