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
    // Kirim event ke Google Analytics
if (typeof gtag === 'function') {
  gtag('event', 'generate_invoice', {
    'event_category': 'engagement',
    'event_label': document.getElementById('storeName').value || 'Toko',
    'value': total
  });
}
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

// ── DOWNLOAD PDF ───────────────────────────
async function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const invoice = document.getElementById('invoicePreview');
  
  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = '⏳ Menyiapkan...';
  btn.disabled = true;
  
  try {
    const canvas = await html2canvas(invoice, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    
    const pdfWidth  = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    
    const filename = `nota-${document.getElementById('invoiceNumber').value.replace(/\//g, '-')}.pdf`;
    pdf.save(filename);
  } catch (e) {
    alert('Gagal generate PDF. Coba lagi.');
    console.error(e);
  }
  
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
