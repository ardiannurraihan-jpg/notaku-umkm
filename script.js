// ============================================
//   NOTAKU AI — MAIN SCRIPT (FULL VERSION)
//   Compatible with index.html (Voice to Invoice, AI Quick Generate, 11 Templates, Dashboard)
// ============================================

let itemCount = 0;
let currentTemplate = 'classic';
let revenueChart = null;
let transactionHistory = [];
let invoiceHistory = [];
let userLogo = null;
let isRecording = false;
let recognition = null;

const GEMINI_API_KEY = 'AIzaSyB4kY3ZXsINoRbMRBZmSihV_7YSjkG_x44';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ========== SAVE & LOAD ==========
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
      data.items.forEach(item => addItem(item.name, parseFloat(item.qty), parseFloat(item.price)));
    }
  } catch(e) { console.warn("Gagal memuat nota terakhir:", e); }
}

function loadInvoiceHistory() {
  const saved = localStorage.getItem('notaku_invoice_history');
  if (saved) {
    try { invoiceHistory = JSON.parse(saved); displayInvoiceHistory(); } catch(e) {}
  }
}

function displayInvoiceHistory() {
  const container = document.getElementById('invoiceHistoryList');
  if (!container) return;
  if (invoiceHistory.length === 0) { container.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--muted)">Belum ada riwayat nota</div>'; return; }
  container.innerHTML = invoiceHistory.slice(0, 20).map(inv => `
    <div class="history-item" onclick="loadInvoiceById(${inv.id})">
      <div class="history-item-header"><span class="history-number">${inv.invoiceNumber}</span><span class="history-date">${new Date(inv.createdAt).toLocaleDateString('id-ID')}</span></div>
      <div class="history-store">${inv.storeName || 'Nama Toko'}</div>
      <div class="history-buyer">${inv.buyerName || 'Pelanggan'}</div>
      <div class="history-actions"><button onclick="event.stopPropagation(); duplicateInvoice(${inv.id})">📋 Duplikat</button><button onclick="event.stopPropagation(); deleteInvoice(${inv.id})">🗑️ Hapus</button></div>
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
    invoice.items.forEach(item => addItem(item.name, parseFloat(item.qty), parseFloat(item.price)));
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

// ========== UPLOAD LOGO ==========
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
        updateDashboardStats();
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
  updateDashboardStats();
  if (document.getElementById('invoicePreview').style.display !== 'none') generateInvoice();
}

function loadUserLogo() { const saved = localStorage.getItem('notaku_user_logo'); if (saved) userLogo = saved; }

// ========== VOICE TO INVOICE ==========
function openVoiceModal() { document.getElementById('voiceModal').style.display = 'flex'; }
function closeVoiceModal() { document.getElementById('voiceModal').style.display = 'none'; }

function toggleVoiceRecording() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Browser Anda tidak mendukung voice recognition. Silakan ketik manual.', 'warn');
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (isRecording) {
    if (recognition) recognition.stop();
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'id-ID';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onstart = () => {
    isRecording = true;
    const btn = document.getElementById('voiceRecordBtn');
    if (btn) btn.style.background = '#c0431a';
    document.getElementById('vrbText').textContent = 'Mendengarkan...';
    showToast('🎙️ Bicara sekarang...', 'info');
  };
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('voiceTextInput').value = transcript;
    showToast('✅ Suara dikenali! Klik "Proses dengan AI"', 'success');
  };
  recognition.onerror = () => { showToast('❌ Gagal mengenali suara. Coba lagi atau ketik manual.', 'error'); stopRecording(); };
  recognition.onend = () => stopRecording();
  recognition.start();
}
function stopRecording() {
  isRecording = false;
  const btn = document.getElementById('voiceRecordBtn');
  if (btn) btn.style.background = '';
  document.getElementById('vrbText').textContent = 'Tap untuk mulai bicara';
}
function processVoiceInput() {
  const text = document.getElementById('voiceTextInput').value.trim();
  if (!text) { showToast('Masukkan deskripsi produk terlebih dahulu!', 'warn'); return; }
  showToast('🤖 AI sedang memproses...', 'info');
  const prompt = `Ekstrak daftar produk dari teks berikut: "${text}". Format output: JSON array dengan key "nama", "qty", "harga". Contoh: [{"nama":"batik","qty":3,"harga":150000}]. Hanya output JSON, tanpa penjelasan.`;
  fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  }).then(res => res.json()).then(data => {
    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      const items = JSON.parse(aiText);
      if (items.length === 0) throw new Error();
      items.forEach(item => addItem(item.nama, item.qty || 1, item.harga || 0));
      closeVoiceModal();
      showToast(`✅ ${items.length} produk ditambahkan!`, 'success');
    } catch(e) { showToast('❌ Gagal mengekstrak produk. Coba format lain.', 'error'); }
  }).catch(() => showToast('❌ AI error, coba lagi.', 'error'));
}

// ========== AI QUICK GENERATE ==========
function aiQuickGenerate() {
  const input = document.getElementById('aiQuickInput');
  const text = input?.value.trim();
  if (!text) { showToast('Masukkan deskripsi produk!', 'warn'); return; }
  showToast('🤖 AI sedang memproses...', 'info');
  const prompt = `Ekstrak daftar produk dari: "${text}". Format JSON array: [{"nama":"...","qty":...,"harga":...}]. Harga dalam Rupiah. Hanya JSON.`;
  fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  }).then(res => res.json()).then(data => {
    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      const items = JSON.parse(aiText);
      if (items.length === 0) throw new Error();
      const itemsContainer = document.getElementById('itemsList');
      if (itemsContainer) itemsContainer.innerHTML = '';
      itemCount = 0;
      items.forEach(item => addItem(item.nama, item.qty || 1, item.harga || 0));
      input.value = '';
      showToast(`✅ ${items.length} produk ditambahkan!`, 'success');
    } catch(e) { showToast('❌ Gagal memproses. Contoh: "Jual 3 batik @150rb"', 'error'); }
  }).catch(() => showToast('❌ AI error, coba lagi.', 'error'));
}

// ========== SHARE & EXPORT ==========
async function shareToWhatsApp() {
  const invoice = document.getElementById('invoicePreview');
  if (!invoice || invoice.style.display === 'none') { showToast('Generate nota dulu!', 'warn'); return; }
  showToast('Menyiapkan gambar...', 'info');
  const canvas = await html2canvas(invoice, { scale: 2, backgroundColor: '#ffffff', logging: false });
  const imgData = canvas.toDataURL('image/jpeg', 0.9);
  const storeName = document.getElementById('storeName')?.value || 'NotaKu';
  const buyerName = document.getElementById('buyerName')?.value || 'Pelanggan';
  const total = document.getElementById('inv-total')?.textContent || 'Rp 0';
  const invoiceNum = document.getElementById('invoiceNumber')?.value || '';
  const link = document.createElement('a'); link.href = imgData; link.download = `nota-${invoiceNum.replace(/\//g, '-')}.jpg`; link.click();
  const text = `Halo! Berikut nota dari ${storeName} untuk ${buyerName}\nNo: ${invoiceNum}\nTotal: ${total}\n\nDibuat dengan NotaKu AI`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  showToast('Gambar nota terdownload! Buka WA untuk share', 'success');
}

function exportToExcel() {
  if (transactionHistory.length === 0) { showToast('Belum ada data transaksi!', 'warn'); return; }
  let html = `<html><head><meta charset="UTF-8"><title>NotaKu - Laporan Penjualan</title><style>body{font-family:Arial;margin:20px;}th{background:#c9952a;color:white;}</style></head><body><h1>📊 Laporan Penjualan NotaKu AI</h1><p>Periode: ${new Date().toLocaleDateString('id-ID')}</p><p>Total Transaksi: ${transactionHistory.length}</p><p>Total Pendapatan: ${formatRupiah(transactionHistory.reduce((s,t)=>s+t.total,0))}</p><hr/><table><thead><tr><th>Tanggal</th><th>Total (Rp)</th></tr></thead><tbody>${transactionHistory.map(t=>`<tr><td>${new Date(t.date).toLocaleDateString('id-ID')}</td><td>${Number(t.total).toLocaleString('id-ID')}</td></tr>`).join('')}<tr style="font-weight:bold;background:#f2ead8"><td>TOTAL</td><td>${transactionHistory.reduce((s,t)=>s+t.total,0).toLocaleString('id-ID')}</td></tr></tbody></table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `notaku-laporan-${new Date().toISOString().split('T')[0]}.xls`; a.click(); URL.revokeObjectURL(url);
  showToast('✅ Laporan Excel berhasil diunduh!', 'success');
}

function exportStats() {
  if (transactionHistory.length === 0) { showToast('Belum ada data!', 'warn'); return; }
  let csv = 'Tanggal,Total (Rp)\n';
  transactionHistory.forEach(t => { csv += `${new Date(t.date).toLocaleDateString('id-ID')},${t.total}\n`; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `notaku-stats-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  showToast('CSV terdownload!', 'success');
}

// ========== AI SMART INVOICE ==========
async function aiSmartSuggest() {
  const items = [];
  document.querySelectorAll('.item-row').forEach(row => {
    const name = row.querySelector('.item-name')?.value.trim();
    if (name) items.push({ name, qty: row.querySelector('.item-qty')?.value || 1 });
  });
  if (items.length === 0) { showToast('Tambahkan produk dulu!', 'warn'); return; }
  showToast('🤖 AI sedang menganalisis harga pasar...', 'info');
  const prompt = `Berdasarkan produk: ${items.map(i=>i.name).join(', ')}. Beri saran: 1. Harga jual realistis di Indonesia (kisaran Rp), 2. Diskon menarik (persen), 3. Deskripsi nota profesional. Format JSON: {"hargaSaran":"Rp X - Y","diskonSaran":Z,"deskripsiSaran":"..."}`;
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let suggestion;
    try { suggestion = JSON.parse(aiText); } catch(e) { suggestion = { hargaSaran: 'Rp 50.000 - 200.000', diskonSaran: 10, deskripsiSaran: 'Terima kasih telah berbelanja!' }; }
    let discValue = suggestion.diskonSaran || 10;
    document.getElementById('aiSuggestionResult').innerHTML = `
      <div style="background:rgba(201,149,42,0.1); padding:1rem; border-radius:12px; margin-top:0.5rem;">
        <div><strong>💰 Saran Harga:</strong> ${suggestion.hargaSaran}</div>
        <div><strong>🎯 Saran Diskon:</strong> ${discValue}%</div>
        <div><strong>📝 Saran Deskripsi:</strong> ${suggestion.deskripsiSaran}</div>
        <button onclick="applyAIDiscount(${discValue})" style="margin-top:0.7rem;background:var(--gold);border:none;padding:0.3rem 1rem;border-radius:20px;cursor:pointer;">✨ Terapkan Diskon</button>
      </div>`;
    showToast('✅ AI saran harga siap!', 'success');
  } catch(e) { showToast('⚠️ AI offline, pakai saran default', 'warn'); }
}
function applyAIDiscount(disc) { document.getElementById('discount').value = Math.min(disc, 50); showToast(`✅ Diskon ${Math.min(disc,50)}% diterapkan!`, 'success'); }

// ========== DASHBOARD & ANALYST ==========
function updateDashboardStats() {
  const hc = document.getElementById('historyCount'); if (hc) hc.innerHTML = `${invoiceHistory.length} nota`;
  const ls = document.getElementById('logoStatus'); if (ls) ls.innerHTML = userLogo ? '✓ Logo terpasang' : 'Belum ada logo';
  const ap = document.getElementById('aiAnalystPreview'); if (ap) ap.innerHTML = transactionHistory.length > 0 ? `${transactionHistory.length} transaksi` : 'Buat nota dulu';
  const pp = document.getElementById('predictionPreview');
  if (pp && transactionHistory.length > 0) { const avg = transactionHistory.reduce((s,t)=>s+t.total,0)/transactionHistory.length; pp.innerHTML = `Prediksi: ${formatRupiah(avg * 30)}/bulan`; }
}

function openAIAnalyst() {
  const modal = document.createElement('div'); modal.className = 'modal-detail active';
  modal.innerHTML = `<div class="modal-detail-content"><div class="modal-detail-header"><h3 style="color:var(--gold);">🤖 AI Smart Analyst</h3><button class="modal-detail-close" onclick="this.closest('.modal-detail').remove()">✕</button></div><div class="modal-detail-body"><div id="aiAnalystResult">Menganalisis data...</div><button id="deepAnalysisBtn" onclick="runDeepAnalysis()" style="background:linear-gradient(135deg,#6b3fa0,#c9952a);border:none;padding:0.8rem;border-radius:12px;cursor:pointer;width:100%;margin-top:1rem;">🔍 Analisis Mendalam</button><div id="deepAnalysisResult" style="margin-top:1rem;"></div></div></div>`;
  document.body.appendChild(modal);
  runSmartAnalysis();
}

async function runSmartAnalysis() {
  const rd = document.getElementById('aiAnalystResult');
  if (!rd) return;
  if (transactionHistory.length === 0) { rd.innerHTML = '⚠️ Belum ada data transaksi. Buat nota dulu.'; return; }
  rd.innerHTML = '🤔 AI sedang menganalisis...';
  const total = transactionHistory.reduce((s,t)=>s+t.total,0);
  const prompt = `Analisis bisnis: Total pendapatan Rp ${total.toLocaleString('id-ID')}, ${transactionHistory.length} transaksi. Beri 3 insight actionable. Format: bullet point dengan emoji.`;
  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const data = await res.json();
    let analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Siap untuk analisis mendalam.';
    rd.innerHTML = `<div style="background:rgba(201,149,42,0.1);padding:1rem;border-radius:12px;">${analysis.replace(/\n/g,'<br>')}</div>`;
  } catch(e) { rd.innerHTML = '<div>⚠️ Gagal terhubung ke AI. Coba lagi nanti.</div>'; }
}

async function runDeepAnalysis() {
  const rd = document.getElementById('deepAnalysisResult'); const btn = document.getElementById('deepAnalysisBtn');
  if (!rd) return;
  rd.innerHTML = '🧠 AI melakukan analisis mendalam...'; if (btn) btn.disabled = true;
  const total = transactionHistory.reduce((s,t)=>s+t.total,0);
  const prompt = `Berikan 5 rekomendasi strategis untuk meningkatkan pendapatan 2x lipat dalam 3 bulan untuk UMKM dengan total pendapatan Rp ${total.toLocaleString('id-ID')}. Format: bullet point dengan emoji.`;
  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const data = await res.json();
    let analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analisis selesai.';
    rd.innerHTML = `<div style="background:rgba(201,149,42,0.08);padding:1rem;border-radius:12px;">${analysis.replace(/\n/g,'<br>')}</div>`;
  } catch(e) { rd.innerHTML = '<div>⚠️ Gagal mendapatkan analisis mendalam.</div>'; }
  if (btn) btn.disabled = false;
}

