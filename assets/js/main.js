
import { $, ensureZipLibs } from './core.js';
import { wireUI } from './ui.js';
import { wireFileInputs } from './files.js';
import * as files from './files.js';
import * as preview from './preview.js';
import { runConversion, downloadZip, toggleControls } from './convert.js';

window.FIC = { files, preview }; // for debugging

wireUI();
wireFileInputs();

// Buttons
$('#clearBtn')?.addEventListener('click', files.clearList);
$('#convertBtn')?.addEventListener('click', runConversion);
$('#zipBtn')?.addEventListener('click', downloadZip);

// Controls visibility
toggleControls();
document.getElementById('fmtSelect')?.addEventListener('change', toggleControls);

// Boost preview once on load
setTimeout(preview.updatePreview, 0);

// GA events
document.addEventListener("DOMContentLoaded", function(){
  var cBtn = document.getElementById("convertBtn");
  var zBtn = document.getElementById("zipBtn");
  var cForm = document.getElementById("contactForm");

  if (cBtn) cBtn.addEventListener("click", function(){
    window.gtag && gtag("event", "convert_click", {event_category:"engagement", value:1});
  });

  if (zBtn) zBtn.addEventListener("click", function(){
    window.gtag && gtag("event", "zip_download", {event_category:"engagement", value:1});
  });

  if (cForm) cForm.addEventListener("submit", function(){
    window.gtag && gtag("event", "contact_submit", {event_category:"lead", value:1});
  });
});

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}
