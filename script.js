// ============================================
//   NOTAKU — MAIN SCRIPT (FULL VERSION - FIXED)
//   Supports: 11 Templates, AI, WA Share, Excel Export, Logo Upload, History, Voice, Demo
// ============================================

// ────────── KONFIGURASI ─────────────────────
let itemCount = 0;
let currentTemplate = 'classic';
let revenueChart = null;
let transactionHistory = [];
let invoiceHistory = [];
let userLogo = null;
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
  const canvas = await html2canvas(invoice, { scale: 2, backgroundColor: '#ffffff', logging: false });
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
  let html = `<html><head><meta charset="UTF-8"><title>NotaKu - Laporan Penjualan</title><style>body{font-family:Arial;margin:20px;}h1{color:#c9952a;}table{border-collapse:collapse;width:100%;margin-top:20px;}th,td{border:1px solid #ddd;padding:8px;}th{background-color:#c9952a;color:white;}.total{font-weight:bold;background-color:#f2ead8;}</style></head><body><h1>📊 NotaKu - Laporan Penjualan</h1><p>Periode: ${new Date().toLocaleDateString('id-ID')}</p><p>Total Transaksi: ${transactionHistory.length}</p><p>Total Pendapatan: ${formatRupiah(transactionHistory.reduce((s,t)=>s+t.total,0))}</p><hr/><table><thead><tr><th>Tanggal</th><th>Total (Rp)</th></tr></thead><tbody>${transactionHistory.map(t=>`<tr><td>${new Date(t.date).toLocaleDateString('id-ID')}</td><td>${Number(t.total).toLocaleString('id-ID')}</td></tr>`).join('')}<tr class="total"><td><strong>TOTAL</strong></td><td><strong>${transactionHistory.reduce((s,t)=>s+t.total,0).toLocaleString('id-ID')}</strong></td></tr></tbody>｜｜DSML｜｜<p style="margin-top:30px;color:#999;">Dibuat dengan NotaKu - Generator Nota Gratis untuk UMKM Indonesia</p></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notaku-laporan-${new Date().toISOString().split('T')[0]}.xls`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Laporan Excel berhasil diunduh!', 'success');
}