function openLogoUpload() { uploadLogo(); }
function openInvoiceHistory() { openHistoryModal(); }
function openRevenuePrediction() { calculatePrediction(); }

function openHistoryModal() {
  const modal = document.createElement('div'); modal.className = 'modal-detail active';
  modal.innerHTML = `<div class="modal-detail-content" style="max-width:700px;"><div class="modal-detail-header"><h3 style="color:var(--gold);">📜 Riwayat Nota</h3><button class="modal-detail-close" onclick="this.closest('.modal-detail').remove()">✕</button></div><div class="modal-detail-body"><div id="historyModalList"></div></div></div>`;
  document.body.appendChild(modal);
  const container = document.getElementById('historyModalList');
  if (invoiceHistory.length === 0) { container.innerHTML = '<div style="text-align:center;padding:2rem;">Belum ada riwayat nota</div>'; return; }
  container.innerHTML = invoiceHistory.map(inv => `
    <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:1rem;margin-bottom:0.8rem;">
      <div style="display:flex;justify-content:space-between;"><strong style="color:var(--gold);">${inv.invoiceNumber}</strong><span style="font-size:0.7rem;">${new Date(inv.createdAt).toLocaleDateString('id-ID')}</span></div>
      <div style="font-size:0.8rem;">${inv.storeName || 'Nama Toko'} → ${inv.buyerName || 'Pelanggan'}</div>
      <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
        <button onclick="event.stopPropagation(); loadInvoiceById(${inv.id}); document.querySelector('.modal-detail').remove();" style="background:var(--gold);border:none;padding:0.3rem 0.8rem;border-radius:6px;">📋 Muat</button>
        <button onclick="event.stopPropagation(); duplicateInvoice(${inv.id}); setTimeout(()=>document.querySelector('.modal-detail')?.remove(),500);" style="background:var(--gold);border:none;padding:0.3rem 0.8rem;border-radius:6px;">📋 Duplikat</button>
        <button onclick="event.stopPropagation(); deleteInvoice(${inv.id}); updateDashboardStats();" style="background:transparent;border:1px solid var(--rust);padding:0.3rem 0.8rem;border-radius:6px;color:var(--rust);">🗑️ Hapus</button>
      </div>
    </div>
  `).join('');
}

