// Things every page of the store uses.

const db = supabase.createClient(NEONE_CONFIG.supabaseUrl, NEONE_CONFIG.supabaseKey);

const $ = (id) => document.getElementById(id);

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

// Loads every active product. Visitors can only ever receive active ones.
async function fetchActiveProducts() {
  const { data, error } = await db
    .from('products')
    .select('id, tag, name, gender, category, price, sizes, colors, images, thumbs, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// The search box in the header: searching sends you to the shop page with the results.
function setupHeaderSearch() {
  const input = $('search-input');
  if (!input) return;
  const q = new URLSearchParams(location.search).get('q');
  if (q) input.value = q;
}

setupHeaderSearch();

// ---------- The order list ----------
// The list is kept in the visitor's own browser. Each entry looks like:
// { tag, name, price, size, color, qty }

const ORDER_KEY = 'neone_order';
let orderInMemory = [];   // used if the browser will not let us save (private mode)

function loadOrder() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return orderInMemory;
  }
}

function saveOrder(list) {
  orderInMemory = list;
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(list));
  } catch (e) {
    // Not saved between pages, but still works until the page is closed.
  }
}

function orderCount() {
  return loadOrder().reduce((total, item) => total + item.qty, 0);
}

// Adds one item. Returns { ok: true, count } or { ok: false, reason: 'cap' }.
function addToOrder(item) {
  const list = loadOrder();
  if (orderCount() >= NEONE_CONFIG.orderCap) return { ok: false, reason: 'cap' };

  const same = list.find((entry) =>
    entry.tag === item.tag && entry.size === item.size && entry.color === item.color);
  if (same) same.qty += 1;
  else list.push({ ...item, qty: 1 });

  saveOrder(list);
  refreshOrderBar();
  return { ok: true, count: orderCount() };
}

function removeOrderLine(index) {
  const list = loadOrder();
  list.splice(index, 1);
  saveOrder(list);
  refreshOrderBar();
}

// Adds or takes away one of an item. Returns false if the cap stops it.
function changeQty(index, change) {
  const list = loadOrder();
  const item = list[index];
  if (!item) return false;
  if (change > 0 && orderCount() >= NEONE_CONFIG.orderCap) return false;

  item.qty += change;
  if (item.qty < 1) list.splice(index, 1);

  saveOrder(list);
  refreshOrderBar();
  return true;
}

function clearOrder() {
  saveOrder([]);
  refreshOrderBar();
}

// The "Order list" link in the header, always visible, with the item count.
function refreshHeaderLink() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let link = $('header-order');
  if (!link) {
    link = document.createElement('a');
    link.id = 'header-order';
    link.className = 'header-order';
    link.href = 'order.html';
    header.appendChild(link);
  }

  const count = orderCount();
  link.textContent = count > 0 ? 'Order list (' + count + ')' : 'Order list';
  if (document.body.dataset.page === 'order') link.setAttribute('aria-current', 'page');
}

// The black bar at the bottom of the page while there are items in the order list.
function refreshOrderBar() {
  refreshHeaderLink();
  if (document.body.dataset.page === 'order') return;

  let bar = $('order-bar');
  const count = orderCount();

  if (count === 0) {
    if (bar) bar.remove();
    document.body.classList.remove('has-order-bar');
    return;
  }

  if (!bar) {
    bar = document.createElement('a');
    bar.id = 'order-bar';
    bar.className = 'order-bar';
    bar.href = 'order.html';

    const label = document.createElement('span');
    label.className = 'order-bar-label';
    const view = document.createElement('span');
    view.className = 'order-bar-view';
    view.textContent = 'View order list';

    bar.append(label, view);
    document.body.appendChild(bar);
  }

  bar.querySelector('.order-bar-label').textContent =
    'Order list: ' + count + '/' + NEONE_CONFIG.orderCap + ' items';
  document.body.classList.add('has-order-bar');
}

refreshOrderBar();


// ---------- Cookie choice and Google Analytics ----------
// Analytics only load after the visitor taps Accept. Declining (or never answering) loads nothing.

