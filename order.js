// The order page: review the list, then send it on WhatsApp.

// The latest price for each product code, from the database.
// A code that is missing here is no longer for sale.
let fresh = null;   // null until loaded (or if loading failed)

function lineInfo(item) {
  if (!fresh) return { available: true, price: item.price };
  const current = fresh[item.tag];
  if (!current) return { available: false, price: item.price };
  return { available: true, price: current.price };
}

function optionText(item) {
  return [item.size ? 'Size: ' + item.size : '', item.color ? 'Color: ' + item.color : '']
    .filter(Boolean).join('  |  ');
}

// ---------- Remembering that the customer agreed ----------

const TERMS_KEY = 'neone_terms_agreed';

function termsRemembered() {
  try {
    return localStorage.getItem(TERMS_KEY) === NEONE_CONFIG.termsVersion;
  } catch (e) {
    return false;
  }
}

function rememberTerms() {
  try {
    localStorage.setItem(TERMS_KEY, NEONE_CONFIG.termsVersion);
  } catch (e) {
    // Not saved: they will simply be asked again next time.
  }
}

function showAgreement() {
  const remembered = termsRemembered();
  $('agree-row').hidden = remembered;
}

// ---------- Drawing the list ----------

function makeQtyButton(text, label, disabled, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'qty-button';
  button.textContent = text;
  button.setAttribute('aria-label', label);
  button.disabled = disabled;
  button.addEventListener('click', handler);
  return button;
}

function render() {
  const list = loadOrder();
  const count = orderCount();

  $('order-empty').hidden = list.length > 0;
  $('order-content').hidden = list.length === 0;
  $('order-count').textContent = list.length === 0 ? '' : count + '/' + NEONE_CONFIG.orderCap + ' items';
  $('clear-all').hidden = list.length === 0;
  if (list.length === 0) return;

  let total = 0;
  let unavailable = 0;
  const atCap = count >= NEONE_CONFIG.orderCap;

  const rows = list.map((item, index) => {
    const info = lineInfo(item);
    if (info.available) total += info.price * item.qty;
    else unavailable += 1;

    const li = document.createElement('li');
    li.className = 'order-item' + (info.available ? '' : ' order-item-gone');

    const top = document.createElement('div');
    top.className = 'order-item-top';

    const name = document.createElement('p');
    name.className = 'order-item-name';
    name.textContent = item.name;

    const code = document.createElement('p');
    code.className = 'muted';
    code.textContent = 'Code #' + item.tag;

    const details = optionText(item);
    top.append(name, code);
    if (details) {
      const d = document.createElement('p');
      d.className = 'muted';
      d.textContent = details;
      top.appendChild(d);
    }

    const bottom = document.createElement('div');
    bottom.className = 'order-item-bottom';

    if (info.available) {
      const qty = document.createElement('div');
      qty.className = 'qty';
      const number = document.createElement('span');
      number.className = 'qty-number';
      number.textContent = item.qty;
      qty.append(
        makeQtyButton('-', 'Remove one', false, () => { changeQty(index, -1); render(); }),
        number,
        makeQtyButton('+', 'Add one', atCap, () => { changeQty(index, 1); render(); })
      );

      const price = document.createElement('p');
      price.className = 'order-item-price';
      price.textContent = formatNaira(info.price * item.qty);

      bottom.append(qty, price);
    } else {
      const gone = document.createElement('p');
      gone.className = 'order-item-gone-text';
      gone.textContent = 'No longer available';
      bottom.appendChild(gone);
    }

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'text-link-button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', 'Remove ' + item.name + ' from the order list');
    remove.addEventListener('click', () => { removeOrderLine(index); render(); });
    bottom.appendChild(remove);

    li.append(top, bottom);
    return li;
  });

  $('order-items').replaceChildren(...rows);
  $('order-total').textContent = formatNaira(total);

  const notice = $('order-notice');
  if (unavailable > 0) {
    notice.textContent = unavailable === 1
      ? 'One item is no longer available. It will not be included in your order. Please remove it.'
      : unavailable + ' items are no longer available. They will not be included in your order. Please remove them.';
    notice.hidden = false;
  } else if (atCap) {
    notice.textContent = 'You have ' + NEONE_CONFIG.orderCap + ' items, the most we can take in one order. Send this order, then start a new one.';
    notice.hidden = false;
  } else {
    notice.hidden = true;
  }

  $('send-error').textContent = '';
}

// ---------- The WhatsApp message ----------

function buildMessage() {
  const lines = [];
  let number = 0;

  loadOrder().forEach((item) => {
    const info = lineInfo(item);
    if (!info.available) return;
    number += 1;

    lines.push(number + '. #' + item.tag + ' ' + item.name);
    const details = [];
    if (item.size) details.push('Size: ' + item.size);
    if (item.color) details.push('Color: ' + item.color);
    details.push('Qty: ' + item.qty);
    lines.push('   ' + details.join(' | '));
  });

  return {
    count: number,
    text: [
      'Hi, I want to order these:',
      '',
      ...lines,
      '',
      'I have read and agree to the Terms and Conditions and the Delivery and Returns policy.',
      'Please confirm availability and the delivery fee.'
    ].join('\n')
  };
}

function handleSend() {
  const errorBox = $('send-error');
  errorBox.textContent = '';

  const message = buildMessage();
  if (message.count === 0) {
    errorBox.textContent = 'There are no available items in your order list.';
    return;
  }
  if (!termsRemembered() && !$('agree').checked) {
    errorBox.textContent = 'Please tick the box to agree to the Terms and the Delivery and Returns policy.';
    return;
  }
  if (!/^\d{10,15}$/.test(NEONE_CONFIG.whatsappNumber)) {
    errorBox.textContent = 'The WhatsApp number has not been set up yet. (Owner: set whatsappNumber in config.js.)';
    return;
  }

  const url = 'https://wa.me/' + NEONE_CONFIG.whatsappNumber + '?text=' + encodeURIComponent(message.text);
  const opened = window.open(url, '_blank', 'noopener');
  if (!opened) window.location.href = url;   // pop-up blocked: go there in this tab instead

  trackEvent('begin_checkout', { currency: 'NGN', items: loadOrder().map((item) => ({
    item_id: item.tag, item_name: item.name, price: item.price, quantity: item.qty })) });
  rememberTerms();
  $('sent-box').hidden = false;
}

// ---------- Start ----------

async function loadFreshPrices() {
  const list = loadOrder();
  if (list.length === 0) return;

  const tags = Array.from(new Set(list.map((item) => item.tag)));
  const { data, error } = await db
    .from('products')
    .select('tag, price')
    .eq('status', 'active')
    .in('tag', tags);

  if (error) return;   // could not check: keep the saved prices

  fresh = {};
  data.forEach((row) => { fresh[row.tag] = row; });
}

async function start() {
  $('send-button').addEventListener('click', handleSend);
  $('clear-all').addEventListener('click', () => {
    if (!window.confirm('Remove all items from your order list?')) return;
    clearOrder();
    $('sent-box').hidden = true;
    render();
  });
  $('clear-button').addEventListener('click', () => {
    clearOrder();
    $('sent-box').hidden = true;
    $('agree').checked = false;
    showAgreement();
    render();
  });

  showAgreement();
  render();                  // show the saved list straight away
  await loadFreshPrices();   // then check prices and availability
  render();
}

start();