function calculatePrediction() {
  if (transactionHistory.length < 3) { showToast('Butuh minimal 3 transaksi untuk prediksi', 'warn'); return; }
  const total = transactionHistory.reduce((s,t)=>s+t.total,0);
  const avgDaily = total / transactionHistory.length;
  const nextMonth = avgDaily * 30;
  showToast(`📈 Prediksi pendapatan bulan depan: ${formatRupiah(nextMonth)}`, 'info');
}

function setChatInput(text) { document.getElementById('chatInput').value = text; sendChatMessage(); }

async function sendChatMessage() {
  const input = document.getElementById('chatInput'); const message = input?.value.trim();
  if (!message) return;
  const messagesDiv = document.getElementById('chatMessages');
  if (!messagesDiv) return;
  const userDiv = document.createElement('div'); userDiv.className = 'acw-msg user'; userDiv.innerHTML = `<div class="acw-avatar">👤</div><div class="acw-bubble">${message}</div>`;
  messagesDiv.appendChild(userDiv); input.value = ''; messagesDiv.scrollTop = messagesDiv.scrollHeight;
  const aiDiv = document.createElement('div'); aiDiv.className = 'acw-msg ai'; aiDiv.innerHTML = `<div class="acw-avatar">🧠</div><div class="acw-bubble">AI sedang berpikir...</div>`;
  messagesDiv.appendChild(aiDiv); messagesDiv.scrollTop = messagesDiv.scrollHeight;
  const total = transactionHistory.reduce((s,t)=>s+t.total,0);
  const prompt = `Anda AI bisnis. Data: ${transactionHistory.length} transaksi, total Rp ${total.toLocaleString('id-ID')}. Pertanyaan: "${message}". Jawab ramah, actionable.`;
  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const data = await res.json();
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, AI sibuk. Coba lagi.';
    aiDiv.innerHTML = `<div class="acw-avatar">🧠</div><div class="acw-bubble">${reply.replace(/\n/g,'<br>')}</div>`;
  } catch(e) { aiDiv.innerHTML = `<div class="acw-avatar">🧠</div><div class="acw-bubble">⚠️ Gagal terhubung ke AI. Coba lagi.</div>`; }
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function scrollToPremium() { document.getElementById('premium')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function showTemplateDemo(template) { switchTemplate(template); closeTemplateDemo(); showToast(`Template ${template} diterapkan!`, 'success'); }
function applyDemoTemplate() { showToast('Template siap digunakan! Generate nota untuk melihat hasil.', 'success'); }
function closeTemplateDemo() { document.getElementById('templateDemoModal').style.display = 'none'; }

// ========== STATISTICS ==========
function saveTransaction(total) {
  transactionHistory.push({ date: new Date().toISOString(), total: total });
  localStorage.setItem('notaku_stats', JSON.stringify(transactionHistory));
  updateStats();
}
function updateStats() {
  const total = transactionHistory.length, revenue = transactionHistory.reduce((s,t)=>s+t.total,0), avg = total > 0 ? revenue/total : 0;
  const el = (id) => document.getElementById(id);
  if (el('totalTransactions')) el('totalTransactions').textContent = total;
  if (el('totalRevenue')) el('totalRevenue').textContent = formatRupiah(revenue);
  if (el('avgTransaction')) el('avgTransaction').textContent = formatRupiah(avg);
  updateChart(); updateDashboardStats();
}
function updateChart() {
  const last7Days = [], last7Revenue = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate()-i); last7Days.push(d.toLocaleDateString('id-ID',{day:'numeric',month:'short'})); const rev = transactionHistory.filter(t => t.date.split('T')[0] === d.toISOString().split('T')[0]).reduce((s,t)=>s+t.total,0); last7Revenue.push(rev); }
  if (revenueChart) revenueChart.destroy();
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  revenueChart = new Chart(canvas.getContext('2d'), { type: 'line', data: { labels: last7Days, datasets: [{ label: 'Pendapatan (Rp)', data: last7Revenue, borderColor: '#c9952a', backgroundColor: 'rgba(201,149,42,0.08)', tension: 0.4, fill: true }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => 'Rp ' + Number(v).toLocaleString('id-ID') } } } } });
}
function resetStats() { if (confirm('Reset semua statistik?')) { transactionHistory = []; localStorage.removeItem('notaku_stats'); updateStats(); showToast('Statistik direset', 'warn'); } }

