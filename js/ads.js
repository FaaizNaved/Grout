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
        adSlots.forEach(() => {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (err) {
            console.warn('AdSense slot init notice:', err);
          }
        });
      }
    } catch (e) {
      console.warn('Ad refresh notice:', e);
    }
  }

  showLevelTransitionAd(onAdComplete) {
    const modal = document.getElementById('adTransitionModal');
    const timerSpan = document.getElementById('adCountdownTimer');
    const skipBtn = document.getElementById('adSkipButton');
    
    if (!modal) {
      if (onAdComplete) onAdComplete();
      return;
    }

    modal.classList.add('active');
    let timeLeft = 3;
    if (timerSpan) timerSpan.textContent = `${timeLeft}s`;
    if (skipBtn) skipBtn.style.opacity = '0.5';

    // Refresh ad inside modal
    this.refreshAds();

    const interval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(interval);
        if (timerSpan) timerSpan.textContent = 'Ready!';
        if (skipBtn) {
          skipBtn.style.opacity = '1';
          skipBtn.textContent = 'Continue to Next Level ➡️';
        }
      } else {
        if (timerSpan) timerSpan.textContent = `${timeLeft}s`;
      }
    }, 1000);

    const handleContinue = () => {
      clearInterval(interval);
      modal.classList.remove('active');
      skipBtn.removeEventListener('click', handleContinue);
      if (onAdComplete) onAdComplete();
    };

    skipBtn.addEventListener('click', handleContinue);
  }
}

export const adManager = new AdManager();