// ────────── AI SMART INVOICE (FIXED - LEBIH CERDAS) ───────────────
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
  
  showToast('🤖 AI sedang menganalisis produk...', 'info');
  
  // Prompt yang lebih baik dengan contoh harga riil
  const prompt = `Anda adalah AI asisten bisnis UMKM Indonesia yang ahli dalam menentukan harga produk.  
Berikut daftar produk yang dijual: ${items.map(i => `${i.name} (${i.qty}x)`).join(', ')}

TUGAS ANDA:
1. Perhatikan NAMA PRODUK dengan seksama. Jika produk adalah barang branded/merek terkenal (seperti Nike, Adidas, New Balance, Samsung, Apple, dll), berikan harga yang sesuai dengan pasaran (bisa mencapai 500rb - 5jt).
2. Jika produk adalah barang umum (seperti tas, sepatu, baju, celana, jam tangan, dll), berikan harga wajar sesuai kualitas (50rb - 500rb).
3. Jika produk adalah makanan/minuman, berikan harga 5rb - 50rb.
4. Jika produk adalah elektronik (hp, laptop, charger, dll), berikan harga 100rb - 10jt tergantung jenisnya.
5. Berikan diskon yang LOGIS (0-20% untuk produk baru, 20-50% untuk promo/bundling).
6. Berikan deskripsi nota yang profesional dan spesifik sesuai produk.

Format jawaban HARUS JSON dengan key: hargaSaran, diskonSaran, deskripsiSaran

CONTOH JAWABAN YANG BENAR:
- Untuk "Sepatu New Balance 574": {"hargaSaran": "Rp 1.200.000 - 1.500.000", "diskonSaran": "0", "deskripsiSaran": "Terima kasih telah membeli Sepatu New Balance 574 original. Bergaransi resmi 1 tahun."}
- Untuk "Sepatu lokal": {"hargaSaran": "Rp 150.000 - 250.000", "diskonSaran": "10", "deskripsiSaran": "Terima kasih telah berbelanja sepatu lokal berkualitas."}
- Untuk "Nasi Goreng": {"hargaSaran": "Rp 15.000 - 25.000", "diskonSaran": "0", "deskripsiSaran": "Selamat menikmati! Nasi Goreng spesial dengan topping pilihan."}

JANGAN berikan harga generik seperti 25rb-50rb untuk produk yang JELAS lebih mahal. Analisis nama produk dengan teliti!`;
  
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
      // Fallback cerdas berdasarkan nama produk
      const productNames = items.map(i => i.name.toLowerCase()).join(' ');
      let hargaSaran = 'Rp 50.000 - 100.000';
      let diskonSaran = '5';
      let deskripsiSaran = 'Terima kasih telah berbelanja!';
      
      // Deteksi merek terkenal
      if (productNames.includes('new balance') || productNames.includes('nike') || productNames.includes('adidas') || productNames.includes('puma') || productNames.includes('reebok')) {
        hargaSaran = 'Rp 1.200.000 - 2.500.000';
        deskripsiSaran = 'Terima kasih telah membeli sepatu original branded. Garansi resmi tersedia.';
      }
      else if (productNames.includes('sepatu') || productNames.includes('sneakers') || productNames.includes('shoe')) {
        hargaSaran = 'Rp 200.000 - 500.000';
        deskripsiSaran = 'Terima kasih telah membeli sepatu berkualitas.';
      }
      else if (productNames.includes('iphone') || productNames.includes('samsung') || productNames.includes('xiaomi') || productNames.includes('oppo') || productNames.includes('vivo')) {
        hargaSaran = 'Rp 2.000.000 - 15.000.000';
        diskonSaran = '0';
        deskripsiSaran = 'Terima kasih telah membeli HP original. Garansi resmi 1 tahun.';
      }
      else if (productNames.includes('laptop') || productNames.includes('notebook') || productNames.includes('macbook')) {
        hargaSaran = 'Rp 5.000.000 - 25.000.000';
        diskonSaran = '0';
        deskripsiSaran = 'Terima kasih telah membeli laptop. Garansi resmi tersedia.';
      }
      else if (productNames.includes('baju') || productNames.includes('kaos') || productNames.includes('kemeja') || productNames.includes('jaket')) {
        hargaSaran = 'Rp 75.000 - 250.000';
        deskripsiSaran = 'Terima kasih telah berbelanja pakaian berkualitas.';
      }
      else if (productNames.includes('nasi') || productNames.includes('mie') || productNames.includes('ayam') || productNames.includes('minuman')) {
        hargaSaran = 'Rp 10.000 - 35.000';
        diskonSaran = '0';
        deskripsiSaran = 'Selamat menikmati!';
      }
      else if (productNames.includes('tas') || productNames.includes('bag')) {
        hargaSaran = 'Rp 150.000 - 400.000';
        deskripsiSaran = 'Terima kasih telah membeli tas berkualitas.';
      }
      else if (productNames.includes('jam') || productNames.includes('watch')) {
        hargaSaran = 'Rp 250.000 - 1.500.000';
        deskripsiSaran = 'Terima kasih telah membeli jam tangan.';
      }
      
      suggestion = { hargaSaran, diskonSaran, deskripsiSaran };
    }
    
    document.getElementById('aiSuggestionResult').innerHTML = `
      <div style="background:rgba(201,149,42,0.1); padding:1rem; border-radius:8px; margin-top:0.5rem;">
        <div style="color:var(--gold); margin-bottom:0.5rem;">🤖 AI Suggestion</div>
        <div><strong>💰 Harga:</strong> ${suggestion.hargaSaran}</div>
        <div><strong>🎯 Diskon:</strong> ${suggestion.diskonSaran}%</div>
        <div><strong>📝 Deskripsi:</strong> ${suggestion.deskripsiSaran}</div>
        <button onclick="applyAIDiscount('${suggestion.diskonSaran}')" style="margin-top:0.5rem;background:var(--gold);border:none;padding:0.2rem 0.8rem;border-radius:4px;cursor:pointer;">✨ Terapkan Diskon</button>
      </div>
    `;
    showToast('AI saran siap!', 'success');
  } catch(e) {
    console.error('AI Error:', e);
    showToast('AI sedang sibuk, coba lagi', 'error');
  }
}

