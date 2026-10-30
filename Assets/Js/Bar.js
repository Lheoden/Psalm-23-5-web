// ============================================================
// BAR / BARISTA MODULE
// This file handles the Bar side of Workflow 2.
//
// Main responsibilities:
// 1. Read PAID orders confirmed by the Cashier
// 2. Display PAID / PREPARING orders in the Bar queue
// 3. Let the Barista select a paid order
// 4. Change order status from PAID to PREPARING
// 5. Allow the Barista to prepare the physical order
// 6. Change order status from PREPARING to READY
// 7. Store completed orders in completedOrders
// 8. Remove READY orders from the active Bar queue
//
// Current prototype uses browser localStorage rather than
// a centralized backend/database.
// ============================================================

const STORAGE_PAID = 'paidOrders';
const STORAGE_COMPLETED = 'completedOrders';
const BAR_BRANCH_ID = 1; // 1 = Calamba, 2 = Lipa
let paidOrders = [];
let selectedOrder = null;
let activePanel = 'details';


// ============================================================
// BAR INVENTORY OVERVIEW
// This is a separate hardcoded inventory display for the Bar UI.
//
// IMPORTANT:
// This array is NOT the same inventory data used by the Admin
// Inventory Management workflow. It is only a Bar-side overview
// in the current prototype and is not synchronized with Admin.js.
// ============================================================
let inventoryItems = [];

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

// ------------------------------------------------------------
// REFRESH BAR QUEUE
// Reloads the latest PAID/PREPARING order data from localStorage.
// ------------------------------------------------------------
function loadOrders() { loadData(); }
// ------------------------------------------------------------
// SAVE ACTIVE BAR ORDERS
// Saves the current paidOrders collection back to localStorage.
// ------------------------------------------------------------
function saveData() { localStorage.setItem(STORAGE_PAID, JSON.stringify(paidOrders)); }

function showPanel(panel) {
  activePanel = panel;

  if (panel !== 'details') {
    return;
  }

  const detailPanel = document.getElementById('detail-panel');
  const detailEmpty = document.getElementById('detail-empty');

  if (selectedOrder) {
    detailPanel?.classList.remove('hidden');
    detailEmpty?.classList.add('hidden');
  } else {
    detailPanel?.classList.add('hidden');
    detailEmpty?.classList.remove('hidden');
  }
}

// ============================================================
// ACTIVE BAR ORDER FILTER
//
// Only orders with these statuses stay in the active Bar queue:
// - PAID
// - PREPARING
//
// READY orders are removed from this active collection.
// ============================================================
function getQueueOrders() {
  return [...paidOrders].filter(order => order.status === 'PAID' || order.status === 'PREPARING').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ------------------------------------------------------------

/* ============================================================
   LOAD BAR DATA
   Loads active orders and inventory from MySQL.
   ============================================================ */

async function loadData() {
  const list = document.getElementById('order-list');

  try {
    const response = await fetch(
      `Ajax/get_bar_orders.php?branch_id=${BAR_BRANCH_ID}`,
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
        data.message || 'Unable to load Bar orders.'
      );
    }

    const previousId = selectedOrder
      ? Number(selectedOrder.id)
      : null;

    paidOrders = data.orders;

    selectedOrder = previousId === null
      ? null
      : paidOrders.find(
          order =>
            Number(order.id) === previousId &&
            ['PAID', 'PREPARING'].includes(order.status)
        ) || null;

    // Load inventory independently so an inventory error
    // does not prevent the order queue from loading.
    let inventoryLoadError = null;

    try {
      await loadInventoryData();
    } catch (inventoryError) {
      inventoryLoadError = inventoryError;

      console.error(
        'Bar inventory loading failed:',
        inventoryError
      );
    }

    renderOrderQueue();

    if (inventoryLoadError) {
      const inventoryList =
        document.getElementById('inventory-list');

      if (inventoryList) {
        inventoryList.textContent =
          'Unable to load inventory from the database.';
      }
    } else {
      renderInventoryOverview();
    }

    if (selectedOrder) {
      showPanel('details');
      renderDetails();
    } else {
      clearDetailPanel();
    }

    console.log(
      'Bar orders loaded from MySQL:',
      paidOrders.length
    );

  } catch (error) {
    console.error('Bar order loading failed:', error);

    if (list) {
      list.textContent =
        'Unable to load Bar orders from the database. Check the connection.';
    }

    const empty = document.getElementById('queue-empty');

    if (empty) {
      empty.classList.add('hidden');
    }
  }
}

/* ============================================================
   LOAD INVENTORY FROM MYSQL
   ============================================================ */

async function loadInventoryData() {
  const response = await fetch(
    `Ajax/get_bar_inventory.php?branch_id=${BAR_BRANCH_ID}`,
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
    !Array.isArray(data.ingredients)
  ) {
    throw new Error(
      data.message || 'Unable to load inventory.'
    );
  }

  inventoryItems = data.ingredients.map(row => ({
    id: Number(row.id),
    name: row.ingredient_name,
    containerType: row.container_type || row.unit || 'unit',
    stockQuantity: Number(row.stock_quantity || 0),
    servingCount: Number(row.serving_count || 0),
    servingsUsed: Number(row.servings_used || 0),
    unit: row.unit || '',
    lowStockThreshold: Number(row.low_stock_threshold || 0)
  }));

  console.log(
    'Bar inventory loaded from MySQL:',
    inventoryItems.length
  );
}

