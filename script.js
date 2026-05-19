// ============================================
//   NOTAKU — MAIN SCRIPT
//   Supports 11 templates (8 premium)
// ============================================

// ── STATE ────────────────────────────────────
let itemCount = 0;
let currentTemplate = 'classic';
let revenueChart = null;
let transactionHistory = [];

// ── SAVE & LOAD LAST INVOICE ────────────────
function saveCurrentInvoice() {
  const invoiceData = {
    storeName: document.getElementById('storeName')?.value || '',
    storeAddress: document.getElementById('storeAddress')?.value || '',
    storePhone: document.getElementById('storePhone')?.value || '',
    buyerName: document.getElementById('buyerName')?.value || '',
    buyerPhone: document.getElementById('buyerPhone')?.value || '',
    invoiceNumber: document.getElementById('invoiceNumber')?.value || '',
    invoiceDate: document.getElementById('invoiceDate')?.value || '',
    discount: document.getElementById('discount')?.value || '0',
    tax: document.getElementById('tax')?.value || '0',
    notes: document.getElementById('notes')?.value || '',
    items: []
  };

document.querySelectorAll('.item-row').forEach(row => {
  const name = row.querySelector('.item-name')?.value || '';
  const qty = row.querySelector('.item-qty')?.value || '1';
  const price = row.querySelector('.item-price')?.value || '0';
  const discount = row.querySelector('.item-discount')?.value || '0';
  if (name) invoiceData.items.push({ name, qty, price, discount });
});

  localStorage.setItem('notaku_last_invoice', JSON.stringify(invoiceData));
}

function loadLastInvoice() {
  const savedData = localStorage.getItem('notaku_last_invoice');
  if (!savedData) return;

  try {
    const data = JSON.parse(savedData);
    document.getElementById('storeName') && (document.getElementById('storeName').value = data.storeName);
    document.getElementById('storeAddress') && (document.getElementById('storeAddress').value = data.storeAddress);
    document.getElementById('storePhone') && (document.getElementById('storePhone').value = data.storePhone);
    document.getElementById('buyerName') && (document.getElementById('buyerName').value = data.buyerName);
    document.getElementById('buyerPhone') && (document.getElementById('buyerPhone').value = data.buyerPhone);
    document.getElementById('invoiceNumber') && (document.getElementById('invoiceNumber').value = data.invoiceNumber);
    document.getElementById('invoiceDate') && (document.getElementById('invoiceDate').value = data.invoiceDate);
    document.getElementById('discount') && (document.getElementById('discount').value = data.discount);
    document.getElementById('tax') && (document.getElementById('tax').value = data.tax);
    document.getElementById('notes') && (document.getElementById('notes').value = data.notes);

    const itemsContainer = document.getElementById('itemsList');
    if (itemsContainer && data.items && data.items.length) {
      itemsContainer.innerHTML = '';
      itemCount = 0;
      data.items.forEach(item => {
        addItem(item.name, parseFloat(item.qty), parseFloat(item.price), parseFloat(item.discount || 0));
      });
    }
  } catch(e) { console.warn("Gagal memuat nota terakhir:", e); }
}

// ── LOAD DATA ────────────────────────────────
function loadData() {
  const saved = localStorage.getItem('notaku_products');
  if (saved) {
    try {
      displaySavedProducts(JSON.parse(saved));
    } catch (e) {
      localStorage.removeItem('notaku_products');
    }
  }

  const stats = localStorage.getItem('notaku_stats');
  if (stats) {
    try {
      transactionHistory = JSON.parse(stats);
      updateStats();
    } catch (e) {
      localStorage.removeItem('notaku_stats');
    }
  }
}

// ── PREMIUM STATUS ───────────────────────────
function showPremiumTemplates() {
  const premiumGroup = document.getElementById('premiumTemplateGroup');
  const premiumNote  = document.getElementById('premiumTemplateNote');
  if (!premiumGroup) return;

  const active = window.PremiumAPI && window.PremiumAPI.isPremium() && !window.PremiumAPI.isExpired();

  if (active) {
    premiumGroup.style.display = 'block';
    if (premiumNote) premiumNote.style.display = 'block';
  } else {
    premiumGroup.style.display = 'none';
    if (premiumNote) premiumNote.style.display = 'none';

    if (window.PremiumAPI && window.PremiumAPI.isTemplatePremium(currentTemplate)) {
      switchTemplate('classic');
    }
  }
}

function checkPremiumStatus() {
  if (!window.PremiumAPI) return;

  const isPremium = window.PremiumAPI.isPremium();
  const isExpired = window.PremiumAPI.isExpired();
  const watermark = document.getElementById('watermark');
  const statusDiv = document.getElementById('premiumStatus');

  if (isPremium && !isExpired) {
    if (watermark) watermark.style.display = 'none';
    if (statusDiv) {
      const days  = window.PremiumAPI.getRemainingDays();
      const until = window.PremiumAPI.getUntilFormatted();
      const plan  = window.PremiumAPI.getPlanName();
      statusDiv.innerHTML =
        `👑 Premium <strong>${plan}</strong> aktif hingga ${until} (${days} hari lagi)<br>` +
        `✨ 8 template eksklusif telah diaktifkan!`;
      statusDiv.style.color = '#c9952a';
    }
  } else {
    if (watermark) watermark.style.display = 'block';
    if (statusDiv) {
      if (isPremium && isExpired) {
        statusDiv.innerHTML = '⚠️ Premium kamu sudah kadaluarsa. Perpanjang untuk akses template eksklusif.';
        statusDiv.style.color = '#c0431a';
      } else {
        statusDiv.innerHTML =
          '🔒 Upgrade ke Premium untuk:<br>' +
          '✓ Hapus watermark · ✓ 8 template eksklusif · ✓ Nota lebih profesional';
        statusDiv.style.color = 'rgba(250,248,243,0.4)';
      }
    }
  }

  showPremiumTemplates();
}

// ── AKTIVASI PREMIUM ─────────────────────────
function activatePremium() {
  const input = document.getElementById('premiumKey');
  const key   = input ? input.value.trim() : '';

  if (!key) {
    showToast('⚠️ Masukkan kode premium terlebih dahulu!', 'warn');
    return;
  }

  if (window.PremiumAPI && window.PremiumAPI.activate(key)) {
    showToast('✅ Premium berhasil diaktifkan! 8 template eksklusif siap digunakan.', 'success');
    if (input) input.value = '';
    checkPremiumStatus();
    setTimeout(() => {
      const el = document.querySelector('.template-selector');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 600);
  } else {
    showToast('❌ Kode tidak valid. Hubungi admin via WhatsApp untuk mendapatkan kode.', 'error');
  }
}

// ── SWITCH TEMPLATE ──────────────────────────
function switchTemplate(templateName) {
  currentTemplate = templateName;
  const preview = document.getElementById('invoicePreview');
  if (preview) preview.className = `invoice-template template-${currentTemplate}`;

  document.querySelectorAll('.template-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.template === templateName);
  });
}

