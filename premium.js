// premium.js - Sistem License Key sederhana
const PREMIUM_CONFIG = {
  // License keys yang valid (ganti dengan kode Anda sendiri)
  validKeys: [
    "DEMO-PREMIUM-2025",
    "UMKM-PRO-001",
    "NOTAKU-GRATIS-001"
  ],
  
  // Cek apakah user premium
  isPremium: function() {
    const saved = localStorage.getItem('notaku_premium_key');
    return saved && this.validKeys.includes(saved);
  },
  
  // Aktivasi premium
  activate: function(key) {
    if (this.validKeys.includes(key)) {
      localStorage.setItem('notaku_premium_key', key);
      localStorage.setItem('notaku_premium_until', new Date(Date.now() + 30*24*60*60*1000).toISOString());
      return true;
    }
    return false;
  },
  
  // Cek masa aktif
  isExpired: function() {
    const until = localStorage.getItem('notaku_premium_until');
    if (!until) return true;
    return new Date(until) < new Date();
  },
  
  // Hapus watermark jika premium
  shouldHideWatermark: function() {
    return this.isPremium() && !this.isExpired();
  }
};

// Export untuk digunakan di script lain
window.PremiumAPI = PREMIUM_CONFIG;
