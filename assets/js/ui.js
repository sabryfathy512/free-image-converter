
import { $, i18n, setLang } from './core.js';

export function applyLang(l){
  setLang(l); const t=i18n[l];
  document.documentElement.lang=l;
  document.documentElement.dir=(l==='ar')?'rtl':'ltr';
  $('#appTitle').textContent=t.title; $('#freeBadge').textContent=t.badge;

  document.title = (l==='en')
    ? "Free Image Converter | JPG to PNG, WebP, ICO Online (No Sign-Up)"
    : "محوّل صيغ الصور مجانًا | JPG إلى PNG و WebP و ICO (بدون تسجيل)";
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.lead);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', t.lead);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', t.lead);

  $('#lead').textContent=t.lead;
  $('#lblFormat').textContent=t.lblFormat; $('#fmtHint').textContent=t.fmtHint;
  $('#lblQuality').textContent=t.lblQuality; $('#lblBG').textContent=t.lblBG; $('#bgHint').textContent=t.bgHint;
  $('#lblResize').textContent=t.lblResize; $('#resizeHint').textContent=t.resizeHint;
  $('#lblPercent').textContent=t.lblPercent; $('#lblMaxW').textContent=t.lblMaxW;
  $('#pickBtn').textContent=t.choose; $('#clearBtn').textContent=t.clear; $('#privacyNote').textContent=t.privacyNote;
  $('#dropTitle').textContent=t.dropTitle; $('#dropHint').textContent=t.dropHint;
  $('#convertBtn').textContent=t.convert; $('#zipBtn').textContent=t.zip;
  $('#faqTitle').textContent=t.notes;
  const thead = document.querySelector('#fileTable thead');
  if (thead){
    thead.innerHTML = `
      <tr>
        <th scope="col">${t.preview}</th><th scope="col">${t.file}</th>
        <th class="nowrap" scope="col">${t.original}</th><th class="nowrap" scope="col">${t.output}</th>
        <th scope="col">${t.status}</th><th scope="col">${t.download}</th>
      </tr>`;
  }
  $('#toast').textContent=t.toast;
  $('#btnEN').setAttribute('aria-pressed', l==='en'); $('#btnAR').setAttribute('aria-pressed', l==='ar');
}

export function setTheme(mode){
  document.documentElement.removeAttribute('data-theme');
  if(mode==='light' || mode==='dark'){ document.documentElement.setAttribute('data-theme', mode); }
  $('#themeLight').setAttribute('aria-pressed', mode==='light');
  $('#themeDark').setAttribute('aria-pressed', mode==='dark');
  $('#themeAuto').setAttribute('aria-pressed', mode!=='light' && mode!=='dark');
  try{ localStorage.setItem('theme', mode); }catch{}
}

export function wireUI(){
  // Language & Theme toggles
  $('#btnEN')?.addEventListener('click',()=>applyLang('en'));
  $('#btnAR')?.addEventListener('click',()=>applyLang('ar'));
  applyLang('en');

  const savedTheme = (()=>{ try{ return localStorage.getItem('theme') || 'auto'; }catch{ return 'auto'; } })();
  setTheme(savedTheme);
  $('#themeLight')?.addEventListener('click',()=>setTheme('light'));
  $('#themeDark')?.addEventListener('click',()=>setTheme('dark'));
  $('#themeAuto')?.addEventListener('click',()=>setTheme('auto'));

  // Modals
  document.querySelectorAll('a[data-modal]')?.forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      const id=a.getAttribute('data-modal'); const dlg=document.getElementById(id);
      dlg?.showModal();
    });
  });
  document.querySelectorAll('dialog [data-close]')?.forEach(b=>{
    b.addEventListener('click', e=> e.target.closest('dialog')?.close());
  });

  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Icons
  const map = [
    ['pickBtn','📂 '],
    ['clearBtn','🧹 '],
    ['convertBtn','⚡ '],
    ['zipBtn','🗜️ ']
  ];
  for (const [id, icon] of map){
    const el = document.getElementById(id);
    if (el && !el.dataset.iconized){
      el.dataset.iconized = '1';
      el.insertAdjacentText('afterbegin', icon);
    }
  }
}
