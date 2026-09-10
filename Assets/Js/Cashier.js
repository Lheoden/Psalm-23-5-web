const STORAGE_UNPAID = 'unpaidOrders';
const STORAGE_PAID = 'paidOrders';
let unpaidOrders = [];
let paidOrders = [];
let selectedOrder = null;
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
  const fallback = '../Assets/Images/Logo.jpg';
  const normalized = String(name || '').trim();
  if (!normalized) return fallback;

  const mapping = {
    americano: '../Assets/Images/Americano.png',
    latte: '../Assets/Images/Latte.png',
    espresso: '../Assets/Images/Espresso.png',
    'spanish latte': '../Assets/Images/Spanish latte.png',
    'mocha latte': '../Assets/Images/Mocha latte.png',
    'salted caramel': '../Assets/Images/Salted caramel.png',
    'caramel macchiato': '../Assets/Images/Caramel Macchiato.png',
    'ube latte': '../Assets/Images/Ube Latte.png',
    'vanilla latte': '../Assets/Images/Vanilla Latte.png',
    matcha: '../Assets/Images/Espresso matcha.png',
    'matcha cream cheese': '../Assets/Images/Matcha Cream Cheese.png',
    'blueberry matcha': '../Assets/Images/Blueberry Matcha.png',
    'strawberry matcha': '../Assets/Images/Strawberry Matcha.png',
    'espresso matcha': '../Assets/Images/Espresso matcha.png',
    'cookie': fallback,
    'pasta': fallback
  };

  const key = normalized.toLowerCase();
  return mapping[key] || fallback;
}

function loadOrders() {
  loadData();
}

function loadData() {
  unpaidOrders = JSON.parse(localStorage.getItem(STORAGE_UNPAID) || 'null') || [];
  paidOrders = JSON.parse(localStorage.getItem(STORAGE_PAID) || 'null') || [];
  renderOrderList();
  if (!selectedOrder) {
    clearSelection();
  } else {
    const stillExists = unpaidOrders.some(order => order.id === selectedOrder.id);
    if (!stillExists) {
      selectedOrder = null;
      clearSelection();
    } else {
      renderDetails();
    }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_UNPAID, JSON.stringify(unpaidOrders));
  localStorage.setItem(STORAGE_PAID, JSON.stringify(paidOrders));
}

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

function selectOrder(orderId) {
  selectedOrder = unpaidOrders.find(order => order.id === orderId);
  if (!selectedOrder) return;
  renderOrderList();
  renderDetails();
}

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
          <img class="item-thumb" src="${imageSrc}" alt="${item.name}" onerror="this.src='../Assets/Images/Logo.jpg'" />
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

function calculateTotal(order) {
  return (order.items || []).reduce((sum, item) => sum + item.qty * item.price, 0);
}

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

function saveOrderChanges() {
  if (!selectedOrder || !editOrderCopy) return;
  selectedOrder.items = editOrderCopy.items;
  selectedOrder.total = calculateTotal(selectedOrder);
  saveData();
  renderDetails();
  renderOrderList();
  closeEditModal();
}

function updatePaymentButtons() {
  const cashBtn = document.getElementById('payment-cash');
  const cashFields = document.getElementById('cash-fields');
  if (cashBtn) cashBtn.classList.add('active');
  if (cashFields) cashFields.classList.remove('hidden');
  updateCashChange();
}

function updateCashChange() {
  if (!selectedOrder) return;
  const total = calculateTotal(selectedOrder);
  const input = document.getElementById('cash-received');
  const received = Math.max(0, Number(input.value || 0));
  const change = Math.max(0, received - total);
  document.getElementById('cash-change').textContent = formatAmount(change);
}

function markAsPaid() {
  if (!selectedOrder) return;
  const total = calculateTotal(selectedOrder);
  const received = Math.max(0, Number(document.getElementById('cash-received').value || 0));

  if (received < total) {
    alert('Amount received must cover the total before marking paid.');
    return;
  }

  selectedOrder.paidAmount = received;
  selectedOrder.change = received - total;
  selectedOrder.total = total;
  selectedOrder.paidAt = new Date().toISOString();
  selectedOrder.status = 'PAID';
  selectedOrder.payment = paymentMethod;

  paidOrders.push(selectedOrder);
  unpaidOrders = unpaidOrders.filter(order => order.id !== selectedOrder.id);
  saveData();
  showSuccess(`Order ${formatOrderNumber(selectedOrder.number || selectedOrder.id)} marked as paid.`);

  selectedOrder = null;
  renderOrderList();
  clearSelection();
}

function clearSelection() {
  selectedOrder = null;
  document.getElementById('detail-panel').classList.add('hidden');
  document.getElementById('detail-empty').classList.remove('hidden');
  renderOrderList();
}

function showSuccess(message) {
  const toast = document.getElementById('success-toast');
  const text = document.getElementById('success-text');
  text.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2600);
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  loadData();
  updateSidebarTime();
  setInterval(updateSidebarTime, 60000);
  updatePaymentButtons();
});
