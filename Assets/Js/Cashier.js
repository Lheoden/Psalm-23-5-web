// ============================================================
// CASHIER MODULE
// This file handles the Cashier side of Workflow 2.
//
// Main responsibilities:
// 1. Read UNPAID orders created by the Kiosk
// 2. Display the unpaid order queue
// 3. Let the Cashier select an order
// 4. Show order details and total amount
// 5. Accept the amount received from the customer
// 6. Calculate change
// 7. Validate that the payment covers the total
// 8. Mark the order as PAID
// 9. Move the order from unpaidOrders to paidOrders
// 10. Make the paid order available to the Bar module
//
// Current prototype storage:
// Browser localStorage is used instead of a centralized
// database/backend.
// ============================================================

const STORAGE_UNPAID = 'unpaidOrders';
const STORAGE_PAID = 'paidOrders';
const STORAGE_VOIDED = 'voidedOrders';
const CASHIER_BRANCH_ID = 1; // 1 = Calamba, 2 = Lipa

let unpaidOrders = [];
let paidOrders = [];
let voidedOrders = [];
let selectedOrder = null;
let voidOrderId = null;
let paymentMethod = 'Cash';
let editOrderCopy = null;
let queueFilter = 'all';

function formatOrderNumber(value) {
  if (value === null || value === undefined) return '—';
  const text = String(value);
  if (text.startsWith('#')) return text;
  const num = parseInt(text, 10);
  return isNaN(num) ? text : '#' + String(num).padStart(2, '0');
}

function formatTime(value) {
  const date = new Date(value);
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatAmount(value) {
  return `₱${Number(value || 0).toFixed(2)}`;
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
  const normalized = String(name || '').trim();
  if (!normalized) return fallback;

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
    'cookie': fallback,
    'pasta': fallback
  };

  const key = normalized.toLowerCase();
  return mapping[key] || fallback;
}

// ------------------------------------------------------------
// REFRESH ORDER QUEUE
// Reloads the latest order data from localStorage.
// ------------------------------------------------------------
function loadOrders() {
  loadData();
}

// ============================================================
// LOAD CASHIER DATA
//
// Reads:
// - unpaidOrders = orders waiting for payment
// - paidOrders   = orders already confirmed as paid
//
// After loading, the Cashier queue and selected order details
// are refreshed.
// ============================================================