// ========== TEMPLATES & PREMIUM ==========
function switchTemplate(templateName) {
  currentTemplate = templateName; const preview = document.getElementById('invoicePreview');
  if (preview) preview.className = `invoice-template template-${currentTemplate}`;
  document.querySelectorAll('.tpl-btn').forEach(b => b.classList.toggle('active', b.dataset.template === templateName));
}
function checkPremiumStatus() {
  if (!window.PremiumAPI) return;
  const isPremium = window.PremiumAPI.isPremium() && !window.PremiumAPI.isExpired();
  const watermark = document.getElementById('watermark');
  const aiContainer = document.getElementById('aiSmartContainer');
  const dashboard = document.getElementById('premiumDashboard');
  const premiumTemplates = document.getElementById('premiumTemplates');
  const premiumTabLock = document.getElementById('premiumTabLock');
  if (isPremium) {
    if (watermark) watermark.style.display = 'none';
    if (aiContainer) aiContainer.style.display = 'block';
    if (dashboard) dashboard.style.display = 'block';
    if (premiumTemplates) premiumTemplates.style.display = 'grid';
    if (premiumTabLock) premiumTabLock.style.display = 'none';
    if (document.getElementById('premiumStatus')) document.getElementById('premiumStatus').innerHTML = `👑 Premium aktif! ✨ 11 template + AI lengkap`;
  } else {
    if (watermark) watermark.style.display = 'block';
    if (aiContainer) aiContainer.style.display = 'none';
    if (dashboard) dashboard.style.display = 'none';
    if (premiumTemplates) premiumTemplates.style.display = 'none';
    if (premiumTabLock) premiumTabLock.style.display = 'inline';
  }
}
function activatePremium() {
  const key = document.getElementById('premiumKey')?.value.trim();
  if (!key) { showToast('⚠️ Masukkan kode premium!', 'warn'); return; }
  if (window.PremiumAPI && window.PremiumAPI.activate(key)) { showToast('✅ Premium aktif!', 'success'); checkPremiumStatus(); document.getElementById('premiumKey').value = ''; }
  else { showToast('❌ Kode tidak valid.', 'error'); }
}
function showPaymentInfo(paket, nominal) {
  const paymentDiv = document.getElementById('paymentInfo'); const amountSpan = document.getElementById('paymentAmount');
  if (paymentDiv) paymentDiv.style.display = 'block';
  if (amountSpan) amountSpan.textContent = `Rp ${nominal.toLocaleString('id-ID')}`;
  paymentDiv?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast(`💳 Transfer Rp ${nominal.toLocaleString('id-ID')} ke BRI`, 'success');
}
function copyPaymentInfo() {
  navigator.clipboard?.writeText('359301009186508').then(() => showToast('✅ No. rekening dicopy!', 'success')).catch(() => showToast('✅ No. rekening dicopy!', 'success'));
}

