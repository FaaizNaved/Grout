// Viral loop sharing, meme soundboard & social engagement for GROUT!

import { audio } from './audio.js';

export class ViralManager {
  constructor() {
    this.gameUrl = window.location.href.split('#')[0];
  }

  getShareText(levelName = "The Viral Staircase", score = 100) {
    return `🧱 Bhai meri saari problems solve ho gayi! 😂\nMaine GROUT game me "${levelName}" clear karke certified Mistri degree le li!\nTile crooked? Heart broken? Flunked exam? ➡️ "ISME GROUT BHAR DENGE!"\n\nKhel ke dekh aur degree download kar 👇\n${this.gameUrl}`;
  }

  shareWhatsApp(levelName, score) {
    const text = encodeURIComponent(this.getShareText(levelName, score));
    const url = `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  }

  shareTwitter(levelName, score) {
    const text = encodeURIComponent(`"Isme Grout Bhar Denge!" 🧱 Just completed ${levelName} in GROUT! Best ASMR meme game on the internet 😂👇`);
    const url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(this.gameUrl)}&hashtags=Grout,IsmeGroutBharDenge,MemeGame,ASMR`;
    window.open(url, '_blank');
  }

  shareReddit(levelName) {
    const title = encodeURIComponent(`I made a web game based on the viral "Isme Grout Bhar Denge" meme!`);
    const url = `https://reddit.com/submit?url=${encodeURIComponent(this.gameUrl)}&title=${title}`;
    window.open(url, '_blank');
  }

  async shareNative(levelName, score) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GROUT! - Isme Grout Bhar Denge',
          text: this.getShareText(levelName, score),
          url: this.gameUrl
        });
        return true;
      } catch (err) {
        // User cancelled or share failed
      }
    }
    return false;
  }

  copyLink(showToast) {
    navigator.clipboard.writeText(this.gameUrl).then(() => {
      if (showToast) {
        showToast('📋 Game Link Copied! Send it on WhatsApp / Instagram!');
      }
    }).catch(() => {
      // Fallback
      prompt('Copy this link:', this.gameUrl);
    });
  }

  initSoundboard() {
    const soundboardBtns = document.querySelectorAll('[data-sound]');
    soundboardBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const soundKey = btn.getAttribute('data-sound');
        audio.triggerMemeSound(soundKey);
        // Visual bounce animation
        btn.classList.add('pop-anim');
        setTimeout(() => btn.classList.remove('pop-anim'), 300);
      });
    });
  }
}

export const viralManager = new ViralManager();
