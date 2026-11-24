// Viral loop sharing, authentic Indian meme soundboard & social engagement for GROUT!

import { audio, VOICE_ASSET_MANIFEST, MEME_CLIPS } from './audio.js';

export class ViralManager {
  constructor() {
    this.gameUrl = typeof window !== 'undefined' && window.location && window.location.href
      ? window.location.href.split('#')[0]
      : 'https://grout.game';
    this.activePlayingId = null;
  }

  getShareText(levelName = "The Moroccan Mosaic", score = 100) {
    return `🧱 Bhai meri saari problems solve ho gayi! 😂\nMaine GROUT game me "${levelName}" clear karke certified Mistri degree le li!\nTile crooked? Heart broken? Flunked exam? ➡️ "ISME GROUT BHAR DENGE!"\n\nKhel ke dekh aur degree download kar 👇\n${this.gameUrl}`;
  }

  shareWhatsApp(levelName, score) {
    const text = encodeURIComponent(this.getShareText(levelName, score));
    const url = `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  }

  shareTwitter(levelName, score) {
    const text = encodeURIComponent(`"Isme Grout Bhar Denge!" 🧱 Just completed ${levelName} in GROUT! Best ASMR Indian meme game 😂👇`);
    const url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(this.gameUrl)}&hashtags=Grout,IsmeGroutBharDenge,IndianMeme,DesiMistri`;
    window.open(url, '_blank');
  }

  shareReddit(levelName) {
    const title = encodeURIComponent(`I made an authentic web game based on the viral Indian "Isme Grout Bhar Denge" meme!`);
    const url = `https://reddit.com/submit?url=${encodeURIComponent(this.gameUrl)}&title=${title}`;
    window.open(url, '_blank');
  }

  async shareNative(levelName, score) {
    if (typeof navigator !== 'undefined' && navigator.share) {
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
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.gameUrl).then(() => {
        if (showToast) {
          showToast('📋 Game Link Copied! Send it on WhatsApp / Instagram!');
        }
      }).catch(() => {
        prompt('Copy this link:', this.gameUrl);
      });
    }
  }

  updateSoundboardPills() {
    if (typeof document === 'undefined') return;
    const soundboardBtns = document.querySelectorAll('[data-sound]');
    soundboardBtns.forEach(btn => {
      const soundKey = btn.getAttribute('data-sound');
      const item = VOICE_ASSET_MANIFEST[soundKey];
      const statusPill = btn.querySelector('.chip-status-pill');
      if (statusPill && item) {
        if (item.installed) {
          statusPill.className = 'chip-status-pill installed';
          statusPill.textContent = 'INSTALLED';
        } else {
          statusPill.className = 'chip-status-pill awaiting';
          statusPill.textContent = 'AWAITING FILE (Drop in public/audio/voices/)';
        }
      }
    });
  }

  initSoundboard() {
    if (typeof document === 'undefined') return;

    const soundboardBtns = document.querySelectorAll('[data-sound]');

    const onStateUpdate = (clipId, isPlaying) => {
      this.activePlayingId = isPlaying ? clipId : null;
      soundboardBtns.forEach(btn => {
        const soundKey = btn.getAttribute('data-sound');
        const playIcon = btn.querySelector('.chip-play-icon');
        const statusPill = btn.querySelector('.chip-status-pill');
        const item = VOICE_ASSET_MANIFEST[soundKey];

        if (soundKey === clipId && isPlaying) {
          btn.classList.add('is-playing');
          if (playIcon) playIcon.textContent = '■';
          if (statusPill) statusPill.textContent = 'PLAYING...';
        } else {
          btn.classList.remove('is-playing');
          if (playIcon) playIcon.textContent = '▶';
          if (statusPill && item) {
            if (item.installed) {
              statusPill.className = 'chip-status-pill installed';
              statusPill.textContent = 'INSTALLED';
            } else {
              statusPill.className = 'chip-status-pill awaiting';
              statusPill.textContent = 'AWAITING FILE (Drop in public/audio/voices/)';
            }
          }
        }
      });
    };

    audio.onVoiceStateChange = onStateUpdate;
    audio.onMemeStateChange = onStateUpdate;

    soundboardBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const soundKey = btn.getAttribute('data-sound');

        // Toggle behavior: if already playing this clip, stop it
        if (this.activePlayingId === soundKey) {
          audio.stopCurrentVoice();
          return;
        }

        audio.triggerMemeSound(soundKey);

        // Visual bounce animation
        btn.classList.add('pop-anim');
        setTimeout(() => btn.classList.remove('pop-anim'), 300);
      });
    });

    // Soundboard modal close button
    const btnClose = document.getElementById('btnCloseSoundboard');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        audio.stopCurrentVoice();
        const modal = document.getElementById('soundboardModal');
        if (modal) modal.classList.remove('active');
      });
    }

    // Initial check of voice availability
    this.updateSoundboardPills();
  }
}

export const viralManager = new ViralManager();
