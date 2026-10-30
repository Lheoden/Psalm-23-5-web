// Must match the integer basis-point rules in Ajax/pricing_helper.php.
const PRICING = {
  // TODO CONFIRM: set Student rate only after owner approval.
  STUDENT_RATE_BP: null,
  // TODO CONFIRM: set after confirming VAT registration and menu-price treatment.
  VAT_REGISTERED: null,
  VAT_PERCENT: null,
  // TODO CONFIRM: set after the statutory PWD/Senior computation is approved.
  PWD_SENIOR_RATE_BP: null,
  OWNER_RATE_BP: 10000,
  // TODO CONFIRM: match the approved zero-payment Owner recording method.
  OWNER_ZERO_PAYMENT_METHOD: 'Complimentary'
};

const CASHIER_BRANCH_ID = 1;
const BRANCH_NAMES = { 1: 'Calamba', 2: 'Lipa' };

let unpaidOrders = [];
let selectedOrder = null;
let queueFilter = 'all';
let paymentBusy = false;
let checkoutState = {
  orderId: null,
  category: 'Regular',
  eligibilityConfirmed: false,
  method: 'Cash',
  cashReceived: '',
  gcashRef: '',
  gcashVerified: false
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function centsFromDecimal(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return 0;
  const whole = Number(match[2]);
  const fraction = Number((match[3] || '').padEnd(2, '0'));
  const cents = whole * 100 + fraction;
  return match[1] === '-' ? -cents : cents;
}

function formatAmount(cents) {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(cents));
  return `${sign}₱${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

function formatOrderNumber(value) {
  if (value === null || value === undefined) return '—';
  const text = String(value);
  if (text.startsWith('#')) return text;
  const number = parseInt(text, 10);
  return Number.isNaN(number) ? text : `#${String(number).padStart(2, '0')}`;
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
}

