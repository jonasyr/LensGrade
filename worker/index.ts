import { reportSchema } from "../src/schema";
interface Env { OPENAI_API_KEY?: string; ASSETS: Fetcher; }
const headers = { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" };
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname==="/api/health") return json({ok:true,configured:!!env.OPENAI_API_KEY});
  if(url.pathname!=="/api/analyze") return env.ASSETS.fetch(request);
  if(request.method!=="POST") return json({error:"Method not allowed"},405);
  if(!env.OPENAI_API_KEY) return json({error:"Der Server ist noch nicht für KI-Analysen konfiguriert. OPENAI_API_KEY fehlt."},503);
  const length=Number(request.headers.get("content-length")||0);
  if(length>22_000_000) return json({error:"Anfrage ist zu groß."},413);
  let body:any;
  try { body=await request.json(); } catch {return json({error:"Ungültiges JSON."},400);}
  const photos=body?.photos;
  if(!Array.isArray(photos)||photos.length<1||photos.length>10) return json({error:"Bitte 1 bis 10 Bilder auswählen."},400);
  if(photos.some((p:any)=>typeof p?.id!=="string"||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p?.data||"")||p.data.length>3_000_000)) return json({error:"Bildformat oder Bildgröße nicht unterstützt."},400);
  const instructions=`Du bist ein anspruchsvoller, fairer Fotokritiker für Hobbyfotografie und Stockfoto-Eignung. Antworte auf Deutsch. Bewerte jeden Bild-Kandidaten anhand sichtbarer Bildmerkmale, mit ganzen oder halben Punkten von 0 bis 10. Technisch unsichere Beobachtungen nicht als gemessene Fakten darstellen. Marktnachfrage, Verkaufspreise, Verkaufszahlen niemals erfinden. Eignung zur kommerziellen Nutzung ist nur eine Einschätzung. Gib konkrete ausführbare Verbesserungsschritte statt generischem Lob. Bei mehreren Aufnahmen vergleiche relativ und benenne die beste Gesamtaufnahme und die beste für Stock. Jede id unverändert zurückgeben. stockKeywords: englische Suchbegriffe, kurz und spezifisch. Benutze ausschließlich gültiges JSON im verlangten Schema.`;
  const content:any[]=[{type:"input_text",text:instructions}];
  for(const p of photos) {content.push({type:"input_text",text:"Foto-ID: "+p.id});content.push({type:"input_image",image_url:p.data,detail:"high"});}
  const schema={type:"object",additionalProperties:false,required:["photos","comparison"],properties:{
   photos:{type:"array",items:{type:"object",additionalProperties:false,required:["id","subject","summary","aesthetic","technical","stockSuitability","strengths","improvements","stockKeywords","stockUseCases"],properties:{
    id:{type:"string"},subject:{type:"string"},summary:{type:"string"},aesthetic:{type:"number"},technical:{type:"number"},stockSuitability:{type:"number"},strengths:{type:"array",items:{type:"string"}},improvements:{type:"array",items:{type:"object",additionalProperties:false,required:["title","why","how"],properties:{title:{type:"string"},why:{type:"string"},how:{type:"string"}}}},stockKeywords:{type:"array",items:{type:"string"}},stockUseCases:{type:"array",items:{type:"string"}}}}},
   comparison:{anyOf:[{type:"object",additionalProperties:false,required:["bestOverallId","bestStockId","reason"],properties:{bestOverallId:{type:"string"},bestStockId:{type:"string"},reason:{type:"string"}}},{type:"null"}]}
  }};
  try {
   const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),90000);
   let response:Response;
   try { response=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:abort.signal,headers:{"Authorization":"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4.1-mini",input:[{role:"user",content}],text:{format:{type:"json_schema",name:"lensgrade_report",strict:true,schema}},max_output_tokens:3500})});}finally{clearTimeout(timeout);}
   if(!response.ok) return json({error:response.status===429?"KI-Dienst derzeit ausgelastet.":"Analyse derzeit nicht verfügbar."},502);
   const data:any=await response.json();
   const output=(data.output||[]).flatMap((x:any)=>x.content||[]).find((x:any)=>x.type==="output_text")?.text;
   if(!output) return json({error:"Die KI hat keinen auswertbaren Bericht zurückgegeben."},502);
   const parsed=reportSchema.parse(JSON.parse(output));
   if(parsed.photos.length!==photos.length||parsed.photos.some((p,i)=>p.id!==photos[i].id)) return json({error:"Bericht passt nicht zur Bildauswahl."},502);
   return json(parsed);
  }catch{return json({error:"Analyse fehlgeschlagen. Bitte später erneut versuchen."},502);}
 }
};