// ── TOAST NOTIFICATION ───────────────────────
function showToast(message, type = 'info') {
  const existing = document.querySelector('.nk-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'nk-toast';
  toast.textContent = message;

  const colors = {
    success: '#2a7a4b',
    error:   '#c0431a',
    warn:    '#c9952a',
    info:    '#1a1510'
  };

  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '2rem',
    right:        '2rem',
    background:   colors[type] || colors.info,
    color:        '#fff',
    padding:      '1rem 1.5rem',
    borderRadius: '12px',
    fontFamily:   "'Space Grotesk', sans-serif",
    fontSize:     '0.85rem',
    fontWeight:   '600',
    zIndex:       '9999',
    boxShadow:    '0 8px 30px rgba(0,0,0,0.25)',
    maxWidth:     '360px',
    lineHeight:   '1.5',
    transform:    'translateY(20px)',
    opacity:      '0',
    transition:   'all 0.3s ease'
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity   = '1';
  });

  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity   = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── SIMPAN PRODUK ────────────────────────────
function saveProducts(products) {
  localStorage.setItem('notaku_products', JSON.stringify(products));
}

// ── TRANSAKSI & STATISTIK ────────────────────
function saveTransaction(total) {
  transactionHistory.push({
    date:  new Date().toISOString(),
    total: total
  });
  localStorage.setItem('notaku_stats', JSON.stringify(transactionHistory));
  updateStats();
}

function updateStats() {
  const total   = transactionHistory.length;
  const revenue = transactionHistory.reduce((s, t) => s + t.total, 0);
  const avg     = total > 0 ? revenue / total : 0;

  const el = (id) => document.getElementById(id);
  if (el('totalTransactions')) el('totalTransactions').textContent = total;
  if (el('totalRevenue'))      el('totalRevenue').textContent = formatRupiah(revenue);
  if (el('avgTransaction'))    el('avgTransaction').textContent = formatRupiah(avg);

  updateChart();
}

function updateChart() {
  const last7Days    = [];
  const last7Revenue = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label   = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    last7Days.push(label);

    const rev = transactionHistory
      .filter(t => t.date.split('T')[0] === dateStr)
      .reduce((s, t) => s + t.total, 0);
    last7Revenue.push(rev);
  }

  if (revenueChart) revenueChart.destroy();

  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;

  revenueChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: last7Days,
      datasets: [{
        label: 'Pendapatan (Rp)',
        data: last7Revenue,
        borderColor: '#c9952a',
        backgroundColor: 'rgba(201,149,42,0.08)',
        pointBackgroundColor: '#c9952a',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        tension: 0.4,
        fill: true,
        borderWidth: 2.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => 'Rp ' + Number(ctx.raw).toLocaleString('id-ID')
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            callback: (v) => 'Rp ' + Number(v).toLocaleString('id-ID'),
            font: { family: "'Fira Code', monospace", size: 11 }
          }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: "'Fira Code', monospace", size: 11 } }
        }
      }
    }
  });
}

function resetStats() {
  if (confirm('Reset semua statistik penjualan? Data tidak dapat dikembalikan!')) {
    transactionHistory = [];
    localStorage.removeItem('notaku_stats');
    updateStats();
    showToast('🗑️ Statistik berhasil direset.', 'warn');
  }
}

// ── EXPORT CSV ───────────────────────────────
function exportStats() {
  if (transactionHistory.length === 0) {
    showToast('⚠️ Belum ada data transaksi untuk diexport.', 'warn');
    return;
  }

  let csv = 'Tanggal,Total (Rp)\n';
  transactionHistory.forEach(t => {
    const date = new Date(t.date).toLocaleDateString('id-ID');
    csv += `${date},${t.total}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `notaku-stats-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('✅ Data statistik sudah diexport ke CSV!', 'success');
}

// ── BACKUP & RESTORE ─────────────────────────
function backupData() {
  const backup = {
    products: localStorage.getItem('notaku_products') || '[]',
    stats: localStorage.getItem('notaku_stats') || '[]',
    lastInvoice: localStorage.getItem('notaku_last_invoice') || '{}',
    darkMode: localStorage.getItem('notaku_dark_mode') || 'false',
    version: '1.0.0',
    date: new Date().toISOString()
  };

  const dataStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notaku-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('💾 Data berhasil di-backup!', 'success');
}

function restoreData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (backup.products) localStorage.setItem('notaku_products', backup.products);
        if (backup.stats) localStorage.setItem('notaku_stats', backup.stats);
        if (backup.lastInvoice) localStorage.setItem('notaku_last_invoice', backup.lastInvoice);
        if (backup.darkMode) localStorage.setItem('notaku_dark_mode', backup.darkMode);

        loadData();
        loadLastInvoice();
        if (backup.darkMode === 'true') document.body.classList.add('dark-mode');
        
        showToast('🔄 Data berhasil direstore!', 'success');
        setTimeout(() => location.reload(), 1500);
      } catch (err) {
        showToast('❌ File backup tidak valid!', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ── QUICK ADD SAMPLE PRODUCTS ─────────────────
function quickAddSample() {
  const samples = [
    { name: 'Batik Tulis Semarang', price: 185000 },
    { name: 'Kain Lurik Premium', price: 95000 },
    { name: 'Tas Anyaman Rotan', price: 120000 },
    { name: 'Kerajinan Kayu Ukir', price: 250000 }
  ];
  
  samples.forEach(sample => {
    addItem(sample.name, 1, sample.price);
  });
  
  showToast('📦 Contoh produk ditambahkan!', 'success');
}

// ── BULK IMPORT ──────────────────────────────
function bulkImportProducts() {
  document.getElementById('bulkImportModal').style.display = 'block';
}

function closeBulkImportModal() {
  document.getElementById('bulkImportModal').style.display = 'none';
}

function processBulkImport() {
  const data = document.getElementById('bulkImportData').value;
  const lines = data.split('\n');
  let count = 0;

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    
    const parts = line.split('|');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const price = parseInt(parts[1].trim());
      if (name && !isNaN(price) && price > 0) {
        const products = JSON.parse(localStorage.getItem('notaku_products') || '[]');
        if (!products.find(p => p.name.toLowerCase() === name.toLowerCase())) {
          products.push({ name, price });
          saveProducts(products);
          count++;
        }
      }
    }
  });

  displaySavedProducts(JSON.parse(localStorage.getItem('notaku_products') || '[]'));
  showToast(`✅ ${count} produk berhasil diimport!`, 'success');
  closeBulkImportModal();
  document.getElementById('bulkImportData').value = '';
}

// ── SHARE INVOICE ────────────────────────────
async function shareInvoice() {
  const invoice = document.getElementById('invoicePreview');
  if (!invoice || invoice.style.display === 'none') {
    showToast('⚠️ Generate nota terlebih dahulu!', 'warn');
    return;
  }

  try {
    const canvas = await html2canvas(invoice, { scale: 2 });
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'nota.png', { type: 'image/png' });
    
    if (navigator.share) {
      await navigator.share({
        title: 'Nota dari NotaKu',
        text: 'Berikut nota dari toko kami',
        files: [file]
      });
      showToast('✅ Nota berhasil dibagikan!', 'success');
    } else {
      showToast('📱 Share tidak didukung, gunakan screenshot', 'info');
    }
  } catch (err) {
    console.log('Share cancelled or failed');
  }
}

