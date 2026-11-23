// Google AdSense Integration & Ad Container Manager for publisher: pub-3896262766732996

export const ADSENSE_PUB_ID = 'ca-pub-3896262766732996';

export class AdManager {
  constructor() {
    this.adLoaded = false;
    this.hasAdBlocker = false;
    this.initAdSense();
  }

  initAdSense() {
    // Check if adsbygoogle is already loaded
    try {
      if (window.adsbygoogle) {
        this.adLoaded = true;
      }
    } catch (e) {
      this.hasAdBlocker = true;
    }
  }

  refreshAds() {
    try {
      if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
        const adSlots = document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status])');
        adSlots.forEach((slot) => {
          // Only initialize slots with valid client and slot attributes
          if (slot.getAttribute('data-ad-slot') && slot.getAttribute('data-ad-client')) {
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (err) {
              console.warn('AdSense slot init notice:', err);
            }
          }
        });
      }
    } catch (e) {
      console.warn('Ad refresh notice:', e);
    }
  }

  showLevelTransitionAd(onAdComplete) {
    // In compliance with AdSense policy, standard display ads are not rendered in timed modals.
    // Transition directly to the next level smoothly without forced countdowns.
    if (onAdComplete) {
      onAdComplete();
    }
  }
}

export const adManager = new AdManager();
