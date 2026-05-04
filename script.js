// ── STATE ──────────────────────────────────
let itemCount = 0;
let currentTemplate = 'classic';
let revenueChart = null;
let transactionHistory = [];

// Load data dari localStorage
function loadData() {
  const saved = localStorage.getItem('notaku_products');
  if (saved) {
    const products = JSON.parse(saved);
    displaySavedProducts(products);
  }
  
  const stats = localStorage.getItem('notaku_stats');
  if (stats) {
    transactionHistory = JSON.parse(stats);
    updateStats();
  }
}

// Tampilkan template premium untuk user premium
function showPremiumTemplates() {
    const premiumGroup = document.getElementById('premiumTemplateGroup');
    const premiumNote = document.getElementById('premiumTemplateNote');
    
    if (!premiumGroup) return;
    
    if (window.PremiumAPI && window.PremiumAPI.isPremium() && !window.PremiumAPI.isExpired()) {
        premiumGroup.style.display = 'block';
        if (premiumNote) premiumNote.style.display = 'block';
    } else {
        premiumGroup.style.display = 'none';
        if (premiumNote) premiumNote.style.display = 'none';
        
        // Jika user mencoba pilih template premium, reset ke classic
        const premiumTemplates = ['premium-luxury', 'premium-elegant', 'premium-dark', 'premium-art', 'premium-nature'];
        if (premiumTemplates.includes(currentTemplate)) {
            currentTemplate = 'classic';
            const classicBtn = document.querySelector('.template-btn[data-template="classic"]');
            if (classicBtn) classicBtn.classList.add('active');
            const invoicePreview = document.getElementById('invoicePreview');
            if (invoicePreview) invoicePreview.className = `invoice-template template-classic`;
        }
    }
}

// Cek status premium saat load
function checkPremiumStatus() {
  if (!window.PremiumAPI) return;
  
  const isPremium = window.PremiumAPI.isPremium();
  const isExpired = window.PremiumAPI.isExpired();
  const watermark = document.getElementById('watermark');
  const statusDiv = document.getElementById('premiumStatus');
  
  if (isPremium && !isExpired) {
    if (watermark) watermark.style.display = 'none';
    if (statusDiv) {
      const until = localStorage.getItem('notaku_premium_until');
      const remainingDays = window.PremiumAPI.getRemainingDays ? window.PremiumAPI.getRemainingDays() : 0;
      statusDiv.innerHTML = `👑 Premium aktif sampai ${new Date(until).toLocaleDateString('id-ID')} (${remainingDays} hari lagi)<br>✨ Kamu mendapatkan 5 template eksklusif!`;
    }
  } else {
    if (watermark) watermark.style.display = 'block';
    if (statusDiv && !isPremium) {
      statusDiv.innerHTML = '🔒 Upgrade ke Premium untuk:<br>✓ Hapus watermark<br>✓ 5 template eksklusif mewah<br>✓ Nota lebih profesional';
    }
  }
  
  // TAMPILKAN TEMPLATE PREMIUM
  showPremiumTemplates();
}

// Aktivasi premium
function activatePremium() {
  const key = document.getElementById('premiumKey').value;
  if (window.PremiumAPI && window.PremiumAPI.activate(key)) {
    alert('✅ Premium berhasil diaktifkan! Kamu sekarang mendapatkan 5 template eksklusif!');
    checkPremiumStatus();
    location.reload();
  } else {
    alert('❌ Kode premium tidak valid. Hubungi admin untuk mendapatkan kode.');
  }
}

// Simpan data ke localStorage
function saveProducts(products) {
  localStorage.setItem('notaku_products', JSON.stringify(products));
}

function saveTransaction(total) {
  const transaction = {
    date: new Date().toISOString(),
    total: total
  };
  transactionHistory.push(transaction);
  localStorage.setItem('notaku_stats', JSON.stringify(transactionHistory));
  updateStats();
}

