// helpers.js — Shared utility functions

window.App = window.App || {};

window.App.Utils = {
  escapeHtml: function (str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
