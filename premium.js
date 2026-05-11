// ============================================
//   NOTAKU — PREMIUM LICENSE SYSTEM
//   Supports 8 exclusive templates
// ============================================

const PREMIUM_CONFIG = {

  // ── Valid license keys ──────────────────
  validKeys: [
    "DEMO-PREMIUM-2025",
    // Tambahkan kode premium Anda di sini
  ],

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

  // ── Cek apakah user premium ─────────────
  isPremium: function () {
    const saved = localStorage.getItem('notaku_premium_key');
    return !!(saved && this.validKeys.includes(saved));
  },

  // ── Aktivasi premium ────────────────────
  activate: function (key) {
    const cleanKey = key.trim().toUpperCase();
    const matched = this.validKeys.find(k => k.toUpperCase() === cleanKey);
    if (matched) {
      localStorage.setItem('notaku_premium_key', matched);
      // Cek apakah key tahunan (mengandung "YEARLY" atau "ANNUAL")
      const isYearly = matched.includes('YEARLY') || matched.includes('ANNUAL') || matched.includes('TAHUNAN');
      const days = isYearly ? 365 : 30;
      const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('notaku_premium_until', until);
      localStorage.setItem('notaku_premium_plan', isYearly ? 'tahunan' : 'bulanan');
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

  // ── Apakah watermark perlu disembunyikan ─
  shouldHideWatermark: function () {
    return this.isPremium() && !this.isExpired();
  },

  // ── Apakah template ini premium ─────────
  isTemplatePremium: function (templateName) {
    return this.premiumTemplates.includes(templateName);
  },

  // ── Deaktivasi (logout premium) ─────────
  deactivate: function () {
    localStorage.removeItem('notaku_premium_key');
    localStorage.removeItem('notaku_premium_until');
    localStorage.removeItem('notaku_premium_plan');
  }
};

// Export ke global
window.PremiumAPI = PREMIUM_CONFIG;