// ────────── LOAD DATA ─────────────────────
function loadData() {
  const saved = localStorage.getItem('notaku_products');
  if (saved) { try { displaySavedProducts(JSON.parse(saved)); } catch(e) { localStorage.removeItem('notaku_products'); } }
  const stats = localStorage.getItem('notaku_stats');
  if (stats) { try { transactionHistory = JSON.parse(stats); updateStats(); } catch(e) { localStorage.removeItem('notaku_stats'); } }
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
    if (window.PremiumAPI && window.PremiumAPI.isTemplatePremium(currentTemplate)) { switchTemplate('classic'); }
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
      const days = window.PremiumAPI.getRemainingDays();
      const until = window.PremiumAPI.getUntilFormatted();
      const plan = window.PremiumAPI.getPlanName();
      statusDiv.innerHTML = `👑 Premium <strong>${plan}</strong> aktif hingga ${until} (${days} hari lagi)<br>✨ 11 template eksklusif + AI Smart + Logo Custom + Riwayat Nota!`;
      statusDiv.style.color = '#c9952a';
    }
  } else {
    if (watermark) watermark.style.display = 'block';
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
  if (!key) { showToast('⚠️ Masukkan kode premium!', 'warn'); return; }
  if (window.PremiumAPI && window.PremiumAPI.activate(key)) {
    showToast('✅ Premium aktif!', 'success');
    if (input) input.value = '';
    checkPremiumStatus();
  } else { showToast('❌ Kode tidak valid. Hubungi admin!', 'error'); }
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
  row.innerHTML = `<input type="text" placeholder="Nama produk" class="item-name" value="${escapeHtml(name)}" /><input type="number" placeholder="Qty" class="item-qty" min="1" value="${qty}" /><input type="number" placeholder="Harga" class="item-price" min="0" value="${price}" /><button class="remove-btn" onclick="removeItem(${id})">✕</button>`;
  list.appendChild(row);
}

function removeItem(id) {
  const row = document.getElementById(`item-${id}`);
  if (row) row.remove();
}

// ────────── SAVED PRODUCTS ─────────────────
function showSaveProductModal() { const modal = document.getElementById('saveProductModal'); if (modal) modal.style.display = 'flex'; }
function closeSaveProductModal() { const modal = document.getElementById('saveProductModal'); if (modal) modal.style.display = 'none'; }
function showPremiumModal() { const modal = document.getElementById('premiumModal'); if (modal) modal.style.display = 'flex'; }
function closePremiumModal() { const modal = document.getElementById('premiumModal'); if (modal) modal.style.display = 'none'; }
window.onclick = function(event) { if (event.target.classList.contains('modal-overlay')) { event.target.style.display = 'none'; } };

