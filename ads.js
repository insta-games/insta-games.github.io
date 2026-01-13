/**
 * Advertisement Configuration
 * 
 * This file manages ad placements across the site.
 * Replace placeholder content with actual ad code (e.g., Google AdSense).
 * 
 * To enable ads:
 * 1. Sign up for Google AdSense or other ad network
 * 2. Get your ad code
 * 3. Replace the placeholder divs with actual ad code
 * 4. Uncomment the initAds() function
 */

// Ad configuration
const AD_CONFIG = {
  enabled: false, // Set to true when you have real ad code
  
  // Ad placements
  placements: {
    header: false,      // Banner ad in header
    sidebar: false,     // Sidebar ads on game pages
    footer: true,       // Footer banner ad
    inContent: false    // In-content ads between game cards
  },
  
  // Ad network (e.g., 'adsense', 'custom')
  network: 'adsense',
  
  // Your ad client ID (for AdSense)
  clientId: 'ca-pub-XXXXXXXXXXXXXXXX' // Replace with your AdSense ID
};

/**
 * Initialize ads when page loads
 */
function initAds() {
  if (!AD_CONFIG.enabled) {
    return;
  }
  
  // Load ad script based on network
  if (AD_CONFIG.network === 'adsense') {
    loadAdSense();
  }
  
  // Show ad containers
  showAdContainers();
}

/**
 * Load Google AdSense script
 */
function loadAdSense() {
  if (!AD_CONFIG.clientId || AD_CONFIG.clientId === 'ca-pub-XXXXXXXXXXXXXXXX') {
    console.warn('AdSense client ID not configured. Please add your publisher ID.');
    return;
  }
  
  const script = document.createElement('script');
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CONFIG.clientId}`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

/**
 * Show ad containers based on placement config
 */
function showAdContainers() {
  Object.keys(AD_CONFIG.placements).forEach(placement => {
    if (AD_CONFIG.placements[placement]) {
      const adElement = document.querySelector(`[data-ad-placement="${placement}"]`);
      if (adElement) {
        adElement.style.display = 'block';
      }
    }
  });
}

/**
 * Insert ad into specific container
 */
function insertAd(containerId, adCode) {
  const container = document.getElementById(containerId);
  if (container && AD_CONFIG.enabled) {
    container.innerHTML = adCode;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAds);
} else {
  initAds();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AD_CONFIG, initAds, insertAd };
}
