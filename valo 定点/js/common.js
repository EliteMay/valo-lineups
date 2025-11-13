/* ===== マスター候補 ===== */
const MAP_OPTIONS_RAW = [
  "Ascent","Bind","Breeze","Fracture","Haven","Icebox","Lotus","Pearl","Split","Sunset"
];
const MAP_OPTIONS = MAP_OPTIONS_RAW.slice().sort((a,b)=>a.localeCompare(b,'ja'));

const AGENT_OPTIONS_RAW = [
  "Astra","Breach","Brimstone","Chamber","Clove","Cypher","Deadlock","Fade",
  "Gekko","Harbor","Iso","Jett","KAY/O","Killjoy","Neon","Omen","Phoenix",
  "Raze","Reyna","Sage","Skye","Sova","Viper","Vyse","Yoru"
];
const AGENT_OPTIONS = AGENT_OPTIONS_RAW.slice().sort((a,b)=>a.localeCompare(b,'ja'));

const TAG_OPTIONS = [
  "one-way","ジャンプ","走り投げ","歩き投げ","しゃがみ",
  "左クリック","右クリック","中クリック","ラインアップ","ラン投げ",
  "バウンド","ダブルバウンド","フラッシュ合わせ","セットプレイ",
  "リテイク","ポストプラント","ラッシュ止め","サイト取り","情報取り","壁抜き","研究中"
];

/* ===== ストレージ ===== */
const STORAGE_KEY = "valo_lineups_v2";
const STORAGE_TRASH = "valo_trash_v2";
const STORAGE_BACKUP_DAY = "valo_backup_day";

function createLineupId(){
  return "L"+Math.random().toString(36).slice(2,10)+Date.now().toString(36);
}
function loadLineups(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); } catch { return []; }
}
function saveLineups(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function loadTrash(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_TRASH)||"[]"); } catch { return []; }
}
function saveTrash(list){
  localStorage.setItem(STORAGE_TRASH, JSON.stringify(list));
}

/* エクスポート/インポート */
function exportLineups(){
  const list = loadLineups();
  const blob = new Blob([JSON.stringify(list,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `lineups-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  navigator.clipboard?.writeText(JSON.stringify(list)).catch(()=>{});
  return list.length;
}
function importLineupsFromText(text){
  const incoming = JSON.parse(text);
  if (!Array.isArray(incoming)) throw new Error("配列JSONではありません");
  const byId = Object.fromEntries(loadLineups().map(x=>[x.id,x]));
  let added=0, updated=0;
  for (const it of incoming){
    if (!it.id) it.id = createLineupId();
    if (byId[it.id]) { byId[it.id] = {...byId[it.id], ...it}; updated++; }
    else { byId[it.id] = it; added++; }
  }
  const merged = Object.values(byId).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  saveLineups(merged);
  return {added, updated, total: merged.length};
}

/* 画像縮小（長辺 1600px） */
async function downscaleImageToDataUrl(fileOrDataUrl, max=1600){
  let imgSrc;
  if (typeof fileOrDataUrl === "string") imgSrc = fileOrDataUrl;
  else imgSrc = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(fileOrDataUrl); });
  const img = await new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.src=imgSrc; });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
  const cvs = document.createElement("canvas"); cvs.width = w; cvs.height = h;
  cvs.getContext("2d").drawImage(img, 0, 0, w, h);
  return cvs.toDataURL("image/jpeg", 0.9);
}

/* タグ */
function parseTags(s){ return (s||"").split(",").map(t=>t.trim()).filter(Boolean); }
function tagsToString(arr){ return (arr||[]).join(", "); }

/* 1日1回 自動バックアップ（ダウンロード＆クリップボード） */
function autoBackupOncePerDay(){
  const today = new Date().toISOString().slice(0,10);
  const last = localStorage.getItem(STORAGE_BACKUP_DAY);
  if (last === today) return;
  localStorage.setItem(STORAGE_BACKUP_DAY, today);
  exportLineups();
}
