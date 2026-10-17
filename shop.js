// The shop page: product grid, category buttons, size filter and sorting.

const params = new URLSearchParams(location.search);
const rawQuery = (params.get('q') || '').trim();
const searchText = rawQuery.replace(/^#/, '').toLowerCase();   // "#001" works the same as "001"
const gender = ['men', 'women'].includes(params.get('g')) ? params.get('g') : 'all';

const state = {
  category: params.get('c') || '',
  size: params.get('s') || '',
  sort: ['price-low', 'price-high'].includes(params.get('sort')) ? params.get('sort') : 'newest'
};

let products = [];

// ---------- Filtering ----------

function matchesSearch(product) {
  if (!searchText) return true;
  const text = [product.tag, product.name, product.category, product.gender].join(' ').toLowerCase();
  return text.includes(searchText);
}

// Products for this section and search, before the category/size filters.
function baseProducts() {
  let list = products.filter((p) => (gender === 'all' || p.gender === gender) && matchesSearch(p));

  // If someone types a full product code, show just that product.
  if (searchText) {
    const exact = list.filter((p) => p.tag.toLowerCase() === searchText);
    if (exact.length > 0) list = exact;
  }
  return list;
}

function orderedCategories(list) {
  const present = new Set(list.map((p) => p.category));
  const preferred = gender === 'all'
    ? [...NEONE_CONFIG.categories.men, ...NEONE_CONFIG.categories.women]
    : NEONE_CONFIG.categories[gender];

  const ordered = Array.from(new Set(preferred)).filter((name) => present.has(name));
  present.forEach((name) => { if (!ordered.includes(name)) ordered.push(name); });
  return ordered;
}

const LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function sizeRank(size) {
  const letter = LETTER_SIZES.indexOf(size);
  if (letter !== -1) return letter;
  const number = Number(size);
  if (!Number.isNaN(number)) return 100 + number;
  return 1000;   // "One size" and anything unusual go last
}

function collectSizes(list) {
  const all = new Set();
  list.forEach((p) => (p.sizes || []).forEach((s) => all.add(s)));
  return Array.from(all).sort((a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b));
}

function sortProducts(list) {
  const copy = list.slice();
  if (state.sort === 'price-low') copy.sort((a, b) => a.price - b.price);
  else if (state.sort === 'price-high') copy.sort((a, b) => b.price - a.price);
  else copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return copy;
}

// ---------- Drawing the page ----------

function renderChips(categories) {
  const row = $('chips');
  row.replaceChildren();
  row.hidden = categories.length === 0;

  const makeChip = (label, value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(state.category === value));
    button.addEventListener('click', () => {
      state.category = value;
      render();
    });
    return button;
  };

  row.appendChild(makeChip('All', ''));
  categories.forEach((name) => row.appendChild(makeChip(name, name)));
}

function renderSizeFilter(sizes) {
  const select = $('size-filter');
  select.replaceChildren();

  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'All sizes';
  select.appendChild(all);

  sizes.forEach((size) => {
    const option = document.createElement('option');
    option.value = size;
    option.textContent = size;
    select.appendChild(option);
  });

  select.value = state.size;
}

function makeImage(src, alt, className, eager) {
  const img = document.createElement('img');
  img.className = className;
  img.src = src;
  img.alt = alt;
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  return img;
}

function makeCard(product, index) {
  const li = document.createElement('li');

  const link = document.createElement('a');
  link.className = 'card';
  link.href = 'product.html?tag=' + encodeURIComponent(product.tag);

  const media = document.createElement('div');
  media.className = 'card-media';

  const first = (product.thumbs && product.thumbs[0]) || (product.images && product.images[0]);
  const second = (product.thumbs && product.thumbs[1]) || (product.images && product.images[1]);

  if (first) {
    media.appendChild(makeImage(first, product.name, 'card-image', index < 4));
  }
  // On computers, hovering a card swaps to the second photo.
  if (first && second) {
    media.appendChild(makeImage(second, '', 'card-image card-image-second', false));
  }

  const info = document.createElement('div');
  info.className = 'card-info';

  const name = document.createElement('p');
  name.className = 'card-name';
  name.textContent = product.name;

  const price = document.createElement('p');
  price.className = 'card-price';
  price.textContent = formatNaira(product.price);

  info.append(name, price);
  link.append(media, info);
  li.appendChild(link);
  return li;
}

function showMessage(text, withClear) {
  const box = $('shop-message');
  box.replaceChildren();
  if (!text) {
    box.hidden = true;
    return;
  }
  const p = document.createElement('p');
  p.textContent = text;
  box.appendChild(p);

  if (withClear) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.textContent = 'Clear filters';
    button.addEventListener('click', () => {
      state.category = '';
      state.size = '';
      render();
    });
    box.appendChild(button);
  }
  box.hidden = false;
}

function updateAddress() {
  const next = new URLSearchParams();
  if (gender !== 'all') next.set('g', gender);
  if (rawQuery) next.set('q', rawQuery);
  if (state.category) next.set('c', state.category);
  if (state.size) next.set('s', state.size);
  if (state.sort !== 'newest') next.set('sort', state.sort);
  const text = next.toString();
  history.replaceState(null, '', location.pathname + (text ? '?' + text : ''));
}

function render() {
  const base = baseProducts();

  const categories = orderedCategories(base);
  if (state.category && !categories.includes(state.category)) state.category = '';

  const inCategory = base.filter((p) => !state.category || p.category === state.category);

  const sizes = collectSizes(inCategory);
  if (state.size && !sizes.includes(state.size)) state.size = '';

  const shown = sortProducts(inCategory.filter((p) => !state.size || (p.sizes || []).includes(state.size)));

  renderChips(categories);
  renderSizeFilter(sizes);
  $('sort').value = state.sort;
  $('grid').replaceChildren(...shown.map(makeCard));

  $('result-count').textContent = shown.length === 0 ? '' : shown.length + (shown.length === 1 ? ' item' : ' items');

  if (products.length === 0) {
    showMessage('New items are coming soon. Please check back.', false);
  } else if (shown.length === 0 && searchText) {
    showMessage('Nothing matches "' + rawQuery + '". Check the code and try again.', Boolean(state.category || state.size));
  } else if (shown.length === 0) {
    showMessage('Nothing here yet.', Boolean(state.category || state.size));
  } else {
    showMessage('', false);
  }

  updateAddress();
}

function setupPageHeading() {
  const titles = { men: 'Men', women: 'Women', all: 'All products' };
  $('shop-title').textContent = rawQuery ? 'Results for "' + rawQuery + '"' : titles[gender];
  document.title = (rawQuery ? 'Search' : titles[gender]) + ' | Neone';

  const current = rawQuery ? 'all' : gender;
  ['all', 'men', 'women'].forEach((name) => {
    const link = $('nav-' + name);
    if (name === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

async function start() {
  setupPageHeading();
  $('shop-message').hidden = false;
  $('shop-message').textContent = 'Loading...';

  try {
    products = await fetchActiveProducts();
  } catch (error) {
    $('shop-message').textContent = 'Could not load the products. Please check your connection and refresh.';
    return;
  }

  $('size-filter').addEventListener('change', () => {
    state.size = $('size-filter').value;
    render();
  });
  $('sort').addEventListener('change', () => {
    state.sort = $('sort').value;
    render();
  });

  render();
}

start();
