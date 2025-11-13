/* ===== 共通：保存/取得/ID/パスワード ===== */
const STORAGE_KEY = 'valo_lineups';
const ADMIN_PASS = 'may'; // ★必要なら変更

function readAll(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}
function writeAll(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
}
function genId(){ return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
function promptPass(){ return window.prompt('パスワードを入力') === ADMIN_PASS; }

const MAPS = ["Ascent","Bind","Breeze","Fracture","Haven","Icebox","Lotus","Pearl","Split","Sunset"];
const AGENTS = [
  "Astra","Breach","Brimstone","Chamber","Clove","Cypher","Deadlock","Fade","Gekko","Harbor","Iso","Jett",
  "KAY/O","Killjoy","Neon","Omen","Phoenix","Raze","Reyna","Sage","Skye","Sova","Viper","Vyse","Yoru"
];

function fillSelectOptions(sel, list){
  sel.innerHTML += list.map(v => `<option>${v}</option>`).join('');
}
function qs(s, root=document){ return root.querySelector(s); }
function qsa(s, root=document){ return Array.from(root.querySelectorAll(s)); }
function byId(id){ return document.getElementById(id); }

/* クリップボードの画像を DataURL で取得（クリック→Ctrl+V 用） */
function toDataUrlFromClipboard(){
  return new Promise((resolve, reject)=>{
    navigator.clipboard.read().then(async items=>{
      for (const item of items){
        for (const type of item.types){
          if (type.startsWith('image/')){
            const blob = await item.getType(type);
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(blob);
            return;
          }
        }
      }
      reject(new Error('画像クリップボードが見つかりません'));
    }).catch(reject);
  });
}