function saveProduct() {
  const name = document.getElementById('saveProductName').value.trim();
  const price = parseFloat(document.getElementById('saveProductPrice').value);
  if (!name || isNaN(price) || price <= 0) { showToast('⚠️ Masukkan nama & harga valid!', 'warn'); return; }
  const products = JSON.parse(localStorage.getItem('notaku_products') || '[]');
  if (products.find(p => p.name.toLowerCase() === name.toLowerCase())) { showToast('⚠️ Produk sudah tersimpan!', 'warn'); return; }
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
  if (products.length === 0) { container.innerHTML = '<span style="font-size:0.75rem;color:var(--muted)">Belum ada produk</span>'; return; }
  products.forEach((product, index) => {
    const btn = document.createElement('div');
    btn.className = 'saved-product';
    btn.innerHTML = `<span class="sp-name">${escapeHtml(product.name)}</span><span class="sp-price">${formatRupiah(product.price)}</span><button class="sp-del" onclick="deleteProduct(event, ${index})">✕</button>`;
    btn.onclick = (e) => { if (e.target.classList.contains('sp-del')) return; addSavedProductToItems(product.name, product.price); };
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

function addSavedProductToItems(name, price) { addItem(name, 1, price); showToast(`✅ "${name}" ditambahkan!`, 'success'); }
function saveProducts(products) { localStorage.setItem('notaku_products', JSON.stringify(products)); }

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
  const last7Days = [], last7Revenue = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    last7Days.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
    const rev = transactionHistory.filter(t => t.date.split('T')[0] === d.toISOString().split('T')[0]).reduce((s, t) => s + t.total, 0);
    last7Revenue.push(rev);
  }
  if (revenueChart) revenueChart.destroy();
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  revenueChart = new Chart(canvas.getContext('2d'), {
    type: 'line', data: { labels: last7Days, datasets: [{ label: 'Pendapatan (Rp)', data: last7Revenue, borderColor: '#c9952a', backgroundColor: 'rgba(201,149,42,0.08)', pointBackgroundColor: '#c9952a', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5, tension: 0.4, fill: true, borderWidth: 2.5 }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'Rp ' + Number(ctx.raw).toLocaleString('id-ID') } } }, scales: { y: { beginAtZero: true } } }
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
  if (transactionHistory.length === 0) { showToast('Belum ada data!', 'warn'); return; }
  let csv = 'Tanggal,Total (Rp)\n';
  transactionHistory.forEach(t => { csv += `${new Date(t.date).toLocaleDateString('id-ID')},${t.total}\n`; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `notaku-stats-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
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
    if (name && qty > 0) items.push({ name, qty, price, subtotal: qty * price });
  });
  if (items.length === 0) { showToast('⚠️ Tambahkan produk!', 'warn'); return; }
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
  if (typeof gtag === 'function') { gtag('event', 'generate_invoice', { event_category: 'engagement', event_label: storeName, value: total }); }
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
  if (!invoice) { showToast('Generate nota dulu!', 'warn'); return; }
  const btn = event?.target?.closest('button');
  const originalHTML = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '⏳…'; btn.disabled = true; }
  const orig = { width: invoice.style.width, maxWidth: invoice.style.maxWidth, margin: invoice.style.margin };
  invoice.style.width = '600px'; invoice.style.maxWidth = '600px'; invoice.style.margin = '0';
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
  } catch (err) { showToast('❌ Gagal buat PDF', 'error'); }
  invoice.style.width = orig.width; invoice.style.maxWidth = orig.maxWidth; invoice.style.margin = orig.margin;
  if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; }
}

function printInvoice() {
  const invoice = document.getElementById('invoicePreview');
  if (!invoice) { showToast('Generate nota dulu!', 'warn'); return; }
  const printWin = window.open('', '_blank');
  printWin.document.write(`<!DOCTYPE html><html><head><title>NotaKu</title><style>${getStylesForPrint()}</style></head><body>${invoice.outerHTML}<script>window.onload=()=>{window.print();window.close();};<\/script></body></html>`);
  printWin.document.close();
}

function getStylesForPrint() {
  return `*{margin:0;padding:0;box-sizing:border-box}body{padding:1rem;font-family:'Space Grotesk',sans-serif}.invoice-template{max-width:600px;margin:0 auto;background:#fff;padding:1.5rem;border:1px solid #e0d8c8}.inv-header{display:flex;justify-content:space-between}.inv-store-name{font-weight:800;font-size:1.2rem}.inv-num{font-weight:700;color:#c9952a}.inv-divider{height:1px;background:#e0d8c8;margin:0.8rem 0}.inv-table{width:100%;border-collapse:collapse;margin:1rem 0}.inv-table th,.inv-table td{padding:0.5rem;border-bottom:1px solid #e0d8c8;text-align:left}.inv-sum-row{display:flex;justify-content:space-between;padding:0.3rem 0}.inv-sum-row.total{font-weight:800;border-top:1px solid #000;margin-top:0.3rem;padding-top:0.5rem}.inv-stamp{font-weight:800;color:#2a7a4b;border:2px solid #2a7a4b;display:inline-block;padding:0.2rem 0.8rem;transform:rotate(-6deg)}@media print{body{padding:0}}`;
}

// ────────── PAYMENT ────────────────────────
function showPaymentInfo(paket, nominal) {
  const paymentDiv = document.getElementById('paymentInfo');
  const amountSpan = document.getElementById('paymentAmount');
  if (!paymentDiv || !amountSpan) return;
  amountSpan.textContent = `Rp ${nominal.toLocaleString('id-ID')}`;
  paymentDiv.style.display = 'block';
  paymentDiv.classList.add('show');
  paymentDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast(`💳 Transfer Rp ${nominal.toLocaleString('id-ID')} ke BRI a.n. Ardian Nurraihan`, 'success');
  if (typeof gtag === 'function') gtag('event', 'view_payment_info', { event_category: 'premium', event_label: paket, value: nominal });
}

function copyPaymentInfo() {
  const rekening = '359301009186508';
  navigator.clipboard?.writeText(rekening).then(() => showToast('✅ No. rekening dicopy!', 'success')).catch(() => showToast('✅ No. rekening: ' + rekening, 'success'));
  if (typeof gtag === 'function') gtag('event', 'copy_rekening', { event_category: 'premium', event_label: 'BRI' });
}

// ────────── TAMBAHAN FUNGSI UNTUK VOICE, TEMPLATE DEMO, AI QUICK ────────────────
let voiceRecognition = null;
let isVoiceRecording = false;
let demoPendingTemplate = null;

function initVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { return null; }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'id-ID';
  return recognition;
}

function toggleVoiceRecording() {
  if (isVoiceRecording) { stopVoiceRecording(); } else { startVoiceRecording(); }
}

function startVoiceRecording() {
  if (!voiceRecognition) {
    voiceRecognition = initVoiceRecognition();
    if (!voiceRecognition) { showToast('Browser tidak support voice recognition', 'error'); return; }
    voiceRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const textarea = document.getElementById('voiceTextInput');
      if (textarea) textarea.value = transcript;
      stopVoiceRecording();
      showToast('✅ Suara terdeteksi! Klik "Proses dengan AI"', 'success');
    };
    voiceRecognition.onerror = () => { stopVoiceRecording(); showToast('Gagal deteksi suara', 'error'); };
    voiceRecognition.onend = () => { stopVoiceRecording(); };
  }
  try {
    voiceRecognition.start();
    isVoiceRecording = true;
    const btn = document.getElementById('voiceRecordBtn');
    const textSpan = document.getElementById('vrbText');
    if (btn) btn.classList.add('recording');
    if (textSpan) textSpan.innerHTML = '🎙️ Mendengarkan...';
    showToast('🎤 Bicara sekarang...', 'info');
  } catch(e) { showToast('Gagal voice recognition', 'error'); }
}

function stopVoiceRecording() {
  if (voiceRecognition) { try { voiceRecognition.stop(); } catch(e) {} }
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
  if (!text) { showToast('Masukkan deskripsi produk!', 'warn'); return; }
  showToast('🤖 AI memproses...', 'info');
  const resultDiv = document.getElementById('voiceResult');
  if (resultDiv) { resultDiv.style.display = 'block'; resultDiv.innerHTML = '<div style="padding:1rem;text-align:center">🧠 AI menganalisis...</div>'; }
  const prompt = `Ekstrak daftar produk dari: "${text}". Format JSON: {"items":[{"name":"nama","qty":jumlah,"price":harga}]}. Hanya JSON.`;
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      parsed.items.forEach(item => { addItem(item.name, parseInt(item.qty)||1, parseInt(item.price)||0); });
      if (resultDiv) { resultDiv.innerHTML = `<div style="background:rgba(74,222,128,0.15);padding:1rem;border-radius:12px;">✅ Menambahkan ${parsed.items.length} produk!</div>`; }
      showToast(`${parsed.items.length} produk ditambahkan!`, 'success');
      setTimeout(() => closeVoiceModal(), 2000);
    } else { throw new Error('No items'); }
  } catch(e) {
    if (resultDiv) { resultDiv.innerHTML = '<div style="background:rgba(239,68,68,0.15);padding:1rem;border-radius:12px;">⚠️ Gagal. Coba: "3 batik 150rb, 2 tas 200rb"</div>'; }
  }
}

