// 定点追加/編集ページ

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");

  const mapSel = document.getElementById("map");
  const agentSel = document.getElementById("agent");
  const sideSel = document.getElementById("side");
  const siteSel = document.getElementById("site");
  const posInput = document.getElementById("pos");
  const throwInput = document.getElementById("throw");
  const noteInput = document.getElementById("note");
  const tagsRoot = document.getElementById("tags");
  const posSuggest = document.getElementById("pos-suggest");

  const resetBtn = document.getElementById("reset");
  const saveBtn = document.getElementById("save");
  const removeBtn = document.getElementById("remove");

  const imgSlots = Array.from(document.querySelectorAll(".img-slot"));

  let editingId = null;
  let lastClickedSlot = null;

  initSelects();
  initTags();
  restoreLastSelection();
  loadEditingDataIfAny();
  restoreDraftIfAny();
  setupImageSlots();
  setupPasteListener();
  setupDraftAutoSave();
  setupEvents();

  function initSelects() {
  const { maps, agents } = getAllMapsAgentsTags();

  const mapList = [...new Set([...DEFAULT_MAPS, ...maps])]
    .sort((a, b) => a.localeCompare(b, "ja"));
  const agentList = [...new Set([...DEFAULT_AGENTS, ...agents])]
    .sort((a, b) => a.localeCompare(b, "ja"));

  mapList.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = m;
    mapSel.appendChild(opt);
  });

  agentList.forEach((a) => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = a;
    agentSel.appendChild(opt);
  });
}


  function initTags() {
    const { tags } = getAllMapsAgentsTags();
    const allTags = [...new Set([...DEFAULT_TAGS, ...tags])];

    tagsRoot.innerHTML = "";
    allTags.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag";
      btn.textContent = t;
      btn.dataset.value = t;
      btn.addEventListener("click", () => {
        btn.classList.toggle("is-active");
      });
      tagsRoot.appendChild(btn);
    });
  }

  function restoreLastSelection() {
    const last = loadLastSelection();
    if (!last) return;
    if (last.map && [...mapSel.options].some(o => o.value === last.map)) {
      mapSel.value = last.map;
    }
    if (last.agent && [...agentSel.options].some(o => o.value === last.agent)) {
      agentSel.value = last.agent;
    }
    if (last.side) sideSel.value = last.side;
    if (last.site) siteSel.value = last.site;
  }

  function readQueryId() {
    const params = new URLSearchParams(location.search);
    return params.get("id");
  }

  function loadEditingDataIfAny() {
    const id = readQueryId();
    if (!id) return;
    const lineup = getLineupById(id);
    if (!lineup) return;

    editingId = id;
    mapSel.value = lineup.map || "";
    agentSel.value = lineup.agent || "";
    sideSel.value = lineup.side || "Attack";
    siteSel.value = lineup.site || "";
    posInput.value = lineup.pos || "";
    throwInput.value = lineup.throw || "";
    noteInput.value = lineup.note || "";

    // tags
    if (Array.isArray(lineup.tags)) {
      lineup.tags.forEach((t) => {
        const btn = tagsRoot.querySelector(`.tag[data-value="${t}"]`);
        if (btn) btn.classList.add("is-active");
      });
    }

    // images
    const imgs = lineup.images || lineup; // 古いデータ互換
    imgSlots.forEach((slot, i) => {
      const key = slot.dataset.key;
      const src = imgs[key];
      if (src) {
        const img = slot.querySelector("img");
        img.src = src;
        slot.classList.add("has-image");
      }
    });

    removeBtn.hidden = false;
    clearDraft(); // 編集モードではドラフトは無視
  }

  function restoreDraftIfAny() {
    if (editingId) return; // 編集時はドラフト使わない
    const draft = loadDraft();
    if (!draft) return;

    if (draft.map) mapSel.value = draft.map;
    if (draft.agent) agentSel.value = draft.agent;
    if (draft.side) sideSel.value = draft.side;
    if (draft.site) siteSel.value = draft.site;
    if (draft.pos) posInput.value = draft.pos;
    if (draft.throw) throwInput.value = draft.throw;
    if (draft.note) noteInput.value = draft.note;

    if (Array.isArray(draft.tags)) {
      draft.tags.forEach((t) => {
        const btn = tagsRoot.querySelector(`.tag[data-value="${t}"]`);
        if (btn) btn.classList.add("is-active");
      });
    }
  }

  function setupImageSlots() {
    imgSlots.forEach((slot) => {
      const img = slot.querySelector("img");
      const delBtn = slot.querySelector(".img-del");

      slot.addEventListener("click", (e) => {
        if (e.target === delBtn) return;
        lastClickedSlot = slot;
      });

      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        img.removeAttribute("src");
        slot.classList.remove("has-image");
      });
    });
  }

  // 画像をリサイズして dataURL(JPEG) を返す関数
