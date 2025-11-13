/* ===== viewer ===== */
const ORDER = [0, 4, 2, 1, 3]; // 1,5,3,2,4 の表示順

const listEl  = byId('list');
const mapSel  = byId('f-map');
const agentSel= byId('f-agent');

fillSelectOptions(mapSel, MAPS);
fillSelectOptions(agentSel, AGENTS);

byId('f-clear').onclick = () => {
  qsa('#filters select,#filters input').forEach(el => el.value = '');
  render();
};

['f-map','f-agent','f-side','f-site','f-throw','f-q'].forEach(id=>{
  byId(id).addEventListener('input', render);
});

byId('export').onclick = () => {
  const blob = new Blob([ localStorage.getItem(STORAGE_KEY) || '[]' ], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'valo-lineups.json';
  a.click();
};
byId('import').onchange = async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const text = await file.text();
  try{
    const arr = JSON.parse(text);
    if(!Array.isArray(arr)) throw 0;
    writeAll(arr);
    alert('インポート完了');
    render();
  }catch{
    alert('JSONが不正です');
  }
};
byId('wipe').onclick = ()=>{
  if(!promptPass()) return;
  if(confirm('全ての定点を削除しますか？')){
    writeAll([]);
    render();
  }
};

function filterList(all){
  const m   = mapSel.value.trim().toLowerCase();
  const a   = agentSel.value.trim().toLowerCase();
  const s   = byId('f-side').value.trim().toLowerCase();
  const site= byId('f-site').value.trim().toLowerCase();
  const th  = byId('f-throw').value.trim().toLowerCase();
  const q   = byId('f-q').value.trim().toLowerCase();

  return all.filter(it=>{
    const text = [
      it.map,it.agent,it.side,it.site,it.pos,it.throw,(it.tags||[]).join(' '),it.note
    ].join(' ').toLowerCase();

    if (m    && (it.map||'').toLowerCase()  !== m) return false;
    if (a    && (it.agent||'').toLowerCase()!== a) return false;
    if (s    && (it.side||'').toLowerCase() !== s) return false;
    if (site && (it.site||'').toLowerCase() !== site) return false;
    if (th   && (it.throw||'').toLowerCase().indexOf(th)===-1) return false;
    if (q    && text.indexOf(q)===-1) return false;
    return true;
  });
}

function render(){
  const all = readAll();
  const arr = filterList(all);

  listEl.innerHTML = '';
  if(!arr.length){
    listEl.innerHTML = `<div class="panel"><p class="muted">登録済みの定点がありません。</p></div>`;
    return;
  }

  arr.forEach(it=>{
    const card = document.createElement('article');
    card.className = 'card';

    const head = document.createElement('div');
    head.className = 'card-head';
    head.innerHTML = `
      <div class="chips">
        ${it.map?`<span class="chip">${it.map}</span>`:''}
        ${it.agent?`<span class="chip">${it.agent}</span>`:''}
        ${it.side?`<span class="chip">${it.side}</span>`:''}
        ${it.site?`<span class="chip">${it.site}</span>`:''}
        ${(it.tags||[]).map(t=>`<span class="chip">#${t}</span>`).join('')}
      </div>
      <h3 class="title">${(it.pos||'（無題）')}</h3>
      <div class="sub">${it.throw||''}</div>
    `;
    card.appendChild(head);

    // 画像表示順: 1,5,3,2,4
    const imgs = [it.img1, it.img5, it.img3, it.img2, it.img4].filter(Boolean);
    if(imgs.length){
      const box = document.createElement('div');
      box.className = 'mosaic-grid';
      imgs.forEach((src, idx)=>{
        const cell = document.createElement('div');
        cell.className = 'cell img-' + (idx+1);
        const img = document.createElement('img');
        img.src = src; img.alt='';
        img.onclick = () => openLightbox(src);
        cell.appendChild(img);
        box.appendChild(cell);
      });
      card.appendChild(box);
    }
    if(it.note){
      const p = document.createElement('div');
      p.className = 'card-head';
      p.innerHTML = `<div class="muted">${it.note}</div>`;
      card.appendChild(p);
    }

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn';
    editBtn.textContent = '編集';
    editBtn.onclick = () => {
      if(!promptPass()) return;
      location.href = `input.html?id=${encodeURIComponent(it.id)}`;
    };
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.textContent = '削除';
    delBtn.onclick = () => {
      if(!promptPass()) return;
      if(!confirm('この定点を削除しますか？')) return;
      const rest = readAll().filter(x => x.id !== it.id);
      writeAll(rest);
      render();
    };
    actions.append(editBtn, delBtn);
    card.appendChild(actions);

    listEl.appendChild(card);
  });
}

/* lightbox */
function openLightbox(src){
  const lb = byId('lightbox');
  byId('lightbox-img').src = src;
  lb.hidden = false;
}
byId('lightbox-close').onclick = () => byId('lightbox').hidden = true;
byId('lightbox').onclick = (e)=>{ if(e.target.id==='lightbox') byId('lightbox').hidden = true; };

render();
