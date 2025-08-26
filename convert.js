
import { $, state, ensureZipLibs, humanSize, setOutInfo, setDownloadBtn, updateRowStatus, updateProgress, toast } from './core.js';

export function extFor(fmt){ return fmt==='jpg'?'jpg':fmt==='ico'?'ico':fmt; }
export function mimeFor(fmt){ return fmt==='jpg'?'image/jpeg':fmt==='png'?'image/png':fmt==='webp'?'image/webp':'image/png'; }

export async function wrapPngAsIco(pngBlob){
  const png=new Uint8Array(await pngBlob.arrayBuffer());
  const headerSize=22; const out=new Uint8Array(headerSize+png.length); const dv=new DataView(out.buffer);
  dv.setUint16(0,0,true); dv.setUint16(2,1,true); dv.setUint16(4,1,true);
  out[6]=0; out[7]=0; out[8]=0; out[9]=0;
  dv.setUint16(10,1,true); dv.setUint16(12,32,true);
  dv.setUint32(14,png.length,true); dv.setUint32(18,headerSize,true);
  out.set(png, headerSize);
  return new Blob([out], { type:'image/x-icon' });
}

export function applyResizeDims(srcW, srcH){
  const mode=$('#resizeMode').value;
  if(mode==='percent'){
    const p=Math.max(10, Math.min(200, parseInt($('#percentVal').value||'100',10)));
    return { w: Math.max(1, Math.round(srcW*p/100)), h: Math.max(1, Math.round(srcH*p/100)) };
  }
  if(mode==='maxw'){
    const maxW=Math.max(64, parseInt($('#maxWidth').value||'1000',10));
    if(srcW<=maxW) return { w: srcW, h: srcH };
    const scale=maxW/srcW;
    return { w: Math.round(srcW*scale), h: Math.round(srcH*scale) };
  }
  return { w: srcW, h: srcH };
}

export async function convertOne(item, fmt, quality, bgColor){
  const bmp=await createImageBitmap(item.file, { imageOrientation: 'from-image' }).catch(()=>null);
  const sourceW=bmp?bmp.width:item.imgW, sourceH=bmp?bmp.height:item.imgH;
  const dims=applyResizeDims(sourceW, sourceH);
  const targetW = (fmt==='ico') ? 256 : dims.w;
  const targetH = (fmt==='ico') ? 256 : dims.h;

  let canvas=document.createElement('canvas'), ctx=canvas.getContext('2d');
  canvas.width=targetW; canvas.height=targetH;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if(fmt==='ico'){
    ctx.clearRect(0,0,256,256);
    const scale=Math.min(256/sourceW,256/sourceH);
    const w=Math.max(1,Math.round(sourceW*scale)), h=Math.max(1,Math.round(sourceH*scale));
    const dx=(256-w)/2, dy=(256-h)/2;
    if(bmp) ctx.drawImage(bmp,dx,dy,w,h);
    else{const img=new Image(); img.src=item.url; await img.decode(); ctx.drawImage(img,dx,dy,w,h);}
    const pngBlob=await window.toBlobSafe(canvas,'image/png',1);
    const icoBlob=await wrapPngAsIco(pngBlob);
    bmp?.close?.();
    return { blob: icoBlob, outW:256, outH:256 };
  }

  if(fmt==='jpg'){ ctx.fillStyle=bgColor||'#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); }
  else{ ctx.clearRect(0,0,canvas.width,canvas.height); }

  if(bmp) ctx.drawImage(bmp,0,0,sourceW,sourceH,0,0,targetW,targetH);
  else{ const img=new Image(); img.src=item.url; await img.decode(); ctx.drawImage(img,0,0,sourceW,sourceH,0,0,targetW,targetH); }
  bmp?.close?.();

  const mime=mimeFor(fmt); const q=(fmt==='jpg'||fmt==='webp')?quality:undefined;
  const blob = await window.toBlobSafe(canvas, mime, q);
  return { blob, outW: targetW, outH: targetH };
}

export async function runConversion(){
  if (!state.files.length) return;
  await ensureZipLibs();
  state.zip = new JSZip();
  state.convertedCount = 0;

  const fmt     = $('#fmtSelect').value;
  const quality = parseFloat($('#quality').value);
  const bg      = $('#bgColor').value;

  for (const item of state.files) updateRowStatus(item.id, 'Processing…');

  let done = 0, total = state.files.length;
  updateProgress(0, total);

  const used = new Set();
  function uniqueName(base, ext){
    let name = `${base}.${ext}`, i=1;
    while(used.has(name)){ name = `${base} (${i++}).${ext}`; }
    used.add(name); return name;
  }

  for (const item of state.files) {
    try {
      const base    = item.file.name.replace(/\.[^.]+$/, '') || 'image';
      const outName = uniqueName(base, extFor(fmt));

      const { blob, outW, outH } = await convertOne(item, fmt, quality, bg);

      item.outBlob = blob;
      item.outName = outName;

      setOutInfo(item.id, `${outW}×${outH} (${humanSize(blob.size)})`);
      setDownloadBtn(item.id, outName, blob);
      updateRowStatus(item.id, 'Ready');

      state.zip.file(outName, blob);
      state.convertedCount++;
    } catch (e) {
      console.error(e);
      updateRowStatus(item.id, 'Failed');
    }
    done++;
    updateProgress(done, total);
  }

  const zipBtn = $('#zipBtn');
  const canZip = state.convertedCount > 0;
  zipBtn.disabled = !canZip;
  zipBtn.setAttribute('aria-disabled', canZip ? 'false' : 'true');
  if (canZip) toast();
}

export async function downloadZip(){
  if(!state.convertedCount) return;
  await ensureZipLibs();
  const blob=await state.zip.generateAsync({ type:'blob', streamFiles:true });
  saveAs(blob, 'converted_images.zip');
}

export function toggleControls(){
  const fmt=$('#fmtSelect').value;
  $('#qualityWrap').style.display=(fmt==='jpg'||fmt==='webp')?'':'none';
  $('#bgWrap').style.display=(fmt==='jpg')?'':'none';
}
