
import { $, state, humanSize } from './core.js';
import { applyResizeDims, mimeFor } from './convert.js';
import { addFiles as originalAddFiles, clearList as originalClearList } from './files.js';

const livePreview = () => document.getElementById('livePreview');
const prevOrig = () => document.getElementById('prevOrig');
const prevOut  = () => document.getElementById('prevOut');
const metaOrig = () => document.getElementById('metaOrig');
const metaOut  = () => document.getElementById('metaOut');

function maxFit(w, h, maxW=520, maxH=360){
  const s = Math.min(maxW / w, maxH / h, 1);
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

async function drawToCanvas(canvas, bmp, targetW, targetH, bg=null){
  if (!canvas) return;
  canvas.width = targetW; canvas.height = targetH;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (bg){
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,targetW,targetH);
  }else{
    ctx.clearRect(0,0,targetW,targetH);
  }
  ctx.drawImage(bmp, 0, 0, bmp.width, bmp.height, 0, 0, targetW, targetH);
  return canvas;
}

export async function updatePreview(){
  const pv = livePreview();
  if (!pv) return;
  if (!state.files.length){
    pv.style.display = 'none';
    return;
  }
  try{
    const item = state.files[0];
    const bmp  = await createImageBitmap(item.file, { imageOrientation: 'from-image' }).catch(()=>null);
    if (!bmp){ pv.style.display='none'; return; }

    // Original
    const fitO = maxFit(bmp.width, bmp.height);
    await drawToCanvas(prevOrig(), bmp, fitO.w, fitO.h, null);
    if (metaOrig()) metaOrig().textContent = `${Math.round(bmp.width)}×${Math.round(bmp.height)} • ${humanSize(item.file.size)}`;

    // Output (simulate)
    const fmtEl = document.getElementById('fmtSelect');
    const qEl   = document.getElementById('quality');
    const bgEl  = document.getElementById('bgColor');
    const fmt     = fmtEl ? fmtEl.value : 'jpg';
    const q       = qEl ? parseFloat(qEl.value) : 0.92;
    const bg      = (fmt === 'jpg') ? (bgEl ? bgEl.value : '#ffffff') : null;

    const dims    = applyResizeDims(bmp.width, bmp.height);
    const targetW = (fmt==='ico') ? 256 : dims.w;
    const targetH = (fmt==='ico') ? 256 : dims.h;

    const temp = document.createElement('canvas');
    await drawToCanvas(temp, bmp, targetW, targetH, bg);
    let blob = await window.toBlobSafe(temp, mimeFor(fmt), (fmt==='jpg' || fmt==='webp') ? q : undefined);

    const outBmp = await createImageBitmap(blob);
    const fitOut  = maxFit(targetW, targetH);
    await drawToCanvas(prevOut(), outBmp, fitOut.w, fitOut.h, null);
    outBmp.close?.();

    if (metaOut()) metaOut().textContent = `${targetW}×${targetH} • ${humanSize(blob.size)}`;

    pv.style.display = '';
    bmp.close?.();
  }catch(e){
    console.error(e);
    livePreview().style.display = 'none';
  }
}

// Wire control changes
['#fmtSelect','#quality','#bgColor','#resizeMode','#percentVal','#maxWidth'].forEach(sel=>{
  const el = document.querySelector(sel);
  if (el) el.addEventListener('input', updatePreview);
  if (el) el.addEventListener('change', updatePreview);
});

// Wrap addFiles/clearList to trigger preview
export async function addFiles(files){
  await originalAddFiles(files);
  updatePreview();
}
export function clearList(){
  originalClearList();
  const pv = livePreview();
  if (pv) pv.style.display = 'none';
  if (prevOrig() && prevOrig().width && prevOrig().height) prevOrig().getContext('2d').clearRect(0,0,prevOrig().width,prevOrig().height);
  if (prevOut() && prevOut().width && prevOut().height) prevOut().getContext('2d').clearRect(0,0,prevOut().width,prevOut().height);
  if (metaOrig()) metaOrig().textContent=''; if (metaOut()) metaOut().textContent='';
}
