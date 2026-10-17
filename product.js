// The product page: photos, color and size choices, the AI notice and testimonials.

const wantedTag = (new URLSearchParams(location.search).get('tag') || '').trim();

let product = null;
let shown = [];   // the photo addresses showing in the gallery right now
const chosen = { size: '', color: '' };

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover)').matches;

function showState(text) {
  $('product-state').textContent = text;
  $('product-state').hidden = false;
  $('product-view').hidden = true;
}

function showNotFound() {
  const box = $('product-state');
  box.replaceChildren();
  const p = document.createElement('p');
  p.textContent = 'We could not find that product. It may no longer be available.';
  const link = document.createElement('a');
  link.className = 'text-button';
  link.href = 'shop.html';
  link.textContent = 'Back to the shop';
  link.style.display = 'inline-block';
  link.style.textDecoration = 'none';
  box.append(p, link);
  box.hidden = false;
  $('product-view').hidden = true;
}

// ---------- Photos ----------

// Photos shown for the chosen color. A photo with no color shows for every color.
// Before a color is chosen, the page opens on the color of the cover photo.
function photosForColor() {
  const images = product.images || [];
  const tags = product.image_colors || [];
  const color = chosen.color || tags[0] || '';
  if (!color || !tags.some(Boolean)) return images;
  const list = images.filter((url, i) => !tags[i] || tags[i] === color);
  return list.length > 0 ? list : images;
}

function renderGallery() {
  const track = $('gallery-track');
  track.replaceChildren();

  shown = photosForColor();
  const images = shown;

  if (images.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'gallery-slide gallery-empty';
    track.appendChild(empty);
    return;
  }

  images.forEach((url, index) => {
    const slide = document.createElement('div');
    slide.className = 'gallery-slide';

    const img = document.createElement('img');
    img.src = url;
    img.alt = product.name + ', photo ' + (index + 1);
    img.loading = index === 0 ? 'eager' : 'lazy';
    img.decoding = 'async';

    slide.appendChild(img);
    track.appendChild(slide);
  });

  buildDots();
  track.scrollLeft = 0;
  updateGalleryPosition();
}

function currentSlide() {
  const track = $('gallery-track');
  if (!track.clientWidth) return 0;
  return Math.round(track.scrollLeft / track.clientWidth);
}

const MAX_DOTS = 10;   // with more photos than this, show "3 / 14" instead of dots

function buildDots() {
  const total = shown.length;
  const box = $('gallery-dots');
  box.replaceChildren();
  box.hidden = total < 2;
  if (total < 2 || total > MAX_DOTS) return;

  for (let i = 0; i < total; i++) {
    const dot = document.createElement('span');
    dot.className = 'gallery-dot';
    box.appendChild(dot);
  }
}

function updateGalleryPosition() {
  const total = shown.length;
  const index = Math.min(currentSlide(), Math.max(total - 1, 0));

  // Dots (phones): the current one is dark.
  const dots = $('gallery-dots').children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].classList.toggle('gallery-dot-active', i === index);
  }
  if (total > MAX_DOTS) $('gallery-dots').textContent = (index + 1) + ' / ' + total;

  // Arrows (computers): no arrow pointing at nothing.
  $('gallery-prev').hidden = total < 2 || index === 0;
  $('gallery-next').hidden = total < 2 || index >= total - 1;

  // For screen readers.
  $('gallery-counter').textContent = total > 1 ? 'Photo ' + (index + 1) + ' of ' + total : '';

  // The AI notice belongs to the first photo only.
  const onFirst = total > 0 && index === 0;
  $('ai-badge').hidden = !onFirst;
  if (!onFirst) setAiNote(false);
}

