/* ===== 画像を .cell でラップしてグリッド＋サイズ強制 ===== */
(function () {
  // 並び順: 1,5,3,2,4（0-basedで 0,4,2,1,3）
  const ORDER = [0,4,2,1,3];

  // 1枚のカードに適用
  function apply(card) {
    if (!card) return;

    // カード内の画像候補（ボタン/アイコン系は除外）
    let imgs = Array.from(card.querySelectorAll('img')).filter(img => {
      if (img.closest('header, nav, button, .badge, .tag, .avatar')) return false;
      // 小さすぎるアイコンも除外
      const r = img.getBoundingClientRect();
      return (r.width >= 80 || r.height >= 80);
    });
    if (!imgs.length) return;

    imgs = imgs.slice(0,5); // 最大5枚まで

    // 画像たちの共通親を探す
    let box = imgs[0].parentElement;
    const containsAll = el => imgs.every(i => el.contains(i));
    while (box && !containsAll(box)) box = box.parentElement;
    if (!box) return;

    // すでにグリッド済みならスキップ
    if (!box.classList.contains('mosaic-grid')) {
      box.classList.add('mosaic-grid');
    }

    // 並び順を決める
    const ordered = ORDER.map(i => imgs[i]).filter(Boolean);
    const list = ordered.length ? ordered : imgs;

    // .cell でラップして配置
    list.forEach((img, idx) => {
      let cell = img.closest('.cell');
      if (!cell || cell.parentElement !== box) {
        cell = document.createElement('div');
        cell.className = 'cell';
        img.replaceWith(cell);
        cell.appendChild(img);
      }
      for (let k=1;k<=5;k++) cell.classList.remove('img-'+k);
      cell.classList.add('img-'+(idx+1));

      // 空画像なら隠す
      const empty = !img.src || img.src === 'about:blank';
      cell.classList.toggle('hidden', empty);

      // DOM順を確定
      box.appendChild(cell);

      // 画像1は必ず全体表示（ミニマップ用）
      if (idx === 0) {
        img.style.objectFit = 'contain';
        img.style.background = '#0b0f19';
      } else {
        img.style.objectFit = 'cover';
      }
      // 表示ブロック化
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.display = 'block';
    });
  }

  // 初期適用：カードっぽい塊を広めに拾う
  function applyAll() {
    const candidates = new Set();
    document.querySelectorAll('img').forEach(img => {
      // 画像の親を数段さかのぼって“塊”にする
      let p = img.parentElement;
      for (let i=0; i<5 && p && p.parentElement; i++) {
        p = p.parentElement;
        if (p.querySelectorAll('img').length >= 3) {
          candidates.add(p);
        }
      }
    });
    candidates.forEach(apply);
  }

  // 初回
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAll);
  } else {
    applyAll();
  }

  // 追加にも追随
  const mo = new MutationObserver(() => applyAll());
  mo.observe(document.body, { childList:true, subtree:true });
})();