// ── CLEAR ALL DATA ───────────────────────────
function clearAllData() {
  if (confirm('Reset semua form dan hapus data? Tindakan ini tidak dapat dibatalkan!')) {
    localStorage.removeItem('notaku_last_invoice');
    document.getElementById('storeName').value = '';
    document.getElementById('storeAddress').value = '';
    document.getElementById('storePhone').value = '';
    document.getElementById('buyerName').value = '';
    document.getElementById('buyerPhone').value = '';
    document.getElementById('discount').value = '0';
    document.getElementById('tax').value = '0';
    document.getElementById('notes').value = '';
    
    const itemsContainer = document.getElementById('itemsList');
    if (itemsContainer) {
      itemsContainer.innerHTML = '';
      itemCount = 0;
      addItem();
      addItem();
    }
    
    showToast('🗑️ Semua data telah direset!', 'warn');
  }
}

// ── INIT ─────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  const dateEl = document.getElementById('invoiceDate');
  if (dateEl) dateEl.value = today;

  const num   = String(Math.floor(Math.random() * 9000) + 1000);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const year  = new Date().getFullYear();
  const numEl = document.getElementById('invoiceNumber');
  if (numEl) numEl.value = `INV/${year}/${month}/${num}`;

  addItem();
  addItem();

  loadData();
  loadLastInvoice();
  checkPremiumStatus();
  loadStockData();
  loadHppData();
  setTimeout(updateDashboard, 200);
  

  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = btn.dataset.template;

      if (window.PremiumAPI && window.PremiumAPI.isTemplatePremium(tpl)) {
        if (!window.PremiumAPI.isPremium() || window.PremiumAPI.isExpired()) {
          showToast('👑 Template ini eksklusif untuk member Premium. Upgrade sekarang!', 'warn');
          const premSec = document.getElementById('premium');
          if (premSec) premSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      switchTemplate(tpl);
    });
  });

  const toggleBtn = document.getElementById('darkModeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      toggleBtn.innerHTML = isDark ? '☀️ Terang' : '🌙 Mode';
      localStorage.setItem('notaku_dark_mode', isDark);
    });
    if (localStorage.getItem('notaku_dark_mode') === 'true') {
      document.body.classList.add('dark-mode');
      toggleBtn.innerHTML = '☀️ Terang';
    }
    // Update laporan laba/rugi
if (typeof updateProfitReport === 'function') {
  setTimeout(updateProfitReport, 100);
}
    
  }
});

function addItem(name = '', qty = 1, price = 0, discount = 0) {
  itemCount++;
  const id   = itemCount;
  const list = document.getElementById('itemsList');
  if (!list) return;

  const row = document.createElement('div');
  row.className = 'item-row';
  row.id = `item-${id}`;
  row.innerHTML = `
    <input type="text"   placeholder="Nama produk / jasa" class="item-name"  value="${escapeHtml(name)}" enterkeyhint="next" />
    <input type="text"   placeholder="Qty"                class="item-qty"   inputmode="numeric" pattern="[0-9]*" value="${qty}" enterkeyhint="next" />
    <input type="text"   placeholder="Harga (Rp)"         class="item-price" inputmode="numeric" pattern="[0-9]*" value="${price}" enterkeyhint="next" />
    <input type="text"   placeholder="Diskon (%)"         class="item-discount" inputmode="numeric" pattern="[0-9]*" value="${discount}" enterkeyhint="done" style="width: 80px;" />
    <button class="remove-btn" onclick="removeItem(${id})" title="Hapus">✕</button>
  `;
  list.appendChild(row);
}

function removeItem(id) {
  const row = document.getElementById(`item-${id}`);
  if (row) row.remove();
}

// ── SAVED PRODUCTS ────────────────────────────
function showSaveProductModal() {
  document.getElementById('saveProductModal').style.display = 'block';
}

function closeSaveProductModal() {
  document.getElementById('saveProductModal').style.display = 'none';
}

function showPremiumModal() {
  document.getElementById('premiumModal').style.display = 'block';
}

function closePremiumModal() {
  document.getElementById('premiumModal').style.display = 'none';
}

window.onclick = function (event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
};

function saveProduct() {
  const name  = document.getElementById('saveProductName').value.trim();
  const price = parseFloat(document.getElementById('saveProductPrice').value);

  if (!name || isNaN(price) || price <= 0) {
    showToast('⚠️ Masukkan nama produk dan harga yang valid!', 'warn');
    return;
  }

  const products = JSON.parse(localStorage.getItem('notaku_products') || '[]');
  if (products.find(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast('⚠️ Produk dengan nama ini sudah tersimpan.', 'warn');
    return;
  }

  products.push({ name, price });
  saveProducts(products);
  displaySavedProducts(products);
  closeSaveProductModal();
  document.getElementById('saveProductName').value  = '';
  document.getElementById('saveProductPrice').value = '';
  showToast(`✅ Produk "${name}" berhasil disimpan!`, 'success');
}

function displaySavedProducts(products) {
  const container = document.getElementById('savedProducts');
  if (!container) return;
  container.innerHTML = '';

  if (products.length === 0) {
    container.innerHTML = '<span style="font-size:0.75rem;color:var(--muted)">Belum ada produk tersimpan.</span>';
    return;
  }

  products.forEach((product, index) => {
    const btn = document.createElement('div');
    btn.className = 'saved-product';
    btn.title = `Klik untuk tambahkan ke nota`;
    btn.innerHTML = `
      <span class="sp-name">${escapeHtml(product.name)}</span>
      <span class="sp-price">${formatRupiah(product.price)}</span>
      <button class="sp-del" onclick="deleteProduct(event, ${index})" title="Hapus">✕</button>
    `;
    btn.onclick = (e) => {
      if (e.target.classList.contains('sp-del')) return;
      addSavedProductToItems(product.name, product.price);
    };
    container.appendChild(btn);
  });
}

function deleteProduct(e, index) {
  e.stopPropagation();
  const products = JSON.parse(localStorage.getItem('notaku_products') || '[]');
  const name = products[index]?.name || '';
  products.splice(index, 1);
  saveProducts(products);
  displaySavedProducts(products);
  showToast(`🗑️ Produk "${name}" dihapus.`, 'warn');
}

function addSavedProductToItems(name, price) {
  addItem(name, 1, price);
  showToast(`✅ "${name}" ditambahkan ke nota.`, 'success');
}

// ── HELPER ────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function formatRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function incrementInvoiceNumber() {
  const invoiceField = document.getElementById('invoiceNumber');
  if (!invoiceField) return;

  let currentNumber = invoiceField.value;
  const match = currentNumber.match(/\/(\d+)$/);
  if (match) {
    const lastNum = parseInt(match[1], 10);
    const nextNum = (lastNum + 1).toString().padStart(match[1].length, '0');
    const nextInvoice = currentNumber.replace(/\d+$/, nextNum);
    invoiceField.value = nextInvoice;
  } else {
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    invoiceField.value = `INV/${date.getFullYear()}/${month}/${randomNum}`;
  }
}

