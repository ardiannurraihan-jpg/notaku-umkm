// ============================================
//   NOTAKU — PREMIUM LICENSE SYSTEM (FULLY INTEGRATED)
//   Auto-sync with admin-generated keys
// ============================================

const PREMIUM_CONFIG = {

  // ── Daftar semua template premium ───────
  premiumTemplates: [
    'premium-luxury',
    'premium-elegant',
    'premium-dark',
    'premium-art',
    'premium-nature',
    'premium-neon',
    'premium-sakura',
    'premium-royal'
  ],

  // ── Mendapatkan semua valid keys dari localStorage admin ──
  getAllValidKeys: function() {
    const defaultKeys = ["DEMO-PREMIUM-2025"];
    let adminKeys = [];
    try {
      const saved = localStorage.getItem('notaku_all_license_keys');
      if (saved) {
        const keys = JSON.parse(saved);
        adminKeys = keys.filter(k => new Date(k.expiresAt) > new Date()).map(k => k.key);
      }
    } catch(e) {}
    return [...defaultKeys, ...adminKeys];
  },

  // ── Cek apakah user premium ─────────────
  isPremium: function () {
    const saved = localStorage.getItem('notaku_premium_key');
    if (!saved) return false;
    const validKeys = this.getAllValidKeys();
    if (!validKeys.includes(saved)) return false;
    return !this.isExpired();
  },

  // ── Aktivasi premium ────────────────────
  activate: function (key) {
    const cleanKey = key.trim().toUpperCase();
    const validKeys = this.getAllValidKeys();
    const matched = validKeys.find(k => k.toUpperCase() === cleanKey);
    
    if (matched) {
      localStorage.setItem('notaku_premium_key', matched);
      
      // Cari data key untuk mendapatkan tanggal expired
      try {
        const saved = localStorage.getItem('notaku_all_license_keys');
        if (saved) {
          const keys = JSON.parse(saved);
          const keyData = keys.find(k => k.key === matched);
          if (keyData && keyData.expiresAt) {
            localStorage.setItem('notaku_premium_until', keyData.expiresAt);
            const isYearly = keyData.duration === 365;
            localStorage.setItem('notaku_premium_plan', isYearly ? 'tahunan' : (keyData.duration === 90 ? '3bulan' : 'bulanan'));
            return true;
          }
        }
      } catch(e) {}
      
      // Fallback: 30 hari jika tidak ada data
      const days = matched.includes('YEARLY') || matched.includes('ANNUAL') || matched.includes('TAHUNAN') ? 365 : 30;
      const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('notaku_premium_until', until);
      localStorage.setItem('notaku_premium_plan', days === 365 ? 'tahunan' : 'bulanan');
      return true;
    }
    return false;
  },

  // ── Cek masa aktif ──────────────────────
  isExpired: function () {
    const until = localStorage.getItem('notaku_premium_until');
    if (!until) return true;
    return new Date(until) < new Date();
  },

  // ── Sisa hari aktif ─────────────────────
  getRemainingDays: function () {
    const until = localStorage.getItem('notaku_premium_until');
    if (!until) return 0;
    const diff = new Date(until) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  // ── Nama paket ──────────────────────────
  getPlanName: function () {
    return localStorage.getItem('notaku_premium_plan') || 'bulanan';
  },

  // ── Tanggal berakhir (formatted) ────────
  getUntilFormatted: function () {
    const until = localStorage.getItem('notaku_premium_until');
    if (!until) return '-';
    return new Date(until).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  },

  // ── Apakah template ini premium ─────────
  isTemplatePremium: function (templateName) {
    return this.premiumTemplates.includes(templateName);
  },

  // ── Deaktivasi ──────────────────────────
  deactivate: function () {
    localStorage.removeItem('notaku_premium_key');
    localStorage.removeItem('notaku_premium_until');
    localStorage.removeItem('notaku_premium_plan');
  }
};

// Export ke global
window.PremiumAPI = PREMIUM_CONFIG;

// Auto-check dan sync ketika halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
  // Cek apakah ada premium key yang tersimpan dan masih valid
  const savedKey = localStorage.getItem('notaku_premium_key');
  if (savedKey) {
    const validKeys = PREMIUM_CONFIG.getAllValidKeys();
    if (!validKeys.includes(savedKey)) {
      // Key tidak valid lagi, hapus
      localStorage.removeItem('notaku_premium_key');
      localStorage.removeItem('notaku_premium_until');
      localStorage.removeItem('notaku_premium_plan');
    }
  }
});
