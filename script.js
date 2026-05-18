// ============================================
//   NOTAKU — MAIN SCRIPT
//   Supports 8 premium templates
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
    if (name) invoiceData.items.push({ name, qty, price });
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
        addItem(item.name, parseFloat(item.qty), parseFloat(item.price));
      });
    }
  } catch(e) { console.warn("Gagal memuat nota terakhir:", e); }
}

// ── LOAD DATA ────────────────────────────────
function loadData() {
  // Produk tersimpan
  const saved = localStorage.getItem('notaku_products');
  if (saved) {
    try {
      displaySavedProducts(JSON.parse(saved));
    } catch (e) {
      localStorage.removeItem('notaku_products');
    }
  }

  // Statistik
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

    // Reset ke classic kalau sedang pakai template premium
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
    // Scroll ke template selector
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
    showToast('⚠️ Belum ada数据 transaksi untuk diexport.', 'warn');
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

// ── INIT ─────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Set tanggal & nomor nota otomatis
  const today = new Date().toISOString().split('T')[0];
  const dateEl = document.getElementById('invoiceDate');
  if (dateEl) dateEl.value = today;

  const num   = String(Math.floor(Math.random() * 9000) + 1000);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const year  = new Date().getFullYear();
  const numEl = document.getElementById('invoiceNumber');
  if (numEl) numEl.value = `INV/${year}/${month}/${num}`;

  // Tambahkan 2 baris produk default
  addItem();
  addItem();

  // Load data tersimpan
  loadData();
  loadLastInvoice();

  // Cek status premium
  checkPremiumStatus();

  // Template selector — event delegation
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = btn.dataset.template;

      // Cek apakah template premium & user tidak premium
      if (window.PremiumAPI && window.PremiumAPI.isTemplatePremium(tpl)) {
        if (!window.PremiumAPI.isPremium() || window.PremiumAPI.isExpired()) {
          showToast('👑 Template ini eksklusif untuk member Premium. Upgrade sekarang!', 'warn');
          // Scroll ke section premium
          const premSec = document.getElementById('premium');
          if (premSec) premSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      switchTemplate(tpl);
    });
  });

  // Dark Mode Toggle
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
  }
});

function addItem(name = '', qty = 1, price = 0) {
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
  <input type="text"   placeholder="Harga (Rp)"         class="item-price" inputmode="numeric" pattern="[0-9]*" value="${price}" enterkeyhint="done" />
  <button class="remove-btn" onclick="removeItem(${id})" title="Hapus">✕</button>
`;
  list.appendChild(row);
}

function removeItem(id) {
  const row = document.getElementById(`item-${id}`);
  if (row) row.remove();
}

function updateSubtotal(id) {
  // Dipanggil saat input berubah — kalkulasi terjadi di generateInvoice
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

// ── HELPER ESCAPE HTML ───────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ── FORMAT HELPERS ────────────────────────────
function formatRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ── AUTO INCREMENT INVOICE NUMBER ─────────────
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
    const name  = row.querySelector('.item-name')?.value.trim();
    const qty   = parseFloat(row.querySelector('.item-qty')?.value)   || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    if (name || price > 0) {
      items.push({ name: name || '-', qty, price, subtotal: qty * price });
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

  // Google Analytics
  if (typeof gtag === 'function') {
    gtag('event', 'generate_invoice', {
      event_category: 'engagement',
      event_label: storeName,
      value: total
    });
  }

  // Simpan ke statistik
  saveTransaction(total);
  saveCurrentInvoice();

  // ── Isi preview ────────────────────────────
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
      tr.innerHTML = `
        <td>${escapeHtml(item.name)}</td>
        <td style="text-align:center">${item.qty}</td>
        <td>${formatRupiah(item.price)}</td>
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

  // ── Tampilkan preview ──────────────────────
  const placeholder = document.getElementById('previewPlaceholder');
  const preview     = document.getElementById('invoicePreview');
  const actions     = document.getElementById('previewActions');

  if (placeholder) placeholder.style.display = 'none';
  if (preview)     preview.style.display     = 'block';
  if (actions)     actions.style.display     = 'flex';

  // Terapkan template aktif
  if (preview) preview.className = `invoice-template template-${currentTemplate}`;

  // Auto increment nomor invoice
  incrementInvoiceNumber();

  // Scroll ke preview
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

  // Optional: tampilkan toast konfirmasi
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

// ── STYLE TAMBAHAN ───────────────────────────
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