async function resizeImageBlob(blob, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const scale = Math.min(
        maxWidth / img.width,
        maxHeight / img.height,
        1 // もともと小さい画像はそのまま
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // JPEG で 0.8 品質にする（PNGよりだいぶ軽くなる）
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve(dataUrl);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

function setupPasteListener() {
  document.addEventListener("paste", async (e) => {
    if (!lastClickedSlot) return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    const item = Array.from(items).find((it) => it.type.startsWith("image/"));
    if (!item) return;

    const blob = item.getAsFile();
    if (!blob) return;

    try {
      // ここでリサイズしてから dataURL 化
      const dataUrl = await resizeImageBlob(blob, 1280, 720);

      const img = lastClickedSlot.querySelector("img");
      img.src = dataUrl;
      lastClickedSlot.classList.add("has-image");
    } catch (err) {
      console.error("画像リサイズに失敗", err);
      alert("画像の読み込みに失敗しました");
    }
  });
}


  function setupDraftAutoSave() {
    const save = () => {
      if (editingId) return; // 編集中はドラフト不要
      const activeTags = Array.from(
        tagsRoot.querySelectorAll(".tag.is-active")
      ).map((b) => b.dataset.value);

      saveDraft({
        map: mapSel.value,
        agent: agentSel.value,
        side: sideSel.value,
        site: siteSel.value,
        pos: posInput.value,
        throw: throwInput.value,
        note: noteInput.value,
        tags: activeTags,
      });
    };

    setInterval(save, 5000); // 5秒ごと
  }

  function currentSelectionKey() {
    return [
      mapSel.value,
      siteSel.value,
      agentSel.value,
      sideSel.value,
    ].join("|");
  }

  function updatePosSuggestion() {
    const list = loadLineups();
    const key = currentSelectionKey();
    const set = new Set();
    list.forEach((l) => {
      const k = [l.map, l.site, l.agent, l.side].join("|");
      if (k === key && l.pos) set.add(l.pos);
    });
    posSuggest.innerHTML = "";
    Array.from(set).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      posSuggest.appendChild(opt);
    });
  }

  function setupEvents() {
    [mapSel, siteSel, agentSel, sideSel].forEach((el) => {
      el.addEventListener("change", () => {
        updatePosSuggestion();
      });
    });
    updatePosSuggestion();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const tags = Array.from(
        tagsRoot.querySelectorAll(".tag.is-active")
      ).map((b) => b.dataset.value);

      const imgs = {};
      imgSlots.forEach((slot) => {
        const key = slot.dataset.key;
        const img = slot.querySelector("img");
        if (img && img.src) {
          imgs[key] = img.src;
        }
      });

      const data = {
        id: editingId || undefined,
        map: mapSel.value,
        agent: agentSel.value,
        side: sideSel.value,
        site: siteSel.value,
        pos: posInput.value.trim(),
        throw: throwInput.value.trim(),
        tags,
        note: noteInput.value.trim(),
        images: imgs,
      };

      const id = upsertLineup(data);

      saveLastSelection({
        map: data.map,
        agent: data.agent,
        side: data.side,
        site: data.site,
      });

      clearDraft();

      alert("保存しました");
      // 保存後、編集モードで開き直す
      location.href = "input.html?id=" + encodeURIComponent(id);
    });

    resetBtn.addEventListener("click", () => {
      form.reset();
      imgSlots.forEach((slot) => {
        const img = slot.querySelector("img");
        img.removeAttribute("src");
        slot.classList.remove("has-image");
      });
      tagsRoot.querySelectorAll(".tag.is-active").forEach((b) => {
        b.classList.remove("is-active");
      });
      clearDraft();
    });

    removeBtn.addEventListener("click", () => {
      if (!editingId) return;
      if (!confirm("この定点を削除しますか？")) return;
      deleteLineup(editingId);
      alert("削除しました");
      location.href = "viewer.html";
    });

    // Ctrl+S で保存
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveBtn.click();
      }
    });
  }
});
