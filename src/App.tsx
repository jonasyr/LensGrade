import { useEffect, useRef, useState } from "react";
import { Aperture, ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, ImagePlus, LoaderCircle, ShieldCheck, Sparkles, Trash2, X, Camera, ChartNoAxesCombined, Lightbulb } from "lucide-react";
import type { Report } from "./schema";

type Photo={id:string;name:string;preview:string;data:string;width:number;height:number;bytes:number};
const MAX=10;
const uid=()=>Math.random().toString(36).slice(2,10);
const links=(keywords:string[])=>{
 const q=encodeURIComponent(keywords.slice(0,5).join(" "));
 return [{name:"Adobe Stock",url:"https://stock.adobe.com/de/search?k="+q},{name:"Shutterstock",url:"https://www.shutterstock.com/search/"+q},{name:"iStock",url:"https://www.istockphoto.com/de/search/2/image?phrase="+q}];
};
async function prepare(file:File):Promise<Photo>{
 if(file.size>35*1024*1024)throw Error(file.name+": Datei größer als 35 MB.");
 if(!file.type.startsWith("image/")&&!/\.(heic|heif|jpg|jpeg|png|webp)$/i.test(file.name))throw Error(file.name+": Kein unterstütztes Bild.");
 let objectURL=URL.createObjectURL(file);
 let bitmap:ImageBitmap|undefined;
 try {
  let blob:Blob=file;
  try{bitmap=await createImageBitmap(blob,{imageOrientation:"from-image"});}catch{
   if(!/\.heic|\.heif/i.test(file.name)&&!file.type.includes("heic")&&!file.type.includes("heif"))throw Error(file.name+": Bild kann nicht gelesen werden.");
   const {default:heic2any}=await import("heic2any");
   const converted=await heic2any({blob:file,toType:"image/jpeg",quality:0.92});
   blob=Array.isArray(converted)?converted[0]:converted;
   bitmap=await createImageBitmap(blob);
  }
  const width=bitmap.width,height=bitmap.height;
  const scale=Math.min(1,1600/Math.max(width,height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("Bildverarbeitung im Browser nicht verfügbar.");
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  let quality=0.86;
  let data=canvas.toDataURL("image/jpeg",quality);
  while(data.length>2_800_000&&quality>0.4){quality-=0.1;data=canvas.toDataURL("image/jpeg",quality);}
  if(data.length>2_800_000)throw Error(file.name+": Bild konnte nicht klein genug konvertiert werden.");
  return {id:uid(),name:file.name,preview:objectURL,data,width,height,bytes:file.size};
 }catch(e){URL.revokeObjectURL(objectURL);throw e;}finally{bitmap?.close();}
}
function Meter({label,value}:{label:string;value:number}){return <div className="meter"><div className="meter-head"><span>{label}</span><strong>{value.toFixed(1)}<small> / 10</small></strong></div><div className="track"><div className="fill" style={{width:value*10+"%"}}/></div></div>;}
export default function App(){
 const [photos,setPhotos]=useState<Photo[]>([]);
 const [report,setReport]=useState<Report|null>(null);
 const [selection,setSelection]=useState(0);
 const [loading,setLoading]=useState(false);
 const [preparing,setPreparing]=useState(false);
 const [error,setError]=useState("");
 const input=useRef<HTMLInputElement>(null);
 const reportRef=useRef<HTMLDivElement>(null);
 useEffect(()=>()=>{photos.forEach(p=>URL.revokeObjectURL(p.preview));},[photos]);
 async function onFiles(files:FileList|null){
  if(!files?.length)return;
  setError("");setReport(null);setPreparing(true);
  const next:Photo[]=[];
  try {
   const existing=photos.length;
   if(existing+files.length>MAX)throw Error("Maximal "+MAX+" Bilder pro Vergleich.");
   for(const file of Array.from(files))next.push(await prepare(file));
   setPhotos(previous=>[...previous,...next]);
  }catch(e){next.forEach(p=>URL.revokeObjectURL(p.preview));setError(e instanceof Error?e.message:"Bild konnte nicht geöffnet werden.");}
  finally{setPreparing(false);if(input.current)input.current.value="";}
 }
 function remove(id:string){
  setPhotos(current=>{const p=current.find(x=>x.id===id);if(p)URL.revokeObjectURL(p.preview);return current.filter(x=>x.id!==id)});
  setReport(null);setSelection(0);setError("");
 }
 async function analyze(){
  setError("");setLoading(true);setReport(null);
  try{
   const response=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({photos:photos.map(({id,data})=>({id,data}))})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Unbekannter Fehler.");
   setReport(data);setSelection(0);
   requestAnimationFrame(()=>reportRef.current?.scrollIntoView({behavior:"smooth",block:"start"}));
  }catch(e){setError(e instanceof Error?e.message:"Analyse fehlgeschlagen.");}finally{setLoading(false);}
 }
 const selected=report?.photos[selection];
 const photo=selected?photos.find(p=>p.id===selected.id):undefined;
 return <main>
  <header className="topbar"><div className="brand"><div className="brandmark"><Aperture size={19}/></div><span>LensGrade</span><span className="beta">BETA</span></div><div className="header-right"><span className="header-label">PHOTO INTELLIGENCE</span><div className="status-dot"/></div></header>
  <section className="hero wrap"><div className="eyebrow"><Sparkles size={13}/> DEIN FOTO. NEU GESEHEN.</div><h1>Jedes Bild hat<br/><em>mehr Potenzial.</em></h1><p className="intro">Ehrliches Foto-Feedback, konkrete Tipps und ein frischer Blick auf dein Stockfoto-Potenzial. Alles an einem Ort.</p>
  <div className="benefits"><span><CheckCircle2 size={15}/> Fundierte KI-Kritik</span><span><CheckCircle2 size={15}/> Bilder vergleichen</span><span><CheckCircle2 size={15}/> Stock-Recherche</span></div></section>
  <section className="workspace wrap"><div className="section-heading"><div><div className="step">01 / DEINE AUSWAHL</div><h2>Fotos hinzufügen</h2><p>Ein Bild bewerten oder bis zu zehn Aufnahmen vergleichen.</p></div><div className="count">{photos.length.toString().padStart(2,"0")} <span>/ 10</span></div></div>
  <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={e=>onFiles(e.target.files)}/>
  <div className={"drop "+(photos.length?"with-photos":"")} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onFiles(e.dataTransfer.files)}}>
   {photos.length===0?<button className="empty-upload" disabled={preparing} onClick={()=>input.current?.click()}><span className="upload-icon">{preparing?<LoaderCircle className="spin"/>:<ImagePlus/>}</span><strong>{preparing?"Fotos werden vorbereitet":"Wähle deine Fotos aus"}</strong><span>Aus der Fotomediathek oder per Drag & Drop</span><span className="upload-action">Bilder auswählen <ArrowRight size={16}/></span><small>JPEG · PNG · WEBP · HEIC · Max. 10 Bilder</small></button>:
   <div className="photo-grid">{photos.map((p,i)=><div className="thumb" key={p.id}><img src={p.preview} alt={p.name}/><span className="thumb-number">{String(i+1).padStart(2,"0")}</span><button aria-label={p.name+" entfernen"} className="remove" onClick={()=>remove(p.id)}><X size={15}/></button><div className="thumb-info"><strong title={p.name}>{p.name}</strong><span>{p.width} × {p.height} px</span></div></div>)}{photos.length<MAX&&<button className="add-thumb" onClick={()=>input.current?.click()} disabled={preparing}><ImagePlus size={23}/><span>Weitere Fotos</span></button>}</div>}
  </div>
  <div className="under-upload"><div><ShieldCheck size={16}/><span>Keine dauerhafte Speicherung deiner Fotos</span></div><span>Max. 35 MB pro Originaldatei</span></div>
  {error&&<div className="error" role="alert">{error}</div>}
  {photos.length>0&&<div className="action-row"><button className="secondary" onClick={()=>{photos.forEach(p=>URL.revokeObjectURL(p.preview));setPhotos([]);setReport(null);setError("");setSelection(0)}}><Trash2 size={16}/> Zurücksetzen</button><button className="primary" disabled={loading||preparing} onClick={analyze}>{loading?<LoaderCircle className="spin" size={18}/>:<Sparkles size={18}/>} {loading?"Analyse läuft …":photos.length>1?"Fotos analysieren & vergleichen":"Foto analysieren"} {!loading&&<ArrowRight size={16}/>}</button></div>}
  </section>
  {report&&<section className="results wrap" ref={reportRef}><div className="section-heading"><div><div className="step">02 / DEINE ANALYSE</div><h2>Der LensGrade Report</h2><p>Eine begründete Bewertung, keine Verkaufsprognose.</p></div><div className="report-count"><CheckCircle2 size={15}/> Abgeschlossen</div></div>
   {report.photos.length>1&&<div className="comparison-banner"><div className="banner-icon"><ChartNoAxesCombined/></div><div><strong>Dein Fotovergleich</strong><p>{report.comparison?.reason||"Tippe auf ein Foto, um die Details zu sehen."}</p><div className="winners"><span>Beste Gesamtaufnahme: <b>#{photos.findIndex(p=>p.id===report.comparison?.bestOverallId)+1}</b></span><span>Beste Stock-Eignung: <b>#{photos.findIndex(p=>p.id===report.comparison?.bestStockId)+1}</b></span></div></div></div>}
   <div className="photo-tabs" role="tablist" aria-label="Foto auswählen">{report.photos.map((result,i)=><button className={selection===i?"active":""} role="tab" aria-selected={selection===i} key={result.id} onClick={()=>setSelection(i)}><img src={photos.find(p=>p.id===result.id)?.preview} alt=""/><span>Foto {i+1}</span></button>)}</div>
   {selected&&<div className="report-layout"><div className="report-image"><img src={photo?.preview} alt={selected.subject}/><div className="photo-meta"><span>{selected.subject}</span><span>{photo?.width} × {photo?.height} px</span></div></div><div className="report-detail"><div className="small-label">FOTOBEWERTUNG</div><h3>{selected.subject}</h3><p className="summary">{selected.summary}</p><div className="scores"><Meter label="Ästhetik" value={selected.aesthetic}/><Meter label="Technik" value={selected.technical}/><Meter label="Stock-Eignung" value={selected.stockSuitability}/></div><p className="disclaimer">Bewertungen sind subjektive KI-Einschätzungen, keine technischen Labormessungen oder Marktdaten.</p></div></div>}
   {selected&&<div className="detail-grid"><div className="panel"><div className="panel-title"><CheckCircle2 size={19}/> Was funktioniert</div><ul>{selected.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></div><div className="panel"><div className="panel-title"><Lightbulb size={19}/> So wird's besser</div><div className="improvements">{selected.improvements.map((item,i)=><div className="tip" key={i}><span className="tip-number">{String(i+1).padStart(2,"0")}</span><div><strong>{item.title}</strong><p>{item.why}</p><p className="how">{item.how}</p></div></div>)}</div></div></div>}
   {selected&&<div className="stock-panel"><div className="stock-heading"><div><div className="step">03 / MARKT-RECHERCHE</div><h2>Ähnliche Stockfotos finden</h2><p>Suche nach vergleichbaren Motiven auf echten Stockplattformen.</p></div><ExternalLink size={21}/></div><div className="tags">{selected.stockKeywords.map(k=><span key={k}>{k}</span>)}</div><div className="stock-links">{links(selected.stockKeywords).map(link=><a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer">{link.name}<ExternalLink size={16}/></a>)}</div><p className="footnote">Dies sind Stichwort-Suchen, keine visuelle Ähnlichkeitssuche. Preise, Verkaufszahlen und Marktnachfrage werden nicht geschätzt. Die Links öffnen externe Anbieter.</p>{selected.stockUseCases.length>0&&<div className="uses"><strong>Mögliche Nutzungen:</strong> {selected.stockUseCases.join(" · ")}</div>}</div>}
   <button className="new-analysis" onClick={()=>{setReport(null);setSelection(0);window.scrollTo({top:0,behavior:"smooth"})}}><ArrowLeft size={16}/> Weitere Analyse starten</button>
  </section>}
  <footer className="footer wrap"><div className="brand"><Aperture size={17}/><span>LensGrade</span></div><span>Mit Liebe zum Detail. Ohne erfundene Marktversprechen.</span><span>© {new Date().getFullYear()} LensGrade</span></footer>
 </main>;
}
