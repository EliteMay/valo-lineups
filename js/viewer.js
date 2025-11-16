// js/viewer.js
// ================= ビュー画面 =================

document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("list");
  const hitCountEl = document.getElementById("hit-count");

  const mapSel = document.getElementById("f-map");
  const agentSel = document.getElementById("f-agent");
  const siteSel = document.getElementById("f-site");
  const qInput = document.getElementById("f-q");
  const clearBtn = document.getElementById("f-clear");
  const sortSel = document.getElementById("f-sort");
  const sideTabsRoot = document.getElementById("side-tabs");
  const quickTagsRoot = document.getElementById("quick-tags");

  const exportBtn = document.getElementById("export");
  const importInput = document.getElementById("import");
  const wipeBtn = document.getElementById("wipe");

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.getElementById("lightbox-close");

  let allLineups = [];
  let state = {
    map: "",
    agent: "",
    site: "",
    side: "",
    q: "",
    tag: "",
    sort: "created-desc",
  };

  let lightboxImages = [];
  let lightboxIndex = 0;

  // ★ init() から開始
  init();

  async function init() {
    allLineups = await loadSharedLineups();  // 共有JSON or localStorage

    initFilters();
    renderQuickTags();
    renderList();
    setupEvents();
    setupKeyboard();
  }

  // ---------- 共有JSON読み込み ----------

  async function loadSharedLineups() {
    try {
      const res = await fetch("shared-lineups.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      if (Array.isArray(json)) {
        return json;
      }
      throw new Error("JSON is not array");
    } catch (err) {
      console.warn(
        "shared-lineups.json の読み込みに失敗したので localStorage を参照します。",
        err
      );
      // 開発中や共有ファイル未配置のときは localStorage をフォールバックに使う
      return loadLineups();
    }
  }

  // ---------- フィルタ初期化 ----------

  function initFilters() {
    const { maps, agents } = getAllMapsAgentsTags();
    const mapList = [...new Set([...DEFAULT_MAPS, ...maps])].sort((a, b) =>
      a.localeCompare(b, "ja")
    );
    const agentList = [...new Set([...DEFAULT_AGENTS, ...agents])].sort(
      (a, b) => a.localeCompare(b, "ja")
    );

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

  // ---------- クイックタグ ----------

  function renderQuickTags() {
    const freq = new Map();
    allLineups.forEach((l) => {
      (l.tags || []).forEach((t) => {
        if (!t) return;
        freq.set(t, (freq.get(t) || 0) + 1);
      });
    });

    const tags = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t]) => t);

    quickTagsRoot.innerHTML = "";
    tags.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag";
      btn.dataset.value = t;
      btn.textContent = t;
      btn.addEventListener("click", () => {
        if (state.tag === t) {
          state.tag = "";
          btn.classList.remove("is-active");
        } else {
          state.tag = t;
          quickTagsRoot
            .querySelectorAll(".tag.is-active")
            .forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
        }
        renderList();
      });
      quickTagsRoot.appendChild(btn);
    });
  }

  // ---------- フィルタ + ソート ----------

  function filteredAndSorted() {
    const q = state.q.toLowerCase();
    let list = allLineups.slice();

    list = list.filter((l) => {
      if (state.map && l.map !== state.map) return false;
      if (state.agent && l.agent !== state.agent) return false;
      if (state.site && l.site !== state.site) return false;
      if (state.side && l.side !== state.side) return false;

      if (state.tag) {
        if (!Array.isArray(l.tags) || !l.tags.includes(state.tag)) return false;
      }

      if (q) {
        const hay = [
          l.map,
          l.agent,
          l.site,
          l.side,
          l.pos,
          l.throw,
          l.note,
          ...(l.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    const sort = state.sort;
    list.sort((a, b) => {
      if (sort === "created-asc") {
        return (a.createdAt || 0) - (b.createdAt || 0);
      }
      if (sort === "created-desc") {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      if (sort === "map-site-agent") {
        const ka =
          (a.map || "") +
          "|" +
          (a.site || "") +
          "|" +
          (a.agent || "") +
          "|" +
          (a.pos || "");
        const kb =
          (b.map || "") +
          "|" +
          (b.site || "") +
          "|" +
          (b.agent || "") +
          "|" +
          (b.pos || "");
        return ka.localeCompare(kb);
      }
      return 0;
    });

    return list;
  }

  // ---------- 一覧描画 ----------

  function renderList() {

    const list = filteredAndSorted();

    if (!list.length) {
      listEl.innerHTML =
        '<div class="empty">条件に合う定点がありません。フィルタを緩めるか、新しく追加してください。</div>';
      hitCountEl.textContent = "0件";
      return;
    }

    hitCountEl.textContent = `${list.length}件 / 全${allLineups.length}件`;

    listEl.innerHTML = "";
    list.forEach((l) => {
      const card = document.createElement("article");
      card.className = "lineup";
      if (l.side === "Attack") card.classList.add("lineup--attack");
      if (l.side === "Defense") card.classList.add("lineup--defense");
      card.dataset.id = l.id;

      // ヘッダー
      const head = document.createElement("div");
      head.className = "lineup__head";

      const headMain = document.createElement("div");
      headMain.className = "lineup__head-main";

      const title = document.createElement("div");
      title.className = "lineup__head-title";
      title.textContent = l.pos || "(無題の定点)";

      const meta = document.createElement("div");
      meta.className = "lineup__head-meta";
      meta.textContent = [
        [l.map, l.site].filter(Boolean).join(" "),
        [l.agent, l.side].filter(Boolean).join(" / "),
      ]
        .filter(Boolean)
        .join(" | ");

      headMain.appendChild(title);
      headMain.appendChild(meta);

      const headActions = document.createElement("div");
      headActions.className = "lineup__head-actions";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn btn-ghost";
      copyBtn.textContent = "コピー";
      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const text = generateShareText(l);
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = "コピー済み";
            setTimeout(() => (copyBtn.textContent = "コピー"), 1500);
          });
        } else {
          prompt("コピーしてください", text);
        }
      });

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-ghost";
      editBtn.textContent = "編集";
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        location.href = "input.html?id=" + encodeURIComponent(l.id);
      });

      headActions.appendChild(copyBtn);
      headActions.appendChild(editBtn);

      head.appendChild(headMain);
      head.appendChild(headActions);

      // 画像ギャラリー（固定5スロット）
      const gallery = document.createElement("div");
      gallery.className = "lineup__gallery";

      const imgs = l.images || l; // 古いデータ互換
      const orderKeys = ["img1", "img2", "img3", "img4", "img5"];

      orderKeys.forEach((key) => {
        const shot = document.createElement("div");
        shot.className = "lineup__shot lineup__shot--" + key;

        const src = imgs[key];
        if (src) {
          const img = document.createElement("img");
          img.src = src;
          img.alt = "";
          shot.appendChild(img);
        } else {
          shot.classList.add("is-empty");
        }

        gallery.appendChild(shot);
      });

      // バッジ
      const badges = document.createElement("div");
      badges.className = "badges";

      if (l.throw) {
        const b = document.createElement("span");
        b.className = "badge";
        b.textContent = `投げ方: ${l.throw}`;
        badges.appendChild(b);
      }

      (l.tags || []).forEach((t) => {
        const b = document.createElement("span");
        b.className = "badge";
        b.textContent = t;
        badges.appendChild(b);
      });

      card.appendChild(head);
      card.appendChild(gallery);
      card.appendChild(badges);
      listEl.appendChild(card);
    });

    // 画像クリック → ライトボックス
    listEl.querySelectorAll(".lineup__shot").forEach((shot) => {
      shot.addEventListener("click", () => {
        const card = shot.closest(".lineup");
        const id = card.dataset.id;
        const lineup = allLineups.find((x) => x.id === id);
        if (!lineup) return;
        const imgsObj = lineup.images || lineup;
        lightboxImages = ["img1", "img2", "img3", "img4", "img5"]
          .map((k) => imgsObj[k])
          .filter(Boolean);

        const imgEl = shot.querySelector("img");
        const currentSrc = imgEl?.src;
        const idx = lightboxImages.findIndex((s) => s === currentSrc);
        lightboxIndex = Math.max(idx, 0);
        openLightbox(lightboxImages[lightboxIndex]);
      });
    });
  }

  function generateShareText(l) {
    return [
      `Map: ${l.map || ""} ${l.site || ""}`,
      `Agent: ${l.agent || ""} (${l.side || ""})`,
      `Pos: ${l.pos || ""}`,
      l.throw ? `Throw: ${l.throw}` : "",
      l.tags && l.tags.length ? `Tags: ${l.tags.join(", ")}` : "",
      l.note ? `Note: ${l.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  // ---------- イベント ----------

  function setupEvents() {
    mapSel.addEventListener("change", () => {
      state.map = mapSel.value;
      renderList();
    });
    agentSel.addEventListener("change", () => {
      state.agent = agentSel.value;
      renderList();
    });
    siteSel.addEventListener("change", () => {
      state.site = siteSel.value;
      renderList();
    });
    qInput.addEventListener("input", () => {
      state.q = qInput.value;
      renderList();
    });
    sortSel.addEventListener("change", () => {
      state.sort = sortSel.value;
      renderList();
    });

    sideTabsRoot.addEventListener("click", (e) => {
      const btn = e.target.closest(".side-tab");
      if (!btn) return;
      sideTabsRoot
        .querySelectorAll(".side-tab")
        .forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.side = btn.dataset.side || "";
      renderList();
    });

    clearBtn.addEventListener("click", () => {
      state = {
        map: "",
        agent: "",
        site: "",
        side: "",
        q: "",
        tag: "",
        sort: "created-desc",
      };
      mapSel.value = "";
      agentSel.value = "";
      siteSel.value = "";
      qInput.value = "";
      sortSel.value = "created-desc";
      sideTabsRoot
        .querySelectorAll(".side-tab")
        .forEach((b) => b.classList.remove("is-active"));
      sideTabsRoot
        .querySelector('.side-tab[data-side=""]')
        .classList.add("is-active");
      quickTagsRoot
        .querySelectorAll(".tag.is-active")
        .forEach((b) => b.classList.remove("is-active"));
      renderList();
    });

    exportBtn.addEventListener("click", () => {
      const data = JSON.stringify(loadLineups(), null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "valo-lineups-export.json";
      a.click();
      URL.revokeObjectURL(url);
    });

    importInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // ★ 書き込みアクションなので認証チェック
      if (!ensureAuthForAction("login.html")) {
        e.target.value = "";
        return;
      }

      try {
        const text = await file.text();
        const json = JSON.parse(text);
        if (!Array.isArray(json)) throw new Error("invalid");
        if (!confirm("既存のデータにマージしますか？\n（重複IDは上書きされます）"))
          return;

        const current = loadLineups();
        const map = new Map(current.map((x) => [x.id, x]));
        json.forEach((l) => {
          if (!l.id) l.id = generateId();
          map.set(l.id, l);
        });
        const merged = Array.from(map.values());
        saveLineups(merged);
        allLineups = merged;
        renderQuickTags();
        renderList();
        alert("インポートしました");
      } catch {
        alert("JSONの読み込みに失敗しました");
      } finally {
        importInput.value = "";
      }
    });

    wipeBtn.addEventListener("click", () => {
      // ★ 書き込みアクションなので認証チェック
      if (!ensureAuthForAction("login.html")) {
        return;
      }

      if (!confirm("本当に全削除しますか？")) return;
      wipeLineups();
      allLineups = [];
      renderQuickTags();
      renderList();
      alert("全て削除しました");
    });

    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  // ---------- ライトボックス / キーボード ----------

  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.removeAttribute("hidden");
  }

  function closeLightbox() {
    lightbox.setAttribute("hidden", "");
  }

  function showPrevImage() {
    if (!lightboxImages.length) return;
    lightboxIndex =
      (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    openLightbox(lightboxImages[lightboxIndex]);
  }

  function showNextImage() {
    if (!lightboxImages.length) return;
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    openLightbox(lightboxImages[lightboxIndex]);
  }

  function setupKeyboard() {
    document.addEventListener("keydown", (e) => {
      if (!lightbox.hasAttribute("hidden")) {
        if (e.key === "Escape") {
          closeLightbox();
        } else if (e.key === "ArrowLeft") {
          showPrevImage();
        } else if (e.key === "ArrowRight") {
          showNextImage();
        }
        return;
      }

      if (e.key === "Escape") {
        clearBtn.click();
        return;
      }
    });
  }
});
