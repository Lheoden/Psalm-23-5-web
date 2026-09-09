const STORAGE_PAID = 'paidOrders';
    const STORAGE_COMPLETED = 'completedOrders';

    let paidOrders = [];

    const sampleOrders = [
      {
        id: '#01',
        number: '#01',
        status: 'PAID',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        items: [
          { name: 'Americano', size: 'Medium', temp: 'Hot', sugar: '25%', addons: ['Extra Shot'] },
          { name: 'Cookie', size: '-', temp: '-', sugar: '-', addons: [] }
        ]
      },
      {
        id: '#02',
        number: '#02',
        status: 'PAID',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        items: [
          { name: 'Latte', size: 'Large', temp: 'Iced', sugar: '50%', addons: ['Vanilla Syrup'] }
        ]
      }
    ];

    function formatOrderNumber(value) {
      if (value === null || value === undefined) return '—';
      const text = String(value);
      if (text.startsWith('#')) return text;
      const num = parseInt(text, 10);
      return isNaN(num) ? text : '#' + String(num).padStart(2, '0');
    }

    function loadData() {
      paidOrders = JSON.parse(localStorage.getItem(STORAGE_PAID) || 'null') || sampleOrders;
      saveData();
      renderOrderQueue();
      showPanel('details');
    }

    function saveData() {
      localStorage.setItem(STORAGE_PAID, JSON.stringify(paidOrders));
    }

    function getQueueOrders() {
      return [...paidOrders].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    function renderOrderQueue() {
      const list = document.getElementById('order-list');
      list.innerHTML = '';
      const queue = getQueueOrders();
      document.getElementById('queue-empty').classList.toggle('hidden', queue.length > 0);
      if (!queue.length) return;
      queue.forEach(order => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'w-full text-left rounded-3xl border border-forest/10 bg-white p-5 shadow-sm card-hover hover:border-forest/30';
        const itemPreview = order.items.map(item => `${item.qty || 1}× ${item.name}`).join(', ');
        card.innerHTML = `
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-sm text-forest/60">Order ${formatOrderNumber(order.number || order.id)} · ${order.type || 'Order'}</p>
              <h3 class="mt-1 text-lg font-semibold text-forest">${order.status === 'PREPARING' ? 'Preparing' : 'Paid'}</h3>
              <p class="mt-2 text-sm text-forest/60 truncate">${itemPreview}</p>
            </div>
            <div class="text-right">
              <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${order.status === 'PREPARING' ? 'bg-preparing/15 text-preparing' : 'bg-paidGray/15 text-paidGray'}">${order.status}</span>
              <p class="mt-2 text-sm text-forest/50">${formatTime(order.paidAt || order.timestamp)}</p>
              ${order.startedAt ? `<p class="text-xs text-forest/50 mt-1">Started ${formatTime(order.startedAt)}</p>` : ''}
            </div>
          </div>`;
        card.onclick = () => selectOrder(order.id);
        list.appendChild(card);
      });
    }

    function formatTime(value) {
      const date = new Date(value);
      return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function selectOrder(orderId) {
      selectedOrder = getQueueOrders().find(order => order.id === orderId);
      if (!selectedOrder) return;
      showPanel('details');
      renderDetails();
    }

    function renderDetails() {
      if (!selectedOrder) return;
      document.getElementById('detail-panel').classList.remove('hidden');
      document.getElementById('detail-empty').classList.add('hidden');
      document.getElementById('detail-title').textContent = `Order ${formatOrderNumber(selectedOrder.number || selectedOrder.id)}`;
      document.getElementById('order-number').textContent = formatOrderNumber(selectedOrder.number || selectedOrder.id);
      document.getElementById('order-time').textContent = `Paid at ${formatTime(selectedOrder.timestamp)}`;
      const statusLabel = document.getElementById('order-status');
      statusLabel.textContent = selectedOrder.status;
      statusLabel.className = `mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${selectedOrder.status === 'PREPARING' ? 'bg-preparing/15 text-preparing' : 'bg-paidGray/15 text-paidGray'}`;
      const detailPanelStatus = document.getElementById('detail-status-panel');
      detailPanelStatus.textContent = selectedOrder.status === 'PREPARING' && selectedOrder.startedAt ? `Preparing since ${formatTime(selectedOrder.startedAt)}` : selectedOrder.status;
      const itemsList = document.getElementById('items-list');
      itemsList.innerHTML = selectedOrder.items.map(item => {
        const addons = item.addons && item.addons.length ? `<p class="text-sm text-forest/60 mt-2">Add-ons: ${item.addons.join(', ')}</p>` : '';
        return `
          <div class="rounded-3xl border border-forest/10 bg-cream p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="font-semibold text-forest">${item.name}</p>
                <p class="text-sm text-forest/60 mt-1">${item.size} · ${item.temp} · Sugar ${item.sugar}</p>
                ${addons}
              </div>
            </div>
          </div>`;
      }).join('');
      document.getElementById('detail-count').textContent = selectedOrder.items.length;
      updateActionButtons();
    }

    function updateActionButtons() {
      document.getElementById('btn-start').disabled = !selectedOrder || selectedOrder.status !== 'PAID';
      document.getElementById('btn-ready').disabled = !selectedOrder || selectedOrder.status === 'READY';
    }

    function startPreparing() {
      if (!selectedOrder || selectedOrder.status !== 'PAID') return;
      selectedOrder.status = 'PREPARING';
      selectedOrder.startedAt = new Date().toISOString();
      saveData();
      renderOrderQueue();
      renderDetails();
      showToast(`Order ${formatOrderNumber(selectedOrder.number || selectedOrder.id)} is now preparing.`);
    }

    function markReady() {
      if (!selectedOrder || selectedOrder.status === 'READY') return;
      paidOrders = paidOrders.filter(order => order.id !== selectedOrder.id);
      const completedOrders = JSON.parse(localStorage.getItem(STORAGE_COMPLETED) || 'null') || [];
      completedOrders.push({ ...selectedOrder, status: 'READY', completedAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_COMPLETED, JSON.stringify(completedOrders));
      selectedOrder = null;
      saveData();
      renderOrderQueue();
      clearDetailPanel();
      showToast('Order marked ready and removed from queue.');
    }



    function showPanel(panel) {
      activePanel = panel;
      document.getElementById('detail-panel').classList.toggle('hidden', panel !== 'details');
      document.getElementById('tab-details').classList.toggle('bg-forest', panel === 'details');
      document.getElementById('tab-details').classList.toggle('text-white', panel === 'details');
      document.getElementById('tab-details').classList.toggle('bg-white', panel !== 'details');
    }

    function clearDetailPanel() {
      document.getElementById('detail-panel').classList.add('hidden');
      if (activePanel === 'details') document.getElementById('detail-empty').classList.remove('hidden');
      document.getElementById('detail-title').textContent = 'Select an order';
    }

    function showToast(message) {
      const toast = document.getElementById('ready-toast');
      document.getElementById('toast-text').textContent = message;
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 2800);
    }

    window.addEventListener('DOMContentLoaded', () => {
      loadData();
      showPanel('details');
    });