// ── GENERATE INVOICE ──────────────────────────
function generateInvoice() {
  const rows  = document.querySelectorAll('.item-row');
 const items = [];
rows.forEach(row => {
  const name = row.querySelector('.item-name')?.value.trim();
  const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
  const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
  const discountPercent = parseFloat(row.querySelector('.item-discount')?.value) || 0;
  if (name && price > 0 && qty > 0) {
    const discountAmount = (price * discountPercent / 100) * qty;
    const finalPrice = price * (1 - discountPercent / 100);
    const subtotal = finalPrice * qty;
    items.push({ 
      name: name, 
      qty, 
      price, 
      discountPercent,
      discountAmount,
      finalPrice,
      subtotal 
    });
  }
});

  if (items.length === 0) {
    showToast('⚠️ Tambahkan minimal 1 produk terlebih dahulu!', 'warn');
    return;
  }

  const get = (id) => document.getElementById(id)?.value.trim() || '';

  const storeName    = get('storeName')    || 'Nama Toko';
  const storeAddress = get('storeAddress');
  const storePhone   = get('storePhone');
  const buyerName    = get('buyerName')    || 'Pelanggan';
  const buyerPhone   = get('buyerPhone');
  const invoiceNum   = get('invoiceNumber');
  const invoiceDate  = get('invoiceDate');
  const discount     = parseFloat(document.getElementById('discount')?.value) || 0;
  const taxPct       = parseFloat(document.getElementById('tax')?.value)      || 0;
  const notes        = get('notes');

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const taxAmt   = Math.round(subtotal * taxPct / 100);
  const total    = Math.max(0, subtotal - discount + taxAmt);

  if (typeof gtag === 'function') {
    gtag('event', 'generate_invoice', {
      event_category: 'engagement',
      event_label: storeName,
      value: total
    });
  }

  // Simpan transaksi dengan detail items
const transactionDetail = {
  date: new Date().toISOString(),
  total: total,
  invoiceNumber: invoiceNum,
  items: items.map(item => ({ 
    name: item.name, 
    qty: item.qty, 
    price: item.price,
    subtotal: item.subtotal
  }))
};

transactionHistory.push(transactionDetail);
localStorage.setItem('notaku_stats', JSON.stringify(transactionHistory));
updateStats();
 if (typeof updateDashboard === 'function') {
  setTimeout(updateDashboard, 100);
}
  // Update stok setelah membuat nota
if (typeof updateStockAfterSale === 'function') {
  updateStockAfterSale(items);
}
  saveCurrentInvoice();

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('inv-storeName',   storeName);
  set('inv-storeAddress', storeAddress);
  set('inv-storePhone',  storePhone   ? `☎ ${storePhone}`  : '');
  set('inv-number',      invoiceNum);
  set('inv-date',        formatDate(invoiceDate));
  set('inv-buyerName',   buyerName);
  set('inv-buyerPhone',  buyerPhone   ? `☎ ${buyerPhone}`  : '');
  set('inv-sigName',     storeName);

  const tbody = document.getElementById('inv-items');
  if (tbody) {
tbody.innerHTML = '';
items.forEach(item => {
  const tr = document.createElement('tr');
  let priceDisplay = formatRupiah(item.price);
  if (item.discountPercent > 0) {
    priceDisplay = `${formatRupiah(item.price)} <span style="font-size:0.7rem;color:#c0431a;">(-${item.discountPercent}%)</span><br><span style="font-size:0.7rem;">→ ${formatRupiah(item.finalPrice)}</span>`;
  }
  tr.innerHTML = `
    <td>${escapeHtml(item.name)}</td>
    <td style="text-align:center">${item.qty}</td>
    <td style="text-align:left">${priceDisplay}</td>
    <td style="text-align:right;font-weight:600">${formatRupiah(item.subtotal)}</td>
  `;
  tbody.appendChild(tr);
});
  }

  set('inv-subtotal', formatRupiah(subtotal));

  const discRow = document.getElementById('inv-discountRow');
  if (discRow) discRow.style.display = discount > 0 ? 'flex' : 'none';
  set('inv-discount', discount > 0 ? `- ${formatRupiah(discount)}` : '');

  const taxRow = document.getElementById('inv-taxRow');
  if (taxRow) taxRow.style.display = taxPct > 0 ? 'flex' : 'none';
  set('inv-tax', taxPct > 0 ? `+ ${formatRupiah(taxAmt)} (${taxPct}%)` : '');

  set('inv-total', formatRupiah(total));

  const notesSection = document.getElementById('inv-notesSection');
  if (notesSection) notesSection.style.display = notes ? 'block' : 'none';
  set('inv-notes', notes);

  const placeholder = document.getElementById('previewPlaceholder');
  const preview     = document.getElementById('invoicePreview');
  const actions     = document.getElementById('previewActions');

  if (placeholder) placeholder.style.display = 'none';
  if (preview)     preview.style.display     = 'block';
  if (actions)     actions.style.display     = 'flex';

  if (preview) preview.className = `invoice-template template-${currentTemplate}`;

  incrementInvoiceNumber();

  if (preview) preview.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showToast('✅ Nota berhasil dibuat!', 'success');
}

// ── DOWNLOAD PDF ──────────────────────────────
async function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const invoice   = document.getElementById('invoicePreview');
  if (!invoice) return;

  const btn          = event?.target?.closest('button') || event?.target;
  const originalHTML = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '⏳ Menyiapkan…'; btn.disabled = true; }

  const orig = {
    width:    invoice.style.width,
    maxWidth: invoice.style.maxWidth,
    margin:   invoice.style.margin
  };

  invoice.style.width    = '600px';
  invoice.style.maxWidth = '600px';
  invoice.style.margin   = '0';

  try {
    await new Promise(r => setTimeout(r, 250));

    const canvas = await html2canvas(invoice, {
      scale:           2.5,
      useCORS:         true,
      backgroundColor: '#ffffff',
      logging:         false,
      windowWidth:     600
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pdfW     = pdf.internal.pageSize.getWidth();
    const margin   = 6;
    const contentW = pdfW - margin * 2;
    const contentH = (canvas.height * contentW) / canvas.width;

    pdf.addImage(imgData, 'JPEG', margin, margin, contentW, contentH, undefined, 'FAST');

    const filename = `nota-${document.getElementById('invoiceNumber')?.value.replace(/\//g, '-') || 'notaku'}.pdf`;
    pdf.save(filename);

    showToast('✅ PDF berhasil didownload!', 'success');

    if (typeof gtag === 'function') {
      gtag('event', 'download_pdf', { event_category: 'engagement' });
    }

  } catch (err) {
    console.error('PDF Error:', err);
    showToast('❌ Gagal membuat PDF. Coba gunakan fitur Print.', 'error');
  }

  invoice.style.width    = orig.width;
  invoice.style.maxWidth = orig.maxWidth;
  invoice.style.margin   = orig.margin;

  if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; }
}

