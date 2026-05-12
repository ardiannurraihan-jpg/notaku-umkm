// ============================================
//   NOTAKU — MAIN SCRIPT (FULL VERSION)
//   Supports: 11 Templates, AI, WA Share, Excel Export, Logo Upload, History
// ============================================

// ────────── KONFIGURASI ─────────────────────
let itemCount = 0;
let currentTemplate = 'classic';
let revenueChart = null;
let transactionHistory = [];
let invoiceHistory = []; // Riwayat semua nota
let userLogo = null; // Logo yang diupload user
const GEMINI_API_KEY = 'AIzaSyB4kY3ZXsINoRbMRBZmSihV_7YSjkG_x44';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ────────── SAVE & LOAD ────────────────────
function saveCurrentInvoice() {
  const invoiceData = {
    id: Date.now(),
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
    template: currentTemplate,
    items: [],
    createdAt: new Date().toISOString()
  };

  document.querySelectorAll('.item-row').forEach(row => {
    const name = row.querySelector('.item-name')?.value || '';
    const qty = row.querySelector('.item-qty')?.value || '1';
    const price = row.querySelector('.item-price')?.value || '0';
    if (name) invoiceData.items.push({ name, qty, price });
  });

  // Simpan ke riwayat
  invoiceHistory.unshift(invoiceData);
  if (invoiceHistory.length > 50) invoiceHistory.pop();
  localStorage.setItem('notaku_invoice_history', JSON.stringify(invoiceHistory));
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
    if (data.template) switchTemplate(data.template);

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

function loadInvoiceHistory() {
  const saved = localStorage.getItem('notaku_invoice_history');
  if (saved) {
    try {
      invoiceHistory = JSON.parse(saved);
      displayInvoiceHistory();
    } catch(e) {}
  }
}

function displayInvoiceHistory() {
  const container = document.getElementById('invoiceHistoryList');
  if (!container) return;
  
  if (invoiceHistory.length === 0) {
    container.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--muted)">Belum ada riwayat nota</div>';
    return;
  }
  
  container.innerHTML = invoiceHistory.slice(0, 20).map(inv => `
    <div class="history-item" onclick="loadInvoiceById(${inv.id})">
      <div class="history-item-header">
        <span class="history-number">${inv.invoiceNumber}</span>
        <span class="history-date">${new Date(inv.createdAt).toLocaleDateString('id-ID')}</span>
      </div>
      <div class="history-store">${inv.storeName || 'Nama Toko'}</div>
      <div class="history-buyer">${inv.buyerName || 'Pelanggan'}</div>
      <div class="history-actions">
        <button onclick="event.stopPropagation(); duplicateInvoice(${inv.id})">📋 Duplikat</button>
        <button onclick="event.stopPropagation(); deleteInvoice(${inv.id})">🗑️ Hapus</button>
      </div>
    </div>
  `).join('');
}

function loadInvoiceById(id) {
  const invoice = invoiceHistory.find(inv => inv.id === id);
  if (!invoice) return;
  
  document.getElementById('storeName').value = invoice.storeName;
  document.getElementById('storeAddress').value = invoice.storeAddress;
  document.getElementById('storePhone').value = invoice.storePhone;
  document.getElementById('buyerName').value = invoice.buyerName;
  document.getElementById('buyerPhone').value = invoice.buyerPhone;
  document.getElementById('invoiceNumber').value = invoice.invoiceNumber;
  document.getElementById('invoiceDate').value = invoice.invoiceDate;
  document.getElementById('discount').value = invoice.discount;
  document.getElementById('tax').value = invoice.tax;
  document.getElementById('notes').value = invoice.notes;
  
  const itemsContainer = document.getElementById('itemsList');
  if (itemsContainer) {
    itemsContainer.innerHTML = '';
    itemCount = 0;
    invoice.items.forEach(item => {
      addItem(item.name, parseFloat(item.qty), parseFloat(item.price));
    });
  }
  
  switchTemplate(invoice.template);
  showToast('Nota berhasil dimuat!', 'success');
  document.getElementById('premium')?.scrollIntoView({ behavior: 'smooth' });
}

function duplicateInvoice(id) {
  const invoice = invoiceHistory.find(inv => inv.id === id);
  if (!invoice) return;
  
  loadInvoiceById(id);
  setTimeout(() => generateInvoice(), 100);
  showToast('Nota diduplikasi!', 'success');
}

function deleteInvoice(id) {
  if (confirm('Hapus nota ini dari riwayat?')) {
    invoiceHistory = invoiceHistory.filter(inv => inv.id !== id);
    localStorage.setItem('notaku_invoice_history', JSON.stringify(invoiceHistory));
    displayInvoiceHistory();
    showToast('Nota dihapus', 'warn');
  }
}

// ────────── UPLOAD LOGO ────────────────────
function uploadLogo() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        userLogo = event.target.result;
        localStorage.setItem('notaku_user_logo', userLogo);
        showToast('Logo berhasil diupload!', 'success');
        if (document.getElementById('invoicePreview').style.display !== 'none') generateInvoice();
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function removeLogo() {
  userLogo = null;
  localStorage.removeItem('notaku_user_logo');
  showToast('Logo dihapus', 'warn');
  if (document.getElementById('invoicePreview').style.display !== 'none') generateInvoice();
}

function loadUserLogo() {
  const saved = localStorage.getItem('notaku_user_logo');
  if (saved) userLogo = saved;
}

// ────────── KIRIM WA ───────────────────────
async function shareToWhatsApp() {
  const invoice = document.getElementById('invoicePreview');
  if (!invoice || invoice.style.display === 'none') {
    showToast('Generate nota dulu!', 'warn');
    return;
  }
  
  showToast('Menyiapkan gambar...', 'info');
  
  const canvas = await html2canvas(invoice, {
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false
  });
  
  const imgData = canvas.toDataURL('image/jpeg', 0.9);
  
  const storeName = document.getElementById('storeName')?.value || 'NotaKu';
  const buyerName = document.getElementById('buyerName')?.value || 'Pelanggan';
  const total = document.getElementById('inv-total')?.textContent || 'Rp 0';
  const invoiceNum = document.getElementById('invoiceNumber')?.value || '';
  
  const text = `Halo! Berikut nota dari ${storeName} untuk ${buyerName}\nNo: ${invoiceNum}\nTotal: ${total}\n\nDibuat dengan NotaKu - Generator Nota Gratis untuk UMKM Indonesia`;
  
  const link = document.createElement('a');
  link.href = imgData;
  link.download = `nota-${invoiceNum.replace(/\//g, '-')}.jpg`;
  link.click();
  
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n\n*Nota terlampir sebagai gambar yang sudah didownload*')}`;
  window.open(waUrl, '_blank');
  
  showToast('Gambar nota terdownload! Buka WA untuk share', 'success');
}