function updateSidebarTime() {
  const element = document.getElementById('sidebar-time');
  if (element) {
    element.textContent = new Date().toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

function getItemImage(name) {
  const fallback = 'Assets/Images/Logo.jpg';
  const mapping = {
    americano: 'Assets/Images/Americano.png',
    latte: 'Assets/Images/Latte.png',
    espresso: 'Assets/Images/Espresso.png',
    'spanish latte': 'Assets/Images/Spanish latte.png',
    'mocha latte': 'Assets/Images/Mocha latte.png',
    'salted caramel': 'Assets/Images/Salted caramel.png',
    'caramel macchiato': 'Assets/Images/Caramel Macchiato.png',
    'ube latte': 'Assets/Images/Ube Latte.png',
    'vanilla latte': 'Assets/Images/Vanilla Latte.png',
    matcha: 'Assets/Images/Espresso matcha.png',
    'matcha cream cheese': 'Assets/Images/Matcha Cream Cheese.png',
    'blueberry matcha': 'Assets/Images/Blueberry Matcha.png',
    'strawberry matcha': 'Assets/Images/Strawberry Matcha.png',
    'espresso matcha': 'Assets/Images/Espresso matcha.png',
    cookie: fallback,
    pasta: fallback
  };
  return mapping[String(name || '').trim().toLowerCase()] || fallback;
}

function loadOrders() {
  loadData();
}

async function loadData() {
  const list = document.getElementById('order-list');
  try {
    const response = await fetch(
      `Ajax/get_unpaid_orders.php?branch_id=${CASHIER_BRANCH_ID}`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await response.json();

    if (!response.ok || !data.success || !Array.isArray(data.orders)) {
      throw new Error(data.message || 'Unable to load unpaid orders.');
    }

    const previousId = selectedOrder ? Number(selectedOrder.id) : null;
    unpaidOrders = data.orders;
    selectedOrder = previousId === null
      ? null
      : unpaidOrders.find(order =>
        Number(order.id) === previousId && order.status === 'UNPAID'
      ) || null;

    if (!selectedOrder) resetCheckout(null);
    renderOrderList();
    if (selectedOrder) renderDetails();
    else clearSelection();
    console.log('Cashier orders loaded from MySQL:', unpaidOrders.length);
  } catch (error) {
    console.error('Cashier order loading failed:', error);
    if (list) {
      list.textContent =
        'Unable to load orders from the database. Check the connection.';
    }
    document.getElementById('empty-state')?.classList.add('hidden');
  }
}

function resetCheckout(orderId) {
  checkoutState = {
    orderId,
    category: 'Regular',
    eligibilityConfirmed: false,
    method: 'Cash',
    cashReceived: '',
    gcashRef: '',
    gcashVerified: false
  };
}

function calculateSubtotal(order) {
  return (order.items || []).reduce((total, item) => {
    const quantity = Number.parseInt(item.qty, 10);
    return total + Math.max(0, quantity || 0) * centsFromDecimal(item.price);
  }, 0);
}

function computePricing(order, category) {
  const subtotalCents = calculateSubtotal(order);
  if (category === 'Student' && PRICING.STUDENT_RATE_BP === null) {
    throw new Error('Student discount settings are pending approval.');
  }
  if (
    (category === 'PWD' || category === 'Senior Citizen') &&
    (
      PRICING.PWD_SENIOR_RATE_BP === null ||
      PRICING.VAT_REGISTERED === null ||
      (PRICING.VAT_REGISTERED && PRICING.VAT_PERCENT === null)
    )
  ) {
    throw new Error('PWD/Senior discount and VAT settings are pending approval.');
  }
  let baseCents = subtotalCents;
  let vatAdjustmentCents = 0;

  if (
    (category === 'PWD' || category === 'Senior Citizen') &&
    PRICING.VAT_REGISTERED
  ) {
    const divisor = 100 + PRICING.VAT_PERCENT;
    baseCents = Math.floor(
      (subtotalCents * 100 + Math.floor(divisor / 2)) / divisor
    );
    vatAdjustmentCents = subtotalCents - baseCents;
  }

  let discountRateBp = 0;
  if (category === 'Student') {
    discountRateBp = PRICING.STUDENT_RATE_BP;
  } else if (category === 'PWD' || category === 'Senior Citizen') {
    discountRateBp = PRICING.PWD_SENIOR_RATE_BP;
  } else if (category === 'Owner') {
    discountRateBp = PRICING.OWNER_RATE_BP;
  } else if (category !== 'Regular') {
    throw new Error('Unknown customer category.');
  }

  const discountCents = discountRateBp >= 10000
    ? baseCents
    : Math.floor((baseCents * discountRateBp + 5000) / 10000);
  return {
    subtotalCents,
    baseCents,
    vatAdjustmentCents,
    discountRateBp,
    discountCents,
    finalCents: baseCents - discountCents
  };
}

function calculateTotal(order, category = checkoutState.category) {
  return computePricing(order, category).finalCents;
}

function renderOrderList() {
  const list = document.getElementById('order-list');
  const emptyState = document.getElementById('empty-state');
  list.innerHTML = '';

  const allUnpaid = unpaidOrders.filter(order => order.status === 'UNPAID');
  const queue = allUnpaid.filter(order =>
    queueFilter === 'all' || order.type === queueFilter
  );
  document.getElementById('count-all').textContent = allUnpaid.length;
  document.getElementById('count-dine-in').textContent =
    allUnpaid.filter(order => order.type === 'Dine-in').length;
  document.getElementById('count-take-out').textContent =
    allUnpaid.filter(order => order.type === 'Take-out').length;
  queue.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (!queue.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  queue.forEach(order => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className =
      `order-card ${selectedOrder && Number(selectedOrder.id) === Number(order.id) ? 'selected' : ''}`;
    const itemSummary = order.items?.length
      ? order.items.map(item =>
        `${Number(item.qty)}× ${escapeHtml(item.name)}`
      ).join(', ')
      : 'No items';
    const subtotal = calculateSubtotal(order);

    card.innerHTML = `
      <div class="order-card-main">
        <div class="order-card-meta">
          <div class="order-code">Order ${escapeHtml(formatOrderNumber(order.number || order.id))}</div>
          <div class="order-type">${escapeHtml(order.type)}</div>
          <div class="order-summary">${itemSummary}</div>
        </div>
        <div class="order-card-side">
          <div class="order-time">${escapeHtml(formatTime(order.timestamp))}</div>
          <div class="order-total">${formatAmount(subtotal)}</div>
        </div>
      </div>
    `;
    card.addEventListener('click', () => selectOrder(order.id));
    list.appendChild(card);
  });
}

function setQueueFilter(filter) {
  queueFilter = filter;
  document.querySelectorAll('.queue-filter').forEach(button => {
    button.classList.toggle('active', button.dataset.filter === filter);
  });
  renderOrderList();
}

function selectOrder(orderId) {
  selectedOrder = unpaidOrders.find(order =>
    Number(order.id) === Number(orderId) && order.status === 'UNPAID'
  );
  if (!selectedOrder) return;
  if (Number(checkoutState.orderId) !== Number(selectedOrder.id)) {
    resetCheckout(Number(selectedOrder.id));
  }
  renderOrderList();
  renderDetails();
}

function renderDetails() {
  if (!selectedOrder) return;
  document.getElementById('detail-panel').classList.remove('hidden');
  document.getElementById('detail-empty').classList.add('hidden');
  document.getElementById('detail-order-number').textContent =
    `Order ${formatOrderNumber(selectedOrder.number || selectedOrder.id)}`;
  document.getElementById('detail-order-type').textContent = selectedOrder.type;
  document.getElementById('detail-status').textContent = 'PENDING PAYMENT';

  const detailItems = document.getElementById('detail-items');
  detailItems.innerHTML = (selectedOrder.items || []).map(item => {
    const quantity = Number.parseInt(item.qty, 10) || 0;
    const unitPriceCents = centsFromDecimal(item.price);
    const details = [
      item.size,
      item.temp,
      item.sugar ? `${item.sugar} Sugar` : ''
    ].filter(value => value && value !== '-').join(' · ');
    const imageSrc = getItemImage(item.name);
    return `
      <div class="item-row">
        <div class="item-main">
          <img class="item-thumb" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(item.name)}" onerror="this.src='Assets/Images/Logo.jpg'" />
          <div class="item-copy">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-meta">${escapeHtml(details || 'Standard')}</div>
          </div>
        </div>
        <div class="item-qty">${quantity}</div>
        <div class="item-price">${formatAmount(unitPriceCents)}</div>
        <div class="item-subtotal">${formatAmount(unitPriceCents * quantity)}</div>
      </div>
    `;
  }).join('');

  document.getElementById('cash-received').value = checkoutState.cashReceived;
  document.getElementById('gcash-reference').value = checkoutState.gcashRef;
  document.getElementById('gcash-verified').checked = checkoutState.gcashVerified;
  updateCategoryButtons();
  updatePaymentButtons();
}

function updateCategoryButtons() {
  let pendingCount = 0;
  document.querySelectorAll('.category-option').forEach(button => {
    const category = button.dataset.category;
    const unavailable = categoryPricingPending(category);
    if (unavailable) pendingCount += 1;
    const selected = button.dataset.category === checkoutState.category;
    button.disabled = unavailable;
    button.setAttribute('aria-disabled', String(unavailable));
    button.classList.toggle('active', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  document.getElementById('pricing-pending-note')
    .classList.toggle('hidden', pendingCount === 0);
}

function categoryPricingPending(category) {
  if (category === 'Student') return PRICING.STUDENT_RATE_BP === null;
  if (category === 'PWD' || category === 'Senior Citizen') {
    return PRICING.PWD_SENIOR_RATE_BP === null ||
      PRICING.VAT_REGISTERED === null ||
      (PRICING.VAT_REGISTERED && PRICING.VAT_PERCENT === null);
  }
  return category === 'Owner';
}

function selectCategory(category) {
  if (!['Regular', 'Student', 'PWD', 'Senior Citizen', 'Owner'].includes(category)) {
    return;
  }
  if (categoryPricingPending(category)) return;
  if (
    (category === 'Student' || category === 'PWD' || category === 'Senior Citizen') &&
    !window.confirm(
      category === 'Student'
        ? "Confirm that you checked the customer's valid student eligibility."
        : "Confirm that you checked the customer's valid PWD/Senior eligibility."
    )
  ) {
    return;
  }
  checkoutState.category = category;
  checkoutState.eligibilityConfirmed =
    category === 'Student' || category === 'PWD' || category === 'Senior Citizen';
  updateCategoryButtons();
  updatePaymentButtons();
}

function selectPaymentMethod(method) {
  if (method !== 'Cash' && method !== 'GCash') return;
  checkoutState.method = method;
  updatePaymentButtons();
}

function currentPricing() {
  return selectedOrder
    ? computePricing(selectedOrder, checkoutState.category)
    : {
      subtotalCents: 0,
      vatAdjustmentCents: 0,
      discountRateBp: 0,
      discountCents: 0,
      finalCents: 0
    };
}

function updatePaymentButtons() {
  const pricing = currentPricing();
  const zeroPayment = pricing.finalCents === 0;
  const cashSelected = checkoutState.method === 'Cash';

  document.querySelector('.payment-method-options')
    .classList.toggle('hidden', zeroPayment);
  document.getElementById('payment-cash').classList.toggle('active', cashSelected);
  document.getElementById('payment-cash').setAttribute('aria-pressed', String(cashSelected));
  document.getElementById('payment-gcash').classList.toggle('active', !cashSelected);
  document.getElementById('payment-gcash').setAttribute('aria-pressed', String(!cashSelected));
  document.getElementById('cash-fields').classList.toggle('hidden', zeroPayment || !cashSelected);
  document.getElementById('gcash-fields').classList.toggle('hidden', zeroPayment || cashSelected);
  document.getElementById('zero-payment-block').classList.toggle('hidden', !zeroPayment);

  document.getElementById('summary-subtotal').textContent =
    formatAmount(pricing.subtotalCents);
  const vatRow = document.getElementById('summary-vat-row');
  vatRow.classList.toggle('hidden', pricing.vatAdjustmentCents === 0);
  document.getElementById('summary-vat').textContent =
    formatAmount(pricing.vatAdjustmentCents);
  const discountRow = document.getElementById('summary-discount-row');
  discountRow.classList.toggle('hidden', pricing.discountCents === 0);
  document.getElementById('summary-discount-label').textContent =
    `Less Discount (${(pricing.discountRateBp / 100).toFixed(2)}%)`;
  document.getElementById('summary-discount').textContent =
    formatAmount(pricing.discountCents);
  document.getElementById('summary-total-payable').textContent =
    formatAmount(pricing.finalCents);
  document.getElementById('gcash-verification-copy').textContent =
    `I checked the GCash merchant account and the payment of ${formatAmount(pricing.finalCents)} was received.`;

  updateCashChange();
  updatePaymentReadiness();
}

function amountInputToCents(value) {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const cents = centsFromDecimal(value);
  return cents < 0 ? null : cents;
}

function updateCashChange() {
  const pricing = currentPricing();
  const input = document.getElementById('cash-received');
  const entered = amountInputToCents(input.value);
  checkoutState.cashReceived = input.value;
  const change = entered === null
    ? 0
    : Math.max(0, entered - pricing.finalCents);
  document.getElementById('cash-change').textContent = formatAmount(change);

  const shortfall = document.getElementById('cash-shortfall');
  if (entered !== null && entered < pricing.finalCents) {
    shortfall.textContent =
      `Short by ${formatAmount(pricing.finalCents - entered)}`;
    shortfall.classList.remove('hidden');
  } else {
    shortfall.textContent = '';
    shortfall.classList.add('hidden');
  }
  updatePaymentReadiness();
}

function updatePaymentReadiness() {
  const button = document.getElementById('mark-paid');
  if (!button) return;
  const pricing = currentPricing();
  const zeroPaymentReady =
    pricing.finalCents === 0 && checkoutState.category === 'Owner';
  const cashReceived = amountInputToCents(
    document.getElementById('cash-received')?.value || ''
  );
  const gcashReference = checkoutState.gcashRef.trim();
  const gcashReady =
    gcashReference.length > 0 &&
    gcashReference.length <= 20 &&
    !/[\u0000-\u001f\u007f]/.test(gcashReference) &&
    checkoutState.gcashVerified;
  const cashReady =
    cashReceived !== null && cashReceived >= pricing.finalCents;
  const methodReady = pricing.finalCents === 0
    ? zeroPaymentReady
    : checkoutState.method === 'Cash' ? cashReady : gcashReady;

  button.disabled = paymentBusy || !selectedOrder || !methodReady;
}

function handleGcashReferenceChange(event) {
  checkoutState.gcashRef = event.target.value;
  updatePaymentReadiness();
}

function handleGcashVerificationChange(event) {
  checkoutState.gcashVerified = event.target.checked;
  updatePaymentReadiness();
}

async function markAsPaid() {
  if (paymentBusy || !selectedOrder) return;
  const orderBeingPaid = selectedOrder;
  const pricing = computePricing(orderBeingPaid, checkoutState.category);

  if (!orderBeingPaid.items?.length || pricing.subtotalCents <= 0) {
    alert('Cannot accept payment for an order with no items.');
    return;
  }

  updatePaymentReadiness();
  const button = document.getElementById('mark-paid');
  if (button.disabled) return;

  const amountReceivedCents = pricing.finalCents === 0
    ? 0
    : checkoutState.method === 'Cash'
      ? amountInputToCents(checkoutState.cashReceived)
      : pricing.finalCents;
  const paymentMethod = pricing.finalCents === 0
    ? 'None'
    : checkoutState.method;
  const payload = {
    order_id: Number(orderBeingPaid.id),
    branch_id: CASHIER_BRANCH_ID,
    customer_category: checkoutState.category,
    eligibility_confirmed: checkoutState.eligibilityConfirmed,
    payment_method: paymentMethod,
    amount_received: amountReceivedCents,
    gcash_reference: checkoutState.method === 'GCash'
      ? checkoutState.gcashRef.trim()
      : null,
    payment_verified:
      checkoutState.method === 'GCash' && checkoutState.gcashVerified,
    expected_final_amount: pricing.finalCents
  };

  paymentBusy = true;
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Saving payment...';

  try {
    const response = await fetch('Ajax/mark_paid.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || 'Unable to record payment.');
    }

    const paidOrder = {
      ...orderBeingPaid,
      number: data.order_number,
      status: data.order_status,
      payment: data.payment_method,
      paidAmount: data.amount_paid,
      change: data.change_amount,
      total: data.total_amount,
      paidAt: data.paid_at,
      branch_id: CASHIER_BRANCH_ID
    };
    unpaidOrders = unpaidOrders.filter(
      order => Number(order.id) !== Number(paidOrder.id)
    );

    // This single localStorage write only nudges an open Bar tab to reload from MySQL.
    try {
      localStorage.setItem('paidOrders', JSON.stringify([paidOrder]));
    } catch (storageError) {
      console.warn('Unable to notify the open Bar tab to refresh:', storageError);
    }

    showReceipt(data);
    selectedOrder = null;
    resetCheckout(null);
    renderOrderList();
    clearSelection();
    showSuccess(
      `Order ${formatOrderNumber(data.order_number)} marked as paid.`
    );
  } catch (error) {
    console.error('Payment submission failed:', error);
    alert(error.message || 'Unable to record payment. Please try again.');
  } finally {
    paymentBusy = false;
    button.textContent = originalText;
    updatePaymentReadiness();
  }
}

function showReceipt(receipt) {
  if (!receipt || receipt.order_status !== 'PAID') return;
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const rows = items.map(item => {
    const unitPriceCents = centsFromDecimal(item.unit_price);
    const lineTotalCents = centsFromDecimal(item.line_total);
    const itemDetails = [
      item.size,
      item.temperature,
      item.sugar_percent ? `${item.sugar_percent} Sugar` : ''
    ].filter(value => value && value !== '-').join(' · ');
    return `<tr>
      <td>${escapeHtml(item.name)}${itemDetails ? `<small>${escapeHtml(itemDetails)}</small>` : ''}</td>
      <td>${Number(item.quantity)} × ${formatAmount(unitPriceCents)}</td>
      <td>${formatAmount(lineTotalCents)}</td>
    </tr>`;
  }).join('');

  const method = receipt.payment_method;
  const date = new Date(receipt.paid_at);
  const dateText = Number.isNaN(date.getTime()) ? receipt.paid_at : date.toLocaleString();
  const gcashLine = method === 'GCash'
    ? `<div><span>GCash Reference</span><strong>${escapeHtml(receipt.gcash_reference)}</strong></div>`
    : '';
  const cashLines = method === 'Cash'
    ? `<div><span>Amount received</span><strong>${formatAmount(centsFromDecimal(receipt.amount_paid))}</strong></div>
       <div><span>Change</span><strong>${formatAmount(centsFromDecimal(receipt.change_amount))}</strong></div>`
    : '';

  document.getElementById('receipt-content').innerHTML = `
    <header class="receipt-header">
      <h2 id="receipt-title">Psalm 23:5 Coffee</h2>
      <p>${escapeHtml(receipt.branch_name)} Branch · ${escapeHtml(receipt.order_type)}</p>
      <p>Order ${escapeHtml(receipt.order_number)}</p>
      <p>${escapeHtml(dateText)}</p>
      <p>Customer category: ${escapeHtml(receipt.customer_category)}</p>
    </header>
    <table class="receipt-items">
      <thead><tr><th>Product</th><th>Qty × Price</th><th>Line total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="receipt-summary">
      <div><span>Subtotal</span><strong>${formatAmount(centsFromDecimal(receipt.subtotal_amount))}</strong></div>
      <div><span>Less VAT</span><strong>${formatAmount(centsFromDecimal(receipt.vat_adjustment_amount))}</strong></div>
      <div><span>Less Discount (${(Number(receipt.discount_rate) * 100).toFixed(2)}%)</span><strong>−${formatAmount(centsFromDecimal(receipt.discount_amount))}</strong></div>
      <div class="receipt-total"><span>Total payable</span><strong>${formatAmount(centsFromDecimal(receipt.total_amount))}</strong></div>
      <div><span>Payment method</span><strong>${escapeHtml(method)}</strong></div>
      ${gcashLine}
      ${cashLines}
    </div>
    <p class="receipt-thanks">Thank you for visiting Psalm 23:5 Coffee.</p>
  `;
  document.getElementById('receipt-modal').classList.remove('hidden');
}

function closeReceipt() {
  document.getElementById('receipt-modal').classList.add('hidden');
}

function printReceipt() {
  document.body.classList.add('printing-receipt');
  window.addEventListener(
    'afterprint',
    () => document.body.classList.remove('printing-receipt'),
    { once: true }
  );
  window.print();
}

function clearSelection() {
  selectedOrder = null;
  document.getElementById('detail-panel').classList.add('hidden');
  document.getElementById('detail-empty').classList.remove('hidden');
  updatePaymentReadiness();
  renderOrderList();
}

function showSuccess(message) {
  const toast = document.getElementById('success-toast');
  document.getElementById('success-text').textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2600);
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();
  document.getElementById('sidebar-branch-name').textContent =
    `${BRANCH_NAMES[CASHIER_BRANCH_ID] || 'Unknown'} Branch`;
  document.getElementById('payment-cash')
    .addEventListener('click', () => selectPaymentMethod('Cash'));
  document.getElementById('payment-gcash')
    .addEventListener('click', () => selectPaymentMethod('GCash'));
  document.querySelectorAll('.category-option').forEach(button => {
    button.addEventListener('click', () => selectCategory(button.dataset.category));
  });
  document.getElementById('gcash-reference')
    .addEventListener('input', handleGcashReferenceChange);
  document.getElementById('gcash-verified')
    .addEventListener('change', handleGcashVerificationChange);

  ['openVoidModal', 'closeVoidModal', 'confirmVoidOrder'].forEach(name => {
    if (typeof window[name] !== 'function') {
      console.warn(`${name} is not implemented; Void Order is unavailable.`);
    }
  });

  loadData();
  updateSidebarTime();
  setInterval(updateSidebarTime, 60000);
  updatePaymentButtons();
});