// ── PRINT ─────────────────────────────────────
function printInvoice() {
  const invoice = document.getElementById('invoicePreview');
  if (!invoice) return;

  const printWin = window.open('', '_blank');
  printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Nota — NotaKu</title>
  <link rel="stylesheet" href="style.css"/>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Space+Grotesk:wght@300;400;500;600;700&family=Fira+Code:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    body { padding: 1rem; background: #fff; }
    @media print { body { padding: 0; } .inv-watermark { display: none !important; } }
  </style>
</head>
<body>
  ${invoice.outerHTML}
  <script>window.onload = () => { window.print(); window.close(); }<\/script>
</body>
</html>`);
  printWin.document.close();
}

// ── PAYMENT INFO ──────────────────────────────
function showPaymentInfo(paket, nominal) {
  const paymentDiv  = document.getElementById('paymentInfo');
  const amountSpan  = document.getElementById('paymentAmount');

  if (!paymentDiv || !amountSpan) return;

  amountSpan.textContent = `Rp ${nominal.toLocaleString('id-ID')}`;
  paymentDiv.style.display = 'block';
  paymentDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  showToast(`✅ Silakan transfer Rp ${nominal.toLocaleString('id-ID')}`, 'success');

  if (typeof gtag === 'function') {
    gtag('event', 'view_payment_info', {
      event_category: 'premium',
      event_label: paket,
      value: nominal
    });
  }
}

function copyPaymentInfo() {
  const rekening = '359301009186508';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(rekening).then(() => {
      showToast('✅ No. rekening BRI berhasil di-copy!', 'success');
    });
  } else {
    const el = document.createElement('textarea');
    el.value = rekening;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('✅ No. rekening BRI berhasil di-copy!', 'success');
  }

  if (typeof gtag === 'function') {
    gtag('event', 'copy_rekening', { event_category: 'premium', event_label: 'BRI' });
  }
}

// ── DYNAMIC STYLES ───────────────────────────
(function injectDynamicStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .saved-product {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      padding: 0.4rem 1.8rem 0.4rem 0.7rem;
    }
    .sp-name  { font-size: 0.78rem; font-weight: 600; color: var(--ink); }
    .sp-price { font-family: var(--font-mono, monospace); font-size: 0.65rem; color: var(--muted); }
    .sp-del   {
      position: absolute; top: 0.3rem; right: 0.3rem;
      background: none; border: none; color: var(--muted);
      font-size: 0.65rem; cursor: pointer; padding: 0.1rem 0.3rem;
      border-radius: 4px; transition: all 0.15s; line-height: 1;
    }
    .sp-del:hover { background: rgba(192,67,26,0.1); color: var(--rust); }
  `;
  document.head.appendChild(style);
})();
  // ============================================
//   FITUR KIRIM NOTA KE WHATSAPP
// ============================================

async function sendToWhatsApp() {
  const invoice = document.getElementById('invoicePreview');
  const previewPlaceholder = document.getElementById('previewPlaceholder');
  
  // Cek apakah nota sudah digenerate
  if (!invoice || invoice.style.display === 'none') {
    showToast('⚠️ Generate nota terlebih dahulu!', 'warn');
    return;
  }
  
  // Ambil data dari nota
  const storeName = document.getElementById('inv-storeName')?.textContent || 'Toko Kami';
  const buyerName = document.getElementById('inv-buyerName')?.textContent || 'Pelanggan';
  const total = document.getElementById('inv-total')?.textContent || 'Rp 0';
  const invoiceNumber = document.getElementById('inv-number')?.textContent || '';
  const buyerPhone = document.getElementById('buyerPhone')?.value || '';
  
  showToast('⏳ Menyiapkan gambar nota...', 'info');
  
  try {
    // Simpan style asli untuk sementara
    const originalWidth = invoice.style.width;
    const originalMaxWidth = invoice.style.maxWidth;
    const originalMargin = invoice.style.margin;
    
    // Set ukuran tetap untuk capture
    invoice.style.width = '500px';
    invoice.style.maxWidth = '500px';
    invoice.style.margin = '0';
    
    await new Promise(r => setTimeout(r, 200));
    
    // Capture nota jadi gambar
    const canvas = await html2canvas(invoice, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 500
    });
    
    // Kembalikan style asli
    invoice.style.width = originalWidth;
    invoice.style.maxWidth = originalMaxWidth;
    invoice.style.margin = originalMargin;
    
    // Konversi ke file
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'nota.png', { type: 'image/png' });
    
    // Ambil nomor HP pembeli
    let phoneNumber = buyerPhone.replace(/\D/g, '');
    
    // Jika tidak ada nomor, minta input
    if (!phoneNumber) {
      phoneNumber = prompt('Masukkan nomor WhatsApp pelanggan:\nContoh: 628123456789', '');
      if (!phoneNumber) {
        showToast('❌ Kirim WA dibatalkan', 'warn');
        return;
      }
      phoneNumber = phoneNumber.replace(/\D/g, '');
    }
    
    // Format nomor (awalan 62, tanpa 0 di depan)
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '62' + phoneNumber.substring(1);
    }
    if (!phoneNumber.startsWith('62')) {
      phoneNumber = '62' + phoneNumber;
    }
    
    // Buat pesan
    const message = `*NOTA DARI ${storeName.toUpperCase()}*%0A%0A` +
      `Kepada Yth. ${buyerName}%0A` +
      `No. Nota: ${invoiceNumber}%0A` +
      `Total: ${total}%0A%0A` +
      `Terima kasih atas pembeliannya!%0A` +
      `Nota ini dibuat dengan NotaKu.id%0A%0A` +
      `_Nota digital, lampiran terlampir_`;
    
    // Cek apakah pakai HP atau desktop
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      // Di HP: pakai Web Share API
      await navigator.share({
        title: `Nota dari ${storeName}`,
        text: `Halo ${buyerName}, berikut nota pembelian Anda. Total: ${total}`,
        files: [file]
      });
      showToast('✅ Nota siap dibagikan ke WhatsApp!', 'success');
    } else {
      // Di Desktop: buka WhatsApp Web
      const waUrl = `https://wa.me/${phoneNumber}?text=${message}`;
      window.open(waUrl, '_blank');
      showToast('✅ Buka WhatsApp Web, kirim gambar nota manual', 'success');
      
      // Download gambar juga sebagai backup
      const link = document.createElement('a');
      link.download = `nota-${invoiceNumber.replace(/\//g, '-')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
    
    // Catat event ke Google Analytics
    if (typeof gtag === 'function') {
      gtag('event', 'send_whatsapp', {
        event_category: 'engagement',
        event_label: storeName
      });
    }
    
  } catch (err) {
    console.error('WA Error:', err);
    showToast('❌ Gagal kirim ke WA. Coba download PDF dulu.', 'error');
  }
}
// ============================================
//   FITUR MANAJEMEN STOK
// ============================================

let stockData = [];

function loadStockData() {
  const saved = localStorage.getItem('notaku_stock');
  if (saved) {
    try {
      stockData = JSON.parse(saved);
      updateStockDisplay();
    } catch (e) {
      stockData = [];
    }
  } else {
    // Data contoh
    stockData = [
      { name: 'Batik Tulis Semarang', stock: 15, minStock: 5 },
      { name: 'Kain Lurik Premium', stock: 8, minStock: 5 },
      { name: 'Tas Anyaman Rotan', stock: 3, minStock: 5 },
      { name: 'Kerajinan Kayu Ukir', stock: 12, minStock: 5 }
    ];
    saveStockData();
  }
  updateStockDisplay();
}

function saveStockData() {
  localStorage.setItem('notaku_stock', JSON.stringify(stockData));
  updateStockDisplay();
}

function updateStockDisplay() {
  const tbody = document.getElementById('stockTableBody');
  const totalProductsEl = document.getElementById('totalProducts');
  const lowStockCountEl = document.getElementById('lowStockCount');
  const safeStockCountEl = document.getElementById('safeStockCount');
  
  if (!tbody) return;
  
  if (stockData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--muted);">Belum ada data stok. Klik "Tambah Stok" untuk mulai.</td></tr>';
    if (totalProductsEl) totalProductsEl.textContent = '0';
    if (lowStockCountEl) lowStockCountEl.textContent = '0';
    if (safeStockCountEl) safeStockCountEl.textContent = '0';
    return;
  }
  
  let lowStock = 0;
  let safeStock = 0;
  
  tbody.innerHTML = stockData.map((item, index) => {
    const isLow = item.stock <= item.minStock;
    if (isLow) lowStock++;
    else safeStock++;
    
    const status = isLow 
      ? '<span style="background: #c0431a; color: white; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.7rem;">⚠️ Stok Menipis</span>'
      : '<span style="background: #2a7a4b; color: white; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.7rem;">✅ Aman</span>';
    
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 0.8rem;">${escapeHtml(item.name)}</td>
        <td style="padding: 0.8rem; text-align: center; font-weight: 600; ${isLow ? 'color: #c0431a;' : ''}">${item.stock}</td>
        <td style="padding: 0.8rem; text-align: center;">${item.minStock}</td>
        <td style="padding: 0.8rem; text-align: center;">${status}</td>
        <td style="padding: 0.8rem; text-align: center;">
          <button onclick="editStock(${index})" style="background: none; border: none; color: var(--gold); cursor: pointer; margin-right: 0.5rem;">✏️ Edit</button>
          <button onclick="deleteStock(${index})" style="background: none; border: none; color: var(--rust); cursor: pointer;">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
  
  if (totalProductsEl) totalProductsEl.textContent = stockData.length;
  if (lowStockCountEl) lowStockCountEl.textContent = lowStock;
  if (safeStockCountEl) safeStockCountEl.textContent = safeStock;
}

function showAddStockModal() {
  // Isi dropdown dengan produk dari saved products
  const select = document.getElementById('stockProductSelect');
  if (select) {
    const savedProducts = JSON.parse(localStorage.getItem('notaku_products') || '[]');
    select.innerHTML = '<option value="">Pilih produk dari daftar favorit...</option>';
    savedProducts.forEach(product => {
      select.innerHTML += `<option value="${escapeHtml(product.name)}|${product.price}">${escapeHtml(product.name)}</option>`;
    });
  }
  
  document.getElementById('stockProductName').value = '';
  document.getElementById('stockQuantity').value = '0';
  document.getElementById('stockMin').value = '5';
  document.getElementById('stockModalTitle').textContent = '📦 Tambah Stok Produk';
  document.getElementById('stockModal').style.display = 'block';
}

function closeStockModal() {
  document.getElementById('stockModal').style.display = 'none';
}

function editStock(index) {
  const item = stockData[index];
  document.getElementById('stockProductName').value = item.name;
  document.getElementById('stockQuantity').value = item.stock;
  document.getElementById('stockMin').value = item.minStock;
  document.getElementById('stockModalTitle').textContent = '✏️ Edit Stok Produk';
  document.getElementById('stockModal').dataset.editIndex = index;
  document.getElementById('stockModal').style.display = 'block';
}

function deleteStock(index) {
  if (confirm(`Hapus stok untuk "${stockData[index].name}"?`)) {
    stockData.splice(index, 1);
    saveStockData();
    showToast(`✅ Stok dihapus!`, 'success');
  }
}

function saveStock() {
  const nameInput = document.getElementById('stockProductName').value.trim();
  const select = document.getElementById('stockProductSelect');
  const quantity = parseInt(document.getElementById('stockQuantity').value) || 0;
  const minStock = parseInt(document.getElementById('stockMin').value) || 5;
  const editIndex = document.getElementById('stockModal').dataset.editIndex;
  
  let productName = nameInput;
  
  // Jika pilih dari dropdown
  if (select && select.value && !nameInput) {
    const selectedValue = select.value;
    productName = selectedValue.split('|')[0];
  }
  
  if (!productName) {
    showToast('⚠️ Masukkan nama produk!', 'warn');
    return;
  }
  
  if (editIndex !== undefined) {
    // Edit existing
    stockData[editIndex] = { name: productName, stock: quantity, minStock: minStock };
    showToast(`✅ Stok "${productName}" diperbarui!`, 'success');
    delete document.getElementById('stockModal').dataset.editIndex;
  } else {
    // Cek duplikat
    const existing = stockData.find(s => s.name.toLowerCase() === productName.toLowerCase());
    if (existing) {
      showToast('⚠️ Produk sudah ada! Gunakan edit untuk mengubah.', 'warn');
      return;
    }
    stockData.push({ name: productName, stock: quantity, minStock: minStock });
    showToast(`✅ Stok "${productName}" ditambahkan!`, 'success');
  }
  
  saveStockData();
  closeStockModal();
  
  // Reset form
  document.getElementById('stockProductName').value = '';
  if (select) select.value = '';
}

function updateStockAfterSale(items) {
  // Kurangi stok setelah membuat nota
  let updated = false;
  
  items.forEach(item => {
    const stockItem = stockData.find(s => s.name.toLowerCase() === item.name.toLowerCase());
    if (stockItem) {
      const newStock = stockItem.stock - item.qty;
      stockItem.stock = Math.max(0, newStock);
      updated = true;
      
      if (newStock <= stockItem.minStock) {
        showToast(`⚠️ Stok "${item.name}" tersisa ${newStock} (min ${stockItem.minStock})!`, 'warn');
      }
    }
  });
  
  if (updated) {
    saveStockData();
  }
}

function exportStockData() {
  if (stockData.length === 0) {
    showToast('⚠️ Belum ada data stok untuk diexport.', 'warn');
    return;
  }
  
  let csv = 'Produk,Stok,Min Stok,Status\n';
  stockData.forEach(item => {
    const status = item.stock <= item.minStock ? 'Menipis' : 'Aman';
    csv += `"${item.name}",${item.stock},${item.minStock},${status}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notaku-stok-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('✅ Data stok berhasil diexport!', 'success');
}
// ============================================
//   FITUR LAPORAN LABA/RUGI (HPP)
// ============================================