function moveGallery(direction) {
  const track = $('gallery-track');
  track.scrollBy({ left: direction * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
}

// ---------- The AI notice ----------

function setAiNote(open) {
  $('ai-note').hidden = !open;
  $('ai-button').setAttribute('aria-expanded', String(open));
}

function setupAiNotice() {
  const badge = $('ai-badge');
  const button = $('ai-button');

  if (canHover) {
    // On computers: hovering (or tabbing to the button) shows it.
    badge.addEventListener('mouseenter', () => setAiNote(true));
    badge.addEventListener('mouseleave', () => setAiNote(false));
    button.addEventListener('focus', () => setAiNote(true));
    button.addEventListener('blur', () => setAiNote(false));
  } else {
    // On phones: tapping opens and closes it.
    button.addEventListener('click', () => setAiNote($('ai-note').hidden));
  }

  document.addEventListener('click', (event) => {
    if (!badge.contains(event.target)) setAiNote(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setAiNote(false);
  });
}

// ---------- Color and size ----------

function renderColors() {
  const colors = product.colors || [];
  $('color-group').hidden = colors.length === 0;
  if (colors.length === 0) return;

  const box = $('color-options');
  box.replaceChildren();

  colors.forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'color-dot';
    button.style.backgroundColor = color.hex;
    button.setAttribute('aria-label', color.name);
    button.setAttribute('aria-pressed', String(chosen.color === color.name));
    button.addEventListener('click', () => {
      chosen.color = color.name;
      $('choice-error').textContent = '';
      renderColors();
      renderGallery();
    });
    box.appendChild(button);
  });

  $('color-name').textContent = chosen.color || 'choose one';
}

function renderSizes() {
  const sizes = product.sizes || [];
  $('size-group').hidden = sizes.length === 0;
  if (sizes.length === 0) return;

  const box = $('size-options');
  box.replaceChildren();

  sizes.forEach((size) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'size-button';
    button.textContent = size;
    button.setAttribute('aria-pressed', String(chosen.size === size));
    button.addEventListener('click', () => {
      chosen.size = size;
      $('choice-error').textContent = '';
      renderSizes();
    });
    box.appendChild(button);
  });
}

// ---------- Adding to the order list ----------

function handleAdd() {
  $('add-status').textContent = '';
  $('choice-error').textContent = '';

  if ((product.sizes || []).length > 0 && !chosen.size) {
    $('choice-error').textContent = 'Please choose a size.';
    return;
  }
  if ((product.colors || []).length > 0 && !chosen.color) {
    $('choice-error').textContent = 'Please choose a color.';
    return;
  }

  const result = addToOrder({
    tag: product.tag,
    name: product.name,
    price: product.price,
    size: chosen.size,
    color: chosen.color
  });

  if (!result.ok) {
    $('choice-error').textContent =
      'You can order up to ' + NEONE_CONFIG.orderCap + ' items at a time. Send this order first, then start a new one.';
    return;
  }

  trackEvent('add_to_cart', { currency: 'NGN', value: product.price,
    items: [{ item_id: product.tag, item_name: product.name, item_category: product.category, price: product.price, quantity: 1 }] });
  $('add-status').textContent = 'Added to your order list (' + result.count + '/' + NEONE_CONFIG.orderCap + ' items).';
}

// ---------- Testimonials ----------

function renderTestimonials() {
  const items = (product.testimonials || []).slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // No testimonials: show nothing at all.
  $('testimonials').hidden = items.length === 0;
  if (items.length === 0) return;

  $('testimonial-list').replaceChildren(...items.map((item, index) => {
    const li = document.createElement('li');

    const link = document.createElement('a');
    link.href = item.image_url;
    link.target = '_blank';
    link.rel = 'noopener';

    const img = document.createElement('img');
    img.src = item.image_url;
    img.alt = 'Customer feedback about ' + product.name + ' (' + (index + 1) + ')';
    img.loading = 'lazy';
    img.decoding = 'async';

    link.appendChild(img);
    li.appendChild(link);
    return li;
  }));
}

// ---------- You may also like ----------

