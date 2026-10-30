const STORAGE_DATA_KEY = 'admin_dashboard_data';
    let branchData = {};
    let currentBranch = 'calamba';
    let currentMenuAction = 'add';
    let editingMenuId = null;

    function getDefaultData() {
      return {
        calamba: {
          orders: [
            { id: 'C1001', time: '2026-05-04T08:15:00', items: ['Americano', 'Cookie'], payment: 'Cash', status: 'Completed', total: 175, category: 'Beverage' },
            { id: 'C1002', time: '2026-05-04T09:05:00', items: ['Latte'], payment: 'GCash', status: 'Completed', total: 150, category: 'Beverage' },
            { id: 'C1003', time: '2026-05-04T10:30:00', items: ['Pasta', 'Espresso'], payment: 'Cash', status: 'Completed', total: 275, category: 'Food' }
          ],
          inventory: {
            coffeeBeans: { label: 'Coffee Beans', stock: 2, unit: 'bag', threshold: 1 },
            milk: { label: 'Milk', stock: 3, unit: 'box', threshold: 1 },
            syrup: { label: 'Syrup', stock: 3, unit: 'bottle', threshold: 1 },
            sugar: { label: 'Sugar', stock: 2, unit: 'pack', threshold: 1 },
            hotCups: { label: 'Hot Cups', stock: 42, unit: 'piece', threshold: 15 },
            coldCups: { label: 'Cold Cups', stock: 28, unit: 'piece', threshold: 10 },
            lids: { label: 'Lids', stock: 36, unit: 'piece', threshold: 12 },
            pasta: { label: 'Pasta', stock: 8, unit: 'serving', threshold: 3 },
            cookies: { label: 'Cookies', stock: 12, unit: 'piece', threshold: 4 }
          },
          menu: [
            { id: 'm1', name: 'Americano', price: 120, category: 'Coffee', mood: ['Focused'], verse: 'Psalm 23:5', image: 'Americano.png', disabled: false },
            { id: 'm2', name: 'Latte', price: 150, category: 'Coffee', mood: ['Relaxed'], verse: 'Psalm 23:1', image: 'Espresso.png', disabled: false },
            { id: 'm3', name: 'Pasta', price: 185, category: 'Food', mood: ['Happy'], verse: 'Psalm 23:2', image: 'Spanish latte.png', disabled: false }
          ],
          users: [
            { id: 'u1', name: 'Kiosk Staff', role: 'Kiosk', status: 'Active' },
            { id: 'u2', name: 'Cashier Anna', role: 'Cashier', status: 'Active' },
            { id: 'u3', name: 'Bar Ivan', role: 'Bar', status: 'Active' }
          ],
          reports: [],
          requests: [
            { id: 'REQ-CAL-01', ingredient: 'Milk', key: 'milk', quantity: 8, date: '2026-05-15', status: 'Pending', notes: 'Morning shift refill' },
            { id: 'REQ-CAL-02', ingredient: 'Hot Cups', key: 'hotCups', quantity: 20, date: '2026-05-14', status: 'Approved', notes: 'Upcoming weekday demand' }
          ],
          activityLog: [
            { time: '08:15', message: 'Generated branch sales report for Calamba' },
            { time: '09:00', message: 'Approved request for Hot Cups' },
            { time: '10:00', message: 'Added new menu item Pasta' }
          ]
        },
        lipa: {
          orders: [
            { id: 'L2001', time: '2026-05-04T08:45:00', items: ['Mocha Latte'], payment: 'Cash', status: 'Completed', total: 165, category: 'Beverage' },
            { id: 'L2002', time: '2026-05-04T09:50:00', items: ['Cookie', 'Espresso'], payment: 'GCash', status: 'Completed', total: 145, category: 'Food' }
          ],
          inventory: {
            coffeeBeans: { label: 'Coffee Beans', stock: 2, unit: 'bag', threshold: 1 },
            milk: { label: 'Milk', stock: 2, unit: 'box', threshold: 1 },
            syrup: { label: 'Syrup', stock: 2, unit: 'bottle', threshold: 1 },
            sugar: { label: 'Sugar', stock: 2, unit: 'pack', threshold: 1 },
            hotCups: { label: 'Hot Cups', stock: 30, unit: 'piece', threshold: 10 },
            coldCups: { label: 'Cold Cups', stock: 22, unit: 'piece', threshold: 10 },
            lids: { label: 'Lids', stock: 30, unit: 'piece', threshold: 12 },
            pasta: { label: 'Pasta', stock: 5, unit: 'serving', threshold: 3 },
            cookies: { label: 'Cookies', stock: 7, unit: 'piece', threshold: 4 }
          },
          menu: [
            { id: 'm4', name: 'Mocha Latte', price: 165, category: 'Coffee', mood: ['Tired'], verse: 'Psalm 23:4', image: 'Mocha latte.png', disabled: false },
            { id: 'm5', name: 'Cookie', price: 55, category: 'Snack', mood: ['Happy'], verse: 'Psalm 23:3', image: 'Logo.jpg', disabled: false }
          ],
          users: [
            { id: 'u4', name: 'Kiosk Jenny', role: 'Kiosk', status: 'Active' },
            { id: 'u5', name: 'Cashier Mark', role: 'Cashier', status: 'Active' },
            { id: 'u6', name: 'Bar Jessa', role: 'Bar', status: 'Active' }
          ],
          reports: [],
          requests: [
            { id: 'REQ-LIP-01', ingredient: 'Cookies', key: 'cookies', quantity: 10, date: '2026-05-15', status: 'Pending', notes: 'Weekend restock' }
          ],
          activityLog: [
            { time: '09:20', message: 'Viewed inventory details for Lipa' },
            { time: '09:50', message: 'Received new low stock alert for Cookies' }
          ]
        }
      };
    }

    function loadData() {
      branchData = JSON.parse(localStorage.getItem(STORAGE_DATA_KEY) || 'null') || getDefaultData();
      branchData = normalizeBranchData(branchData);
      saveData();
      renderBranchInfo();
      showTab('overview');
      renderOverview();
      renderSalesTable();
      renderInventory();
      renderReports();
      renderMenu();
      renderUsers();
    }

    function normalizeBranchData(data) {
      const defaults = getDefaultData();
      Object.keys(defaults).forEach(branch => {
        if (!data[branch]) {
          data[branch] = defaults[branch];
          return;
        }
        data[branch].orders = data[branch].orders || [];
        data[branch].menu = data[branch].menu || [];
        data[branch].users = data[branch].users || [];
        data[branch].reports = data[branch].reports || [];
        data[branch].requests = data[branch].requests || [];
        data[branch].activityLog = data[branch].activityLog || [];
        if (!data[branch].inventory || typeof data[branch].inventory.hotCups === 'number') {
          data[branch].inventory = defaults[branch].inventory;
        } else {
          Object.keys(defaults[branch].inventory).forEach(key => {
            if (!data[branch].inventory[key]) {
              data[branch].inventory[key] = defaults[branch].inventory[key];
              return;
            }

            const item = data[branch].inventory[key];
            const defaultItem = defaults[branch].inventory[key];

            // Migrate the old prototype inventory model (raw-looking quantities +
            // containers/servings) to simple countable stock units used by Workflow 3.
            if (!item.unit || 'containers' in item || 'servingsPerContainer' in item) {
              data[branch].inventory[key] = { ...defaultItem };
            }
          });
        }
      });
      return data;
    }

    function saveData() {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(branchData));
    }

    function resetAdminData() {
      localStorage.removeItem(STORAGE_DATA_KEY);
      branchData = getDefaultData();
      saveData();
      currentBranch = 'calamba';
      document.getElementById('branch-select').value = currentBranch;
      const branchName = document.getElementById('branch-name');
      if (branchName) branchName.textContent = 'Calamba';
      renderBranchInfo();
      showTab('overview');
      renderOverview();
      renderSalesTable();
      renderInventory();
      renderReports();
      renderMenu();
      renderUsers();
    }

    function changeBranch(branch) {
      currentBranch = branch;
      const branchName = document.getElementById('branch-name');
      if (branchName) branchName.textContent = branch.charAt(0).toUpperCase() + branch.slice(1);
      renderBranchInfo();
      renderOverview();
      renderSalesTable();
      renderInventory();
      renderReports();
      renderMenu();
      renderUsers();
    }

    function showTab(tab) {
      ['overview', 'sales', 'inventory', 'reports', 'menu', 'users'].forEach(section => {
        const sectionElement = document.getElementById(section);
        const tabButton = document.getElementById(`tab-${section}`);

        if (sectionElement) sectionElement.classList.toggle('hidden', section !== tab);
        if (tabButton) tabButton.classList.toggle('active', section === tab);
      });

      if (tab === 'inventory') {
        renderInventory();
        if (window.lucide) lucide.createIcons();
      }
      if (tab === 'reports') renderReports();
    }

    function getCurrentBranchData() {
      return branchData[currentBranch];
    }

    function renderBranchInfo() {
      const data = getCurrentBranchData();
      const branchName = document.getElementById('branch-name');
      const branchActive = document.getElementById('branch-active');
      const branchReports = document.getElementById('branch-reports');

      if (branchName) branchName.textContent = currentBranch.charAt(0).toUpperCase() + currentBranch.slice(1);
      if (branchActive) branchActive.textContent = data.orders.length;
      if (branchReports) branchReports.textContent = data.reports.length;
    }

    function renderOverview() {
      const data = getCurrentBranchData();
      const today = new Date().toISOString().slice(0,10);
      const todaysOrders = data.orders.filter(order => ((order.time || order.timestamp || '').startsWith(today)));
      const todaysSales = todaysOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const lowStock = Object.values(data.inventory || {}).filter(item => item.stock <= item.threshold);

      const salesEl = document.getElementById('kpi-sales');
      const ordersEl = document.getElementById('kpi-orders');
      const lowStockEl = document.getElementById('kpi-low-stock');
      const branchesEl = document.getElementById('kpi-active-branches');

      if (salesEl) salesEl.textContent = `₱${todaysSales.toFixed(2)}`;
      if (ordersEl) ordersEl.textContent = todaysOrders.length;
      if (lowStockEl) lowStockEl.textContent = lowStock.length;
      if (branchesEl) branchesEl.textContent = Object.keys(branchData).length;

      renderDashboardRecentOrders(data.orders);
      renderDashboardLowStock(lowStock);
    }

    function renderDashboardRecentOrders(orders) {
      const table = document.getElementById('dashboard-recent-orders');
      if (!table) return;

      const branchLabel = currentBranch.charAt(0).toUpperCase() + currentBranch.slice(1);
      const recentOrders = [...(orders || [])]
        .sort((a, b) => new Date(b.time || b.timestamp || 0) - new Date(a.time || a.timestamp || 0))
        .slice(0, 5);

      if (!recentOrders.length) {
        table.innerHTML = '<tr><td colspan="6" class="empty-table">No recent orders to display.</td></tr>';
        return;
      }

      table.innerHTML = recentOrders.map(order => {
        const itemList = (order.items || [])
          .map(item => typeof item === 'string' ? item : item.name)
          .filter(Boolean)
          .join(', ');

        const rawTime = order.time || order.timestamp || '';
        const parsedTime = rawTime ? new Date(rawTime) : null;
        const timeLabel = parsedTime && !Number.isNaN(parsedTime.getTime())
          ? parsedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '—';

        return `
          <tr>
            <td class="order-number">${formatOrderNumber(order.id || order.number)}</td>
            <td>${itemList || '—'}</td>
            <td>${branchLabel}</td>
            <td class="order-total">₱${Number(order.total || 0).toFixed(2)}</td>
            <td><span class="status-badge">${order.status || '—'}</span></td>
            <td>${timeLabel}</td>
          </tr>`;
      }).join('');
    }

    function renderDashboardLowStock(items) {
      const container = document.getElementById('dashboard-low-stock');
      if (!container) return;

      if (!items.length) {
        container.innerHTML = '<div class="empty-state">No low stock items.</div>';
        return;
      }

      container.innerHTML = items.slice(0, 5).map(item => `
        <div class="stock-item">
          <div class="stock-icon"><i data-lucide="package-open"></i></div>
          <div class="stock-copy">
            <strong>${item.label}</strong>
            <span>${item.stock} remaining</span>
          </div>
          <span class="low-badge">Low</span>
        </div>
      `).join('');

      if (window.lucide) lucide.createIcons();
    }

    function addActivity(message) {
      const data = getCurrentBranchData();
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      data.activityLog.unshift({ time, message });
      if (data.activityLog.length > 10) data.activityLog.pop();
      saveData();
    }

    function renderNotifications(requests) {
      const list = document.getElementById('notification-list');
      const active = requests.filter(request => request.status !== 'Completed').slice(0, 4);
      list.innerHTML = active.length ? active.map(request => `
        <li class="rounded-2xl bg-cream p-3 border border-forest/10">
          <p class="font-semibold text-forest">${request.ingredient}</p>
          <p class="text-sm text-forest/60">${request.quantity} units • ${request.status}</p>
        </li>`).join('') : '<li class="text-forest/60">No active replenishment alerts.</li>';
    }

    function renderActivityLog(logs) {
      const list = document.getElementById('activity-log-list');
      list.innerHTML = logs.length ? logs.slice(0, 5).map(log => `
        <li class="rounded-2xl bg-cream p-3 border border-forest/10">
          <p class="text-sm font-semibold text-forest">${log.time}</p>
          <p class="text-sm text-forest/70">${log.message}</p>
        </li>`).join('') : '<li class="text-forest/60">No activity logged yet.</li>';
    }

    function getTopItem(orders) {
      const counts = {};
      orders.forEach(order => order.items.forEach(item => {
        const name = typeof item === 'string' ? item : item.name;
        counts[name] = (counts[name] || 0) + 1;
      }));
      const top = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
      return top ? `${top[0]} (${top[1]})` : '-';
    }

    function getLowStockAlerts(inventory) {
      return Object.values(inventory).filter(item => item.stock <= item.threshold).map(item => item.label);
    }

    function renderSalesPerDay(orders) {
      const container = document.getElementById('chart-sales-day');
      container.innerHTML = '';
      const days = getLastDays(7);
      days.forEach(day => {
        const amount = orders.filter(order => ((order.time || order.timestamp || '').startsWith(day))).reduce((sum, order) => sum + (order.total || 0), 0);
        const width = Math.min(100, amount / 5);
        const bar = document.createElement('div');
        bar.className = 'space-y-2';
        bar.innerHTML = `
          <div class="flex items-center justify-between text-sm text-forest/70"><span>${day.slice(5)}</span><span>₱${amount.toFixed(2)}</span></div>
          <div class="h-3 rounded-full bg-forest/10"><div class="h-3 rounded-full bg-forest" style="width:${width}%"></div></div>`;
        container.appendChild(bar);
      });
    }

    function getLastDays(count) {
      const dates = [];
      for (let i = count -1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().slice(0,10));
      }
      return dates;
    }

    function renderLowStockList(items) {
      const list = document.getElementById('low-stock-list');
      list.innerHTML = items.length ? items.map(item => `<li class="rounded-2xl bg-cream p-3 border border-forest/10">${item} is low</li>`).join('') : '<li class="text-forest/60">No low stock alerts.</li>';
    }

    function formatOrderNumber(value) {
      if (value === null || value === undefined) return '—';
      const text = String(value);
      if (text.startsWith('#')) return text;
      const num = parseInt(text, 10);
      return isNaN(num) ? text : '#' + String(num).padStart(2, '0');
    }

    function renderSalesTable() {
      const data = getCurrentBranchData();
      const from = document.getElementById('sales-from').value;
      const to = document.getElementById('sales-to').value;
      const rows = data.orders.filter(order => {
        if (!from && !to) return true;
        const time = (order.time || order.timestamp || '').slice(0,10);
        if (from && time < from) return false;
        if (to && time > to) return false;
        return true;
      });
      document.getElementById('sales-table').innerHTML = rows.map(order => {
        const itemList = (order.items || []).map(item => typeof item === 'string' ? item : item.name).join(', ');
        const payment = order.payment || order.paymentMethod || 'N/A';
        const time = (order.time || order.timestamp || '').slice(11,16);
        const status = order.status || 'Completed';
        return `
        <tr class="border-t border-forest/10">
          <td class="py-4">${formatOrderNumber(order.id || order.number)}</td>
          <td class="py-4">${time}</td>
          <td class="py-4">${itemList}</td>
          <td class="py-4">${payment}</td>
          <td class="py-4"><span class="rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">${status}</span></td>
        </tr>`;
      }).join('');
      renderCategoryChart(data.orders);
    }

    function renderCategoryChart(orders) {
      const categories = {};
      orders.forEach(order => {
        const category = order.category || 'Mixed';
        categories[category] = (categories[category] || 0) + (order.total || 0);
      });
      const container = document.getElementById('chart-sales-category');
      container.innerHTML = Object.entries(categories).map(([category, total]) => `
        <div>
          <div class="flex items-center justify-between text-sm text-forest/70"><span>${category}</span><span>₱${total.toFixed(2)}</span></div>
          <div class="h-3 rounded-full bg-forest/10 mt-2"><div class="h-3 rounded-full bg-forest" style="width:${Math.min(100, total/3)}%"></div></div>
        </div>`).join('');
    }

    function getInventoryItems() {
      const inventory = getCurrentBranchData().inventory || {};
      return Object.entries(inventory).map(([key, value]) => ({ key, ...value }));
    }

    function getInventoryCategory(item) {
      const packagingKeys = ['hotCups', 'coldCups', 'lids'];
      const foodKeys = ['pasta', 'cookies'];

      if (packagingKeys.includes(item.key)) return 'Packaging';
      if (foodKeys.includes(item.key)) return 'Food';
      return 'Ingredient';
    }

    function formatInventoryQuantity(value, unit) {
      const quantity = Number(value);
      const safeUnit = unit || 'unit';
      const plural = quantity === 1 ? safeUnit : `${safeUnit}s`;
      return `${quantity} ${plural}`;
    }

    function renderInventory() {
      const items = getInventoryItems();
      const table = document.getElementById('ingredient-table');
      const lowStock = items.filter(item => Number(item.stock) <= Number(item.threshold));

      if (!table) return;

      document.getElementById('inv-total-ingredients').textContent = items.length;
      document.getElementById('inv-low-stock-count').textContent = lowStock.length;

      const branchLabel = document.getElementById('inventory-branch-label');
      if (branchLabel) {
        branchLabel.textContent = `${currentBranch.charAt(0).toUpperCase() + currentBranch.slice(1)} Branch`;
      }

      table.innerHTML = items.map(item => {
        const isLow = Number(item.stock) <= Number(item.threshold);
        return `
          <tr data-inventory-name="${String(item.label).toLowerCase()}">
            <td>
              <span class="inventory-item-name">${item.label}</span>
            </td>
            <td>
              <span class="inventory-stock-value">${formatInventoryQuantity(item.stock, item.unit)}</span>
            </td>
            <td>${formatInventoryQuantity(item.threshold, item.unit)}</td>
            <td>
              <span class="inventory-status ${isLow ? 'low' : 'good'}">
                ${isLow ? 'LOW STOCK' : 'GOOD'}
              </span>
            </td>
            <td>
              <button
                type="button"
                class="inventory-edit-btn"
                onclick="openStockModal('${item.key}')"
                aria-label="Update ${item.label} stock"
                title="Update stock"
              >
                <i data-lucide="pencil"></i>
              </button>
            </td>
          </tr>`;
      }).join('');

      filterInventoryTable();

      if (window.lucide) lucide.createIcons();
    }

    function filterInventoryTable() {
      const searchInput = document.getElementById('inventory-search');
      const table = document.getElementById('ingredient-table');
      if (!table) return;

      const query = (searchInput?.value || '').trim().toLowerCase();
      const rows = Array.from(table.querySelectorAll('tr'));

      let visibleRows = 0;

      rows.forEach(row => {
        const itemName = row.dataset.inventoryName || '';
        const visible = !query || itemName.includes(query);
        row.style.display = visible ? '' : 'none';
        if (visible) visibleRows++;
      });

      let emptyRow = table.querySelector('.inventory-search-empty');

      if (visibleRows === 0 && rows.length > 0) {
        if (!emptyRow) {
          emptyRow = document.createElement('tr');
          emptyRow.className = 'inventory-search-empty';
          emptyRow.innerHTML = '<td colspan="5" class="inventory-empty-row">No inventory items match your search.</td>';
          table.appendChild(emptyRow);
        }
      } else if (emptyRow) {
        emptyRow.remove();
      }
    }

    function openStockModal(itemKey = null) {
      const modal = document.getElementById('stock-modal');
      const select = document.getElementById('stock-item-select');
      const items = getInventoryItems();

      if (!modal || !select) return;

      select.innerHTML = items.map(item =>
        `<option value="${item.key}">${item.label}</option>`
      ).join('');

      if (itemKey && items.some(item => item.key === itemKey)) {
        select.value = itemKey;
      }

      clearStockValidation();
      syncSelectedInventoryItem();

      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');

      if (window.lucide) lucide.createIcons();

      setTimeout(() => {
        const quantityInput = document.getElementById('stock-new-quantity');
        if (quantityInput) quantityInput.focus();
      }, 0);
    }

    function closeStockModal() {
      const modal = document.getElementById('stock-modal');
      if (!modal) return;

      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      clearStockValidation();
    }

    function syncSelectedInventoryItem() {
      const select = document.getElementById('stock-item-select');
      const currentValue = document.getElementById('stock-current-value');
      const thresholdValue = document.getElementById('stock-threshold-value');
      const quantityInput = document.getElementById('stock-new-quantity');

      if (!select) return;

      const item = getCurrentBranchData().inventory?.[select.value];
      if (!item) return;

      if (currentValue) currentValue.textContent = formatInventoryQuantity(item.stock, item.unit);
      if (thresholdValue) thresholdValue.textContent = formatInventoryQuantity(item.threshold, item.unit);

      if (quantityInput) {
        quantityInput.value = item.stock;
        quantityInput.min = '0';
      }

      clearStockValidation();
    }

    function showStockValidation(message) {
      const messageElement = document.getElementById('stock-validation-message');
      if (!messageElement) return;

      messageElement.textContent = message;
      messageElement.classList.remove('hidden');
    }

    function clearStockValidation() {
      const messageElement = document.getElementById('stock-validation-message');
      if (!messageElement) return;

      messageElement.textContent = '';
      messageElement.classList.add('hidden');
    }

    function updateInventoryStock() {
      const select = document.getElementById('stock-item-select');
      const quantityInput = document.getElementById('stock-new-quantity');

      if (!select || !quantityInput) return;

      const rawValue = quantityInput.value.trim();
      const newQuantity = Number(rawValue);
      const inventoryItem = getCurrentBranchData().inventory?.[select.value];

      clearStockValidation();

      // Workflow 3: validate quantity. Invalid values are rejected and re-entered.
      if (!inventoryItem) {
        showStockValidation('Please select a valid inventory item.');
        return;
      }

      if (rawValue === '' || !Number.isFinite(newQuantity) || newQuantity < 0) {
        showStockValidation('Enter a valid stock quantity of 0 or higher.');
        quantityInput.focus();
        return;
      }

      // Valid quantity -> update inventory record.
      inventoryItem.stock = newQuantity;

      // Persist existing Admin inventory data.
      saveData();

      // Workflow 3: check threshold and immediately display LOW STOCK / GOOD.
      const isLowStock = newQuantity <= Number(inventoryItem.threshold);

      renderInventory();
      renderOverview();
      closeStockModal();

      const updateMessage = document.getElementById('inventory-update-message');
      if (updateMessage) {
        updateMessage.textContent = `${inventoryItem.label} updated to ${formatInventoryQuantity(newQuantity, inventoryItem.unit)}. Status: ${isLowStock ? 'LOW STOCK' : 'GOOD'}.`;
        updateMessage.classList.remove('hidden');

        window.clearTimeout(window.inventoryMessageTimer);
        window.inventoryMessageTimer = window.setTimeout(() => {
          updateMessage.classList.add('hidden');
        }, 4000);
      }
    }

    function submitInventoryRequest() {
      const data = getCurrentBranchData();
      const ingredientKey = document.getElementById('request-ingredient').value;
      const quantity = Number(document.getElementById('request-quantity').value);
      const notes = document.getElementById('request-notes').value.trim();
      const inventoryItem = data.inventory[ingredientKey];
      if (!inventoryItem || quantity < 1) return;
      const request = {
        id: `REQ-${Date.now()}`,
        ingredient: inventoryItem.label,
        key: ingredientKey,
        quantity,
        date: new Date().toISOString().slice(0,10),
        status: 'Pending',
        notes
      };
      data.requests.unshift(request);
      addActivity(`Submitted replenishment request for ${request.ingredient}.`);
      saveData();
      renderInventory();
      renderOverview();
    }

    function renderRequestList() {
      const requests = getCurrentBranchData().requests;
      const list = document.getElementById('request-list');
      if (!list) return;
      list.innerHTML = requests.length ? requests.map(request => `
        <div class="rounded-3xl bg-cream p-4 border border-forest/10">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="font-semibold text-forest">${request.ingredient}</p>
              <p class="text-sm text-forest/60">${request.date} • ${request.notes || 'No notes'}</p>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-semibold ${request.status === 'Pending' ? 'bg-amber-100 text-amber-700' : request.status === 'Approved' ? 'bg-forest/10 text-forest' : 'bg-forestLight/20 text-forest'}">${request.status}</span>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <p class="text-sm text-forest/70">Qty: ${request.quantity}</p>
            ${request.status === 'Pending' ? `<button onclick="updateRequestStatus('${request.id}','Approved')" class="rounded-full border border-forest text-forest px-3 py-2 text-xs font-semibold hover:bg-forest/10 transition">Approve</button>` : ''}
            ${request.status !== 'Completed' ? `<button onclick="updateRequestStatus('${request.id}','Completed')" class="rounded-full bg-forest text-white px-3 py-2 text-xs font-semibold hover:bg-forestLight transition">Mark Completed</button>` : ''}
          </div>
        </div>`).join('') : '<p class="text-forest/60">No requests submitted yet.</p>';
    }

    function updateRequestStatus(requestId, status) {
      const data = getCurrentBranchData();
      const request = data.requests.find(item => item.id === requestId);
      if (!request) return;
      request.status = status;
      addActivity(`${status === 'Approved' ? 'Approved' : 'Completed'} request for ${request.ingredient}.`);
      saveData();
      renderInventory();
      renderOverview();
    }

    function generateReport() {
      const data = getCurrentBranchData();
      const type = document.getElementById('report-type').value;
      const from = document.getElementById('report-from').value;
      const to = document.getElementById('report-to').value;
      const filteredOrders = data.orders.filter(order => {
        if (!from && !to) return true;
        const time = (order.time || order.timestamp || '').slice(0,10);
        if (from && time < from) return false;
        if (to && time > to) return false;
        return true;
      });
      const summary = {
        id: `R${Date.now()}`,
        type,
        generatedAt: new Date().toISOString(),
        range: { from, to },
        totalOrders: filteredOrders.length,
        totalSales: filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0),
        topItems: getTopItem(filteredOrders),
        inventorySummary: getInventoryItems().map(item => ({ label: item.label, stock: item.stock, containers: item.containers, servings: item.containers * item.servingsPerContainer })),
        pendingRequests: data.requests.filter(request => request.status === 'Pending').length
      };
      data.reports.unshift(summary);
      addActivity(`Generated ${type} report.`);
      saveData();
      renderReports();
      renderOverview();
      renderInventory();
    }

    function renderReports() {
      const reports = getCurrentBranchData().reports;
      document.getElementById('report-list').innerHTML = reports.length ? reports.map(report => {
        const typeLabel = report.type === 'inventory' ? 'Inventory Report' : 'Sales Report';
        const detail = report.type === 'sales' ? report.topItems : `${report.inventorySummary.length} ingredients`;
        return `
        <div class="rounded-3xl bg-cream p-4 border border-forest/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold text-forest">${report.id}</p>
            <p class="text-sm text-forest/60">${report.generatedAt.slice(0,10)} • ${typeLabel}</p>
            <p class="text-sm text-forest/60">${detail}</p>
          </div>
          <div class="flex gap-2">
            <button onclick="downloadReport('${report.id}')" class="rounded-2xl bg-forest text-white px-4 py-2 text-sm font-semibold hover:bg-forestLight transition">Download</button>
            <button onclick="deleteReport('${report.id}')" class="rounded-2xl border border-forest text-forest px-4 py-2 text-sm font-semibold hover:bg-forest/10 transition">Delete</button>
          </div>
        </div>`;
      }).join('') : '<p class="text-forest/60">No reports saved yet.</p>';
    }

    function downloadReport(reportId) {
      const data = getCurrentBranchData();
      const report = data.reports.find(item => item.id === reportId);
      if (!report) return;
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFont('helvetica');
      doc.setFontSize(16);
      doc.text(`${currentBranch.charAt(0).toUpperCase() + currentBranch.slice(1)} ${report.type === 'inventory' ? 'Inventory' : 'Sales'} Report`, 20, 20);
      doc.setFontSize(12);
      doc.text(`Branch: ${currentBranch.charAt(0).toUpperCase() + currentBranch.slice(1)}`, 20, 30);
      doc.text(`Report ID: ${report.id}`, 20, 40);
      doc.text(`Generated at: ${report.generatedAt}`, 20, 50);
      doc.text(`Type: ${report.type === 'inventory' ? 'Inventory' : 'Sales'}`, 20, 60);
      doc.text(`Range: ${report.range.from || 'Any'} to ${report.range.to || 'Any'}`, 20, 70);
      if (report.type === 'sales') {
        doc.text(`Total Orders: ${report.totalOrders}`, 20, 80);
        doc.text(`Total Sales: ₱${report.totalSales.toFixed(2)}`, 20, 90);
        doc.text(`Top Items: ${report.topItems}`, 20, 100);
      } else {
        doc.text(`Pending Requests: ${report.pendingRequests}`, 20, 80);
        doc.text('Inventory Summary:', 20, 90);
        report.inventorySummary.slice(0, 8).forEach((item, index) => {
          doc.text(`${item.label}: ${item.stock} units, ${item.containers} containers, ${item.servings} servings`, 20, 100 + index * 8);
        });
      }
      doc.save(`${report.id}.pdf`);
    }

    function deleteReport(reportId) {
      const reports = getCurrentBranchData().reports;
      getCurrentBranchData().reports = reports.filter(report => report.id !== reportId);
      saveData();
      renderReports();
    }

    function renderMenu() {
      const menu = getCurrentBranchData().menu;
      document.getElementById('menu-table').innerHTML = menu.map(item => `
        <tr class="border-t border-forest/10">
          <td class="py-4">${item.name}</td>
          <td class="py-4">${item.category}</td>
          <td class="py-4">₱${item.price}</td>
          <td class="py-4">${item.mood.join(', ')}</td>
          <td class="py-4">${item.disabled ? '<span class="rounded-full bg-forest/10 px-2 py-1 text-xs font-semibold text-forest">Disabled</span>' : '<span class="rounded-full bg-cream px-2 py-1 text-xs font-semibold text-forest">Available</span>'}</td>
          <td class="py-4 flex gap-2">
            <button onclick="openMenuModal('edit','${item.id}')" class="rounded-full bg-forest text-white px-3 py-2 text-xs font-semibold hover:bg-forestLight transition">Edit</button>
            <button onclick="toggleMenuItemStatus('${item.id}')" class="rounded-full border border-forest text-forest px-3 py-2 text-xs font-semibold hover:bg-forest/10 transition">${item.disabled ? 'Enable' : 'Disable'}</button>
            <button onclick="deleteMenuItem('${item.id}')" class="rounded-full border border-forest text-forest px-3 py-2 text-xs font-semibold hover:bg-forest/10 transition">Delete</button>
          </td>
        </tr>`).join('');
    }

    function openMenuModal(action, itemId = null) {
      currentMenuAction = action;
      editingMenuId = itemId;
      const title = action === 'add' ? 'Add Product' : 'Edit Product';
      document.getElementById('menu-modal-title').textContent = title;
      if (action === 'edit') {
        const item = getCurrentBranchData().menu.find(item => item.id === itemId);
        document.getElementById('menu-name').value = item.name;
        document.getElementById('menu-price').value = item.price;
        document.getElementById('menu-category').value = item.category;
        document.getElementById('menu-mood').value = item.mood.join(', ');
        document.getElementById('menu-verse').value = item.verse;
        document.getElementById('menu-image').value = item.image;
      } else {
        document.getElementById('menu-name').value = '';
        document.getElementById('menu-price').value = '';
        document.getElementById('menu-category').value = '';
        document.getElementById('menu-mood').value = '';
        document.getElementById('menu-verse').value = '';
        document.getElementById('menu-image').value = '';
      }
      document.getElementById('menu-modal').classList.remove('hidden');
    }

    function closeMenuModal() {
      document.getElementById('menu-modal').classList.add('hidden');
    }

    function saveMenuItem() {
      const name = document.getElementById('menu-name').value.trim();
      const price = Number(document.getElementById('menu-price').value);
      const category = document.getElementById('menu-category').value.trim();
      const mood = document.getElementById('menu-mood').value.split(',').map(tag => tag.trim()).filter(Boolean);
      const verse = document.getElementById('menu-verse').value.trim();
      const image = document.getElementById('menu-image').value.trim();
      if (!name || !category || !price) return;
      const menu = getCurrentBranchData().menu;
      if (currentMenuAction === 'add') {
        menu.push({ id: `m${Date.now()}`, name, price, category, mood, verse, image, disabled: false });
      } else {
        const item = menu.find(item => item.id === editingMenuId);
        item.name = name;
        item.price = price;
        item.category = category;
        item.mood = mood;
        item.verse = verse;
        item.image = image;
      }
      saveData();
      renderMenu();
      closeMenuModal();
    }

    function deleteMenuItem(itemId) {
      getCurrentBranchData().menu = getCurrentBranchData().menu.filter(item => item.id !== itemId);
      saveData();
      renderMenu();
    }

    function toggleMenuItemStatus(itemId) {
      const item = getCurrentBranchData().menu.find(item => item.id === itemId);
      if (!item) return;
      item.disabled = !item.disabled;
      saveData();
      renderMenu();
    }

    function renderUsers() {
      const users = getCurrentBranchData().users;
      document.getElementById('users-table').innerHTML = users.map(user => `
        <tr class="border-t border-forest/10">
          <td class="py-4">${user.name}</td>
          <td class="py-4">${user.role}</td>
          <td class="py-4">${currentBranch.charAt(0).toUpperCase() + currentBranch.slice(1)}</td>
          <td class="py-4">${user.status}</td>
          <td class="py-4"><button onclick="resetPassword('${user.id}')" class="rounded-full border border-forest text-forest px-3 py-2 text-xs font-semibold hover:bg-forest/10 transition">Reset Password</button></td>
        </tr>`).join('');
    }

    function resetPassword(userId) {
      const user = getCurrentBranchData().users.find(user => user.id === userId);
      if (!user) return;
      alert(`Password reset simulated for ${user.name}.`);
    }

    window.addEventListener('DOMContentLoaded', () => {
      loadData();

      const branchSelect = document.getElementById('branch-select');
      if (branchSelect) branchSelect.value = currentBranch;

      const dateElement = document.getElementById('admin-date');
      if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }

      if (window.lucide) lucide.createIcons();
    });