function showTemplateDemo(templateName) {
  demoPendingTemplate = templateName;
  const modal = document.getElementById('templateDemoModal');
  const title = document.getElementById('demoModalTitle');
  const previewDiv = document.getElementById('templateDemoPreview');
  if (!modal || !previewDiv) return;
  const names = { 'premium-luxury':'💎 Luxury', 'premium-dark':'🌙 Dark', 'premium-neon':'⚡ Neon', 'premium-sakura':'🌸 Sakura', 'premium-royal':'👑 Royal', 'premium-nature':'🍃 Nature', 'premium-elegant':'🦢 Elegant', 'premium-art':'🎨 Art' };
  if (title) title.innerHTML = `Preview: ${names[templateName] || templateName}`;
  previewDiv.innerHTML = `<div class="invoice-template template-${templateName}" style="max-width:400px;margin:0 auto;font-size:0.8rem;padding:1rem;">
    <div class="inv-header"><div class="inv-store"><div class="inv-store-name">Demo Store</div></div>
    <div class="inv-meta"><div class="inv-label">NOTA</div><div class="inv-num">DEMO/001</div></div></div>
    <div class="inv-divider"></div>
    <div class="inv-buyer"><div class="inv-buyer-name">Customer Demo</div></div>
    <table class="inv-table"><thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
    <tbody><tr><td>Produk Premium A</td><td style="text-align:center">2</td><td>Rp 250.000</td><td style="text-align:right">Rp 500.000</td></tr>
    <tr><td>Produk Premium B</td><td style="text-align:center">1</td><td>Rp 350.000</td><td style="text-align:right">Rp 350.000</td></tr></tbody></table>
    <div class="inv-summary"><div class="inv-sum-row total"><span>TOTAL</span><span>Rp 850.000</span></div></div>
    <div class="inv-footer"><div class="inv-stamp">LUNAS</div></div>
    <div class="inv-powered">NotaKu AI · DEMO</div></div>`;
  modal.style.display = 'flex';
}