function updateStats() {
  const totalTransactions = transactionHistory.length;
  const totalRevenue = transactionHistory.reduce((sum, t) => sum + t.total, 0);
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  
  document.getElementById('totalTransactions').textContent = totalTransactions;
  document.getElementById('totalRevenue').textContent = formatRupiah(totalRevenue);
  document.getElementById('avgTransaction').textContent = formatRupiah(avgTransaction);
  
  updateChart();
}

function updateChart() {
  const last7Days = [];
  const last7Revenue = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    last7Days.push(dateStr);
    
    const revenue = transactionHistory.filter(t => t.date.split('T')[0] === dateStr)
      .reduce((sum, t) => sum + t.total, 0);
    last7Revenue.push(revenue);
  }
  
  if (revenueChart) {
    revenueChart.destroy();
  }
  
  const ctx = document.getElementById('revenueChart').getContext('2d');
  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7Days,
      datasets: [{
        label: 'Pendapatan (Rp)',
        data: last7Revenue,
        borderColor: '#c9952a',
        backgroundColor: 'rgba(201,149,42,0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'top',
        }
      }
    }
  });
}

function resetStats() {
  if (confirm('Reset semua statistik? Data tidak dapat dikembalikan!')) {
    transactionHistory = [];
    localStorage.removeItem('notaku_stats');
    updateStats();
  }
}

// ── INIT ───────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('invoiceDate').value = today;
  
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const year = new Date().getFullYear();
  document.getElementById('invoiceNumber').value = `INV/${year}/${month}/${num}`;
  
  addItem();
  addItem();
  loadData();
  checkPremiumStatus();
  
  // Template selector
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTemplate = btn.dataset.template;
      document.getElementById('invoicePreview').className = `invoice-template template-${currentTemplate}`;
    });
  });
});

// ── ADD ITEM ROW ───────────────────────────
function addItem() {
  itemCount++;
  const id = itemCount;
  const list = document.getElementById('itemsList');
  
  const row = document.createElement('div');
  row.className = 'item-row';
  row.id = `item-${id}`;
  row.innerHTML = `
    <input type="text" placeholder="Nama produk/jasa" class="item-name" oninput="updateSubtotal(${id})" />
    <input type="number" placeholder="Qty" class="item-qty" min="1" value="1" oninput="updateSubtotal(${id})" />
    <input type="number" placeholder="Harga (Rp)" class="item-price" min="0" value="" oninput="updateSubtotal(${id})" />
    <button class="remove-btn" onclick="removeItem(${id})" title="Hapus">✕</button>
  `;
  list.appendChild(row);
}

function removeItem(id) {
  const row = document.getElementById(`item-${id}`);
  if (row) row.remove();
}

function updateSubtotal(id) {
  // just triggers on input — totals calculated on generate
}

// ── SAVED PRODUCTS ─────────────────────────
function saveProduct() {
  const name = document.getElementById('saveProductName').value.trim();
  const price = parseFloat(document.getElementById('saveProductPrice').value);
  
  if (!name || isNaN(price) || price <= 0) {
    alert('Masukkan nama produk dan harga yang valid!');
    return;
  }
  
  const products = JSON.parse(localStorage.getItem('notaku_products') || '[]');
  products.push({ name, price });
  saveProducts(products);
  displaySavedProducts(products);
  closeSaveProductModal();
  document.getElementById('saveProductName').value = '';
  document.getElementById('saveProductPrice').value = '';
}

function displaySavedProducts(products) {
  const container = document.getElementById('savedProducts');
  container.innerHTML = '';
  
  products.forEach(product => {
    const btn = document.createElement('div');
    btn.className = 'saved-product';
    btn.innerHTML = `${product.name}<br/><small>${formatRupiah(product.price)}</small>`;
    btn.onclick = () => addSavedProductToItems(product.name, product.price);
    container.appendChild(btn);
  });
}

function addSavedProductToItems(name, price) {
  addItem();
  const items = document.querySelectorAll('.item-row');
  const lastItem = items[items.length - 1];
  lastItem.querySelector('.item-name').value = name;
  lastItem.querySelector('.item-price').value = price;
}

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

