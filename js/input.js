/* ===== input ===== */
const form = byId('form');
const idParam = new URL(location.href).searchParams.get('id'); // 編集なら id が入る
const isEdit = !!idParam;

// パスワード（画面を開いた時点で）
(() => { if(!promptPass()) location.href='viewer.html'; })();

fillSelectOptions(byId('map'), MAPS);
fillSelectOptions(byId('agent'), AGENTS);

// タグ（選択式）
const TAGS = ['one-way','ジャンプ','走り投げ','走りジャンプ','解除阻止','ラッシュ止め','設置後','フェイク','ピストル'];
const tagWrap = byId('tags');
TAGS.forEach(t=>{
  const b = document.createElement('button');
  b.type='button';
  b.className='pill';
  b.textContent=t;
  b.onclick=()=> b.classList.toggle('active');
  tagWrap.appendChild(b);
});

// 画像スロット：クリック→貼り付け、×で個別削除
qsa('.img-slot').forEach(slot=>{
  const img = slot.querySelector('img');
  const del = slot.querySelector('.img-del');

  slot.addEventListener('click', async ()=>{
    try{
      const dataUrl = await toDataUrlFromClipboard();
      img.src = dataUrl;
    }catch(err){
      alert('クリップボードに画像がありません');
    }
  });
  del.addEventListener('click', (e)=>{
    e.stopPropagation();
    img.removeAttribute('src');
  });
});

// 編集読み込み
if(isEdit){
  const item = readAll().find(x=>x.id===idParam);
  if(!item){ alert('データが見つかりません'); location.href='viewer.html'; }
  byId('map').value = item.map||'';
  byId('agent').value = item.agent||'';
  byId('side').value = item.side||'Attack';
  byId('site').value = item.site||'';
  byId('pos').value = item.pos||'';
  byId('throw').value = item.throw||'';
  byId('note').value = item.note||'';
  (item.tags||[]).forEach(t=>{
    const p = qsa('.tag-pills .pill').find(el=>el.textContent===t);
    if(p) p.classList.add('active');
  });
  if(item.img1) qs('[data-key="img1"] img').src = item.img1;
  if(item.img2) qs('[data-key="img2"] img').src = item.img2;
  if(item.img3) qs('[data-key="img3"] img').src = item.img3;
  if(item.img4) qs('[data-key="img4"] img').src = item.img4;
  if(item.img5) qs('[data-key="img5"] img').src = item.img5;

  byId('remove').hidden = false;
  byId('remove').onclick = ()=>{
    if(!promptPass()) return;
    if(!confirm('この定点を削除しますか？')) return;
    const rest = readAll().filter(x=>x.id!==idParam);
    writeAll(rest);
    location.href='viewer.html';
  };
}

// リセット
byId('reset').onclick = ()=>{
  if(confirm('入力内容をリセットしますか？')){
    form.reset();
    qsa('.img-slot img').forEach(i=>i.removeAttribute('src'));
    qsa('.tag-pills .pill').forEach(p=>p.classList.remove('active'));
  }
};

// 保存
form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const data = {
    id: isEdit ? idParam : genId(),
    map: byId('map').value.trim(),
    agent: byId('agent').value.trim(),
    side: byId('side').value.trim(),
    site: byId('site').value.trim(),
    pos: byId('pos').value.trim(),
    throw: byId('throw').value.trim(),
    tags: qsa('.tag-pills .pill.active').map(x=>x.textContent),
    note: byId('note').value.trim(),
    img1: qs('[data-key="img1"] img').getAttribute('src')||'',
    img2: qs('[data-key="img2"] img').getAttribute('src')||'',
    img3: qs('[data-key="img3"] img').getAttribute('src')||'',
    img4: qs('[data-key="img4"] img').getAttribute('src')||'',
    img5: qs('[data-key="img5"] img').getAttribute('src')||'',
    createdAt: isEdit ? undefined : Date.now(),
    updatedAt: Date.now()
  };

  // 保存
  const all = readAll();
  const i = all.findIndex(x=>x.id===data.id);
  if(i>=0) all[i]=data; else all.unshift(data);
  writeAll(all);
  alert('保存しました');
  location.href='viewer.html';
});