function closeTemplateDemo() {
  const modal = document.getElementById('templateDemoModal');
  if (modal) modal.style.display = 'none';
  demoPendingTemplate = null;
}

function applyDemoTemplate() {
  if (demoPendingTemplate) { switchTemplate(demoPendingTemplate); showToast(`Template ${demoPendingTemplate} diterapkan!`, 'success'); }
  closeTemplateDemo();
}

async function aiQuickGenerate() {
  const input = document.getElementById('aiQuickInput');
  const text = input?.value.trim();
  if (!text) { showToast('Masukkan deskripsi produk!', 'warn'); return; }
  showToast('🤖 AI memproses...', 'info');
  const prompt = `Ekstrak daftar produk dari: "${text}". Output JSON: {"items":[{"name":"nama","qty":jumlah,"price":harga}]}. Hanya JSON.`;
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      parsed.items.forEach(item => { addItem(item.name, parseInt(item.qty)||1, parseInt(item.price)||0); });
      showToast(`${parsed.items.length} produk ditambahkan!`, 'success');
      if (input) input.value = '';
    } else { showToast('Gagal memproses', 'error'); }
  } catch(e) { showToast('AI error', 'error'); }
}

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
  modal.innerHTML = `<div class="modal-detail-content"><div class="modal-detail-header"><h3 style="color:var(--gold);">📈 Prediksi Pendapatan</h3><button class="modal-detail-close" onclick="this.closest('.modal-detail').remove()">✕</button></div>
    <div class="modal-detail-body"><div id="predictionResult">Menghitung prediksi...</div></div></div>`;
  document.body.appendChild(modal);
  calculatePrediction();
}

function calculatePrediction() {
  const resultDiv = document.getElementById('predictionResult');
  if (!resultDiv) return;
  if (transactionHistory.length < 3) { resultDiv.innerHTML = '⚠️ Butuh minimal 3 transaksi.'; return; }
  const totalRevenue = transactionHistory.reduce((s,t) => s + t.total, 0);
  const avgDaily = totalRevenue / transactionHistory.length;
  const nextMonth = avgDaily * 30;
  resultDiv.innerHTML = `<div style="background:rgba(201,149,42,0.1);padding:1rem;border-radius:12px;">
    <p>💰 Prediksi bulan depan: ${formatRupiah(nextMonth)}</p>
    <p>📈 Target 3 bulan: ${formatRupiah(nextMonth * 3)}</p>
    <p>🎯 Target harian: ${formatRupiah(nextMonth / 30)}/hari</p></div>`;
}

