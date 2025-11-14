// 共通：localStorage 管理とかユーティリティ

const VALO_STORAGE_KEY = "valo-lineups-v1";

function loadLineups() {
  try {
    const raw = localStorage.getItem(VALO_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveLineups(list) {
  localStorage.setItem(VALO_STORAGE_KEY, JSON.stringify(list));
}

function generateId() {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

function upsertLineup(data) {
  const list = loadLineups();
  const now = Date.now();
  if (!data.id) {
    data.id = generateId();
    data.createdAt = now;
  }
  data.updatedAt = now;

  const idx = list.findIndex((x) => x.id === data.id);
  if (idx >= 0) list[idx] = data;
  else list.push(data);

  saveLineups(list);
  return data.id;
}

function deleteLineup(id) {
  const list = loadLineups().filter((x) => x.id !== id);
  saveLineups(list);
}

function wipeLineups() {
  saveLineups([]);
}

function getLineupById(id) {
  return loadLineups().find((x) => x.id === id) || null;
}

function getAllMapsAgentsTags() {
  const list = loadLineups();
  const maps = new Set();
  const agents = new Set();
  const tags = new Set();
  list.forEach((l) => {
    if (l.map) maps.add(l.map);
    if (l.agent) agents.add(l.agent);
    if (Array.isArray(l.tags)) {
      l.tags.forEach((t) => t && tags.add(t));
    }
  });
  return {
    maps: Array.from(maps),
    agents: Array.from(agents),
    tags: Array.from(tags),
  };
}

// デフォルトのマップ/エージェント/タグ
// js/common.js

// スタンダード全マップ
const DEFAULT_MAPS = [
  "Abyss",
  "Ascent",
  "Bind",
  "Breeze",
  "Corrode",
  "Fracture",
  "Haven",
  "Icebox",
  "Lotus",
  "Pearl",
  "Split",
  "Sunset",
];


const DEFAULT_AGENTS = [
  "Brimstone",
  "Viper",
  "Omen",
  "Astra",
  "Harbor",
  "Killjoy",
  "Cypher",
  "Sage",
  "Sova",
  "Fade",
  "Skye",
  "Breach",
  "Raze",
  "Jett",
  "Phoenix",
  "Reyna",
  "Yoru",
  "Neon",
  "Gekko",
  "Chamber",
  "KAY/O",
];

const DEFAULT_TAGS = [
  "post-plant",
  "retake",
  "default設置",
  "ラッシュ",
  "アンチラッシュ",
  "1way",
  "セットプレー",
  "セーブ狩り",
];

// 前回の map/agent/side/site 保存用
const LAST_SELECTION_KEY = "valo-lineups-last-selection";

function saveLastSelection(sel) {
  localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify(sel));
}

function loadLastSelection() {
  try {
    const raw = localStorage.getItem(LAST_SELECTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Input のドラフト用（画像は重いので除外）
const DRAFT_KEY = "valo-lineups-draft";

function saveDraft(obj) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
