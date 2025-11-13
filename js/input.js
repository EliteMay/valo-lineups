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