// ────────── EXPORT EXCEL ───────────────────
function exportToExcel() {
  if (transactionHistory.length === 0) {
    showToast('Belum ada data transaksi!', 'warn');
    return;
  }
  
  let html = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>NotaKu - Laporan Penjualan</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #c9952a; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #c9952a; color: white; }
        .total { font-weight: bold; background-color: #f2ead8; }
        .chart-container { margin-top: 30px; }
      </style>
    </head>
    <body>
      <h1>📊 NotaKu - Laporan Penjualan</h1>
      <p>Periode: ${new Date().toLocaleDateString('id-ID')}</p>
      <p>Total Transaksi: ${transactionHistory.length}</p>
      <p>Total Pendapatan: ${formatRupiah(transactionHistory.reduce((s, t) => s + t.total, 0))}</p>
      <hr/>
      <table>
        <thead><tr><th>Tanggal</th><th>Total (Rp)</th></tr></thead>
        <tbody>
          ${transactionHistory.map(t => `<tr><td>${new Date(t.date).toLocaleDateString('id-ID')}</td><td>${Number(t.total).toLocaleString('id-ID')}</td></tr>`).join('')}
          <tr class="total"><td><strong>TOTAL</strong></td><td><strong>${transactionHistory.reduce((s, t) => s + t.total, 0).toLocaleString('id-ID')}</strong></td></tr>
        </tbody>
      </table>
      <div class="chart-container">
        <h3>📈 Grafik Tren Penjualan</h3>
        <img src="https://quickchart.io/chart?c={type:'line',data:{labels:[${transactionHistory.slice(-7).map(t => `'${new Date(t.date).toLocaleDateString('id-ID')}'`).join(',')}],datasets:[{label:'Pendapatan',data:[${transactionHistory.slice(-7).map(t => t.total).join(',')}],borderColor:'#c9952a',fill:false}]}}" style="max-width:100%"/>
      </div>
      <p style="margin-top:30px;color:#999;">Dibuat dengan NotaKu - Generator Nota Gratis untuk UMKM Indonesia</p>
    </body>
    </html>
  `;
  
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notaku-laporan-${new Date().toISOString().split('T')[0]}.xls`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Laporan Excel berhasil diunduh!', 'success');
}

// ────────── AI SMART INVOICE ───────────────
async function aiSmartSuggest() {
  const items = [];
  document.querySelectorAll('.item-row').forEach(row => {
    const name = row.querySelector('.item-name')?.value.trim();
    const qty = row.querySelector('.item-qty')?.value || 1;
    if (name) items.push({ name, qty });
  });
  
  if (items.length === 0) {
    showToast('Tambahkan produk dulu!', 'warn');
    return;
  }
  
  showToast('🤖 AI sedang berpikir...', 'info');
  
  const prompt = `Anda adalah asisten bisnis untuk UMKM Indonesia. Berdasarkan daftar produk ini: ${items.map(i => `${i.name} (${i.qty}x)`).join(', ')}, berikan 3 saran singkat:
1. Saran harga jual yang fair untuk produk tersebut (dalam Rupiah)
2. Saran diskon yang menarik (dalam persen)
3. Saran deskripsi nota yang profesional (maks 50 kata)
Format jawaban: gunakan format JSON dengan key: hargaSaran, diskonSaran, deskripsiSaran`;
  
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const data = await response.json();
    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    let suggestion;
    try {
      suggestion = JSON.parse(aiText);
    } catch(e) {
      suggestion = { hargaSaran: 'Rp 25.000 - 50.000', diskonSaran: '5-10%', deskripsiSaran: 'Terima kasih telah berbelanja! Semoga pelayanannya memuaskan.' };
    }
    
    document.getElementById('aiSuggestionResult').innerHTML = `
      <div style="background:rgba(201,149,42,0.1); padding:1rem; border-radius:8px; margin-top:0.5rem;">
        <div style="color:var(--gold); margin-bottom:0.5rem;">🤖 AI Suggestion</div>
        <div><strong>💰 Harga:</strong> ${suggestion.hargaSaran || 'Rp 25.000 - 50.000'}</div>
        <div><strong>🎯 Diskon:</strong> ${suggestion.diskonSaran || '5-10%'}</div>
        <div><strong>📝 Deskripsi:</strong> ${suggestion.deskripsiSaran || 'Terima kasih telah berbelanja!'}</div>
        <button onclick="applyAIDiscount('${suggestion.diskonSaran || '5'}')" style="margin-top:0.5rem;background:var(--gold);border:none;padding:0.2rem 0.8rem;border-radius:4px;cursor:pointer;">✨ Terapkan Diskon</button>
      </div>
    `;
    showToast('AI saran siap!', 'success');
  } catch(e) {
    console.error('AI Error:', e);
    showToast('AI sedang sibuk, coba lagi', 'error');
  }
}

function applyAIDiscount(discountStr) {
  const disc = parseInt(discountStr) || 5;
  document.getElementById('discount').value = disc;
  showToast(`✅ Diskon ${disc}% diterapkan!`, 'success');
}

// ────────── LOAD DATA ─────────────────────
function loadData() {
  const saved = localStorage.getItem('notaku_products');
  if (saved) {
    try {
      displaySavedProducts(JSON.parse(saved));
    } catch (e) { localStorage.removeItem('notaku_products'); }
  }
  
  const stats = localStorage.getItem('notaku_stats');
  if (stats) {
    try {
      transactionHistory = JSON.parse(stats);
      updateStats();
    } catch (e) { localStorage.removeItem('notaku_stats'); }
  }
  
  loadUserLogo();
  loadInvoiceHistory();
}

