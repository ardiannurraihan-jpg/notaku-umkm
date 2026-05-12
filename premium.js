// ============================================
//   NOTAKU — PREMIUM LICENSE SYSTEM
// ============================================

const PREMIUM_CONFIG = {

  validKeys: ["DEMO-PREMIUM-2025"],

  premiumTemplates: [
    'premium-luxury', 'premium-elegant', 'premium-dark', 'premium-art',
    'premium-nature', 'premium-neon', 'premium-sakura', 'premium-royal'
  ],

  // Ambil semua key dari admin (localStorage)
  getAllValidKeys: function() {
    let adminKeys = [];
    try {
      const saved = localStorage.getItem('notaku_all_license_keys');
      if (saved) {
        const keys = JSON.parse(saved);
        adminKeys = keys.filter(k => new Date(k.expiresAt) > new Date()).map(k => k.key);
      }
    } catch(e) {}
    return [...this.validKeys, ...adminKeys];
  },

  isPremium: function() {
    const saved = localStorage.getItem('notaku_premium_key');
    if (!saved) return false;
    const validKeys = this.getAllValidKeys();
    if (!validKeys.includes(saved)) return false;
    return !this.isExpired();
  },

  activate: function(key) {
    const cleanKey = key.trim().toUpperCase();
    const validKeys = this.getAllValidKeys();
    const matched = validKeys.find(k => k.toUpperCase() === cleanKey);
    
    if (matched) {
      localStorage.setItem('notaku_premium_key', matched);
      try {
        const saved = localStorage.getItem('notaku_all_license_keys');
        if (saved) {
          const keys = JSON.parse(saved);
          const keyData = keys.find(k => k.key === matched);
          if (keyData && keyData.expiresAt) {
            localStorage.setItem('notaku_premium_until', keyData.expiresAt);
            localStorage.setItem('notaku_premium_plan', keyData.duration === 365 ? 'tahunan' : (keyData.duration === 90 ? '3bulan' : 'bulanan'));
            return true;
          }
        }
      } catch(e) {}
      const days = matched.includes('YEARLY') ? 365 : 30;
      localStorage.setItem('notaku_premium_until', new Date(Date.now() + days * 86400000).toISOString());
      localStorage.setItem('notaku_premium_plan', days === 365 ? 'tahunan' : 'bulanan');
      return true;
    }
    return false;
  },

  isExpired: function() {
    const until = localStorage.getItem('notaku_premium_until');
    if (!until) return true;
    return new Date(until) < new Date();
  },

  getRemainingDays: function() {
    const until = localStorage.getItem('notaku_premium_until');
    if (!until) return 0;
    return Math.max(0, Math.ceil((new Date(until) - new Date()) / 86400000));
  },

  getPlanName: function() {
    return localStorage.getItem('notaku_premium_plan') || 'bulanan';
  },

  getUntilFormatted: function() {
    const until = localStorage.getItem('notaku_premium_until');
    return until ? new Date(until).toLocaleDateString('id-ID') : '-';
  },

  isTemplatePremium: function(templateName) {
    return this.premiumTemplates.includes(templateName);
  },

  deactivate: function() {
    localStorage.removeItem('notaku_premium_key');
    localStorage.removeItem('notaku_premium_until');
    localStorage.removeItem('notaku_premium_plan');
  }
};

window.PremiumAPI = PREMIUM_CONFIG;
