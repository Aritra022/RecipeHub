const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

let RECIPES = [], VISIBLE = [], showAll = false;
const PAGE_LIMIT = 12, apiUrl = 'https://dummyjson.com/recipes';

const $grid = qs('#grid'),
      $search = qs('#search'),
      $filters = qs('#filters'),
      $count = qs('#count'),
      $empty = qs('#empty'),
      $backdrop = qs('#backdrop'),
      $modalTitle = qs('#modalTitle'),
      $modalBody = qs('#modalBody'),
      $addBtn = qs('#addBtn'),
      $refreshBtn = qs('#refreshBtn'),
      $toggleView = qs('#toggleView'),
      $addRecipeBackdrop = document.getElementById('addRecipeBackdrop'),
      $closeAddRecipe = document.getElementById('closeAddRecipe'),
      $addRecipeForm = document.getElementById('addRecipeForm');

function debounce(fn, wait=300){
  let t;
  return (...a)=>{
    clearTimeout(t); t = setTimeout(()=>fn.apply(this,a), wait);
  }
}

async function fetchRecipes(){
  try {
    const res = await fetch(apiUrl);
    if(!res.ok) throw new Error('Network');
    const json = await res.json();
    return json.recipes || [];
  } catch(e) {
    console.warn('Fetch failed', e);
    return [];
  }
}

function loadLocalAdded(){
  try { return JSON.parse(localStorage.getItem('my_recipes_v1')) || []; }
  catch { return []; }
}

function saveLocalAdded(a){
  localStorage.setItem('my_recipes_v1', JSON.stringify(a));
}

async function getRecipe(){
  const fromApi = await fetchRecipes(),
        local = loadLocalAdded();
  RECIPES = [...local, ...fromApi];
  VISIBLE = RECIPES.slice();
  renderFilters();
  render();
}

function render(){
  const q = ($search.value||'').trim().toLowerCase();
  const filtered = VISIBLE.filter(r => filterMatch(r, q));
  $count.textContent = `${filtered.length} recipe${filtered.length===1?'':'s'}`;
  if(!filtered.length){
    $grid.innerHTML = '';
    $empty.style.display = 'block';
    return;
  }
  $empty.style.display = 'none';
  const toShow = showAll ? filtered : filtered.slice(0, PAGE_LIMIT);
  $grid.innerHTML = toShow.map(cardHtml).join('\n');
  qsa('.view-btn').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.id)));
}

function cardHtml(r){
  const img = r.image || 'https://via.placeholder.com/600x400?text=No+Image',
        name = r.name || 'Untitled',
        meta = r.cuisine || (r.tags && r.tags.join(', ')) || '',
        id = r.id !== undefined ? r.id : r._localId || 'local-' + Math.random().toString(36).slice(2,9);
  return `<article class="card" data-id="${id}">
    <img src="${img}" alt="${escapeHtml(name)}">
    <div class="card-content">
      <h3>${escapeHtml(name)}</h3>
      <div class="meta">${escapeHtml(meta)}</div>
      <div class="card-actions">
        <button class="btn view-btn" data-id="${id}">View</button>
        <div class="pill">${Array.isArray(r.ingredients) ? r.ingredients.length + ' ingredients' : ''}</div>
      </div>
    </div>
  </article>`;
}

function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function filterMatch(r, q){
  if(!q) return true;
  const fields = [r.name, r.cuisine, r.category, (r.tags||[]).join(' '),(r.instructions||'')].join(' ');
  return fields.toLowerCase().includes(q);
}

function renderFilters(){
  const tags = new Set();
  RECIPES.forEach(r => {
    if(Array.isArray(r.tags)) r.tags.forEach(t => tags.add(t));
    if(r.cuisine) tags.add(r.cuisine);
  });
  $filters.innerHTML = '';
  ['All', ...tags].forEach((t, i) => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (i===0 ? ' active':'');
    btn.textContent = t;
    btn.addEventListener('click', () => {
      qsa('.chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      VISIBLE = t === 'All' ? RECIPES.slice() : RECIPES.filter(r => (r.tags || []).includes(t) || r.cuisine === t);
      render();
    });
    $filters.appendChild(btn);
  });
}

function openModal(id){
  const r = RECIPES.find(x => String(x.id) === String(id) || (x._localId && x._localId === id));
  if(!r) return;
  $modalTitle.textContent = r.name || 'Recipe';
  $modalBody.innerHTML = `
    <div>
      <img src="${r.image || ''}" alt="${escapeHtml(r.name)}" style="width:100%;height:200px;object-fit:cover;border-radius:8px">
      <h3>${escapeHtml(r.name)}</h3>
      ${r.cuisine ? `<div><strong>Cuisine:</strong> ${escapeHtml(r.cuisine)}</div>` : ''}
      <h4>Ingredients</h4>
      ${Array.isArray(r.ingredients) ? `<ul>${r.ingredients.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}</ul>` : '<div>No ingredients listed</div>'}
      <h4>Instructions</h4>
      <div style="white-space:pre-wrap">${Array.isArray(r.instructions) ? escapeHtml(r.instructions.join('\n')) : escapeHtml(r.instructions || '')}</div>
    </div>`;
  $backdrop.style.display = 'flex';
  setTimeout(() => $backdrop.style.opacity = '1', 10);
}

function closeModal(){
  $backdrop.style.opacity = '0';
  setTimeout(() => $backdrop.style.display = 'none', 200);
}

// ----- Add Recipe Modal -----
function openAddRecipe() {
  $addRecipeBackdrop.style.display = 'flex';
  setTimeout(() => $addRecipeBackdrop.style.opacity = '1', 10);
}

function closeAddRecipeModal() {
  $addRecipeBackdrop.style.opacity = '0';
  setTimeout(() => $addRecipeBackdrop.style.display = 'none', 200);
}

$closeAddRecipe.addEventListener('click', closeAddRecipeModal);
$addRecipeBackdrop.addEventListener('click', e => {
  if (e.target === $addRecipeBackdrop) closeAddRecipeModal();
});

$addRecipeForm.addEventListener('submit', e => {
  e.preventDefault();
  const newRecipe = {
    _localId: 'local-' + Date.now(),
    name: document.getElementById('recipeName').value,
    cuisine: document.getElementById('recipeCuisine').value,
    image: document.getElementById('recipeImage').value,
    ingredients: document.getElementById('recipeIngredients').value.split(',').map(i => i.trim()),
    instructions: document.getElementById('recipeInstructions').value.split('\n').map(i => i.trim())
  };
  const local = loadLocalAdded();
  local.push(newRecipe);
  saveLocalAdded(local);
  closeAddRecipeModal();
  getRecipe(); // refresh list
  $addRecipeForm.reset();
});

// Events
document.addEventListener('click', e => {
  if(e.target === $backdrop || e.target.id === 'modalClose') closeModal();
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') {
    closeModal();
    closeAddRecipeModal();
  }
});
$addBtn.addEventListener('click', openAddRecipe);
$refreshBtn.addEventListener('click', getRecipe);
$toggleView.addEventListener('click', () => {
  showAll = !showAll;
  $toggleView.textContent = showAll ? 'Show limited' : 'Show all';
  render();
});
$search.addEventListener('input', debounce(render, 250));

getRecipe();