// ────────── PREMIUM TEMPLATES ──────────────
function showPremiumTemplates() {
  const premiumGroup = document.getElementById('premiumTemplateGroup');
  const premiumNote = document.getElementById('premiumTemplateNote');
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
  const aiContainer = document.getElementById('aiSmartContainer');
  const logoContainer = document.getElementById('logoUploadContainer');
  const historyContainer = document.getElementById('invoiceHistoryContainer');
  
  if (isPremium && !isExpired) {
    if (watermark) watermark.style.display = 'none';
    if (aiContainer) aiContainer.style.display = 'block';
    if (logoContainer) logoContainer.style.display = 'block';
    if (historyContainer) historyContainer.style.display = 'block';
    if (statusDiv) {
      const days = window.PremiumAPI.getRemainingDays();
      const until = window.PremiumAPI.getUntilFormatted();
      const plan = window.PremiumAPI.getPlanName();
      statusDiv.innerHTML = `👑 Premium <strong>${plan}</strong> aktif hingga ${until} (${days} hari lagi)<br>✨ 11 template eksklusif + AI Smart + Logo Custom + Riwayat Nota!`;
      statusDiv.style.color = '#c9952a';
    }
  } else {
    if (watermark) watermark.style.display = 'block';
    if (aiContainer) aiContainer.style.display = 'none';
    if (logoContainer) logoContainer.style.display = 'none';
    if (historyContainer) historyContainer.style.display = 'none';
    if (statusDiv) {
      if (isPremium && isExpired) {
        statusDiv.innerHTML = '⚠️ Premium sudah kadaluarsa. Perpanjang untuk akses fitur eksklusif!';
        statusDiv.style.color = '#c0431a';
      } else {
        statusDiv.innerHTML = '🔒 Upgrade ke Premium untuk: ✓ Hapus watermark · ✓ 11 template eksklusif · ✓ AI Smart Invoice · ✓ Logo Custom · ✓ Riwayat Nota';
        statusDiv.style.color = 'rgba(250,248,243,0.4)';
      }
    }
  }
  showPremiumTemplates();
}

function activatePremium() {
  const input = document.getElementById('premiumKey');
  const key = input ? input.value.trim() : '';
  
  if (!key) {
    showToast('⚠️ Masukkan kode premium!', 'warn');
    return;
  }
  
  if (window.PremiumAPI && window.PremiumAPI.activate(key)) {
    showToast('✅ Premium aktif! 11 template + AI + Logo Custom + Riwayat siap!', 'success');
    if (input) input.value = '';
    checkPremiumStatus();
    setTimeout(() => {
      const el = document.querySelector('.template-selector');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 600);
  } else {
    showToast('❌ Kode tidak valid. Hubungi admin!', 'error');
  }
}

function switchTemplate(templateName) {
  currentTemplate = templateName;
  const preview = document.getElementById('invoicePreview');
  if (preview) preview.className = `invoice-template template-${currentTemplate}`;
  document.querySelectorAll('.template-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.template === templateName);
  });
}

// ────────── ADD ITEM ───────────────────────
function addItem(name = '', qty = 1, price = 0) {
  itemCount++;
  const id = itemCount;
  const list = document.getElementById('itemsList');
  if (!list) return;
  
  const row = document.createElement('div');
  row.className = 'item-row';
  row.id = `item-${id}`;
  row.innerHTML = `
    <input type="text" placeholder="Nama produk" class="item-name" value="${escapeHtml(name)}" oninput="updateSubtotal(${id})" />
    <input type="number" placeholder="Qty" class="item-qty" min="1" value="${qty}" oninput="updateSubtotal(${id})" />
    <input type="number" placeholder="Harga" class="item-price" min="0" value="${price}" oninput="updateSubtotal(${id})" />
    <button class="remove-btn" onclick="removeItem(${id})">✕</button>
  `;
  list.appendChild(row);
}

function removeItem(id) {
  const row = document.getElementById(`item-${id}`);
  if (row) row.remove();
}

function updateSubtotal(id) {}

// ────────── SAVED PRODUCTS ─────────────────
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

window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
};

function saveProduct() {
  const name = document.getElementById('saveProductName').value.trim();
  const price = parseFloat(document.getElementById('saveProductPrice').value);
  
  if (!name || isNaN(price) || price <= 0) {
    showToast('⚠️ Masukkan nama & harga valid!', 'warn');
    return;
  }
  
  const products = JSON.parse(localStorage.getItem('notaku_products') || '[]');
  if (products.find(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast('⚠️ Produk sudah tersimpan!', 'warn');
    return;
  }
  
  products.push({ name, price });
  saveProducts(products);
  displaySavedProducts(products);
  closeSaveProductModal();
  document.getElementById('saveProductName').value = '';
  document.getElementById('saveProductPrice').value = '';
  showToast(`✅ "${name}" disimpan!`, 'success');
}

function displaySavedProducts(products) {
  const container = document.getElementById('savedProducts');
  if (!container) return;
  container.innerHTML = '';
  
  if (products.length === 0) {
    container.innerHTML = '<span style="font-size:0.75rem;color:var(--muted)">Belum ada produk</span>';
    return;
  }
  
  products.forEach((product, index) => {
    const btn = document.createElement('div');
    btn.className = 'saved-product';
    btn.innerHTML = `<span class="sp-name">${escapeHtml(product.name)}</span><span class="sp-price">${formatRupiah(product.price)}</span><button class="sp-del" onclick="deleteProduct(event, ${index})">✕</button>`;
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
  showToast(`🗑️ "${name}" dihapus`, 'warn');
}

function addSavedProductToItems(name, price) {
  addItem(name, 1, price);
  showToast(`✅ "${name}" ditambahkan!`, 'success');
}

function saveProducts(products) {
  localStorage.setItem('notaku_products', JSON.stringify(products));
}

// ────────── TRANSACTIONS ───────────────────
function saveTransaction(total) {
  transactionHistory.push({ date: new Date().toISOString(), total: total });
  localStorage.setItem('notaku_stats', JSON.stringify(transactionHistory));
  updateStats();
}

function updateStats() {
  const total = transactionHistory.length;
  const revenue = transactionHistory.reduce((s, t) => s + t.total, 0);
  const avg = total > 0 ? revenue / total : 0;
  
  const el = (id) => document.getElementById(id);
  if (el('totalTransactions')) el('totalTransactions').textContent = total;
  if (el('totalRevenue')) el('totalRevenue').textContent = formatRupiah(revenue);
  if (el('avgTransaction')) el('avgTransaction').textContent = formatRupiah(avg);
  updateChart();
}

function updateChart() {
  const last7Days = [];
  const last7Revenue = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    last7Days.push(label);
    const rev = transactionHistory.filter(t => t.date.split('T')[0] === dateStr).reduce((s, t) => s + t.total, 0);
    last7Revenue.push(rev);
  }
  if (revenueChart) revenueChart.destroy();
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  revenueChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: last7Days, datasets: [{ label: 'Pendapatan (Rp)', data: last7Revenue, borderColor: '#c9952a', backgroundColor: 'rgba(201,149,42,0.08)', pointBackgroundColor: '#c9952a', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5, tension: 0.4, fill: true, borderWidth: 2.5 }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'Rp ' + Number(ctx.raw).toLocaleString('id-ID') } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: (v) => 'Rp ' + Number(v).toLocaleString('id-ID'), font: { family: "'Fira Code', monospace", size: 11 } } }, x: { grid: { display: false }, ticks: { font: { family: "'Fira Code', monospace", size: 11 } } } } }
  });
}

