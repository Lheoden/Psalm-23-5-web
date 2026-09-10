const STORAGE_PAID = 'paidOrders';
const STORAGE_COMPLETED = 'completedOrders';
let paidOrders = [];
let selectedOrder = null;
let activePanel = 'details';

const inventoryItems = [
  { name: 'Coffee Beans', currentStock: 2.5, lowStockThreshold: 1, unit: 'kg' },
  { name: 'Milk', currentStock: 1.2, lowStockThreshold: 0.5, unit: 'L' },
  { name: 'Matcha Powder', currentStock: 200, lowStockThreshold: 300, unit: 'g' },
  { name: 'Chocolate Syrup', currentStock: 100, lowStockThreshold: 150, unit: 'ml' },
  { name: 'Caramel Syrup', currentStock: 450, lowStockThreshold: 200, unit: 'ml' },
  { name: 'Cups (16oz)', currentStock: 35, lowStockThreshold: 50, unit: 'pcs' }
];

function formatOrderNumber(value) {
  if (value === null || value === undefined) return '-';
  const text = String(value);
  if (text.startsWith('#')) return text;
  const number = parseInt(text, 10);
  return Number.isNaN(number) ? text : `#${String(number).padStart(2, '0')}`;
}

function formatTime(value) {
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getItemImage(name) {
  const images = { americano: 'Americano.png', latte: 'Latte.png', espresso: 'Espresso.png', 'spanish latte': 'Spanish latte.png', 'mocha latte': 'Mocha latte.png', 'salted caramel': 'Salted caramel.png', 'caramel macchiato': 'Caramel Macchiato.png', 'ube latte': 'Ube Latte.png', 'vanilla latte': 'Vanilla Latte.png', 'espresso matcha': 'Espresso matcha.png', 'matcha cream cheese': 'Matcha Cream Cheese.png', 'blueberry matcha': 'Blueberry Matcha.png', 'strawberry matcha': 'Strawberry Matcha.png' };
  return `Assets/Images/${images[String(name || '').trim().toLowerCase()] || 'Logo.jpg'}`;
}

function loadOrders() { loadData(); }
function saveData() { localStorage.setItem(STORAGE_PAID, JSON.stringify(paidOrders)); }
function getQueueOrders() {
  return [...paidOrders].filter(order => order.status === 'PAID' || order.status === 'PREPARING').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function loadData() {
  paidOrders = JSON.parse(localStorage.getItem(STORAGE_PAID) || 'null') || [];
  renderOrderQueue();
  renderInventoryOverview();
  if (selectedOrder && getQueueOrders().some(order => order.id === selectedOrder.id)) renderDetails();
  else clearDetailPanel();
}

function renderOrderQueue() {
  const list = document.getElementById('order-list');
  const queue = getQueueOrders();
  list.innerHTML = '';
  document.getElementById('queue-count').textContent = queue.length;
  document.getElementById('queue-empty').classList.toggle('hidden', queue.length > 0);
  queue.forEach(order => {
    const card = document.createElement('button');
    const selected = selectedOrder && selectedOrder.id === order.id;
    const items = order.items || [];
    const itemCount = items.reduce((sum, item) => sum + (item.qty || 1), 0);
    const summary = items.map(item => `${item.qty || 1}x ${item.name}`).join(' - ') || 'No items';
    card.type = 'button';
    card.className = `bar-order-card ${selected ? 'selected' : ''}`;
    card.innerHTML = `<div class="bar-order-card-head"><strong>${formatOrderNumber(order.number || order.id)}</strong><span>${formatTime(order.paidAt || order.timestamp)}</span><b class="order-type-badge">${order.type || 'Order'}</b><b class="${order.status === 'PREPARING' ? 'status-preparing' : 'status-paid'}">${order.status}</b></div><div class="bar-order-card-body"><strong>${itemCount} item${itemCount === 1 ? '' : 's'}</strong><span>${summary}</span></div>`;
    card.onclick = () => selectOrder(order.id);
    list.appendChild(card);
  });
}

function renderInventoryOverview() {
  const list = document.getElementById('inventory-list');
  const lowItems = inventoryItems.filter(item => item.currentStock <= item.lowStockThreshold);
  list.innerHTML = inventoryItems.map(item => {
    const low = item.currentStock <= item.lowStockThreshold;
    const percent = Math.min(100, Math.max(8, item.currentStock / Math.max(item.lowStockThreshold * 2, item.currentStock) * 100));
    return `<div class="inventory-item"><div class="inventory-item-top"><span class="inventory-icon"><i data-lucide="package" class="w-4 h-4"></i></span><div><strong>${item.name}</strong><small>${item.currentStock} ${item.unit}</small></div><b class="stock-${low ? 'low' : 'good'}">${low ? 'LOW' : 'GOOD'}</b></div><div class="stock-bar"><span style="width:${percent}%"></span></div></div>`;
  }).join('');
  document.getElementById('low-stock-alert').classList.toggle('hidden', lowItems.length === 0);
  lucide.createIcons();
}

function selectOrder(orderId) {
  selectedOrder = getQueueOrders().find(order => order.id === orderId) || null;
  if (selectedOrder) { showPanel('details'); renderDetails(); renderOrderQueue(); }
}

function renderDetails() {
  if (!selectedOrder) return;
  document.getElementById('detail-panel').classList.remove('hidden');
  document.getElementById('detail-empty').classList.add('hidden');
  document.getElementById('detail-title').textContent = `Order ${formatOrderNumber(selectedOrder.number || selectedOrder.id)}`;
  document.getElementById('order-number').textContent = formatOrderNumber(selectedOrder.number || selectedOrder.id).replace('#', '');
  document.getElementById('order-time').textContent = `Paid at ${formatTime(selectedOrder.paidAt || selectedOrder.timestamp)}`;
  document.getElementById('order-type').textContent = selectedOrder.type || 'Order';
  const status = document.getElementById('order-status');
  status.textContent = selectedOrder.status;
  status.className = selectedOrder.status === 'PREPARING' ? 'status-preparing' : 'status-paid';
  const items = selectedOrder.items || [];
  document.getElementById('items-list').innerHTML = items.map(item => {
    const details = [item.size, item.temp, item.sugar && `${item.sugar} Sugar`].filter(value => value && value !== '-').join(' - ') || 'Standard';
    return `<div class="bar-item-row"><img src="${getItemImage(item.name)}" alt="${item.name}" onerror="this.src='Assets/Images/Logo.jpg'" /><div><strong>${item.name}</strong><span>${details}</span></div><b>${item.qty || 1} x</b></div>`;
  }).join('');
  document.getElementById('detail-count').textContent = items.reduce((sum, item) => sum + (item.qty || 1), 0);
  updateActionButtons();
  lucide.createIcons();
}

function updateActionButtons() {
  document.getElementById('btn-start').disabled = !selectedOrder || selectedOrder.status !== 'PAID';
  document.getElementById('btn-ready').disabled = !selectedOrder || selectedOrder.status !== 'PREPARING';
}

function startPreparing() {
  if (!selectedOrder || selectedOrder.status !== 'PAID') return;
  selectedOrder.status = 'PREPARING';
  selectedOrder.startedAt = new Date().toISOString();
  saveData(); renderOrderQueue(); renderDetails();
  showToast(`Order ${formatOrderNumber(selectedOrder.number || selectedOrder.id)} is now preparing.`);
}

function markReady() {
  if (!selectedOrder || selectedOrder.status !== 'PREPARING') return;
  const completedOrders = JSON.parse(localStorage.getItem(STORAGE_COMPLETED) || 'null') || [];
  completedOrders.push({ ...selectedOrder, status: 'READY', completedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_COMPLETED, JSON.stringify(completedOrders));
  const currentId = selectedOrder.id;
  paidOrders = paidOrders.filter(order => order.id !== currentId);
  saveData();
  selectedOrder = getQueueOrders()[0] || null;
  renderOrderQueue();
  if (selectedOrder) renderDetails(); else clearDetailPanel();
  showToast('Order marked ready and removed from queue.');
}

function showPanel(panel) {
  activePanel = panel;
  document.getElementById('detail-panel').classList.toggle('hidden', panel !== 'details' || !selectedOrder);
  document.getElementById('detail-empty').classList.toggle('hidden', panel === 'details' && !!selectedOrder);
}

function clearDetailPanel() {
  selectedOrder = null;
  document.getElementById('detail-panel').classList.add('hidden');
  document.getElementById('detail-empty').classList.remove('hidden');
  document.getElementById('detail-title').textContent = 'Select an order';
}

function showToast(message) {
  document.getElementById('toast-text').textContent = message;
  const toast = document.getElementById('ready-toast');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2800);
}

window.addEventListener('DOMContentLoaded', () => {
  loadData();
  const time = document.getElementById('bar-time');
  const updateTime = () => { time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  updateTime();
  setInterval(updateTime, 60000);
  window.addEventListener('storage', event => { if (event.key === STORAGE_PAID) loadData(); });
  lucide.createIcons();
});
