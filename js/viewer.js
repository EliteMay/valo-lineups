document.addEventListener("DOMContentLoaded", () => {
  autoBackupOncePerDay();

  const filterMap   = document.getElementById("filterMap");
  const filterAgent = document.getElementById("filterAgent");
  const filterSide  = document.getElementById("filterSide");
  const filterSite  = document.getElementById("filterSite");
  const filterUse   = document.getElementById("filterUse");
  const searchText  = document.getElementById("searchText");
  const clearBtn    = document.getElementById("clearFilter");
  const listEl      = document.getElementById("lineupList");

  MAP_OPTIONS.forEach(m => { const o=document.createElement("option"); o.value=m; o.textContent=m; filterMap.appendChild(o); });
  AGENT_OPTIONS.forEach(a => { const o=document.createElement("option"); o.value=a; o.textContent=a; filterAgent.appendChild(o); });

  let all = loadLineups();

  function pill(text){ return `<span class="pill">${text}</span>`; }

  function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

  function enableLightbox(){
    document.querySelectorAll(".shots img.shot").forEach(img=>{
      img.addEventListener("click", ()=>{
        const lb = document.createElement("div");
        lb.className = "lightbox";
        lb.innerHTML = `<div class="lightbox-inner"><img src="${img.src}"><button class="lb-close">✕</button></div>`;
        document.body.appendChild(lb);
        lb.querySelector(".lb-close").addEventListener("click", ()=>lb.remove());
        lb.addEventListener("click", e=>{ if(e.target===lb) lb.remove(); });
      });
    });
  }

  function render(items){
    listEl.innerHTML = "";
    if (!items.length){ listEl.innerHTML = `<div class="panel">登録された定点がありません。<a href="input.html">input.html</a> から追加してください。</div>`; return; }

    for (const it of items){
      const tagsPart = (it.tags||[]).map(t=>pill(`#${t}`)).join(" ");
      const imgs = (it.images||[]).map(src=>`<img class="shot" src="${src}" alt="">`).join("");

      const card = document.createElement("article");
      card.className = "lineup-card";
      card.innerHTML = `
        <header>
          <div class="title">
            ${pill(it.map)} ${pill(it.side)} ${pill(it.site)} ${pill(it.agent)} ${it.star ? pill("★") : ""}
          </div>
          <div class="ops">
            <button class="btn small edit" data-id="${it.id}">編集</button>
            <button class="btn small del" data-id="${it.id}">削除</button>
          </div>
        </header>
        <div class="meta">
          <div>ポジ名：${escapeHtml(it.pos||"")}</div>
          <div>投げ方：${escapeHtml(it.usage||"")}</div>
          ${it.extra ? `<div>補足：${escapeHtml(it.extra)}</div>` : ""}
          ${tagsPart ? `<div class="tags">${tagsPart}</div>` : ""}
        </div>
        <div class="shots">${imgs}</div>
      `;
      listEl.appendChild(card);
    }
    bindCardOps();
    enableLightbox();
  }

  function apply(){
    const kw = (searchText.value||"").toLowerCase();
    const f = all.filter(it=>{
      if (filterMap.value && it.map!==filterMap.value) return false;
      if (filterAgent.value && it.agent!==filterAgent.value) return false;
      if (filterSide.value && it.side!==filterSide.value) return false;
      if (filterSite.value && it.site!==filterSite.value) return false;
      if (filterUse.value && it.usage!==filterUse.value) return false;
      if (kw){
        const hay = [
          it.map,it.agent,it.side,it.site,it.usage,it.pos,it.description,it.extra,(it.tags||[]).join(" ")
        ].join(" ").toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
    render(f);
  }

  // 編集モーダル
  const modal = document.getElementById("editModal");
  const editForm = document.getElementById("editForm");
  const editCloseBtn = document.getElementById("editCloseBtn");
  const editCloseBtn2 = document.getElementById("editCloseBtn2");
  const editId    = document.getElementById("editId");
  const editMap   = document.getElementById("editMap");
  const editAgent = document.getElementById("editAgent");
  const editSide  = document.getElementById("editSide");
  const editSite  = document.getElementById("editSite");
  const editUsage = document.getElementById("editUsage");
  const editPos   = document.getElementById("editPos");
  const editDiff  = document.getElementById("editDiff");
  const editStatus= document.getElementById("editStatus");
  const editDesc  = document.getElementById("editDesc");
  const editExtra = document.getElementById("editExtra");
  const editTagsHidden = document.getElementById("editTags");

  // セレクトの初期化
  MAP_OPTIONS.forEach(m => { const o=document.createElement("option"); o.value=m; o.textContent=m; editMap.appendChild(o); });
  AGENT_OPTIONS.forEach(a => { const o=document.createElement("option"); o.value=a; o.textContent=a; editAgent.appendChild(o); });

  function bindCardOps(){
    document.querySelectorAll(".lineup-card .del").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.dataset.id;
        if(!confirm("削除しますか？")) return;
        all = all.filter(x=>x.id!==id); saveLineups(all); apply();
      });
    });
    document.querySelectorAll(".lineup-card .edit").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.dataset.id;
        const it = all.find(x=>x.id===id); if(!it) return;
        openEdit(it);
      });
    });
  }

  function openEdit(it){
    editId.value = it.id;
    editMap.value = it.map||"";
    editAgent.value = it.agent||"";
    editSide.value = it.side||"";
    editSite.value = it.site||"";
    editUsage.value = it.usage||"";
    editPos.value = it.pos||"";
    editDiff.value = it.difficulty||"";
    editStatus.value = it.status||"";
    editDesc.value = it.description||"";
    editExtra.value = it.extra||"";
    editTagsHidden.value = (it.tags||[]).join(", ");
    modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false");
  }
  function closeEdit(){ modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); }
  editCloseBtn.addEventListener("click", closeEdit);
  editCloseBtn2.addEventListener("click", closeEdit);

  // ★ 編集保存の直前だけパスワード確認
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

  editForm.addEventListener("submit", async e=>{
    e.preventDefault();

    const ok = await verifyPasswordOnce();
    if (!ok) return;

    const id = editId.value;
    const idx = all.findIndex(x=>x.id===id);
    if (idx<0) return;

    const old = all[idx];
    all[idx] = {
      ...old,
      map:editMap.value, agent:editAgent.value, side:editSide.value, site:editSite.value, usage:editUsage.value,
      pos:editPos.value.trim(), difficulty:editDiff.value, status:editStatus.value,
      description:editDesc.value.trim(), extra:editExtra.value.trim(),
      tags: parseTags(editTagsHidden.value)
    };
    saveLineups(all);
    closeEdit();
    apply();
  });

  [filterMap,filterAgent,filterSide,filterSite,filterUse,searchText].forEach(el=>el.addEventListener("input", apply));
  clearBtn.addEventListener("click", ()=>{
    [filterMap,filterAgent,filterSide,filterSite,filterUse,searchText].forEach(el=>el.value="");
    apply();
  });

  apply();
});
// ==== 画像差し替え（編集モード） 下に貼るだけOK =========================
// 前提: 各カード要素に data-id が付いている（既存の編集/削除で使っているID）
// 画像サムネイルは .lineup-img というクラス（なければ画像要素に .lineup-img を追加してね）
(function enableImageReplace() {
  // 画像縮小ユーティリティ（common.js にあるならそれを使う）
  async function fileToDataUrl(file, maxW = 1600) {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, maxW / bmp.width);
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return dataUrl;
  }

  // 画像置換 core
  async function replaceImageForCard(cardEl, imgIndex/*0-based*/, newDataUrl) {
    const id = cardEl?.dataset?.id;
    if (!id) return;
    const db = JSON.parse(localStorage.getItem('valolineups_list') || '[]');
    const idx = db.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;
    const entry = db[idx];
    entry.images = entry.images || [];
    entry.images[imgIndex] = newDataUrl;
    localStorage.setItem('valolineups_list', JSON.stringify(db));
    // 画面側も即時差し替え
    const imgs = cardEl.querySelectorAll('.lineup-img');
    if (imgs[imgIndex]) imgs[imgIndex].src = newDataUrl;
  }

  // 「編集」ボタンが押されたらフラグON
  let editing = false;
  document.addEventListener('click', (e) => {
    if (e.target.closest('button') && /編集/.test(e.target.textContent)) {
      editing = true;
      document.body.dataset.editing = '1';
      return;
    }
    if (e.target.closest('button') && /保存|完了|キャンセル/.test(e.target.textContent)) {
      editing = false;
      delete document.body.dataset.editing;
    }
  });

  // 画像クリックでファイル選択→置換（編集時のみ）
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  let pending = { card: null, index: -1 };
  document.addEventListener('click', async (e) => {
    const imgEl = e.target.closest('.lineup-img');
    if (!imgEl || !editing) return;
    const card = e.target.closest('[data-id]');
    const imgs = Array.from(card.querySelectorAll('.lineup-img'));
    const imgIndex = imgs.indexOf(imgEl);
    if (imgIndex < 0) return;

    pending = { card, index: imgIndex };
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f || !pending.card) return;
    const dataUrl = await fileToDataUrl(f, 1600);
    await replaceImageForCard(pending.card, pending.index, dataUrl);
    pending = { card: null, index: -1 };
  });

  // 画像貼り付け（Ctrl+V）にも対応（編集時のみ）
  window.addEventListener('paste', async (e) => {
    if (!editing) return;
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (!item || !pending.card || pending.index < 0) return;
    const file = item.getAsFile();
    const dataUrl = await fileToDataUrl(file, 1600);
    await replaceImageForCard(pending.card, pending.index, dataUrl);
    pending = { card: null, index: -1 };
  });
})();
// ==== 画像表示順を [1,5,3,2,4] に並び替え（下に貼るだけOK） ============
(function forceImageOrder() {
  const ORDER = [0, 4, 2, 1, 3]; // 0-based: 1,5,3,2,4

  // カードが描画されるたびに並べ替える（MutationObserverで監視）
  const root = document.body;
  const isCard = (el) => el.matches?.('.lineup-card,[data-lineup-card]');
  const reorder = (card) => {
    const box = card.querySelector?.('.images-grid,.lineup-images,.images');
    if (!box) return;
    const nodes = Array.from(box.querySelectorAll('.lineup-img,img'));
    if (nodes.length <= 1) return;
    const wanted = ORDER.map(i => nodes[i]).filter(Boolean);
    if (!wanted.length) return;
    // 既存を一旦末尾に追加し直し
    wanted.forEach(n => box.appendChild(n));
  };

  // 初期 & 以降の変化を監視
  document.querySelectorAll('.lineup-card,[data-lineup-card]').forEach(reorder);
  const mo = new MutationObserver((muts) => {
    muts.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1) {
          if (isCard(n)) reorder(n);
          n.querySelectorAll?.('.lineup-card,[data-lineup-card]').forEach(reorder);
        }
      });
    });
  });
  mo.observe(root, { childList: true, subtree: true });
})();