const COOKIE_KEY = 'neone_cookie_choice';
let cookieChoiceInMemory = null;
let analyticsLoaded = false;

function getCookieChoice() {
  try {
    return localStorage.getItem(COOKIE_KEY);
  } catch (e) {
    return cookieChoiceInMemory;
  }
}

function setCookieChoice(choice) {
  cookieChoiceInMemory = choice;
  try {
    localStorage.setItem(COOKIE_KEY, choice);
  } catch (e) {
    // Not saved: the banner will simply ask again next visit.
  }
}

function analyticsId() {
  const id = NEONE_CONFIG.gaMeasurementId;
  return /^G-[A-Z0-9]{4,}$/.test(id) ? id : null;
}

function loadAnalytics() {
  const id = analyticsId();
  if (!id || analyticsLoaded) return;
  analyticsLoaded = true;

  window['ga-disable-' + id] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, { anonymize_ip: true });

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(script);
}

// If someone changes their mind and declines: switch analytics off and remove its cookies.
function stopAnalytics() {
  const id = analyticsId();
  if (id) window['ga-disable-' + id] = true;

  const parts = location.hostname.split('.');
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    if (name !== '_ga' && !name.startsWith('_ga_')) return;
    const expired = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    document.cookie = expired;
    for (let i = 0; i < parts.length - 1; i++) {
      document.cookie = expired + '; domain=' + parts.slice(i).join('.');
    }
  });
}

// Sends a note to Google Analytics, only if the visitor accepted cookies.
function trackEvent(name, params) {
  if (analyticsLoaded && window.gtag) window.gtag('event', name, params || {});
}

function hideCookieBanner() {
  const banner = $('cookie-banner');
  if (banner) banner.remove();
}

function showCookieBanner() {
  if ($('cookie-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Cookie choice');

  const text = document.createElement('p');
  text.append(
    'We use analytics cookies to see which products people like. They are only used if you accept. See our ',
  );
  const link = document.createElement('a');
  link.href = 'privacy.html';
  link.textContent = 'Privacy Policy';
  text.append(link, '.');

  const actions = document.createElement('div');
  actions.className = 'cookie-actions';

  const decline = document.createElement('button');
  decline.type = 'button';
  decline.className = 'cookie-button';
  decline.textContent = 'Decline';
  decline.addEventListener('click', () => {
    setCookieChoice('declined');
    stopAnalytics();
    hideCookieBanner();
  });

  const accept = document.createElement('button');
  accept.type = 'button';
  accept.className = 'cookie-button cookie-button-accept';
  accept.textContent = 'Accept';
  accept.addEventListener('click', () => {
    setCookieChoice('accepted');
    loadAnalytics();
    hideCookieBanner();
  });

  actions.append(decline, accept);
  banner.append(text, actions);
  document.body.appendChild(banner);
}

// A "Cookie settings" link in the footer lets people change their mind at any time.
function addCookieSettingsLink() {
  const links = document.querySelector('.footer-links');
  if (!links || $('cookie-settings')) return;

  const button = document.createElement('button');
  button.id = 'cookie-settings';
  button.type = 'button';
  button.className = 'footer-link-button';
  button.textContent = 'Cookie settings';
  button.addEventListener('click', showCookieBanner);
  links.appendChild(button);
}

function setupCookies() {
  const choice = getCookieChoice();
  if (choice === 'accepted') loadAnalytics();
  else if (!choice) showCookieBanner();
  addCookieSettingsLink();
}

// ---------- WhatsApp updates ("add me to your broadcast") ----------

function setupUpdates() {
  const section = $('updates');
  const link = $('updates-link');
  if (!section || !link) return;

  const number = NEONE_CONFIG.whatsappNumber;
  if (!/^\d{10,15}$/.test(number)) return;   // number not set up: the section stays hidden

  link.href = 'https://wa.me/' + number + '?text=' + encodeURIComponent(NEONE_CONFIG.updatesMessage);
  link.addEventListener('click', () => trackEvent('join_whatsapp_updates'));
  section.hidden = false;
}

setupCookies();
setupUpdates();