async function loadData() {
  const list = document.getElementById('order-list');

  try {
    const response = await fetch(
      `Ajax/get_unpaid_orders.php?branch_id=${CASHIER_BRANCH_ID}`,
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    const data = await response.json();

    if (
      !response.ok ||
      !data.success ||
      !Array.isArray(data.orders)
    ) {
      throw new Error(
        data.message || 'Unable to load unpaid orders.'
      );
    }

    // Unpaid orders now come from MySQL.
    unpaidOrders = data.orders;

    // Paid and voided lists still use localStorage for now.
    paidOrders = JSON.parse(
      localStorage.getItem(STORAGE_PAID) || 'null'
    ) || [];

    voidedOrders = JSON.parse(
      localStorage.getItem(STORAGE_VOIDED) || 'null'
    ) || [];

    // Remember which order was selected, if any.
    const previousId = selectedOrder
      ? Number(selectedOrder.id)
      : null;

    // Keep that selection only if the order is still unpaid.
    selectedOrder = previousId === null
      ? null
      : unpaidOrders.find(
          order =>
            Number(order.id) === previousId &&
            order.status === 'UNPAID'
        ) || null;

    renderOrderList();

    if (selectedOrder) {
      renderDetails();
    } else {
      clearSelection();
    }

    console.log(
      'Cashier orders loaded from MySQL:',
      unpaidOrders.length
    );

  } catch (error) {
    console.error('Cashier order loading failed:', error);

    if (list) {
      list.textContent =
        'Unable to load orders from the database. Check the connection.';
    }

    document.getElementById('empty-state')
      ?.classList.add('hidden');
  }
}


// ------------------------------------------------------------
// SAVE CASHIER DATA
// Persists both unpaidOrders and paidOrders to localStorage.
// ------------------------------------------------------------
function saveData() {
  localStorage.setItem(STORAGE_UNPAID, JSON.stringify(unpaidOrders));
  localStorage.setItem(STORAGE_PAID, JSON.stringify(paidOrders));
}

// ============================================================
// UNPAID ORDER QUEUE
//
// Workflow step:
// "Cashier selects unpaid order."
//
// Only orders with status UNPAID are displayed here.
// The queue can also be filtered by Dine-in / Take-out.
// ============================================================
function renderOrderList() {
  const list = document.getElementById('order-list');
  const emptyState = document.getElementById('empty-state');
  list.innerHTML = '';

  const queue = (unpaidOrders || []).filter(order => {
    const isUnpaid = order.status === 'UNPAID';
    const matchesFilter = queueFilter === 'all' || order.type === queueFilter;
    return isUnpaid && matchesFilter;
  });
  const allUnpaid = (unpaidOrders || []).filter(order => order.status === 'UNPAID');
  document.getElementById('count-all').textContent = allUnpaid.length;
  document.getElementById('count-dine-in').textContent = allUnpaid.filter(order => order.type === 'Dine-in').length;
  document.getElementById('count-take-out').textContent = allUnpaid.filter(order => order.type === 'Take-out').length;
  queue.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (!queue.length) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  queue.forEach(order => {
    const card = document.createElement('button');
    card.type = 'button';
    const isSelected = selectedOrder && selectedOrder.id === order.id;
    card.className = `order-card ${isSelected ? 'selected' : ''}`;

    const itemSummary = order.items && order.items.length
      ? order.items.map(item => `${item.qty}× ${item.name}`).join(', ')
      : 'No items';

    const total = calculateTotal(order);

    card.innerHTML = `
      <div class="order-card-main">
        <div class="order-card-meta">
          <div class="order-code">Order ${formatOrderNumber(order.number || order.id)}</div>
          <div class="order-type">${order.type}</div>
          <div class="order-summary">${itemSummary}</div>
        </div>
        <div class="order-card-side">
          <div class="order-time">${formatTime(order.timestamp)}</div>
          <div class="order-total">₱${total.toFixed(2)}</div>
        </div>
      </div>
    `;

    card.onclick = () => selectOrder(order.id);
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

// ------------------------------------------------------------
// SELECT ORDER
// Finds the chosen UNPAID order and displays its details
// in the Cashier processing panel.
// ------------------------------------------------------------
function selectOrder(orderId) {
  selectedOrder = unpaidOrders.find(order => order.id === orderId && order.status === 'UNPAID');
  if (!selectedOrder) return;
  renderOrderList();
  renderDetails();
}

// ============================================================
// DISPLAY SELECTED ORDER DETAILS
//
// Shows:
// - Order number
// - Dine-in / Take-out type
// - PENDING PAYMENT status
// - Items and customizations
// - Quantity and subtotal
// - Final order total
//
// This lets the Cashier verify the order before payment.
// ============================================================
function renderDetails() {
  if (!selectedOrder) return;
  document.getElementById('detail-panel').classList.remove('hidden');
  document.getElementById('detail-empty').classList.add('hidden');

  const orderNumberText = `Order ${formatOrderNumber(selectedOrder.number || selectedOrder.id)}`;
  document.getElementById('detail-order-number').textContent = orderNumberText;
  document.getElementById('detail-order-type').textContent = selectedOrder.type;
  document.getElementById('detail-status').textContent = 'PENDING PAYMENT';

  const detailItems = document.getElementById('detail-items');
  detailItems.innerHTML = selectedOrder.items.map(item => {
    const itemPrice = Number(item.price || 0).toFixed(2);
    const itemSubtotal = (item.qty * item.price).toFixed(2);
    const itemDetails = [item.size, item.temp, item.sugar && `${item.sugar} Sugar`].filter(value => value && value !== '-').join(' · ');
    const imageSrc = getItemImage(item.name);

    return `
      <div class="item-row">
        <div class="item-main">
          <img class="item-thumb" src="${imageSrc}" alt="${item.name}" onerror="this.src='Assets/Images/Logo.jpg'" />
          <div class="item-copy">
            <div class="item-name">${item.name}</div>
            <div class="item-meta">${itemDetails || 'Standard'}</div>
          </div>
        </div>
        <div class="item-qty">${item.qty}</div>
        <div class="item-price">₱${itemPrice}</div>
        <div class="item-subtotal">₱${itemSubtotal}</div>
      </div>
    `;
  }).join('');

  const total = calculateTotal(selectedOrder);
  document.getElementById('detail-subtotal').textContent = formatAmount(total);
  document.getElementById('detail-subtotal-copy').textContent = formatAmount(total);
  document.getElementById('detail-total-copy').textContent = formatAmount(total);
  document.getElementById('detail-item-count').textContent = selectedOrder.items.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('cash-received').value = selectedOrder.paidAmount || '';
  updatePaymentButtons();
}

// ------------------------------------------------------------
// ORDER TOTAL CALCULATION
// Adds each item's quantity × price to get the final total.
// ------------------------------------------------------------
function calculateTotal(order) {
  return (order.items || []).reduce((sum, item) => sum + item.qty * item.price, 0);
}

// ------------------------------------------------------------
// EDIT ORDER BEFORE PAYMENT
// Creates a temporary copy so the Cashier can adjust items
// before saving changes to the selected unpaid order.
// ------------------------------------------------------------
function openEditModal() {
  if (!selectedOrder) return;
  editOrderCopy = JSON.parse(JSON.stringify(selectedOrder));
  renderModalItems();
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  editOrderCopy = null;
}

function renderModalItems() {
  const container = document.getElementById('modal-items');
  container.innerHTML = '';

  if (!editOrderCopy || !editOrderCopy.items || !editOrderCopy.items.length) {
    container.innerHTML = '<div class="empty-state"><p class="empty-title">No items</p><p class="empty-sub">Add an item to continue.</p></div>';
    return;
  }

  editOrderCopy.items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'modal-item';
    card.innerHTML = `
      <div class="modal-item-head">
        <div class="modal-item-copy">
          <div class="modal-item-name">${item.name}</div>
          <div class="modal-item-meta">${[item.size, item.temp, item.sugar].filter(value => value && value !== '-').join(' · ') || 'Standard'}</div>
        </div>
        <div class="modal-item-actions">
          <div class="qty-box">
            <button type="button" class="qty-btn" onclick="updateModalQty(${index}, -1)">-</button>
            <span class="qty-value">${item.qty}</span>
            <button type="button" class="qty-btn" onclick="updateModalQty(${index}, 1)">+</button>
          </div>
          <button type="button" class="remove-item-btn" onclick="removeModalItem(${index})">Remove</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function updateModalQty(itemIndex, delta) {
  const item = editOrderCopy.items[itemIndex];
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  renderModalItems();
}

function removeModalItem(itemIndex) {
  if (!editOrderCopy || !editOrderCopy.items) return;
  editOrderCopy.items.splice(itemIndex, 1);
  renderModalItems();
}

function addModalItem() {
  if (!editOrderCopy) return;
  const type = document.getElementById('new-item-type').value;
  const itemTemplates = {
    Americano: { name: 'Americano', size: 'Medium', temp: 'Hot', sugar: '25%', price: 120 },
    Latte: { name: 'Latte', size: 'Large', temp: 'Iced', sugar: '50%', price: 150 },
    Espresso: { name: 'Espresso', size: 'Small', temp: 'Hot', sugar: '0%', price: 90 },
    Cookie: { name: 'Cookie', size: '-', temp: '-', sugar: '-', price: 55 },
    Pasta: { name: 'Pasta', size: '-', temp: '-', sugar: '-', price: 185 }
  };

  const template = itemTemplates[type];
  if (!template) return;

  editOrderCopy.items.push({ id: `m${Date.now()}`, qty: 1, ...template });
  renderModalItems();
}

// ------------------------------------------------------------
// SAVE EDITED ORDER
// Replaces the selected order's items with the edited copy,
// recalculates the total, then saves the updated data.
// ------------------------------------------------------------
function saveOrderChanges() {
  if (!selectedOrder || !editOrderCopy) return;
  selectedOrder.items = editOrderCopy.items;
  selectedOrder.total = calculateTotal(selectedOrder);
  saveData();
  renderDetails();
  renderOrderList();
  closeEditModal();
}

// ------------------------------------------------------------
// PAYMENT METHOD DISPLAY
// The current prototype supports Cash payment for this workflow.
// ------------------------------------------------------------
function updatePaymentButtons() {
  const cashBtn = document.getElementById('payment-cash');
  const cashFields = document.getElementById('cash-fields');
  if (cashBtn) cashBtn.classList.add('active');
  if (cashFields) cashFields.classList.remove('hidden');
  updateCashChange();
}

// ============================================================
// CHANGE CALCULATION
//
// Workflow step:
// "System calculates change."
//
// Formula:
// amount received - order total
//
// The displayed change is never allowed to go below zero.
// ============================================================
function updateCashChange() {
  if (!selectedOrder) return;
  const total = calculateTotal(selectedOrder);
  const input = document.getElementById('cash-received');
  const received = Math.max(0, Number(input.value || 0));
  const change = Math.max(0, received - total);
  document.getElementById('cash-change').textContent = formatAmount(change);
}

// ============================================================
// MARK AS PAID - CASHIER → BAR HANDOFF
//
// Workflow steps:
// 1. Cashier enters amount received
// 2. System validates that payment covers the total
// 3. Cashier selects "Mark as Paid"
// 4. System updates status to PAID
// 5. Order is moved to paidOrders
// 6. Order becomes available to the Bar module
//
// IMPORTANT:
// The Cashier manually receives the physical cash.
// The system only validates the entered amount and records
// the payment result; there is no online payment gateway.
// ============================================================

async function markAsPaid() {
  if (!selectedOrder) {
    alert('Please select an order first.');
    return;
  }

  const orderBeingPaid = selectedOrder;
  const total = calculateTotal(orderBeingPaid);
  const cashInput = document.getElementById('cash-received');
  const received = Number(cashInput?.value || 0);

  // Prevent payment for empty test orders.
  if (!orderBeingPaid.items || orderBeingPaid.items.length === 0 || total <= 0) {
    alert('Cannot accept payment for an order with no items.');
    return;
  }

  if (!Number.isFinite(received) || received < total) {
    alert('Amount received must cover the total before marking paid.');
    return;
  }

  const button = document.getElementById('mark-paid');
  const originalText = button ? button.textContent : '';

  if (button) {
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Saving payment...';
  }

  try {
    const response = await fetch('Ajax/mark_paid.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        order_id: Number(orderBeingPaid.id),
        branch_id: CASHIER_BRANCH_ID,
        amount_received: received
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || !data.success) {
      throw new Error(
        data?.message || 'Unable to record payment.'
      );
    }

    // Update the browser-side paid list only after PHP succeeds.
    const paidOrder = {
      ...orderBeingPaid,
      number: data.order_number || orderBeingPaid.number,
      status: data.order_status || 'PAID',
      payment: data.payment_method || 'Cash',
      paidAmount: Number(data.amount_paid),
      change: Number(data.change_amount),
      total: Number(data.total_amount),
      paidAt: new Date().toISOString()
    };

    // Avoid adding the same order twice.
    paidOrders = (paidOrders || []).filter(
      order => Number(order.id) !== Number(paidOrder.id)
    );
    paidOrders.push(paidOrder);

    // Remove it from the local unpaid queue.
    unpaidOrders = (unpaidOrders || []).filter(
      order => Number(order.id) !== Number(paidOrder.id)
    );

    // Keep the existing Bar workflow compatible for now.
    saveData();

    selectedOrder = null;
    renderOrderList();
    clearSelection();

    showSuccess(
      `Order ${formatOrderNumber(paidOrder.number || paidOrder.id)} marked as paid.`
    );

    console.log('Payment saved to MySQL:', data);

  } catch (error) {
    console.error('Payment submission failed:', error);

    alert(
      error.message ||
      'Unable to record payment. Please try again.'
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

// ------------------------------------------------------------
// CLEAR SELECTED ORDER
// Resets the details panel after an order is completed or
// no longer exists in the unpaid queue.
// ------------------------------------------------------------
function clearSelection() {
  selectedOrder = null;
  document.getElementById('detail-panel').classList.add('hidden');
  document.getElementById('detail-empty').classList.remove('hidden');
  renderOrderList();
}

// ------------------------------------------------------------
// PAYMENT SUCCESS MESSAGE
// Shows temporary confirmation after an order is marked PAID.
// ------------------------------------------------------------
function showSuccess(message) {
  const toast = document.getElementById('success-toast');
  const text = document.getElementById('success-text');
  text.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2600);
}

// ============================================================
// CASHIER INITIALIZATION
// Runs when the page finishes loading:
// - create icons
// - load stored orders
// - update Cashier clock
// - prepare payment controls
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  loadData();
  updateSidebarTime();
  setInterval(updateSidebarTime, 60000);
  updatePaymentButtons();
});