function resetStats() {
  if (confirm('Reset semua statistik?')) {
    transactionHistory = [];
    localStorage.removeItem('notaku_stats');
    updateStats();
    showToast('Statistik direset', 'warn');
  }
}

function exportStats() {
  if (transactionHistory.length === 0) {
    showToast('Belum ada data!', 'warn');
    return;
  }
  let csv = 'Tanggal,Total (Rp)\n';
  transactionHistory.forEach(t => {
    const date = new Date(t.date).toLocaleDateString('id-ID');
    csv += `${date},${t.total}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notaku-stats-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV terdownload!', 'success');
}

// ────────── GENERATE INVOICE ───────────────
function generateInvoice() {
  const rows = document.querySelectorAll('.item-row');
  const items = [];
  rows.forEach(row => {
    const name = row.querySelector('.item-name')?.value.trim();
    const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    if (name || price > 0) items.push({ name: name || '-', qty, price, subtotal: qty * price });
  });
  
  if (items.length === 0) {
    showToast('⚠️ Tambahkan produk!', 'warn');
    return;
  }
  
  const get = (id) => document.getElementById(id)?.value.trim() || '';
  const storeName = get('storeName') || 'Nama Toko';
  const storeAddress = get('storeAddress');
  const storePhone = get('storePhone');
  const buyerName = get('buyerName') || 'Pelanggan';
  const buyerPhone = get('buyerPhone');
  const invoiceNum = get('invoiceNumber');
  const invoiceDate = get('invoiceDate');
  const discount = parseFloat(document.getElementById('discount')?.value) || 0;
  const taxPct = parseFloat(document.getElementById('tax')?.value) || 0;
  const notes = get('notes');
  
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const taxAmt = Math.round(subtotal * taxPct / 100);
  const total = Math.max(0, subtotal - discount + taxAmt);
  
  if (typeof gtag === 'function') {
    gtag('event', 'generate_invoice', { event_category: 'engagement', event_label: storeName, value: total });
  }
  
  saveTransaction(total);
  saveCurrentInvoice();
  
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('inv-storeName', storeName);
  set('inv-storeAddress', storeAddress);
  set('inv-storePhone', storePhone ? `☎ ${storePhone}` : '');
  set('inv-number', invoiceNum);
  set('inv-date', formatDate(invoiceDate));
  set('inv-buyerName', buyerName);
  set('inv-buyerPhone', buyerPhone ? `☎ ${buyerPhone}` : '');
  set('inv-sigName', storeName);
  
  const tbody = document.getElementById('inv-items');
  if (tbody) {
    tbody.innerHTML = '';
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(item.name)}</td><td style="text-align:center">${item.qty}</td><td>${formatRupiah(item.price)}</td><td style="text-align:right;font-weight:600">${formatRupiah(item.subtotal)}</td>`;
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
  const preview = document.getElementById('invoicePreview');
  const actions = document.getElementById('previewActions');
  if (placeholder) placeholder.style.display = 'none';
  if (preview) preview.style.display = 'block';
  if (actions) actions.style.display = 'flex';
  if (preview) preview.className = `invoice-template template-${currentTemplate}`;
  
  incrementInvoiceNumber();
  if (preview) preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('✅ Nota berhasil dibuat!', 'success');
}

// ────────── PRINT & PDF ────────────────────
async function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const invoice = document.getElementById('invoicePreview');
  if (!invoice) return;
  
  const btn = event?.target?.closest('button');
  const originalHTML = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '⏳…'; btn.disabled = true; }
  
  const orig = { width: invoice.style.width, maxWidth: invoice.style.maxWidth, margin: invoice.style.margin };
  invoice.style.width = '600px';
  invoice.style.maxWidth = '600px';
  invoice.style.margin = '0';
  
  try {
    await new Promise(r => setTimeout(r, 250));
    const canvas = await html2canvas(invoice, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: 600 });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const margin = 6;
    const contentW = pdfW - margin * 2;
    const contentH = (canvas.height * contentW) / canvas.width;
    pdf.addImage(imgData, 'JPEG', margin, margin, contentW, contentH, undefined, 'FAST');
    const filename = `nota-${document.getElementById('invoiceNumber')?.value.replace(/\//g, '-') || 'notaku'}.pdf`;
    pdf.save(filename);
    showToast('✅ PDF siap!', 'success');
    if (typeof gtag === 'function') gtag('event', 'download_pdf', { event_category: 'engagement' });
  } catch (err) {
    console.error(err);
    showToast('❌ Gagal buat PDF', 'error');
  }
  invoice.style.width = orig.width;
  invoice.style.maxWidth = orig.maxWidth;
  invoice.style.margin = orig.margin;
  if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; }
}

function printInvoice() {
  const invoice = document.getElementById('invoicePreview');
  if (!invoice) return;
  const printWin = window.open('', '_blank');
  printWin.document.write(`<!DOCTYPE html><html><head><title>NotaKu</title><link rel="stylesheet" href="style.css"/><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Space+Grotesk:wght@300;400;500;600;700&family=Fira+Code:wght@300;400;500&display=swap" rel="stylesheet"/><style>body{padding:1rem;background:#fff;}@media print{body{padding:0;}.inv-watermark{display:none!important;}}</style></head><body>${invoice.outerHTML}<script>window.onload=()=>{window.print();window.close();};<\/script></body></html>`);
  printWin.document.close();
}

// ────────── PAYMENT ────────────────────────
function showPaymentInfo(paket, nominal) {
  const paymentDiv = document.getElementById('paymentInfo');
  const amountSpan = document.getElementById('paymentAmount');
  if (!paymentDiv || !amountSpan) return;
  amountSpan.textContent = `Rp ${nominal.toLocaleString('id-ID')}`;
  paymentDiv.style.display = 'block';
  paymentDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast(`💳 Transfer Rp ${nominal.toLocaleString('id-ID')} ke BRI`, 'success');
  if (typeof gtag === 'function') gtag('event', 'view_payment_info', { event_category: 'premium', event_label: paket, value: nominal });
}

function copyPaymentInfo() {
  const rekening = '359301009186508';
  navigator.clipboard?.writeText(rekening).then(() => showToast('✅ No. rekening dicopy!', 'success')).catch(() => showToast('✅ No. rekening dicopy!', 'success'));
  if (typeof gtag === 'function') gtag('event', 'copy_rekening', { event_category: 'premium', event_label: 'BRI' });
}

