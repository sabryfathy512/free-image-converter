
export const $ = (s) => document.querySelector(s);

export const i18n = {
  en: {
    title: "Free Image Converter",
    badge: "Free forever · No login",
    lead: "Free forever. No sign-up. No uploads. Convert between JPG, PNG, WebP, and ICO with drag-and-drop, batch processing, optional resize, and ZIP download. Ad-supported.",
    lblFormat: "Output format",
    fmtHint: "JPG/WebP allow quality setting. ICO is a 256×256 PNG inside an ICO header.",
    lblQuality: "Quality (JPG/WebP)",
    lblBG: "Background for JPG (transparent areas)",
    bgHint: "Used only when output is JPG.",
    lblResize: "Resize before convert (optional)",
    resizeHint: "Reduce size for faster processing on low-memory devices.",
    lblPercent: "Scale percentage",
    lblMaxW: "Max width (px)",
    choose: "Choose Files",
    clear: "Clear List",
    privacyNote: "Free · No login · All processing in your browser.",
    dropTitle: "Drag & drop images",
    dropHint: "JPG, PNG, WebP, ICO. Batch supported. *Large images work; device memory is the only limit.",
    convert: "Convert",
    zip: "Download All (ZIP)",
    notes: "Notes",
    preview: "Preview", file: "File", original: "Original", output: "Output",
    status: "Status", download: "Download", done: "Ready", processing: "Processing…",
    failed: "Failed", toast: "✅ Conversion complete",
    altThumb: "Thumbnail preview"
  },
  ar: {
    title: "محوّل صيغ الصور مجانًا",
    badge: "مجاني دائمًا · بدون تسجيل",
    lead: "مجاني للأبد. بدون تسجيل أو رفع. تحويل بين ‎JPG‎ و‎PNG‎ و‎WebP‎ و‎ICO مع السحب والإفلات، معالجة دُفعية، تغيير الحجم اختياري، وتنزيل ZIP. مدعوم بالإعلانات.",
    lblFormat: "صيغة الإخراج",
    fmtHint: "يمكن ضبط الجودة لملفي JPG وWebP. يتم إنشاء ICO من ‎PNG بحجم ‎256×256 داخل ملف ICO.",
    lblQuality: "الجودة (JPG/WebP)",
    lblBG: "لون الخلفية لملف JPG (للمناطق الشفافة)",
    bgHint: "يُستخدم فقط عند اختيار JPG.",
    lblResize: "تغيير الحجم قبل التحويل (اختياري)",
    resizeHint: "تقليل الحجم لتسريع المعالجة على الأجهزة محدودة الذاكرة.",
    lblPercent: "نسبة التصغير/التكبير",
    lblMaxW: "أقصى عرض (بكسل)",
    choose: "اختر الملفات",
    clear: "مسح القائمة",
    privacyNote: "مجاني · بدون تسجيل · كل المعالجة داخل متصفحك.",
    dropTitle: "اسحب وأفلت الصور هنا",
    dropHint: "JPG, PNG, WebP, ICO — يدعم الدُفعات. *تعمل مع الصور الكبيرة؛ الحد فقط هو ذاكرة جهازك.",
    convert: "تحويل",
    zip: "تنزيل الكل (ZIP)",
    notes: "ملاحظات",
    preview: "معاينة", file: "الملف", original: "الأصلي", output: "الإخراج",
    status: "الحالة", download: "تنزيل", done: "جاهز", processing: "جارٍ المعالجة…",
    failed: "فشل", toast: "✅ تم إكمال التحويل",
    altThumb: "صورة مُصغّرة"
  }
};

export let lang = 'en';
export function setLang(l){ lang = l; }

export const state = { files: [], zip: null, convertedCount: 0 };

export function humanSize(b){const u=["B","KB","MB","GB"];let i=0,n=b;while(n>=1024&&i<u.length-1){n/=1024;i++}return `${n.toFixed(n<10&&i>0?2:0)} ${u[i]}`}
export function toast(){const el=$('#toast');el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
export function updateRowStatus(id,txt){const el=$(`#st-${id}`); if(el) el.textContent=txt}
export function setOutInfo(id,txt){const el=$(`#out-${id}`); if(el) el.textContent=txt}
export function setDownloadBtn(id,name,blob){
  const td=$(`#dl-${id}`); if(!td) return;
  td.innerHTML='';
  const b=document.createElement('button');
  b.className='btn secondary';
  b.textContent=i18n[lang].download || 'Download';
  b.setAttribute('aria-label','Download '+name);
  b.addEventListener('click',()=>saveAs(blob,name));
  td.appendChild(b);
}
export function updateProgress(done,total){
  const progressBar = $('#progressBar');
  const progressText = $('#progressText');
  const pct = total? Math.round((done/total)*100) : 0;
  if(progressBar) progressBar.style.width = pct + '%';
  if(progressText) progressText.textContent = pct + '%';
  const bar = document.querySelector('.progress');
  if (bar){
    bar.setAttribute('role','progressbar');
    bar.setAttribute('aria-valuemin','0'); bar.setAttribute('aria-valuemax','100');
    bar.setAttribute('aria-valuenow', String(pct));
  }
}

export function loadScript(src){
  return new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
export async function ensureZipLibs(){
  if(!window.JSZip){
    await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
  }
  if(!window.saveAs){
    await loadScript('https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js');
    if(typeof window.saveAs!=='function'){
      window.saveAs=function(b,n){
        const a=document.createElement('a'),u=URL.createObjectURL(b);
        a.href=u;a.download=n||'download';document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(u),1000);
      };
    }
  }
}

// Polyfill toBlobSafe
if (!window.__toBlobSafeInstalled){
  window.__toBlobSafeInstalled = true;
  window.toBlobSafe = function(canvas, mime, q){
    return new Promise(function(resolve){
      try {
        canvas.toBlob(function(b){
          if(!b && mime === 'image/webp'){
            canvas.toBlob(function(b2){ resolve(b2); }, 'image/png', 1);
          } else {
            resolve(b);
          }
        }, mime, q);
      } catch(e){
        canvas.toBlob(function(b2){ resolve(b2); }, 'image/png', 1);
      }
    });
  };
}