function formatInventoryNumber(value) {
  return Number(value || 0).toLocaleString('en-US', {
    maximumFractionDigits: 2
  });
}

function formatContainerLabel(containerType, quantity) {
  const type = String(containerType || 'unit')
    .trim()
    .toLowerCase();

  const packMatch = type.match(/^pack of (\d+)$/);

  if (packMatch) {
    return `${formatInventoryNumber(quantity)} ${
      quantity === 1 ? 'pack' : 'packs'
    } of ${packMatch[1]}`;
  }

  const pluralForms = {
    bag: 'bags',
    box: 'boxes',
    bottle: 'bottles',
    pack: 'packs',
    piece: 'pieces',
    serving: 'servings'
  };

  const label = quantity === 1
    ? type
    : (pluralForms[type] || `${type}s`);

  return `${formatInventoryNumber(quantity)} ${label}`;
}

function getInventoryStockLabel(item) {
  const quantity = Number(item.stockQuantity || 0);
  const servingCount = Number(item.servingCount || 0);
  const used = Number(item.servingsUsed || 0);

  const containerLabel = formatContainerLabel(
    item.containerType,
    quantity
  );

  if (servingCount > 1) {
    const remaining = Math.max(
      0,
      quantity * servingCount - used
    );

    if (String(item.unit).toLowerCase() === 'cup') {
      return `${containerLabel} · About ${
        formatInventoryNumber(remaining)
      } cups remaining`;
    }

    return `${containerLabel} · About ${
      formatInventoryNumber(remaining)
    } estimated servings remaining`;
  }

  const unit = String(
    item.unit || item.containerType || 'unit'
  ).toLowerCase();

  const pluralForms = {
    piece: 'pieces',
    serving: 'servings',
    cup: 'cups'
  };

  const unitLabel = quantity === 1
    ? unit
    : (pluralForms[unit] || `${unit}s`);

  return `${formatInventoryNumber(quantity)} ${unitLabel}`;
}
  


// ============================================================
// PAID ORDER QUEUE
//
// Workflow step:
// "System displays paid order at Bar."
//
// Cashier.js places paid orders into 'paidOrders'.
// This function displays PAID and PREPARING orders so the
// Barista can select one for preparation.
// ============================================================
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

// ------------------------------------------------------------
// BAR INVENTORY DISPLAY
// Compares each hardcoded Bar inventory item's currentStock
// against lowStockThreshold and shows LOW or GOOD.
//
// This is only a supporting Bar display in the current prototype.
// Workflow 3 inventory updating is handled by Admin.js.
// ------------------------------------------------------------