// Click outside modal to close
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
}

// ── FORMAT RUPIAH ──────────────────────────
function formatRupiah(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── GENERATE INVOICE ───────────────────────
function generateInvoice() {
  const rows = document.querySelectorAll('.item-row');
  const items = [];
  rows.forEach(row => {
    const name = row.querySelector('.item-name').value.trim();
    const qty  = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    if (name || price > 0) {
      items.push({ name: name || '-', qty, price, subtotal: qty * price });
    }
  });
  
  if (items.length === 0) {
    alert('Tambahkan minimal 1 produk dulu!');
    return;
  }
  
  const storeName    = document.getElementById('storeName').value.trim() || 'Nama Toko';
  const storeAddress = document.getElementById('storeAddress').value.trim();
  const storePhone   = document.getElementById('storePhone').value.trim();
  const buyerName    = document.getElementById('buyerName').value.trim() || 'Pelanggan';
  const buyerPhone   = document.getElementById('buyerPhone').value.trim();
  const invoiceNum   = document.getElementById('invoiceNumber').value.trim();
  const invoiceDate  = document.getElementById('invoiceDate').value;
  const discount     = parseFloat(document.getElementById('discount').value) || 0;
  const taxPct       = parseFloat(document.getElementById('tax').value) || 0;
  const notes        = document.getElementById('notes').value.trim();
  
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const taxAmt   = Math.round(subtotal * taxPct / 100);
  const total    = subtotal - discount + taxAmt;
  
  // Kirim event ke Google Analytics
  if (typeof gtag === 'function') {
    gtag('event', 'generate_invoice', {
      'event_category': 'engagement',
      'event_label': storeName,
      'value': total
    });
  }
  
  // Save transaction untuk statistik
  saveTransaction(total);
  
  document.getElementById('inv-storeName').textContent = storeName;
  document.getElementById('inv-storeAddress').textContent = storeAddress;
  document.getElementById('inv-storePhone').textContent = storePhone ? `☎ ${storePhone}` : '';
  document.getElementById('inv-number').textContent = invoiceNum;
  document.getElementById('inv-date').textContent = formatDate(invoiceDate);
  document.getElementById('inv-buyerName').textContent = buyerName;
  document.getElementById('inv-buyerPhone').textContent = buyerPhone ? `☎ ${buyerPhone}` : '';
  document.getElementById('inv-sigName').textContent = storeName;
  
  const tbody = document.getElementById('inv-items');
  tbody.innerHTML = '';
  items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td style="text-align:center">${item.qty}</td>
      <td>${formatRupiah(item.price)}</td>
      <td style="text-align:right;font-weight:600">${formatRupiah(item.subtotal)}</td>
    `;
    tbody.appendChild(tr);
  });
  
  document.getElementById('inv-subtotal').textContent = formatRupiah(subtotal);
  
  if (discount > 0) {
    document.getElementById('inv-discountRow').style.display = 'flex';
    document.getElementById('inv-discount').textContent = `- ${formatRupiah(discount)}`;
  } else {
    document.getElementById('inv-discountRow').style.display = 'none';
  }
  
  if (taxPct > 0) {
    document.getElementById('inv-taxRow').style.display = 'flex';
    document.getElementById('inv-tax').textContent = `+ ${formatRupiah(taxAmt)} (${taxPct}%)`;
  } else {
    document.getElementById('inv-taxRow').style.display = 'none';
  }
  
  document.getElementById('inv-total').textContent = formatRupiah(total);
  
  if (notes) {
    document.getElementById('inv-notesSection').style.display = 'block';
    document.getElementById('inv-notes').textContent = notes;
  } else {
    document.getElementById('inv-notesSection').style.display = 'none';
  }
  
  document.getElementById('previewPlaceholder').style.display = 'none';
  document.getElementById('invoicePreview').style.display = 'block';
  document.getElementById('previewActions').style.display = 'flex';
  
  document.getElementById('invoicePreview').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── DOWNLOAD PDF (OPTIMIZED FOR HP) ──
async function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const invoice = document.getElementById('invoicePreview');
  
  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = '⏳ Menyiapkan...';
  btn.disabled = true;
  
  // Simpan style asli sementara
  const originalStyle = {
    width: invoice.style.width,
    maxWidth: invoice.style.maxWidth,
    margin: invoice.style.margin,
    transform: invoice.style.transform
  };
  
  // Set style untuk capture yang optimal
  invoice.style.width = '100%';
  invoice.style.maxWidth = '600px';
  invoice.style.margin = '0 auto';
  invoice.style.transform = 'scale(1)';
  
  try {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Ambil ukuran asli elemen
    const originalWidth = invoice.offsetWidth;
    const originalHeight = invoice.offsetHeight;
    
    // Hitung scale yang tepat untuk A5 (148mm x 210mm)
    const targetWidth = 600; // lebar target dalam pixel
    const scale = targetWidth / originalWidth;
    
    const canvas = await html2canvas(invoice, {
      scale: scale * 2,  // Scale dinamis
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: originalWidth,
      windowHeight: originalHeight,
      onclone: (clonedDoc, element) => {
        // Pastikan cloned element juga rapi
        element.style.width = '100%';
        element.style.maxWidth = '600px';
        element.style.margin = '0 auto';
      }
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Gunakan format A5 (148mm x 210mm) - landscape lebih nyaman di HP?
    // Coba portrait dulu
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();  // 148 mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    // Tambahkan margin kecil agar tidak kepotong
    const margin = 5; // margin 5mm
    const contentWidth = pdfWidth - (margin * 2);
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
    
    const filename = `nota-${document.getElementById('invoiceNumber').value.replace(/\//g, '-')}.pdf`;
    pdf.save(filename);
    
  } catch (e) {
    console.error('PDF Error:', e);
    alert('Gagal generate PDF. Silakan coba lagi atau gunakan fitur Print.');
  }
  
  // Kembalikan style asli
  invoice.style.width = originalStyle.width;
  invoice.style.maxWidth = originalStyle.maxWidth;
  invoice.style.margin = originalStyle.margin;
  invoice.style.transform = originalStyle.transform;
  
  btn.textContent = originalText;
  btn.disabled = false;
}

// ── PRINT ──────────────────────────────────
function printInvoice() {
  const invoice = document.getElementById('invoicePreview').outerHTML;
  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Nota</title>
      <link rel="stylesheet" href="style.css"/>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet"/>
      <style>
        body { padding: 1rem; background: white; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      ${invoice}
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
    </body>
    </html>
  `);
  printWin.document.close();
}

// ========== FUNGSI PREMIUM REAL ==========
function showPaymentInfo(paket, nominal) {
    const paymentDiv = document.getElementById('paymentInfo');
    const amountSpan = document.getElementById('paymentAmount');
    amountSpan.textContent = `Rp ${nominal.toLocaleString('id-ID')}`;
    paymentDiv.style.display = 'block';
    paymentDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    if (typeof gtag === 'function') {
        gtag('event', 'view_payment_info', {
            'event_category': 'premium',
            'event_label': paket,
            'value': nominal
        });
    }
}

function copyPaymentInfo() {
    const rekening = '359301009186508';
    navigator.clipboard.writeText(rekening);
    alert('✅ Nomor rekening sudah di-copy: ' + rekening);
    
    if (typeof gtag === 'function') {
        gtag('event', 'copy_rekening', {
            'event_category': 'premium',
            'event_label': 'BRI'
        });
    }
}
// Tambahkan fungsi ini di script.js
function exportStats() {
  if (transactionHistory.length === 0) {
    alert('Belum ada data transaksi untuk diexport.');
    return;
  }
  
  let csvContent = "Tanggal,Total (Rp)\n";
  transactionHistory.forEach(t => {
    const date = new Date(t.date).toLocaleDateString('id-ID');
    csvContent += `${date},${t.total}\n`;
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notaku-stats-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  alert('✅ Data statistik sudah diexport ke CSV!');
}