function openAIAnalyst() {
  const modal = document.createElement('div');
  modal.className = 'modal-detail active';
  modal.innerHTML = `<div class="modal-detail-content"><div class="modal-detail-header"><h3 style="color:var(--gold);">🤖 AI Smart Analyst</h3><button class="modal-detail-close" onclick="this.closest('.modal-detail').remove()">✕</button></div>
    <div class="modal-detail-body"><div id="aiAnalystResult">Menganalisis data...</div>
    <button onclick="runDeepAnalysis()" style="background:linear-gradient(135deg,#6b3fa0,#c9952a);border:none;padding:0.8rem;border-radius:12px;cursor:pointer;width:100%;margin-top:1rem;">🔍 Analisis Mendalam</button>
    <div id="deepAnalysisResult" style="margin-top:1rem;font-size:0.8rem;"></div></div></div>`;
  document.body.appendChild(modal);
  runSmartAnalysis();
}

async function runSmartAnalysis() {
  const resultDiv = document.getElementById('aiAnalystResult');
  if (!resultDiv) return;
  if (transactionHistory.length === 0) { resultDiv.innerHTML = '⚠️ Belum ada data transaksi.'; return; }
  resultDiv.innerHTML = '🤔 AI menganalisis...';
  const totalRevenue = transactionHistory.reduce((s,t) => s + t.total, 0);
  const avgTransaction = totalRevenue / transactionHistory.length;
  const prompt = `Analisis bisnis: Total pendapatan Rp ${totalRevenue.toLocaleString('id-ID')}, rata-rata Rp ${avgTransaction.toLocaleString('id-ID')}, total ${transactionHistory.length} transaksi. Beri 3 insight actionable. Gunakan emoji.`;
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    let analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analisis siap.';
    resultDiv.innerHTML = `<div style="background:rgba(201,149,42,0.1);padding:1rem;border-radius:12px;">${analysis.replace(/\n/g, '<br>')}</div>`;
  } catch(e) { resultDiv.innerHTML = '⚠️ AI sibuk. Coba lagi.'; }
}

async function runDeepAnalysis() {
  const resultDiv = document.getElementById('deepAnalysisResult');
  if (!resultDiv) return;
  resultDiv.innerHTML = '🧠 AI menganalisis mendalam...';
  const totalRevenue = transactionHistory.reduce((s,t) => s + t.total, 0);
  const avgTransaction = totalRevenue / transactionHistory.length;
  const prompt = `Analisis mendalam bisnis: Pendapatan Rp ${totalRevenue.toLocaleString('id-ID')}, rata-rata Rp ${avgTransaction.toLocaleString('id-ID')}, total ${transactionHistory.length} transaksi. Beri 5 rekomendasi strategis. Bullet point dengan emoji.`;
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    let analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analisis selesai.';
    resultDiv.innerHTML = `<div style="background:rgba(201,149,42,0.08);padding:1rem;border-radius:12px;">${analysis.replace(/\n/g, '<br>')}</div>`;
  } catch(e) { resultDiv.innerHTML = '⚠️ Gagal.'; }
}

function openLogoUpload() { uploadLogo(); }