// ========== ITEMS & PRODUCTS ==========
function addItem(name = '', qty = 1, price = 0) {
  itemCount++; const id = itemCount; const list = document.getElementById('itemsList');
  if (!list) return;
  const row = document.createElement('div'); row.className = 'item-row'; row.id = `item-${id}`;
  row.innerHTML = `<input type="text" placeholder="Nama produk" class="item-name" value="${escapeHtml(name)}" /><input type="number" placeholder="Qty" class="item-qty" min="1" value="${qty}" /><input type="number" placeholder="Harga" class="item-price" min="0" value="${price}" /><button class="remove-btn" onclick="removeItem(${id})">✕</button>`;
  list.appendChild(row);
}
function removeItem(id) { document.getElementById(`item-${id}`)?.remove(); }
function showSaveProductModal() { document.getElementById('saveProductModal').style.display = 'block'; }
function closeSaveProductModal() { document.getElementById('saveProductModal').style.display = 'none'; }
function showPremiumModal() { document.getElementById('premiumModal').style.display = 'block'; }
function closePremiumModal() { document.getElementById('premiumModal').style.display = 'none'; }

function saveProduct() {
  const name = document.getElementById('saveProductName').value.trim();
  const price = parseFloat(document.getElementById('saveProductPrice').value);
  if (!name || isNaN(price) || price <= 0) { showToast('⚠️ Masukkan nama & harga valid!', 'warn'); return; }
  const products = JSON.parse(localStorage.getItem('notaku_products') || '[]');
  if (products.find(p => p.name.toLowerCase() === name.toLowerCase())) { showToast('⚠️ Produk sudah tersimpan!', 'warn'); return; }
  products.push({ name, price });
  localStorage.setItem('notaku_products', JSON.stringify(products));
  displaySavedProducts(products);
  closeSaveProductModal();
  document.getElementById('saveProductName').value = ''; document.getElementById('saveProductPrice').value = '';
  showToast(`✅ "${name}" disimpan!`, 'success');
}
function displaySavedProducts(products) {
  const container = document.getElementById('savedProducts');
  if (!container) return; container.innerHTML = '';
  if (products.length === 0) { container.innerHTML = '<span>Belum ada produk</span>'; return; }
  products.forEach((product, index) => {
    const btn = document.createElement('div'); btn.className = 'saved-product';
    btn.innerHTML = `<span>${escapeHtml(product.name)}</span><span>${formatRupiah(product.price)}</span><button onclick="deleteProduct(event, ${index})">✕</button>`;
    btn.onclick = (e) => { if (e.target.tagName === 'BUTTON') return; addItem(product.name, 1, product.price); };
    container.appendChild(btn);
  });
}
function deleteProduct(e, index) {
  e.stopPropagation();
  const products = JSON.parse(localStorage.getItem('notaku_products') || '[]');
  products.splice(index, 1);
  localStorage.setItem('notaku_products', JSON.stringify(products));
  displaySavedProducts(products);
  showToast('Produk dihapus', 'warn');
}