// ────────── HELPERS ────────────────────────
function showToast(message, type = 'info') {
  const existing = document.querySelector('.nk-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'nk-toast';
  toast.textContent = message;
  const colors = { success: '#2a7a4b', error: '#c0431a', warn: '#c9952a', info: '#1a1510' };
  Object.assign(toast.style, { position: 'fixed', bottom: '2rem', right: '2rem', background: colors[type] || colors.info, color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.85rem', fontWeight: '600', zIndex: '9999', boxShadow: '0 8px 30px rgba(0,0,0,0.25)', maxWidth: '360px', lineHeight: '1.5', transform: 'translateY(20px)', opacity: '0', transition: 'all 0.3s ease' });
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; });
  setTimeout(() => { toast.style.transform = 'translateY(20px)'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; });
}

function formatRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function incrementInvoiceNumber() {
  const invoiceField = document.getElementById('invoiceNumber');
  if (!invoiceField) return;
  let current = invoiceField.value;
  const match = current.match(/\/(\d+)$/);
  if (match) {
    const last = parseInt(match[1], 10);
    const next = (last + 1).toString().padStart(match[1].length, '0');
    invoiceField.value = current.replace(/\d+$/, next);
  } else {
    const random = Math.floor(Math.random() * 9000) + 1000;
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    invoiceField.value = `INV/${date.getFullYear()}/${month}/${random}`;
  }
}

// ────────── INIT ───────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  const dateEl = document.getElementById('invoiceDate');
  if (dateEl) dateEl.value = today;
  
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const year = new Date().getFullYear();
  const numEl = document.getElementById('invoiceNumber');
  if (numEl) numEl.value = `INV/${year}/${month}/${num}`;
  
  addItem();
  addItem();
  loadData();
  loadLastInvoice();
  checkPremiumStatus();
  displayInvoiceHistory();
  
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = btn.dataset.template;
      if (window.PremiumAPI && window.PremiumAPI.isTemplatePremium(tpl)) {
        if (!window.PremiumAPI.isPremium() || window.PremiumAPI.isExpired()) {
          showToast('👑 Template premium untuk member! Upgrade sekarang!', 'warn');
          document.getElementById('premium')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  }
});