function openInvoiceHistory() {
  const modal = document.createElement('div');
  modal.className = 'modal-detail active';
  modal.innerHTML = `<div class="modal-detail-content" style="max-width:700px;"><div class="modal-detail-header"><h3 style="color:var(--gold);">📜 Riwayat Nota</h3><button class="modal-detail-close" onclick="this.closest('.modal-detail').remove()">✕</button></div>
    <div class="modal-detail-body"><div id="historyModalList" style="max-height:400px;overflow-y:auto;"></div></div></div>`;
  document.body.appendChild(modal);
  const container = document.getElementById('historyModalList');
  if (invoiceHistory.length === 0) { container.innerHTML = '<div style="text-align:center;padding:2rem;">Belum ada riwayat nota</div>'; }
  else {
    container.innerHTML = invoiceHistory.map(inv => `<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:1rem;margin-bottom:0.8rem;">
      <div><strong style="color:var(--gold);">${inv.invoiceNumber}</strong> <span style="font-size:0.7rem;">${new Date(inv.createdAt).toLocaleDateString('id-ID')}</span></div>
      <div style="font-size:0.8rem;">${inv.storeName || 'Toko'} → ${inv.buyerName || 'Pelanggan'}</div>
      <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
        <button onclick="loadInvoiceById(${inv.id}); document.querySelector('.modal-detail').remove();" style="background:var(--gold);border:none;padding:0.3rem 0.8rem;border-radius:6px;cursor:pointer;">📋 Muat</button>
        <button onclick="duplicateInvoice(${inv.id});" style="background:var(--gold);border:none;padding:0.3rem 0.8rem;border-radius:6px;cursor:pointer;">📋 Duplikat</button>
        <button onclick="deleteInvoice(${inv.id}); updateDashboardStats();" style="background:transparent;border:1px solid var(--rust);padding:0.3rem 0.8rem;border-radius:6px;cursor:pointer;color:var(--rust);">🗑️ Hapus</button>
      </div></div>`).join('');
  }
}

function updateDashboardStats() {
  const historyCount = document.getElementById('historyCount');
  const logoStatus = document.getElementById('logoStatus');
  const aiPreview = document.getElementById('aiAnalystPreview');
  const predictionPreview = document.getElementById('predictionPreview');
  if (historyCount) historyCount.innerHTML = `${invoiceHistory.length} nota`;
  if (logoStatus) logoStatus.innerHTML = userLogo ? '✓ Logo terpasang' : 'Belum ada logo';
  if (aiPreview) aiPreview.innerHTML = transactionHistory.length > 0 ? `${transactionHistory.length} transaksi` : 'Buat nota dulu';
  if (predictionPreview && transactionHistory.length > 0) {
    const avg = transactionHistory.reduce((s,t) => s + t.total, 0) / transactionHistory.length;
    predictionPreview.innerHTML = `Prediksi: ${formatRupiah(avg * 30)}/bulan`;
  }
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
  const context = `Data bisnis: ${transactionHistory.length} transaksi, pendapatan Rp ${transactionHistory.reduce((s,t)=>s+t.total,0).toLocaleString('id-ID')}. Pertanyaan: ${message}. Jawab ramah, actionable, max 200 kata.`;
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: context }] }] })
    });
    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, AI sibuk.';
    aiLoadingDiv.textContent = aiResponse;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch(e) { aiLoadingDiv.textContent = '⚠️ Gagal terhubung ke AI.'; }
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

function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : m); }
function formatRupiah(num) { return 'Rp ' + Number(num || 0).toLocaleString('id-ID'); }
function formatDate(str) { if (!str) return ''; const d = new Date(str); if (isNaN(d.getTime())) return ''; return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
function incrementInvoiceNumber() {
  const invoiceField = document.getElementById('invoiceNumber');
  if (!invoiceField) return;
  let current = invoiceField.value;
  const match = current.match(/\/(\d+)$/);
  if (match) { const last = parseInt(match[1], 10); const next = (last + 1).toString().padStart(match[1].length, '0'); invoiceField.value = current.replace(/\d+$/, next); }
  else { const random = Math.floor(Math.random() * 9000) + 1000; const date = new Date(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); invoiceField.value = `INV/${date.getFullYear()}/${month}/${random}`; }
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
  addItem(); addItem();
  loadData(); loadLastInvoice();
  checkPremiumStatus();
  
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = btn.dataset.template;
      if (window.PremiumAPI && window.PremiumAPI.isTemplatePremium && window.PremiumAPI.isTemplatePremium(tpl)) {
        if (!window.PremiumAPI.isPremium || !window.PremiumAPI.isPremium() || window.PremiumAPI.isExpired()) {
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
      localStorage.setItem('notaku_dark_mode', document.body.classList.contains('dark-mode'));
    });
    if (localStorage.getItem('notaku_dark_mode') === 'true') { document.body.classList.add('dark-mode'); }
  }
});

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