// ========== GENERATE INVOICE ==========
function generateInvoice() {
  const rows = document.querySelectorAll('.item-row'); const items = [];
  rows.forEach(row => {
    const name = row.querySelector('.item-name')?.value.trim();
    const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    if (name || price > 0) items.push({ name: name || '-', qty, price, subtotal: qty * price });
  });
  if (items.length === 0) { showToast('⚠️ Tambahkan produk!', 'warn'); return; }
  const get = id => document.getElementById(id)?.value.trim() || '';
  const storeName = get('storeName') || 'Nama Toko', storeAddress = get('storeAddress'), storePhone = get('storePhone');
  const buyerName = get('buyerName') || 'Pelanggan', buyerPhone = get('buyerPhone');
  const invoiceNum = get('invoiceNumber'), invoiceDate = get('invoiceDate');
  const discount = parseFloat(document.getElementById('discount')?.value) || 0;
  const taxPct = parseFloat(document.getElementById('tax')?.value) || 0;
  const notes = get('notes');
  const subtotal = items.reduce((s,i)=>s+i.subtotal,0);
  const taxAmt = Math.round(subtotal * taxPct / 100);
  const total = Math.max(0, subtotal - discount + taxAmt);
  saveTransaction(total); saveCurrentInvoice();
  const set = (id,val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('inv-storeName', storeName); set('inv-storeAddress', storeAddress); set('inv-storePhone', storePhone ? `☎ ${storePhone}` : '');
  set('inv-number', invoiceNum); set('inv-date', formatDate(invoiceDate));
  set('inv-buyerName', buyerName); set('inv-buyerPhone', buyerPhone ? `☎ ${buyerPhone}` : ''); set('inv-sigName', storeName);
  const tbody = document.getElementById('inv-items');
  if (tbody) { tbody.innerHTML = ''; items.forEach(item => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${escapeHtml(item.name)}</td><td style="text-align:center">${item.qty}</td><td>${formatRupiah(item.price)}</td><td style="text-align:right;font-weight:600">${formatRupiah(item.subtotal)}</td>`; tbody.appendChild(tr); }); }
  set('inv-subtotal', formatRupiah(subtotal));
  const dr = document.getElementById('inv-discountRow'); if(dr) dr.style.display = discount > 0 ? 'flex' : 'none';
  set('inv-discount', discount > 0 ? `- ${formatRupiah(discount)}` : '');
  const tr = document.getElementById('inv-taxRow'); if(tr) tr.style.display = taxPct > 0 ? 'flex' : 'none';
  set('inv-tax', taxPct > 0 ? `+ ${formatRupiah(taxAmt)} (${taxPct}%)` : '');
  set('inv-total', formatRupiah(total));
  const ns = document.getElementById('inv-notesSection'); if(ns) ns.style.display = notes ? 'block' : 'none';
  set('inv-notes', notes);
  const placeholder = document.getElementById('previewPlaceholder'); if(placeholder) placeholder.style.display = 'none';
  const preview = document.getElementById('invoicePreview'); if(preview) preview.style.display = 'block';
  const actions = document.getElementById('previewActions'); if(actions) actions.style.display = 'flex';
  if(preview) preview.className = `invoice-template template-${currentTemplate}`;
  incrementInvoiceNumber(); preview?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('✅ Nota berhasil dibuat!', 'success');
}

function incrementInvoiceNumber() {
  const inv = document.getElementById('invoiceNumber');
  if (!inv) return;
  let curr = inv.value;
  const match = curr.match(/\/(\d+)$/);
  if (match) { const next = (parseInt(match[1],10)+1).toString().padStart(match[1].length,'0'); inv.value = curr.replace(/\d+$/, next); }
  else { const rand = Math.floor(Math.random()*9000)+1000; const date = new Date(); inv.value = `INV/${date.getFullYear()}/${(date.getMonth()+1).toString().padStart(2,'0')}/${rand}`; }
}

async function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const invoice = document.getElementById('invoicePreview');
  if (!invoice) return;
  const btn = event?.target?.closest('button'); const orig = btn?.innerHTML || '';
  if(btn) { btn.innerHTML = '⏳…'; btn.disabled = true; }
  const origStyle = { width: invoice.style.width, maxWidth: invoice.style.maxWidth, margin: invoice.style.margin };
  invoice.style.width = '600px'; invoice.style.maxWidth = '600px'; invoice.style.margin = '0';
  try {
    await new Promise(r => setTimeout(r, 250));
    const canvas = await html2canvas(invoice, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff', logging: false });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 6, 6, w - 12, h);
    pdf.save(`nota-${document.getElementById('invoiceNumber')?.value.replace(/\//g,'-')||'notaku'}.pdf`);
    showToast('✅ PDF siap!', 'success');
  } catch(e) { showToast('❌ Gagal buat PDF', 'error'); }
  invoice.style.width = origStyle.width; invoice.style.maxWidth = origStyle.maxWidth; invoice.style.margin = origStyle.margin;
  if(btn) { btn.innerHTML = orig; btn.disabled = false; }
}
function printInvoice() {
  const invoice = document.getElementById('invoicePreview');
  if (!invoice) return;
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>NotaKu</title><link rel="stylesheet" href="style.css"/><style>body{padding:1rem;background:#fff;}@media print{body{padding:0;}}</style></head><body>${invoice.outerHTML}<script>window.onload=()=>{window.print();window.close();};<\/script></body></html>`);
  w.document.close();
}

// ========== HELPERS ==========
function showToast(msg, type='info') {
  const t = document.querySelector('.nk-toast');
  if(t) t.remove();
  const toast = document.createElement('div'); toast.className = 'nk-toast'; toast.textContent = msg;
  const colors = { success: '#2a7a4b', error: '#c0431a', warn: '#c9952a', info: '#1a1510' };
  Object.assign(toast.style, { position: 'fixed', bottom: '2rem', right: '2rem', background: colors[type]||colors.info, color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', fontWeight: '600', zIndex: '9999', boxShadow: '0 8px 30px rgba(0,0,0,0.25)', maxWidth: '360px', transform: 'translateY(20px)', opacity: '0', transition: 'all 0.3s ease' });
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; });
  setTimeout(() => { toast.style.transform = 'translateY(20px)'; toast.style.opacity = '0'; setTimeout(()=>toast.remove(),300); }, 3500);
}
function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, m => m==='&'?'&amp;':m==='<'?'&lt;':m==='>'?'&gt;':m); }
function formatRupiah(num) { return 'Rp ' + Number(num||0).toLocaleString('id-ID'); }
function formatDate(str) { if(!str) return ''; return new Date(str).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }); }

function loadData() {
  const p = localStorage.getItem('notaku_products');
  if(p) { try { displaySavedProducts(JSON.parse(p)); } catch(e) {} }
  const s = localStorage.getItem('notaku_stats');
  if(s) { try { transactionHistory = JSON.parse(s); updateStats(); } catch(e) {} }
  loadUserLogo(); loadInvoiceHistory(); updateDashboardStats();
}

// ========== INIT ==========
window.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  const dateEl = document.getElementById('invoiceDate'); if(dateEl) dateEl.value = today;
  const num = String(Math.floor(Math.random()*9000)+1000);
  const month = String(new Date().getMonth()+1).padStart(2,'0');
  const year = new Date().getFullYear();
  const numEl = document.getElementById('invoiceNumber'); if(numEl) numEl.value = `INV/${year}/${month}/${num}`;
  addItem(); addItem();
  loadData(); loadLastInvoice();
  checkPremiumStatus();
  
  document.querySelectorAll('.tpl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = btn.dataset.template;
      if (window.PremiumAPI && window.PremiumAPI.isTemplatePremium && window.PremiumAPI.isTemplatePremium(tpl)) {
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
  if(toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const dark = document.body.classList.contains('dark-mode');
      toggleBtn.innerHTML = dark ? '☀️' : '🌙';
      localStorage.setItem('notaku_dark_mode', dark);
    });
    if(localStorage.getItem('notaku_dark_mode') === 'true') { document.body.classList.add('dark-mode'); toggleBtn.innerHTML = '☀️'; }
  }
  
  document.querySelectorAll('.ttab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.ttab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const freeDiv = document.getElementById('freeTemplates');
      const premiumDiv = document.getElementById('premiumTemplates');
      if(target === 'free') { freeDiv.style.display = 'grid'; premiumDiv.style.display = 'none'; }
      else { freeDiv.style.display = 'none'; premiumDiv.style.display = 'grid'; }
    });
  });
});