let hppData = {}; // { "nama produk": harga_beli }

function loadHppData() {
  const saved = localStorage.getItem('notaku_hpp');
  if (saved) {
    try {
      hppData = JSON.parse(saved);
    } catch (e) {
      hppData = {};
    }
  } else {
    // Data contoh
    hppData = {
      'Batik Tulis Semarang': 120000,
      'Kain Lurik Premium': 55000,
      'Tas Anyaman Rotan': 70000,
      'Kerajinan Kayu Ukir': 150000
    };
    saveHppData();
  }
}

function saveHppData() {
  localStorage.setItem('notaku_hpp', JSON.stringify(hppData));
}

function showHppModal() {
  const products = JSON.parse(localStorage.getItem('notaku_products') || '[]');
  const allProductNames = [...new Set([
    ...products.map(p => p.name),
    ...Object.keys(hppData)
  ])];
  
  const container = document.getElementById('hppProductList');
  if (!container) return;
  
  container.innerHTML = `
    <div style="margin-bottom: 1rem; padding: 0.5rem; background: var(--gold-pale); border-radius: 8px;">
      <span style="font-size: 0.7rem;">💡 Tips: Harga beli = modal per produk. Kosongkan jika tidak tahu.</span>
    </div>
  `;
  
  allProductNames.forEach(name => {
    const currentHpp = hppData[name] || '';
    container.innerHTML += `
      <div class="input-wrap" style="margin-bottom: 0.8rem;">
        <label style="display: block; font-size: 0.7rem; color: var(--muted); margin-bottom: 0.2rem;">${escapeHtml(name)}</label>
        <input type="number" id="hpp_${name.replace(/[^a-zA-Z0-9]/g, '_')}" placeholder="Harga Beli (Rp)" value="${currentHpp}" step="1000" style="width: 100%;" />
      </div>
    `;
  });
  
  document.getElementById('hppModal').style.display = 'block';
}

