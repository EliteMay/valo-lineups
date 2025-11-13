document.addEventListener("DOMContentLoaded", () => {
  const mapInput   = document.getElementById("mapInput");
  const agentInput = document.getElementById("agentInput");
  const sideInput  = document.getElementById("sideInput");
  const siteInput  = document.getElementById("siteInput");
  const usageInput = document.getElementById("usageInput");
  const posInput   = document.getElementById("posInput");
  const diffInput  = document.getElementById("diffInput");
  const statusInput= document.getElementById("statusInput");
  const descInput  = document.getElementById("descInput");
  const extraInput = document.getElementById("extraInput");
  const tagsHidden = document.getElementById("tagsInput");
  const starInput  = document.getElementById("starInput");

  const form       = document.getElementById("lineupForm");
  const resetBtn   = document.getElementById("resetBtn");
  const clearAllBtn= document.getElementById("clearAllBtn");
  const messageEl  = document.getElementById("message");
  const exportBtn  = document.getElementById("exportBtn");
  const importBtn  = document.getElementById("importBtn");

  const pasteSlots = document.querySelectorAll(".paste-slot");
  let currentSlot  = null;
  let tempImages   = { img1:null, img2:null, img3:null, img4:null, img5:null };

  // 候補（名前順）
  MAP_OPTIONS.forEach(m => { const o=document.createElement("option"); o.value=m; o.textContent=m; mapInput.appendChild(o); });
  AGENT_OPTIONS.forEach(a => { const o=document.createElement("option"); o.value=a; o.textContent=a; agentInput.appendChild(o); });

  // タグ（選択式チップ）
  const tagsSelect = document.getElementById("tagsSelect");
  const selectedTags = new Set();
  function renderTagsSelect(){
    if (!tagsSelect) return;
    tagsSelect.innerHTML = "";
    TAG_OPTIONS.forEach(t=>{
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (selectedTags.has(t) ? " chip-on" : "");
      b.textContent = t;
      b.addEventListener("click", ()=>{
        if (selectedTags.has(t)) selectedTags.delete(t); else selectedTags.add(t);
        tagsHidden.value = Array.from(selectedTags).join(", ");
        renderTagsSelect();
      });
      tagsSelect.appendChild(b);
    });
  }
  if (tagsSelect) renderTagsSelect();

  // 画像枠の選択
  pasteSlots.forEach(slot => {
    slot.addEventListener("click", () => {
      pasteSlots.forEach(s => s.classList.remove("active"));
      slot.classList.add("active");
      currentSlot = slot.dataset.slot;
      setMessage("");
    });
  });

  // 画像ペースト（Win+Shift+S → クリックで枠選択 → Ctrl+V）
  window.addEventListener("paste", async e => {
    if (!currentSlot) return;
    const cd = e.clipboardData || e.originalEvent?.clipboardData;
    if (!cd) return;
    let file = null;
    for (const it of cd.items) if (it.type && it.type.startsWith("image/")) { file = it.getAsFile(); break; }
    if (!file) return;
    const dataUrl = await downscaleImageToDataUrl(file, 1600);
    tempImages[currentSlot] = dataUrl;
    const el = document.querySelector(`.paste-slot[data-slot="${currentSlot}"]`);
    el.innerHTML = `<img src="${dataUrl}" alt="">`;
  });

  function resetPaste() {
    tempImages = { img1:null, img2:null, img3:null, img4:null, img5:null };
    pasteSlots.forEach(el => {
      el.classList.remove("active");
      const s = el.dataset.slot;
      el.textContent = (
        s==="img1" ? "画像1（ミニマップ全体）" :
        s==="img2" ? "画像2（画面全体）" :
        s==="img3" ? "画像3（合わせる位置）" :
        s==="img4" ? "画像4（立ち位置 / 成立時）" :
                     "画像5（非成立 / 相手視点）"
      );
    });
    currentSlot = null;
  }

  function setMessage(text, isError=false) {
    messageEl.textContent = text;
    messageEl.className = "message" + (isError ? " error" : "");
  }

  function isDuplicateCandidate(list, item){
    return list.some(x =>
      x.map===item.map && x.agent===item.agent &&
      x.side===item.side && x.site===item.site &&
      (x.pos||"").toLowerCase()===(item.pos||"").toLowerCase()
    );
  }

  // ★ 保存時だけ Functions（/auth-check）でPW確認
  async function verifyPasswordOnce(){
    const pw = prompt("保存用パスワードを入力してください");
    if (!pw) return false;
    try{
      const res = await fetch("/auth-check", {
        method: "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({ password: pw })
      });
      if (res.status === 204) return true;
      alert("パスワードが違います。");
      return false;
    }catch(e){
      alert("認証サーバに接続できません。");
      return false;
    }
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    setMessage("");

    const map   = mapInput.value;
    const agent = agentInput.value;
    const side  = sideInput.value;
    const site  = siteInput.value;
    const usage = usageInput.value;
    const pos   = posInput.value.trim();
    const diff  = diffInput.value;
    const st    = statusInput.value;
    const desc  = (descInput.value||"").trim();
    const extra = (extraInput.value||"").trim();
    const tags  = parseTags(tagsHidden.value);
    const star  = !!starInput.checked;

    if (!map || !agent || !side || !site || !usage || !pos) {
      setMessage("必須項目が空です。", true); return;
    }
    if (!tempImages.img1) { setMessage("画像1（ミニマップ全体）を貼り付けてください。", true); return; }

    // 認証（この瞬間だけ）
    const ok = await verifyPasswordOnce();
    if (!ok) return;

    const images = [tempImages.img1,tempImages.img2,tempImages.img3,tempImages.img4,tempImages.img5].filter(Boolean);
    const newItem = {
      id: createLineupId(), createdAt: Date.now(),
      map, agent, side, site, usage, pos,
      difficulty: diff, status: st,
      description: desc, extra, images, tags, star
    };

    const list = loadLineups();
    if (isDuplicateCandidate(list, newItem)){
      if (!confirm("類似の定点がある可能性があります。保存しますか？")) return;
    }
    list.unshift(newItem);
    saveLineups(list);

    form.reset();
    resetPaste();
    selectedTags.clear(); tagsHidden.value=""; renderTagsSelect();
    setMessage("保存しました。viewer.html で確認できます。");
  });

  resetBtn.addEventListener("click", () => {
    form.reset(); resetPaste(); selectedTags.clear(); tagsHidden.value=""; renderTagsSelect();
    setMessage("入力をリセットしました。");
  });

  clearAllBtn.addEventListener("click", () => {
    if (!confirm("本当に全定点を削除しますか？")) return;
    localStorage.setItem(STORAGE_KEY, "[]");
    setMessage("全定点を削除しました。");
  });

  exportBtn.addEventListener("click", () => { const n = exportLineups(); alert(`エクスポートしました（${n}件）。`); });
  importBtn.addEventListener("click", () => {
    const text = prompt("エクスポートしたJSONを貼り付け（IDマージ）");
    if (!text) return;
    try { const res = importLineupsFromText(text); alert(`追加 ${res.added} / 更新 ${res.updated} / 合計 ${res.total}件`); }
    catch(e){ alert("インポート失敗: "+e.message); }
  });
});
// ==== 入場時パスワード認証（下に貼るだけOK） ==========================
(function gateByPassword() {
  // 1セッション中は再認証させない
  if (sessionStorage.getItem('valolineups_authed') === '1') return;

  const ask = async () => {
    const pwd = prompt('入力ページはパスワードが必要です。');
    if (!pwd) return false;
    try {
      const res = await fetch('/auth-check', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({ password: pwd })
      });
      const ok = res.ok;
      if (ok) sessionStorage.setItem('valolineups_authed', '1');
      return ok;
    } catch (e) { return false; }
  };

  // DOM 生成前でも動くよう即時実行
  (async () => {
    const ok = await ask();
    if (!ok) {
      alert('パスワードが違います。');
      location.href = 'index.html';
    }
  })();
})();
/* ================= 個別画像クリア（下に貼るだけ） =================== */
/* 想定:
   - 画像プレビューは各枠の <img> で表示されている
   - 保存時は <img src>（dataURL）を参照している構造
   - 枠は「画像1〜画像5」の順で並んでいる（足りない枠はスキップ）
   - hidden/input で name="image1"〜"image5" を使っている場合もクリアする
*/