function makeRelatedCard(item, index) {
  const li = document.createElement('li');

  const link = document.createElement('a');
  link.className = 'card';
  link.href = 'product.html?tag=' + encodeURIComponent(item.tag);

  const media = document.createElement('div');
  media.className = 'card-media';

  const first = (item.thumbs && item.thumbs[0]) || (item.images && item.images[0]);
  const second = (item.thumbs && item.thumbs[1]) || (item.images && item.images[1]);

  [[first, ''], [second, ' card-image-second']].forEach(([src, extra], i) => {
    if (!src || (i === 1 && !first)) return;
    const img = document.createElement('img');
    img.className = 'card-image' + extra;
    img.src = src;
    img.alt = i === 0 ? item.name : '';
    img.loading = 'lazy';
    img.decoding = 'async';
    media.appendChild(img);
  });

  const info = document.createElement('div');
  info.className = 'card-info';
  const name = document.createElement('p');
  name.className = 'card-name';
  name.textContent = item.name;
  const price = document.createElement('p');
  price.className = 'card-price';
  price.textContent = formatNaira(item.price);
  info.append(name, price);

  link.append(media, info);
  li.appendChild(link);
  return li;
}

// Up to 4 other products from the same section, the same category first.
// If anything goes wrong, the block simply does not show.
async function renderRelated() {
  try {
    const { data, error } = await db
      .from('products')
      .select('id, tag, name, category, price, images, thumbs')
      .eq('status', 'active')
      .eq('gender', product.gender)
      .neq('id', product.id)
      .order('created_at', { ascending: false })
      .limit(24);

    if (error || !data || data.length === 0) return;

    const same = data.filter((item) => item.category === product.category);
    const others = data.filter((item) => item.category !== product.category);
    const picks = [...same, ...others].slice(0, 4);

    const section = document.createElement('section');
    section.id = 'related';
    section.className = 'related';

    const heading = document.createElement('h2');
    heading.textContent = 'You may also like';

    const list = document.createElement('ul');
    list.className = 'grid related-grid';
    list.replaceChildren(...picks.map(makeRelatedCard));

    section.append(heading, list);
    $('product-view').appendChild(section);
  } catch (e) {
    // Nothing to show.
  }
}

// ---------- Start ----------

function fillPage() {
  document.title = product.name + ' | Neone';

  $('product-name').textContent = product.name;
  $('product-price').textContent = formatNaira(product.price);
  $('product-code').textContent = 'Code #' + product.tag;

  const sectionName = product.gender === 'men' ? 'Men' : 'Women';
  $('back-link').textContent = 'Back to ' + sectionName + ' / ' + product.category;
  $('back-link').href = 'shop.html?g=' + product.gender + '&c=' + encodeURIComponent(product.category);

  // If there is only one size, or only one color, choose it for the customer.
  if ((product.sizes || []).length === 1) chosen.size = product.sizes[0];
  if ((product.colors || []).length === 1) chosen.color = product.colors[0].name;

  renderGallery();
  renderColors();
  renderSizes();
  renderTestimonials();

  $('product-state').hidden = true;
  $('product-view').hidden = false;
  updateGalleryPosition();
}

async function loadProduct() {
  const base = 'id, tag, name, gender, category, price, sizes, colors, images, thumbs, ';
  const tail = 'testimonials(id, image_url, created_at)';
  const run = (fields) => db.from('products').select(fields)
    .eq('status', 'active').eq('tag', wantedTag).maybeSingle();

  let result = await run(base + 'image_colors, ' + tail);
  // If the image_colors column does not exist yet, use the old list so the page still works.
  if (result.error && /image_colors/.test(result.error.message || '')) {
    result = await run(base + tail);
  }
  return result;
}

async function start() {
  if (!wantedTag) {
    showNotFound();
    return;
  }

  setupAiNotice();

  const { data, error } = await loadProduct();

  if (error) {
    showState('Could not load this product. Please check your connection and refresh.');
    return;
  }
  if (!data) {
    showNotFound();
    return;
  }

  product = data;
  fillPage();
  renderRelated();
  trackEvent('view_item', { currency: 'NGN', value: product.price,
    items: [{ item_id: product.tag, item_name: product.name, item_category: product.category, price: product.price }] });

  $('gallery-track').addEventListener('scroll', updateGalleryPosition, { passive: true });
  window.addEventListener('resize', updateGalleryPosition);
  $('gallery-prev').addEventListener('click', () => moveGallery(-1));
  $('gallery-next').addEventListener('click', () => moveGallery(1));
  $('add-button').addEventListener('click', handleAdd);
}

start();
