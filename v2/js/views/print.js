// print.js — Bulk print all territory cards

window.App = window.App || {};
window.App.Views = window.App.Views || {};

(function () {
  window.App.Views.Print = {
    render: function (container) {
      var territories = App.Store.getAll();
      var cleanups = [];

      // Add print-layout class to hide navbar and remove container constraints
      document.body.classList.add('print-layout');

      // Controls (no-print)
      var controls = document.createElement('div');
      controls.className = 'no-print';
      controls.style.cssText = 'padding:1rem;text-align:center;';
      controls.innerHTML = '<h2>All Territory Cards (' + territories.length + ')</h2>';

      var btnRow = document.createElement('div');
      btnRow.style.marginTop = '0.5rem';

      var printBtn = document.createElement('a');
      printBtn.href = '#';
      printBtn.className = 'btn btn-primary';
      printBtn.textContent = 'Print All';
      printBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.print();
      });

      var downloadBtn = document.createElement('a');
      downloadBtn.href = '#';
      downloadBtn.className = 'btn btn-primary';
      downloadBtn.textContent = 'Download All PNGs';
      downloadBtn.addEventListener('click', function (e) {
        e.preventDefault();
        downloadAllCards();
      });

      var backBtn = document.createElement('a');
      backBtn.href = '#/';
      backBtn.className = 'btn btn-secondary';
      backBtn.textContent = 'Back';

      btnRow.appendChild(printBtn);
      btnRow.appendChild(document.createTextNode(' '));
      btnRow.appendChild(downloadBtn);
      btnRow.appendChild(document.createTextNode(' '));
      btnRow.appendChild(backBtn);
      controls.appendChild(btnRow);
      container.appendChild(controls);

      // Cards grid
      var grid = document.createElement('div');
      grid.className = 'cards-grid';

      territories.forEach(function (territory) {
        var qrUrl = territory.qr_url || '';

        var card = document.createElement('div');
        card.className = 'territory-card';
        card.id = 'territory-card-' + territory.id;
        card.style.position = 'relative';

        // Label
        var label = document.createElement('div');
        label.className = 'card-label';
        label.style.cssText = 'position:absolute;top:8px;left:8px;z-index:1000;background:rgba(255,255,255,0.9);padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.875rem;';
        label.textContent = territory.number + ' - ' + territory.name;
        card.appendChild(label);

        // QR
        if (qrUrl) {
          var qrContainer = document.createElement('div');
          qrContainer.className = 'qr-container';
          qrContainer.id = 'qr-' + territory.id;
          qrContainer.style.cssText = 'position:absolute;bottom:8px;right:8px;z-index:1000;background:white;padding:4px;';
          qrContainer.setAttribute('data-qr-url', qrUrl);
          card.appendChild(qrContainer);
        }

        // Dedicated map div inside the card
        var mapDiv = document.createElement('div');
        mapDiv.className = 'card-map';
        card.appendChild(mapDiv);

        grid.appendChild(card);
        var cardCleanup = App.Components.CardMap.renderCardMap(card, territory);
        cleanups.push(cardCleanup);
      });

      container.appendChild(grid);

      function downloadAllCards() {
        var cards = document.querySelectorAll('.territory-card');
        var i = 0;

        function downloadNext() {
          if (i >= cards.length) return;
          var card = cards[i];
          html2canvas(card, { scale: 2, useCORS: true }).then(function (canvas) {
            var link = document.createElement('a');
            var label = card.querySelector('.card-label').textContent.trim().toLowerCase().replace(/\s+/g, '-');
            link.download = label + '.png';
            link.href = canvas.toDataURL();
            link.click();
          }).catch(function (err) {
            console.error('Failed to render card ' + i + ':', err);
          }).then(function () {
            i++;
            setTimeout(downloadNext, 500);
          });
        }

        downloadNext();
      }

      return function () {
        document.body.classList.remove('print-layout');
        cleanups.forEach(function (fn) { fn(); });
      };
    }
  };
})();