(function enablePerSlotClear() {
  // ① 最低限のスタイルをJSから注入（CSS編集不要）
  const style = document.createElement('style');
  style.textContent = `
    .vl-slot-wrap { position: relative; }
    .vl-slot-clear {
      position:absolute; top:6px; right:6px; width:28px; height:28px;
      border-radius:999px; border:none; background:#000a; color:#fff;
      display:flex; align-items:center; justify-content:center;
      font-weight:700; cursor:pointer; opacity:0; transition:.15s;
      backdrop-filter: blur(4px);
    }
    .vl-slot-wrap:hover .vl-slot-clear { opacity:1; }
    .vl-slot-clear:hover { background:#000d; }
  `;
  document.head.appendChild(style);

  // ② 画像枠（スロット）を推定してラップ＋クリアボタンを付与
  function findSlots() {
    // よくあるクラス名を総当り。該当しなければ「画像プレビューっぽい <img>」で拾う
    const candidates = Array.from(document.querySelectorAll(
      '[data-img-index], .image-slot, .img-slot, .paste-zone, .img-drop, .image-box, .image-cell, .img-cell, .img-preview, .image-preview'
    ));

    // 候補の中で <img> を持つ枠のみ
    let slots = candidates.filter(el => el.querySelector('img'));
    if (slots.length === 0) {
      // フォールバック：画像セクション直下の img の親を枠と見なす
      const imgs = Array.from(document.querySelectorAll('section, .images, .images-grid, .image-area, .image-group, .card-images, .form-images'))
        .flatMap(sec => Array.from(sec.querySelectorAll('img')));
      slots = Array.from(new Set(imgs.map(img => img.parentElement))).filter(Boolean);
    }

    // 重複/ネストを整理（外側の枠を残す）
    slots = slots.filter(el => !slots.some(other => other !== el && other.contains(el)));
    return slots;
  }

  function attachClear(slot, index) {
    // 既に付いていればスキップ
    if (slot.classList.contains('vl-slot-wrap')) return;
    slot.classList.add('vl-slot-wrap');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vl-slot-clear';
    btn.title = 'この画像だけ削除';
    btn.textContent = '×';
    slot.appendChild(btn);

    const clearThis = () => {
      const img = slot.querySelector('img');
      if (img) img.src = '';             // 画面から消す
      // hidden / input がある場合も消す（name=image1..image5に対応）
      const hidden =
        document.querySelector(`input[name="image${index+1}"]`) ||
        document.querySelector(`textarea[name="image${index+1}"]`);
      if (hidden) hidden.value = '';

      // 内部状態を使っている場合に備えて、よくある場所を消しにいく（存在すれば）
      try {
        const state = window.__valoForm || window.__form || window.formData;
        if (state && Array.isArray(state.images)) state.images[index] = '';
      } catch {}

      // UIの枠に「未設定」っぽい表示があるなら消去
      slot.querySelectorAll('[data-has-image],[data-value]').forEach(el=>{
        el.removeAttribute('data-has-image'); el.dataset.value='';
      });
    };

    btn.addEventListener('click', clearThis);

    // Alt+クリックで消去（ボタン狙いにくい場合の保険）
    slot.addEventListener('click', (e) => {
      if (e.altKey) { e.preventDefault(); clearThis(); }
    });
  }

  function setup() {
    const slots = findSlots();
    slots.forEach((slot, i) => attachClear(slot, i)); // i: 0=画像1, 1=画像2...
  }

  // 初期化
  setup();

  // 動的に枠が増える場合に備えて監視
  const mo = new MutationObserver(() => setup());
  mo.observe(document.body, { childList: true, subtree: true });
})();


