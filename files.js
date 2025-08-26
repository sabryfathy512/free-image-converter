
import { $, state, updateProgress, updateRowStatus } from './core.js';

export function makeRow(item){
  const tr=document.createElement('tr');
  tr.id=`row-${item.id}`;
  const alt = "Thumbnail: " + (item.file?.name || "image");
  tr.innerHTML=`
    <td><img class="thumb" src="${item.thumbUrl}" alt="${alt}"></td>
    <td class="nowrap">${item.file.name}</td>
    <td>${Math.round(item.imgW)}×${Math.round(item.imgH)}</td>
    <td id="out-${item.id}">—</td>
    <td id="st-${item.id}">—</td>
    <td id="dl-${item.id}">—</td>`;
  return tr;
}

export function acceptFiles(files){
  const okTypes = /^(image\/(png|jpeg|webp|avif|gif|bmp|x-icon|vnd\.microsoft\.icon))$/i;
  return Array.from(files).filter(f => okTypes.test(f.type) || /\.ico$/i.test(f.name));
}

export async function analyzeFile(file){
  const url=URL.createObjectURL(file);
  try{
    const bmp=await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(()=>null);
    if(bmp){
      const width=bmp.width,height=bmp.height;
      let tCanvas,ctx;
      if(typeof OffscreenCanvas!=='undefined'){tCanvas=new OffscreenCanvas(52,52); ctx=tCanvas.getContext('2d')}
      else{tCanvas=document.createElement('canvas'); tCanvas.width=52; tCanvas.height=52; ctx=tCanvas.getContext('2d')}
      const scale=Math.min(52/width,52/height), w=Math.max(1,Math.round(width*scale)), h=Math.max(1,Math.round(height*scale));
      ctx.clearRect(0,0,52,52);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bmp,(52-w)/2,(52-h)/2,w,h);
      const blob=tCanvas.convertToBlob? await tCanvas.convertToBlob() : await new Promise(r=>tCanvas.toBlob(r,'image/png'));
      const thumbUrl=URL.createObjectURL(blob);
      bmp.close?.();
      return { url, imgW: width, imgH: height, thumbUrl };
    }else{
      const img=await new Promise((res,rej)=>{const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=url;});
      const c=document.createElement('canvas'); c.width=52; c.height=52; const ctx=c.getContext('2d');
      const scale=Math.min(52/img.width,52/img.height), w=Math.max(1,Math.round(img.width*scale)), h=Math.max(1,Math.round(img.height*scale));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img,(52-w)/2,(52-h)/2,w,h);
      const blob=await new Promise(r=>c.toBlob(r,'image/png'));
      const thumbUrl=URL.createObjectURL(blob);
      return { url, imgW: img.width, imgH: img.height, thumbUrl };
    }
  }catch(e){ URL.revokeObjectURL(url); throw e; }
}

export async function addFiles(files){
  const fileBody = $('#fileBody');
  const accepted = acceptFiles(files);
  for(const file of accepted){
    const info=await analyzeFile(file).catch(()=>null);
    if(!info) continue;
    const item={ id:Date.now()+Math.random(), file, url:info.url, thumbUrl:info.thumbUrl, imgW:info.imgW, imgH:info.imgH, status:'pending', outBlob:null, outName:null };
    state.files.push(item);
    fileBody.appendChild(makeRow(item));
    updateRowStatus(item.id,'—');
  }
  $('#zipBtn').disabled=true;
  $('#zipBtn').setAttribute('aria-disabled','true');
  updateProgress(0, state.files.length);
}

export function clearList(){
  state.files.forEach(f=>{ URL.revokeObjectURL(f.url); URL.revokeObjectURL(f.thumbUrl); });
  state.files.length = 0;
  state.zip = null;
  state.convertedCount = 0;
  const fileBody = $('#fileBody');
  if (fileBody) fileBody.innerHTML = '';
  $('#zipBtn').disabled = true;
  $('#zipBtn').setAttribute('aria-disabled','true');
  updateProgress(0,0);
}

export function wireFileInputs(){
  $('#pickBtn')?.addEventListener('click',()=>$('#picker').click());
  $('#picker')?.addEventListener('change',e=>addFiles(e.target.files));

  const drop=$('#drop');
  if (drop){
    ['dragenter','dragover'].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();drop.classList.add('dragover')}));
    ['dragleave','drop'].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();drop.classList.remove('dragover')}));
    drop.addEventListener('drop',e=>{const dt=e.dataTransfer; if(dt?.files?.length) addFiles(dt.files)});
  }
  ['dragover','drop'].forEach(evt=>{
    window.addEventListener(evt, e=>{ e.preventDefault(); });
  });
}