// Timer countdown
function updateTimer() {
  const endTime = localStorage.getItem('notaku_offer_end');
  let target;
  if(endTime) target = new Date(endTime);
  else { target = new Date(); target.setHours(target.getHours()+24); localStorage.setItem('notaku_offer_end', target.toISOString()); }
  const now = new Date();
  const diff = Math.max(0, target - now);
  const hours = Math.floor(diff / (1000*60*60));
  const mins = Math.floor((diff % (3600000)) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const h = document.getElementById('timerH'); if(h) h.textContent = hours.toString().padStart(2,'0');
  const m = document.getElementById('timerM'); if(m) m.textContent = mins.toString().padStart(2,'0');
  const s = document.getElementById('timerS'); if(s) s.textContent = secs.toString().padStart(2,'0');
  if(diff <= 0 && document.getElementById('offerBanner')) document.getElementById('offerBanner').style.display = 'none';
}
setInterval(updateTimer, 1000); updateTimer();

// Social proof toast
setInterval(() => {
  const toast = document.getElementById('spToast');
  if(!toast) return;
  const names = ['Toko Mawar Semarang', 'Warung Sederhana', 'Boutique Aisha', 'Laundry Cepat', 'Bengkel Jaya', 'Kedai Kopi Nusantara', 'Toko Berkah'];
  const name = names[Math.floor(Math.random()*names.length)];
  document.getElementById('spName').textContent = name;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}, 30000);
