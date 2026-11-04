(function(){
  const $ = s => document.querySelector(s);
  const KEY = 'bg_admin_token';
  let token = null, editingId = null, items = [];
  try{ token = sessionStorage.getItem(KEY); }catch(e){}

  function el(tag, text, cls){ const n = document.createElement(tag); if(text!==undefined) n.textContent = text; if(cls) n.className = cls; return n; }
  function msg(node, text, ok){ node.textContent = text || ''; node.className = 'msg ' + (text ? (ok ? 'ok' : 'err') : ''); }

  async function api(path, opts = {}){
    const r = await fetch(path, {
      ...opts,
      headers: { 'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token} : {}) }
    });
    const data = await r.json().catch(()=>({}));
    if(r.status === 401 && path !== '/api/admin/login'){ logoutLocal(); throw new Error('Session expired. Please log in again.'); }
    if(!r.ok) throw new Error(data.error || ('Request failed ('+r.status+')'));
    return data;
  }

  function show(loggedIn){
    $('#login-view').classList.toggle('hidden', loggedIn);
    $('#dash-view').classList.toggle('hidden', !loggedIn);
  }
  function logoutLocal(){ token = null; try{ sessionStorage.removeItem(KEY); }catch(e){} show(false); }

  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    try{
      const d = await api('/api/admin/login', { method:'POST', body: JSON.stringify({ username: $('#l-user').value, password: $('#l-pass').value }) });
      token = d.token; try{ sessionStorage.setItem(KEY, token); }catch(e){}
      $('#l-pass').value = ''; msg($('#login-msg'), '');
      await enter();
    }catch(err){ msg($('#login-msg'), err.message); }
  });

  $('#logout').addEventListener('click', async () => {
    try{ await api('/api/admin/logout', { method:'POST' }); }catch(e){}
    logoutLocal();
  });

  async function enter(){ show(true); await Promise.all([loadMenu(), loadOrders()]); }

  async function loadMenu(){
    const r = await fetch('/api/menu'); items = await r.json();
    $('#count').textContent = items.length;
    const body = $('#menu-rows'); body.innerHTML = '';
    items.forEach(it => {
      const tr = document.createElement('tr');
      tr.append(el('td', (it.emoji ? it.emoji + ' ' : '') + it.name));
      const c = document.createElement('td'); c.append(el('span', it.category, 'tag')); tr.append(c);
      tr.append(el('td', 'R' + Number(it.price).toFixed(2)));
      const act = document.createElement('td');
      const ed = el('button', 'Edit', 'small-btn'); ed.type = 'button'; ed.onclick = () => startEdit(it);
      const del = el('button', 'Delete', 'small-btn danger'); del.type = 'button'; del.onclick = () => removeItem(it);
      act.append(ed, del); tr.append(act);
      body.append(tr);
    });
  }

  async function loadOrders(){
    const body = $('#order-rows'); body.innerHTML = '';
    try{
      const list = await api('/api/admin/orders');
      if(!list.length){ const tr = document.createElement('tr'); const td = el('td', 'No orders yet.'); td.colSpan = 5; tr.append(td); body.append(tr); return; }
      list.slice(0, 30).forEach(o => {
        const tr = document.createElement('tr');
        tr.append(el('td', new Date(o.createdAt).toLocaleString()), el('td', o.email), el('td', o.items.join(', ')),
                  el('td', 'R' + Number(o.total).toFixed(2)), el('td', o.verified ? 'Yes' : 'No'));
        body.append(tr);
      });
    }catch(e){ /* session handled in api() */ }
  }

  function resetForm(){
    editingId = null; $('#item-form').reset();
    $('#form-title').textContent = 'Add a menu item'; $('#f-submit').textContent = 'Add item'; $('#f-cancel').classList.add('hidden');
  }
  function startEdit(it){
    editingId = it.id;
    $('#f-name').value = it.name; $('#f-price').value = it.price; $('#f-cat').value = it.category;
    $('#f-emoji').value = it.emoji || ''; $('#f-desc').value = it.desc || ''; $('#f-img').value = it.imageUrl || '';
    $('#form-title').textContent = 'Edit: ' + it.name; $('#f-submit').textContent = 'Save changes'; $('#f-cancel').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('#f-cancel').addEventListener('click', () => { resetForm(); msg($('#form-msg'), ''); });

  $('#item-form').addEventListener('submit', async e => {
    e.preventDefault();
    const body = { name: $('#f-name').value, price: $('#f-price').value, category: $('#f-cat').value,
                   emoji: $('#f-emoji').value, desc: $('#f-desc').value, imageUrl: $('#f-img').value };
    try{
      const wasEdit = editingId !== null;
      await api(wasEdit ? '/api/admin/menu/' + editingId : '/api/admin/menu', { method: wasEdit ? 'PUT' : 'POST', body: JSON.stringify(body) });
      resetForm(); msg($('#form-msg'), wasEdit ? 'Item updated.' : 'Item added — it is now live on the site.', true);
      await loadMenu();
    }catch(err){ msg($('#form-msg'), err.message); }
  });

  async function removeItem(it){
    if(!confirm('Delete "' + it.name + '" from the menu?')) return;
    try{ await api('/api/admin/menu/' + it.id, { method:'DELETE' }); if(editingId === it.id) resetForm(); await loadMenu(); }
    catch(err){ msg($('#form-msg'), err.message); }
  }

  // auto-resume an existing session
  if(token){ api('/api/admin/me').then(enter).catch(()=>show(false)); } else show(false);
})();