// ────────── INJECT STYLES ──────────────────
(function injectDynamicStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .saved-product { position: relative; display: flex; flex-direction: column; gap: 0.1rem; padding: 0.4rem 1.8rem 0.4rem 0.7rem; background: var(--cream); border-radius: 8px; cursor: pointer; transition: all 0.15s; }
    .saved-product:hover { background: var(--gold-pale); transform: translateY(-1px); }
    .sp-name { font-size: 0.78rem; font-weight: 600; color: var(--ink); }
    .sp-price { font-family: monospace; font-size: 0.65rem; color: var(--muted); }
    .sp-del { position: absolute; top: 0.3rem; right: 0.3rem; background: none; border: none; color: var(--muted); font-size: 0.65rem; cursor: pointer; padding: 0.1rem 0.3rem; border-radius: 4px; }
    .sp-del:hover { background: rgba(192,67,26,0.1); color: var(--rust); }
    .history-item { background: var(--cream); border-radius: 8px; padding: 0.8rem; margin-bottom: 0.5rem; cursor: pointer; transition: all 0.15s; }
    .history-item:hover { background: var(--gold-pale); transform: translateY(-1px); }
    .history-item-header { display: flex; justify-content: space-between; margin-bottom: 0.3rem; }
    .history-number { font-weight: 700; font-family: monospace; color: var(--gold); }
    .history-date { font-size: 0.7rem; color: var(--muted); }
    .history-store { font-size: 0.8rem; font-weight: 500; }
    .history-buyer { font-size: 0.7rem; color: var(--muted); margin-top: 0.2rem; }
    .history-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .history-actions button { background: transparent; border: 1px solid var(--border); border-radius: 4px; padding: 0.2rem 0.5rem; font-size: 0.65rem; cursor: pointer; }
    .history-actions button:hover { background: var(--gold); color: var(--ink); }
    .ai-btn { background: linear-gradient(135deg, #6b3fa0, #c9952a); color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; margin-top: 0.5rem; }
    .ai-btn:hover { opacity: 0.9; transform: scale(1.02); }
    .logo-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .logo-actions button { background: var(--gold); border: none; padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.7rem; cursor: pointer; }
    .premium-feature-badge { background: linear-gradient(135deg, #c9952a, #e8b84b); color: var(--ink); padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.6rem; font-weight: bold; display: inline-block; margin-left: 0.5rem; }
  `;
  document.head.appendChild(style);
  // ============================================
//   TAMBAHAN FUNGSI UNTUK VOICE, TEMPLATE DEMO, AI QUICK
//   (Tambahkan ini di AKHIR file script.js)
// ============================================

// ────────── VOICE RECOGNITION ───────────────
let voiceRecognition = null;
let isVoiceRecording = false;

function initVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Speech recognition not supported');
    return null;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'id-ID';
  return recognition;
}

function toggleVoiceRecording() {
  if (isVoiceRecording) {
    stopVoiceRecording();
  } else {
    startVoiceRecording();
  }
}

function startVoiceRecording() {
  if (!voiceRecognition) {
    voiceRecognition = initVoiceRecognition();
    if (!voiceRecognition) {
      showToast('Browser tidak support voice recognition', 'error');
      return;
    }
    
    voiceRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const textarea = document.getElementById('voiceTextInput');
      if (textarea) textarea.value = transcript;
      stopVoiceRecording();
      showToast('✅ Suara terdeteksi! Klik "Proses dengan AI"', 'success');
    };
    
    voiceRecognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      stopVoiceRecording();
      showToast('Gagal mendeteksi suara. Coba lagi.', 'error');
    };
    
    voiceRecognition.onend = () => {
      stopVoiceRecording();
    };
  }
  
  try {
    voiceRecognition.start();
    isVoiceRecording = true;
    const btn = document.getElementById('voiceRecordBtn');
    const textSpan = document.getElementById('vrbText');
    if (btn) btn.classList.add('recording');
    if (textSpan) textSpan.innerHTML = '🎙️ Mendengarkan... (bicara sekarang)';
    showToast('🎤 Bicara sekarang...', 'info');
  } catch(e) {
    showToast('Gagal memulai voice recognition', 'error');
  }
}

function stopVoiceRecording() {
  if (voiceRecognition) {
    try { voiceRecognition.stop(); } catch(e) {}
  }
  isVoiceRecording = false;
  const btn = document.getElementById('voiceRecordBtn');
  const textSpan = document.getElementById('vrbText');
  if (btn) btn.classList.remove('recording');
  if (textSpan) textSpan.innerHTML = '🎙️ Tap untuk mulai bicara';
}

function openVoiceModal() {
  const modal = document.getElementById('voiceModal');
  if (modal) modal.style.display = 'flex';
  const textarea = document.getElementById('voiceTextInput');
  if (textarea) textarea.value = '';
  const resultDiv = document.getElementById('voiceResult');
  if (resultDiv) resultDiv.style.display = 'none';
}

function closeVoiceModal() {
  const modal = document.getElementById('voiceModal');
  if (modal) modal.style.display = 'none';
  stopVoiceRecording();
}

async function processVoiceInput() {
  const textarea = document.getElementById('voiceTextInput');
  const text = textarea?.value.trim();
  if (!text) {
    showToast('Masukkan deskripsi produk atau rekam suara dulu!', 'warn');
    return;
  }
  
  showToast('🤖 AI sedang memproses...', 'info');
  const resultDiv = document.getElementById('voiceResult');
  if (resultDiv) {
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="padding:1rem;text-align:center">🧠 AI menganalisis teks...</div>';
  }
  
  const prompt = `Anda adalah AI parser untuk nota UMKM. Ekstrak daftar produk dari teks berikut: "${text}". Format output JSON: {"items":[{"name":"nama produk","qty":jumlah,"price":harga_per_unit}]}. Harga dalam angka, qty default 1 jika tidak disebut. Hanya output JSON, tanpa penjelasan lain. Contoh: {"items":[{"name":"batik","qty":3,"price":150000},{"name":"tas rotan","qty":2,"price":200000}]}`;
  
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    aiText = aiText.replace(/```json\n?/g,'').replace(/```\n?/g,'');
    let parsed;
    try { parsed = JSON.parse(aiText); } catch(e) { parsed = { items: [] }; }
    
    if (parsed.items && parsed.items.length > 0) {
      const container = document.getElementById('itemsList');
      if (container) container.innerHTML = '';
      itemCount = 0;
      parsed.items.forEach(item => {
        const qty = parseInt(item.qty) || 1;
        const price = parseInt(item.price) || 0;
        addItem(item.name, qty, price);
      });
      if (resultDiv) {
        resultDiv.innerHTML = `<div style="background:rgba(74,222,128,0.15);padding:1rem;border-radius:12px;">
          ✅ Berhasil menambahkan ${parsed.items.length} produk!<br/>
          ${parsed.items.map(i => `• ${i.name} (${i.qty||1}x Rp ${(i.price||0).toLocaleString('id-ID')})`).join('<br/>')}
        </div>`;
      }
      showToast(`${parsed.items.length} produk ditambahkan!`, 'success');
      setTimeout(() => closeVoiceModal(), 2000);
    } else {
      throw new Error('No items parsed');
    }
  } catch(e) {
    console.error('Voice AI error:', e);
    if (resultDiv) {
      resultDiv.innerHTML = '<div style="background:rgba(239,68,68,0.15);padding:1rem;border-radius:12px;">⚠️ Gagal memproses. Coba format: "3 batik 150rb, 2 tas 200rb"</div>';
    }
  }
}

// ────────── TEMPLATE DEMO ──────────────────
let demoPendingTemplate = null;

function showTemplateDemo(templateName) {
  demoPendingTemplate = templateName;
  const modal = document.getElementById('templateDemoModal');
  const title = document.getElementById('demoModalTitle');
  const previewDiv = document.getElementById('templateDemoPreview');
  if (!modal || !previewDiv) return;
  
  const templateNames = {
    'premium-luxury': '💎 Luxury Gold',
    'premium-dark': '🌙 Dark Executive',
    'premium-neon': '⚡ Neon Cyber',
    'premium-sakura': '🌸 Sakura Soft',
    'premium-royal': '👑 Royal Marble',
    'premium-nature': '🍃 Nature Fresh',
    'premium-elegant': '🦢 Elegant Silk',
    'premium-art': '🎨 Art Deco'
  };
  if (title) title.innerHTML = `Preview: ${templateNames[templateName] || templateName}`;
  
  const demoItems = [
    { name: 'Produk Premium A', qty: 2, price: 250000, subtotal: 500000 },
    { name: 'Produk Premium B', qty: 1, price: 350000, subtotal: 350000 }
  ];
  const subtotal = 850000;
  const total = 850000;
  
  let templateClass = `invoice-template template-${templateName}`;
  let html = `<div class="${templateClass}" style="max-width:400px;margin:0 auto;font-size:0.8rem;padding:1rem;">
    <div class="inv-header"><div class="inv-store"><div class="inv-store-name">Demo Store</div><div class="inv-store-sub">Jl. Contoh No. 123</div></div>
    <div class="inv-meta"><div class="inv-label">NOTA</div><div class="inv-num">DEMO/001</div><div class="inv-date">${new Date().toLocaleDateString('id-ID')}</div></div></div>
    <div class="inv-divider"></div>
    <div class="inv-buyer"><div class="inv-buyer-label">Kepada Yth.</div><div class="inv-buyer-name">Customer Demo</div></div>
    <table class="inv-table"><thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>
    ${demoItems.map(i => `<tr><td>${i.name}</td><td style="text-align:center">${i.qty}</td><td>Rp ${i.price.toLocaleString('id-ID')}</td><td style="text-align:right;font-weight:600">Rp ${i.subtotal.toLocaleString('id-ID')}</td></tr>`).join('')}
    </tbody></table>
    <div class="inv-summary"><div class="inv-sum-row"><span>Subtotal</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div>
    <div class="inv-sum-row total"><span>TOTAL</span><span>Rp ${total.toLocaleString('id-ID')}</span></div></div>
    <div class="inv-footer"><div class="inv-footer-left"><div>Hormat kami,</div><div class="inv-sig-space"></div><div>Demo Store</div></div>
    <div class="inv-footer-right"><div class="inv-stamp">LUNAS</div></div></div>
    <div class="inv-powered">NotaKu AI · DEMO</div>
  </div>`;
  
  previewDiv.innerHTML = html;
  modal.style.display = 'flex';
}

function closeTemplateDemo() {
  const modal = document.getElementById('templateDemoModal');
  if (modal) modal.style.display = 'none';
  demoPendingTemplate = null;
}

function applyDemoTemplate() {
  if (demoPendingTemplate) {
    switchTemplate(demoPendingTemplate);
    showToast(`Template ${demoPendingTemplate} diterapkan!`, 'success');
  }
  closeTemplateDemo();
}

// ────────── AI QUICK GENERATE ──────────────
async function aiQuickGenerate() {
  const input = document.getElementById('aiQuickInput');
  const text = input?.value.trim();
  if (!text) {
    showToast('Masukkan deskripsi produk!', 'warn');
    return;
  }
  showToast('🤖 AI memproses...', 'info');
  
  const prompt = `Ekstrak daftar produk dari: "${text}". Output JSON: {"items":[{"name":"nama","qty":jumlah,"price":harga}]}. Hanya JSON.`;
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    aiText = aiText.replace(/```json\n?/g,'').replace(/```\n?/g,'');
    let parsed;
    try { parsed = JSON.parse(aiText); } catch(e) { parsed = { items: [] }; }
    
    if (parsed.items && parsed.items.length > 0) {
      const container = document.getElementById('itemsList');
      if (container) container.innerHTML = '';
      itemCount = 0;
      parsed.items.forEach(item => {
        addItem(item.name, parseInt(item.qty)||1, parseInt(item.price)||0);
      });
      showToast(`${parsed.items.length} produk ditambahkan!`, 'success');
      if (input) input.value = '';
    } else {
      showToast('Gagal memproses, coba format lain', 'error');
    }
  } catch(e) {
    showToast('AI error, coba lagi', 'error');
  }
}

// ────────── CHAT & DASHBOARD ───────────────
function setChatInput(text) {
  const input = document.getElementById('chatInput');
  if (input) input.value = text;
  sendChatMessage();
}

function scrollToPremium() {
  const section = document.getElementById('premium');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openRevenuePrediction() {
  const modal = document.createElement('div');
  modal.className = 'modal-detail active';
  modal.innerHTML = `
    <div class="modal-detail-content">
      <div class="modal-detail-header">
        <h3 style="color:var(--gold);">📈 Prediksi Pendapatan</h3>
        <button class="modal-detail-close" onclick="this.closest('.modal-detail').remove()">✕</button>
      </div>
      <div class="modal-detail-body">
        <div id="predictionResult">Menghitung prediksi...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  calculatePrediction();
}

function calculatePrediction() {
  const resultDiv = document.getElementById('predictionResult');
  if (!resultDiv) return;
  if (transactionHistory.length < 3) {
    resultDiv.innerHTML = '⚠️ Butuh minimal 3 transaksi untuk prediksi yang akurat.';
    return;
  }
  const totalRevenue = transactionHistory.reduce((s,t) => s + t.total, 0);
  const avgDaily = totalRevenue / transactionHistory.length;
  const nextMonth = avgDaily * 30;
  resultDiv.innerHTML = `<div style="background:rgba(201,149,42,0.1);padding:1rem;border-radius:12px;">
    <p><strong>📊 Berdasarkan ${transactionHistory.length} transaksi:</strong></p>
    <p>💰 <strong>Prediksi pendapatan bulan depan:</strong> ${formatRupiah(nextMonth)}</p>
    <p>📈 <strong>Target 3 bulan:</strong> ${formatRupiah(nextMonth * 3)}</p>
    <p>🎯 <strong>Target harian:</strong> ${formatRupiah(nextMonth / 30)}/hari</p>
    <hr style="margin:0.5rem 0;border-color:rgba(201,149,42,0.2);">
    <p style="font-size:0.7rem;color:var(--muted);">💡 AI Saran: Promosi rutin dan loyalty program bisa meningkatkan 20-30%</p>
  </div>`;
}

function openAIAnalyst() {
  const modal = document.createElement('div');
  modal.className = 'modal-detail active';
  modal.innerHTML = `
    <div class="modal-detail-content">
      <div class="modal-detail-header">
        <h3 style="color:var(--gold);">🤖 AI Smart Analyst</h3>
        <button class="modal-detail-close" onclick="this.closest('.modal-detail').remove()">✕</button>
      </div>
      <div class="modal-detail-body">
        <div id="aiAnalystResult" style="margin-bottom:1rem;">Menganalisis data...</div>
        <button onclick="runDeepAnalysis()" style="background:linear-gradient(135deg,#6b3fa0,#c9952a);border:none;padding:0.8rem;border-radius:12px;cursor:pointer;width:100%;">🔍 Analisis Mendalam</button>
        <div id="deepAnalysisResult" style="margin-top:1rem;font-size:0.8rem;color:var(--muted);"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  runSmartAnalysis();
}

async function runSmartAnalysis() {
  const resultDiv = document.getElementById('aiAnalystResult');
  if (!resultDiv) return;
  if (transactionHistory.length === 0) {
    resultDiv.innerHTML = '⚠️ Belum ada data transaksi. Buat nota dulu untuk analisis.';
    return;
  }
  resultDiv.innerHTML = '🤔 AI sedang menganalisis...';
  const totalRevenue = transactionHistory.reduce((s,t) => s + t.total, 0);
  const avgTransaction = totalRevenue / transactionHistory.length;
  const prompt = `Anda adalah AI Business Analyst super cerdas. Analisis bisnis: Total pendapatan Rp ${totalRevenue.toLocaleString('id-ID')}, rata-rata transaksi Rp ${avgTransaction.toLocaleString('id-ID')}, total transaksi ${transactionHistory.length}. Beri 3 insight penting untuk meningkatkan penjualan UMKM. Format: singkat, actionable. Gunakan emoji. Maksimal 200 kata.`;
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    let analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analisis siap. Klik "Analisis Mendalam" untuk hasil lebih detail.';
    resultDiv.innerHTML = `<div style="background:rgba(201,149,42,0.1);padding:1rem;border-radius:12px;">${analysis.replace(/\n/g, '<br>')}</div>`;
  } catch(e) {
    resultDiv.innerHTML = '⚠️ AI sedang sibuk. Coba lagi nanti.';
  }
}

async function runDeepAnalysis() {
  const resultDiv = document.getElementById('deepAnalysisResult');
  if (!resultDiv) return;
  resultDiv.innerHTML = '🧠 AI melakukan analisis mendalam...';
  const totalRevenue = transactionHistory.reduce((s,t) => s + t.total, 0);
  const avgTransaction = totalRevenue / transactionHistory.length;
  const last7Days = transactionHistory.slice(-7);
  const trend = last7Days.length > 0 ? (last7Days[last7Days.length-1]?.total > last7Days[0]?.total ? 'naik' : 'turun') : 'stabil';
  const prompt = `Anda adalah AI canggih dari tahun 2030. Analisis mendalam bisnis UMKM: Total pendapatan Rp ${totalRevenue.toLocaleString('id-ID')}, rata-rata transaksi Rp ${avgTransaction.toLocaleString('id-ID')}, tren 7 hari ${trend}, total transaksi ${transactionHistory.length}. Beri 5 rekomendasi strategis untuk meningkatkan pendapatan 2x lipat dalam 3 bulan. Format: bullet point dengan emoji.`;
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    let analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analisis selesai.';
    resultDiv.innerHTML = `<div style="background:rgba(201,149,42,0.08);padding:1rem;border-radius:12px;">${analysis.replace(/\n/g, '<br>')}</div>`;
  } catch(e) {
    resultDiv.innerHTML = '⚠️ Gagal mendapatkan analisis mendalam. Coba lagi.';
  }
}

function openLogoUpload() {
  uploadLogo();
}

function openInvoiceHistory() {
  const modal = document.createElement('div');
  modal.className = 'modal-detail active';
  modal.innerHTML = `
    <div class="modal-detail-content" style="max-width:700px;">
      <div class="modal-detail-header">
        <h3 style="color:var(--gold);">📜 Riwayat Nota</h3>
        <button class="modal-detail-close" onclick="this.closest('.modal-detail').remove()">✕</button>
      </div>
      <div class="modal-detail-body">
        <div id="historyModalList" style="max-height:400px;overflow-y:auto;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const container = document.getElementById('historyModalList');
  if (invoiceHistory.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:2rem;">Belum ada riwayat nota</div>';
  } else {
    container.innerHTML = invoiceHistory.map(inv => `
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:1rem;margin-bottom:0.8rem;">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;">
          <strong style="color:var(--gold);">${inv.invoiceNumber}</strong>
          <span style="font-size:0.7rem;color:var(--muted);">${new Date(inv.createdAt).toLocaleDateString('id-ID')}</span>
        </div>
        <div style="font-size:0.8rem;">${inv.storeName || 'Nama Toko'} → ${inv.buyerName || 'Pelanggan'}</div>
        <div style="font-size:0.75rem;color:var(--muted);">${inv.items.length} produk</div>
        <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
          <button onclick="event.stopPropagation(); loadInvoiceById(${inv.id}); document.querySelector('.modal-detail').remove();" style="background:var(--gold);border:none;padding:0.3rem 0.8rem;border-radius:6px;cursor:pointer;">📋 Muat</button>
          <button onclick="event.stopPropagation(); duplicateInvoice(${inv.id}); setTimeout(()=> document.querySelector('.modal-detail')?.remove(), 500);" style="background:var(--gold);border:none;padding:0.3rem 0.8rem;border-radius:6px;cursor:pointer;">📋 Duplikat</button>
          <button onclick="event.stopPropagation(); deleteInvoice(${inv.id}); updateDashboardStats(); location.reload();" style="background:transparent;border:1px solid var(--rust);padding:0.3rem 0.8rem;border-radius:6px;cursor:pointer;color:var(--rust);">🗑️ Hapus</button>
        </div>
      </div>
    `).join('');
  }
}

function updateDashboardStats() {
  const historyCount = document.getElementById('historyCount');
  const logoStatus = document.getElementById('logoStatus');
  const aiPreview = document.getElementById('aiAnalystPreview');
  const predictionPreview = document.getElementById('predictionPreview');
  const dashboardDate = document.getElementById('dashboardDate');
  if (historyCount) historyCount.innerHTML = `${invoiceHistory.length} nota`;
  if (logoStatus) logoStatus.innerHTML = userLogo ? '✓ Logo terpasang' : 'Belum ada logo';
  if (aiPreview) aiPreview.innerHTML = transactionHistory.length > 0 ? `${transactionHistory.length} transaksi, siap analisis` : 'Buat nota dulu';
  if (predictionPreview && transactionHistory.length > 0) {
    const avg = transactionHistory.reduce((s,t) => s + t.total, 0) / transactionHistory.length;
    predictionPreview.innerHTML = `Prediksi: ${formatRupiah(avg * 30)}/bulan`;
  }
  if (dashboardDate) dashboardDate.innerHTML = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input?.value.trim();
  if (!message) return;
  const messagesDiv = document.getElementById('chatMessages');
  if (!messagesDiv) return;
  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'chat-message user';
  userMsgDiv.textContent = message;
  messagesDiv.appendChild(userMsgDiv);
  input.value = '';
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  const aiLoadingDiv = document.createElement('div');
  aiLoadingDiv.className = 'chat-message ai';
  aiLoadingDiv.textContent = '🧠 AI sedang berpikir...';
  messagesDiv.appendChild(aiLoadingDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  const context = `Anda adalah AI Business Assistant super cerdas (tahun 2030). Data bisnis: Total transaksi ${transactionHistory.length}, total pendapatan Rp ${transactionHistory.reduce((s,t)=>s+t.total,0).toLocaleString('id-ID')}. Pertanyaan: ${message}. Jawab ramah, profesional, actionable. Gunakan emoji. Maksimal 300 kata.`;
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: context }] }] })
    });
    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, AI sedang sibuk. Coba lagi nanti.';
    aiLoadingDiv.textContent = aiResponse;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch(e) {
    aiLoadingDiv.textContent = '⚠️ Gagal terhubung ke AI. Coba lagi nanti.';
  }
}

// ────────── EXPORT KE GLOBAL ───────────────
window.openVoiceModal = openVoiceModal;
window.closeVoiceModal = closeVoiceModal;
window.toggleVoiceRecording = toggleVoiceRecording;
window.processVoiceInput = processVoiceInput;
window.showTemplateDemo = showTemplateDemo;
window.closeTemplateDemo = closeTemplateDemo;
window.applyDemoTemplate = applyDemoTemplate;
window.aiQuickGenerate = aiQuickGenerate;
window.setChatInput = setChatInput;
window.scrollToPremium = scrollToPremium;
window.openRevenuePrediction = openRevenuePrediction;
window.openAIAnalyst = openAIAnalyst;
window.openLogoUpload = openLogoUpload;
window.openInvoiceHistory = openInvoiceHistory;
window.updateDashboardStats = updateDashboardStats;
window.sendChatMessage = sendChatMessage;
window.showPaymentInfo = showPaymentInfo;
window.copyPaymentInfo = copyPaymentInfo;
window.activatePremium = activatePremium;
window.checkPremiumStatus = checkPremiumStatus;
window.switchTemplate = switchTemplate;
})();
