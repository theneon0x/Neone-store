// The product page: photos, color and size choices, the AI notice and testimonials.

const wantedTag = (new URLSearchParams(location.search).get('tag') || '').trim();

let product = null;
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

function renderGallery() {
  const track = $('gallery-track');
  track.replaceChildren();

  const images = product.images || [];

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
  updateGalleryPosition();
}

function currentSlide() {
  const track = $('gallery-track');
  if (!track.clientWidth) return 0;
  return Math.round(track.scrollLeft / track.clientWidth);
}

const MAX_DOTS = 10;   // with more photos than this, show "3 / 14" instead of dots

function buildDots() {
  const total = (product.images || []).length;
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
  const total = (product.images || []).length;
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

async function start() {
  if (!wantedTag) {
    showNotFound();
    return;
  }

  setupAiNotice();

  const { data, error } = await db
    .from('products')
    .select('id, tag, name, gender, category, price, sizes, colors, images, thumbs, testimonials(id, image_url, created_at)')
    .eq('status', 'active')
    .eq('tag', wantedTag)
    .maybeSingle();

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
  trackEvent('view_item', { currency: 'NGN', value: product.price,
    items: [{ item_id: product.tag, item_name: product.name, item_category: product.category, price: product.price }] });

  $('gallery-track').addEventListener('scroll', updateGalleryPosition, { passive: true });
  window.addEventListener('resize', updateGalleryPosition);
  $('gallery-prev').addEventListener('click', () => moveGallery(-1));
  $('gallery-next').addEventListener('click', () => moveGallery(1));
  $('add-button').addEventListener('click', handleAdd);
}

start();
