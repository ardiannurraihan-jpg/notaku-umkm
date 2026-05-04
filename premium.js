// premium.js - Sistem License Key
const PREMIUM_CONFIG = {
  // License keys yang valid (akan ditambah manual oleh admin)
  validKeys: [
    "DEMO-PREMIUM-2025"
  ],
  
  isPremium: function() {
    const saved = localStorage.getItem('notaku_premium_key');
    return saved && this.validKeys.includes(saved);
  },
  
  activate: function(key) {
    if (this.validKeys.includes(key)) {
      localStorage.setItem('notaku_premium_key', key);
      localStorage.setItem('notaku_premium_until', new Date(Date.now() + 30*24*60*60*1000).toISOString());
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
    const diff = new Date(until) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
};

window.PremiumAPI = PREMIUM_CONFIG;