function closeHppModal() {
  document.getElementById('hppModal').style.display = 'none';
}

function saveAllHpp() {
  const products = JSON.parse(localStorage.getItem('notaku_products') || '[]');
  const allProductNames = [...new Set([
    ...products.map(p => p.name),
    ...Object.keys(hppData)
  ])];
  
  allProductNames.forEach(name => {
    const inputId = `hpp_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const input = document.getElementById(inputId);
    if (input && input.value) {
      const hpp = parseInt(input.value);
      if (!isNaN(hpp) && hpp > 0) {
        hppData[name] = hpp;
      } else if (input.value === '') {
        // Hapus jika kosong
        delete hppData[name];
      }
    }
  });
  
  saveHppData();
  showToast('✅ Harga beli semua produk disimpan!', 'success');
  closeHppModal();
  updateProfitReport();
}

function calculateHppForTransaction(items) {
  let totalHpp = 0;
  items.forEach(item => {
    const hpp = hppData[item.name] || 0;
    totalHpp += hpp * item.qty;
  });
  return totalHpp;
}

function updateProfitReport() {
  const period = document.getElementById('reportPeriod')?.value || 'month';
  const now = new Date();
  let startDate;
  
  switch(period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all':
      startDate = new Date(2000, 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  // Filter transaksi berdasarkan periode
  const filteredTransactions = transactionHistory.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= startDate;
  });
  
  // Hitung total pendapatan
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  
  // Hitung HPP REAL dari data transaksi (jika ada items)
  let totalHpp = 0;
  let hasRealData = false;
  
  filteredTransactions.forEach(t => {
    if (t.items && t.items.length > 0) {
      hasRealData = true;
      t.items.forEach(item => {
        const hpp = hppData[item.name] || 0;
        totalHpp += hpp * item.qty;
      });
    }
  });
  
  // Jika tidak ada data real, fallback ke estimasi (40% margin)
  if (!hasRealData && totalRevenue > 0) {
    totalHpp = totalRevenue * 0.6; // asumsi margin 40%
  }
  
  const profit = totalRevenue - totalHpp;
  const margin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0;
  
  // Update tampilan
  const revenueEl = document.getElementById('reportRevenue');
  const hppEl = document.getElementById('reportHpp');
  const profitEl = document.getElementById('reportProfit');
  const marginEl = document.getElementById('profitMargin');
  
  if (revenueEl) revenueEl.textContent = formatRupiah(totalRevenue);
  if (hppEl) hppEl.textContent = formatRupiah(totalHpp);
  if (profitEl) profitEl.textContent = formatRupiah(profit);
  if (marginEl) marginEl.textContent = margin.toFixed(1) + '%';
  
  // Update tabel
  updateProfitTable(filteredTransactions);
}

function updateProfitTable(transactions) {
  const tbody = document.getElementById('profitTableBody');
  if (!tbody) return;
  
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--muted);">Belum ada transaksi di periode ini</td></tr>';
    return;
  }
  
  tbody.innerHTML = transactions.slice().reverse().map(t => {
    // Hitung HPP REAL untuk transaksi ini
    let realHpp = 0;
    if (t.items && t.items.length > 0) {
      t.items.forEach(item => {
        const hpp = hppData[item.name] || 0;
        realHpp += hpp * item.qty;
      });
    }
    
    // Jika tidak ada data real, estimasi dari total (asumsi margin 40%)
    if (realHpp === 0 && t.total > 0) {
      realHpp = t.total * 0.6;
    }
    
    const profit = t.total - realHpp;
    const margin = t.total > 0 ? (profit / t.total * 100) : 0;
    const date = new Date(t.date).toLocaleDateString('id-ID');
    const invoiceNumber = t.invoiceNumber || '-';
    
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 0.8rem;">${date}</td>
        <td style="padding: 0.8rem;">${invoiceNumber}</td>
        <td style="padding: 0.8rem; text-align: center;">${formatRupiah(t.total)}</td>
        <td style="padding: 0.8rem; text-align: center; color: #c0431a;">${formatRupiah(realHpp)}</td>
        <td style="padding: 0.8rem; text-align: center; color: #2a7a4b;">${formatRupiah(profit)}</td>
        <td style="padding: 0.8rem; text-align: center;">${margin.toFixed(1)}%</td>
       </tr>
    `;
  }).join('');
}