function renderInventoryOverview() {
  const list = document.getElementById('inventory-list');

  if (!list) return;

  const lowItems = inventoryItems.filter(
    item => item.stockQuantity <= item.lowStockThreshold
  );

  if (inventoryItems.length === 0) {
    list.innerHTML = '<p>No inventory records available.</p>';
  } else {
    list.innerHTML = inventoryItems.map(item => {
      const low =
        item.stockQuantity <= item.lowStockThreshold;

      const maxStock = Math.max(
        item.lowStockThreshold * 2,
        item.stockQuantity,
        1
      );

      const percent = Math.min(
        100,
        Math.max(
          8,
          item.stockQuantity / maxStock * 100
        )
      );

      return `
        <div class="inventory-item">
          <div class="inventory-item-top">
            <span class="inventory-icon">
              <i data-lucide="package" class="w-4 h-4"></i>
            </span>

            <div>
              <strong>${item.name}</strong>
              <small>${getInventoryStockLabel(item)}</small>
            </div>

            <b class="stock-${low ? 'low' : 'good'}">
              ${low ? 'LOW' : 'GOOD'}
            </b>
          </div>

          <div class="stock-bar">
            <span style="width:${percent}%"></span>
          </div>
        </div>
      `;
    }).join('');
  }

  const alert = document.getElementById('low-stock-alert');

  if (alert) {
    alert.classList.toggle('hidden', lowItems.length === 0);
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ------------------------------------------------------------
// SELECT PAID ORDER
// Finds the selected active Bar order, then opens its details.
// ------------------------------------------------------------
function selectOrder(orderId) {
  selectedOrder = getQueueOrders().find(order => order.id === orderId) || null;
  if (selectedOrder) { showPanel('details'); renderDetails(); renderOrderQueue(); }
}

// ============================================================
// DISPLAY SELECTED ORDER
//
// Shows:
// - Order number
// - Time paid
// - Dine-in / Take-out type
// - Current status
// - Ordered items and customizations
//
// This gives the Barista the information needed to prepare
// the physical customer order.
// ============================================================
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

// ------------------------------------------------------------
// STATUS-BASED BUTTON CONTROL
//
// Start Preparing is enabled only when status = PAID.
// Mark as Ready is enabled only when status = PREPARING.
//
// This helps enforce the intended order-status sequence.
// ------------------------------------------------------------
function updateActionButtons() {
  document.getElementById('btn-start').disabled = !selectedOrder || selectedOrder.status !== 'PAID';
  document.getElementById('btn-ready').disabled = !selectedOrder || selectedOrder.status !== 'PREPARING';
}

// ============================================================
// START PREPARING
//
// Workflow steps:
// 1. Barista selects "Start Preparing"
// 2. System updates status:
//    PAID -> PREPARING
// 3. Preparation start time is recorded
//
// The actual drink/food preparation is a physical task done
// by the Barista, not an automated system process.
// ============================================================

async function startPreparing() {
  if (!selectedOrder || selectedOrder.status !== 'PAID') {
    return;
  }

  const orderBeingStarted = selectedOrder;
  const button = document.getElementById('btn-start');
  const originalHTML = button ? button.innerHTML : '';

  if (button) {
    if (button.disabled) return;

    button.disabled = true;
    button.textContent = 'Starting preparation...';
  }

  try {
    const response = await fetch('Ajax/update_bar_status.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        order_id: Number(orderBeingStarted.id),
        branch_id: BAR_BRANCH_ID,
        action: 'start_preparing'
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || !data.success) {
      throw new Error(
        data?.message || 'Unable to start preparation.'
      );
    }

    // Reload the authoritative order status from MySQL.
    await loadData();

    showToast(
      `Order ${formatOrderNumber(data.order_number || orderBeingStarted.number || orderBeingStarted.id)} is now preparing.`
    );

    console.log('Bar preparation started in MySQL:', data);

  } catch (error) {
    console.error('Start preparation failed:', error);

    alert(
      error.message ||
      'Unable to start preparation. Please try again.'
    );

  } finally {
    if (button) {
      button.innerHTML = originalHTML;
      button.disabled =
        !selectedOrder || selectedOrder.status !== 'PAID';
    }
  }
}


// ============================================================
// MARK AS READY / COMPLETE ORDER
//
// Workflow steps:
// 1. Barista finishes preparing the physical order
// 2. Barista selects "Mark as Ready"
// 3. System stores a completed copy with status READY
// 4. Completion time is recorded
// 5. Order is removed from the active paidOrders queue
//
// Resulting workflow status:
// PREPARING -> READY
// ============================================================
async function markReady() {
  if (!selectedOrder || selectedOrder.status !== 'PREPARING') {
    return;
  }

  const orderBeingCompleted = selectedOrder;
  const button = document.getElementById('btn-ready');
  const originalHTML = button ? button.innerHTML : '';

  if (button) {
    if (button.disabled) return;

    button.disabled = true;
    button.textContent = 'Updating inventory...';
  }

  try {
    const response = await fetch('Ajax/mark_ready.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        order_id: Number(orderBeingCompleted.id),
        branch_id: BAR_BRANCH_ID
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || !data.success) {
      throw new Error(
        data?.message || 'Unable to mark order as ready.'
      );
    }

    console.log('Order marked READY in MySQL:', data);
    console.log(
      'Estimated inventory deductions:',
      data.estimated_inventory_deductions
    );

    // Reload active orders from MySQL.
    // READY orders are no longer included in the active queue.
    await loadData();

    showToast(
      `Order ${formatOrderNumber(data.order_number || orderBeingCompleted.number || orderBeingCompleted.id)} marked ready.`
    );

  } catch (error) {
    console.error('Mark as Ready failed:', error);

    alert(
      error.message ||
      'Unable to mark order as ready. Please try again.'
    );

  } finally {
    if (button) {
      button.innerHTML = originalHTML;
      button.disabled =
        !selectedOrder || selectedOrder.status !== 'PREPARING';
    }
  }
}


// ------------------------------------------------------------
// CLEAR ORDER DETAILS
// Resets the Bar details panel when there is no selected
// active order to display.
// ------------------------------------------------------------
function clearDetailPanel() {
  selectedOrder = null;
  document.getElementById('detail-panel').classList.add('hidden');
  document.getElementById('detail-empty').classList.remove('hidden');
  document.getElementById('detail-title').textContent = 'Select an order';
}

// ------------------------------------------------------------
// BAR STATUS MESSAGE
// Displays temporary feedback after preparation/status actions.
// ------------------------------------------------------------
function showToast(message) {
  document.getElementById('toast-text').textContent = message;
  const toast = document.getElementById('ready-toast');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2800);
}

// ============================================================
// BAR INITIALIZATION
// Runs when the Bar page finishes loading.
//
// - Loads current paidOrders
// - Starts the Bar clock
// - Listens for localStorage changes to paidOrders
// - Recreates Lucide icons
//
// The storage event helps refresh other open tabs/windows on
// the same browser origin. It is not a WebSocket/backend sync.
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  const time = document.getElementById('bar-time');
  const updateTime = () => { time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  updateTime();
  setInterval(updateTime, 60000);
  window.addEventListener('storage', event => { if (event.key === STORAGE_PAID) loadData(); });
  lucide.createIcons();
});