function exportProfitReport() {
  const period = document.getElementById('reportPeriod')?.value || 'month';
  const periodText = {
    'day': 'Hari Ini',
    'week': 'Minggu Ini',
    'month': 'Bulan Ini',
    'all': 'Semua Waktu'
  }[period];
  
  const revenue = document.getElementById('reportRevenue')?.textContent || 'Rp 0';
  const hpp = document.getElementById('reportHpp')?.textContent || 'Rp 0';
  const profit = document.getElementById('reportProfit')?.textContent || 'Rp 0';
  const margin = document.getElementById('profitMargin')?.textContent || '0%';
  
  let csv = `Laporan Laba/Rugi - ${periodText}\n`;
  csv += `"${new Date().toLocaleDateString('id-ID')}"\n\n`;
  csv += `Total Pendapatan,${revenue}\n`;
  csv += `Total HPP (Modal),${hpp}\n`;
  csv += `LABA BERSIH,${profit}\n`;
  csv += `Margin Keuntungan,${margin}\n\n`;
  csv += `Detail Transaksi\n`;
  csv += `Tanggal,Total (Rp)\n`;
  
  transactionHistory.forEach(t => {
    const date = new Date(t.date).toLocaleDateString('id-ID');
    csv += `${date},${t.total}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notaku-laba-rugi-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('✅ Laporan laba/rugi berhasil diexport!', 'success');
}
// ============================================
//   FITUR EMAIL NOTA
// ============================================

function showEmailModal() {
  const invoice = document.getElementById('invoicePreview');
  if (!invoice || invoice.style.display === 'none') {
    showToast('⚠️ Generate nota terlebih dahulu!', 'warn');
    return;
  }
  
  // Isi email subject dengan nomor nota
  const invoiceNumber = document.getElementById('inv-number')?.textContent || '';
  const storeName = document.getElementById('inv-storeName')?.textContent || 'Toko Kami';
  const buyerName = document.getElementById('inv-buyerName')?.textContent || 'Pelanggan';
  
  document.getElementById('emailSubject').value = `Nota Pembelian ${invoiceNumber} dari ${storeName}`;
  document.getElementById('emailMessage').value = `Yth. ${buyerName},\n\nTerima kasih telah berbelanja di ${storeName}. Berikut nota pembelian Anda terlampir.\n\nSalam hangat,\n${storeName}`;
  document.getElementById('emailAddress').value = '';
  
  document.getElementById('emailModal').style.display = 'block';
}

function closeEmailModal() {
  document.getElementById('emailModal').style.display = 'none';
}

async function sendEmailWithInvoice() {
  const invoice = document.getElementById('invoicePreview');
  const email = document.getElementById('emailAddress')?.value.trim();
  const subject = document.getElementById('emailSubject')?.value || 'Nota Pembelian';
  const message = document.getElementById('emailMessage')?.value || '';
  
  if (!email) {
    showToast('⚠️ Masukkan alamat email pelanggan!', 'warn');
    return;
  }
  
  if (!email.includes('@') || !email.includes('.')) {
    showToast('⚠️ Masukkan email yang valid!', 'warn');
    return;
  }
  
  showToast('⏳ Menyiapkan email...', 'info');
  
  try {
    // Capture nota jadi gambar
    const originalWidth = invoice.style.width;
    const originalMaxWidth = invoice.style.maxWidth;
    const originalMargin = invoice.style.margin;
    
    invoice.style.width = '600px';
    invoice.style.maxWidth = '600px';
    invoice.style.margin = '0';
    
    await new Promise(r => setTimeout(r, 200));
    
    const canvas = await html2canvas(invoice, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 600
    });
    
    invoice.style.width = originalWidth;
    invoice.style.maxWidth = originalMaxWidth;
    invoice.style.margin = originalMargin;
    
    // Konversi ke base64
    const imgData = canvas.toDataURL('image/png');
    
    // Data untuk dikirim
    const invoiceNumber = document.getElementById('inv-number')?.textContent || '';
    const storeName = document.getElementById('inv-storeName')?.textContent || 'Toko Kami';
    const total = document.getElementById('inv-total')?.textContent || 'Rp 0';
    
    // Format pesan email
    const emailBody = `${message}\n\n---\n📋 Detail Nota:\nNomor: ${invoiceNumber}\nTotal: ${total}\n\nNota terlampir dalam bentuk gambar.\n\n---\nDibuat dengan NotaKu.id - Generator Nota Gratis untuk UMKM Indonesia`;
    
    // Karena tidak ada server backend, kita gunakan mailto:
    // Ini akan membuka aplikasi email default pengguna
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Buka mailto link
    window.location.href = mailtoLink;
    
    // Download gambar nota sebagai backup
    const link = document.createElement('a');
    link.download = `nota-${invoiceNumber.replace(/\//g, '-')}.png`;
    link.href = imgData;
    link.click();
    
    showToast('✅ Email client terbuka! Lampirkan gambar nota yang sudah didownload.', 'success');
    
    // Catat event ke Google Analytics
    if (typeof gtag === 'function') {
      gtag('event', 'send_email', {
        event_category: 'engagement',
        event_label: storeName
      });
    }
    
    closeEmailModal();
    
  } catch (err) {
    console.error('Email Error:', err);
    showToast('❌ Gagal menyiapkan email. Coba download PDF lalu kirim manual.', 'error');
  }
}
// ============================================
//   REGISTER SERVICE WORKER (PWA)
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// ============================================
//   DASHBOARD VISUAL PREMIUM
// ============================================

let productsPieChart = null;
let salesBarChart = null;

function updateDashboard() {
  const period = document.getElementById('dashboardPeriod')?.value || 'month';
  const now = new Date();
  let startDate;
  
  switch(period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
      startDate = new Date(2000, 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  // Filter transaksi berdasarkan periode
  const filteredTransactions = transactionHistory.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= startDate;
  });
  
  // Hitung total pendapatan dan laba
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  
  // Hitung total laba (dari HPP)
  let totalProfit = 0;
  filteredTransactions.forEach(t => {
    if (t.items && t.items.length > 0) {
      t.items.forEach(item => {
        const hpp = hppData[item.name] || 0;
        totalProfit += (item.price - hpp) * item.qty;
      });
    } else {
      totalProfit += t.total * 0.4; // estimasi
    }
  });
  
  // Update KPI
  const revenueEl = document.getElementById('dashboardRevenue');
  const profitEl = document.getElementById('dashboardProfit');
  const transEl = document.getElementById('dashboardTransactions');
  
  if (revenueEl) revenueEl.textContent = formatRupiah(totalRevenue);
  if (profitEl) profitEl.textContent = formatRupiah(totalProfit);
  if (transEl) transEl.textContent = filteredTransactions.length;
  
  // Update grafik
  updateProductsPieChart(filteredTransactions);
  updateSalesBarChart(filteredTransactions);
  updateTopProductsList(filteredTransactions);
}

function updateProductsPieChart(transactions) {
  const canvas = document.getElementById('productsPieChart');
  if (!canvas) return;
  
  // Kumpulkan data penjualan per produk
  const productSales = {};
  
  transactions.forEach(t => {
    if (t.items && t.items.length > 0) {
      t.items.forEach(item => {
        const name = item.name;
        const revenue = item.subtotal || (item.price * item.qty);
        productSales[name] = (productSales[name] || 0) + revenue;
      });
    }
  });
  
  const labels = Object.keys(productSales).slice(0, 5);
  const data = labels.map(l => productSales[l]);
  
  if (productsPieChart) productsPieChart.destroy();
  
  productsPieChart = new Chart(canvas.getContext('2d'), {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#c9952a', '#2a7a4b', '#c0431a', '#6b3fa0', '#00d4ff'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 10 } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatRupiah(ctx.raw)}` } }
      }
    }
  });
}

function updateSalesBarChart(transactions) {
  const canvas = document.getElementById('salesBarChart');
  if (!canvas) return;
  
  // Kelompokkan berdasarkan tanggal
  const dailySales = {};
  
  transactions.forEach(t => {
    const date = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    dailySales[date] = (dailySales[date] || 0) + t.total;
  });
  
  // Ambil 7 hari terakhir atau semua
  let labels = Object.keys(dailySales);
  let data = labels.map(l => dailySales[l]);
  
  if (labels.length > 7) {
    labels = labels.slice(-7);
    data = data.slice(-7);
  }
  
  if (salesBarChart) salesBarChart.destroy();
  
  salesBarChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Penjualan (Rp)',
        data: data,
        backgroundColor: '#c9952a',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => 'Rp ' + (v/1000).toFixed(0) + 'k' } }
      }
    }
  });
}

function updateTopProductsList(transactions) {
  const container = document.getElementById('topProductsList');
  if (!container) return;
  
  // Kumpulkan data produk
  const productQty = {};
  const productRevenue = {};
  
  transactions.forEach(t => {
    if (t.items && t.items.length > 0) {
      t.items.forEach(item => {
        const name = item.name;
        const qty = item.qty;
        const revenue = item.subtotal || (item.price * qty);
        productQty[name] = (productQty[name] || 0) + qty;
        productRevenue[name] = (productRevenue[name] || 0) + revenue;
      });
    }
  });
  
  const sorted = Object.entries(productRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  if (sorted.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--muted);">Belum ada data penjualan</p>';
    return;
  }
  
  container.innerHTML = sorted.map(([name, revenue], index) => {
    const qty = productQty[name] || 0;
    return `
      <div style="display: flex; align-items: center; gap: 0.8rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
        <div style="width: 30px; height: 30px; background: #c9952a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${index + 1}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600;">${escapeHtml(name)}</div>
          <div style="font-size: 0.7rem; color: var(--muted);">${qty} terjual</div>
        </div>
        <div style="font-weight: 700; color: #c9952a;">${formatRupiah(revenue)}</div>
      </div>
    `;
  }).join('');
}

function exportDashboard() {
  // Fitur gratis untuk semua
  html2canvas(document.querySelector('.stats-section .glass-panel')).then(canvas => {
    const link = document.createElement('a');
    link.download = `dashboard-notaku-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL();
    link.click();
    showToast('✅ Dashboard berhasil di-download sebagai gambar!', 'success');
  }).catch(() => {
    showToast('📸 Ambil screenshot manual dengan Print Screen', 'info');
  });
}
