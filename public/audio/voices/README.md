# GROUT — Downloadable Voice Asset Directory (`public/audio/voices/`)

This directory is the dedicated asset repository for authentic spoken Indian meme voice recordings in **GROUT**.

---

## Instructions for Adding Voice Recordings

To hear original recorded dialogue in the game, download your voice clips and place them directly into this folder (`public/audio/voices/`) using the exact filenames listed below.

### Recommended Audio Specifications
- **Format:** MP3 (`.mp3`)
- **Sample Rate:** 44.1 kHz or 48 kHz
- **Bitrate:** 128 kbps to 192 kbps CBR
- **Channels:** Stereo or Mono
- **Volume:** Normalized to -14 LUFS / -1 dB true peak

---

## Voice File Manifest & In-Game Triggers

| Filename | Voice Title / Meme Reference | In-Game Trigger Moment | Soundboard Section |
| :--- | :--- | :--- | :--- |
| `intro-grout-bhar-denge.mp3` | **"Isme Grout Bhar Denge!"** | Fresh page load / opening interaction prompt; also soundboard signature clip. | Signature GROUT Voice |
| `laura-phir-agya-tu.mp3` | **"Laura, Phir Aa Gaya Tu!"** | When continuous grouting or buffing streak crosses the 5x combo threshold. | Streak Reactions |
| `level-complete-mistri-op.mp3` | **"Thekedar Shocked, Mistri Rocked!"** | Level completion victory modal celebration. | Victory & Failure Reactions |
| `level-failure-reaction.mp3` | **"Paisa Barbaad BC!"** | Level failure trigger (color mismatch, timeout, fragility limit). | Victory & Failure Reactions |
| `hexagon-challenge.mp3` | **"Thekedar Hexagon Challenge"** | Level 2 (Hexagon Bathroom Floor) start or blowout recovery warning. | Level Reactions |
| `mosaic-color-reaction.mp3` | **"Moroccan Color Harmony"** | Level 3 (Moroccan Mosaic) color selection / section transition. | Level Reactions |
| `cafe-timer-warning.mp3` | **"30-Second Curing Alert"** | Level 4 (Speed-Run Café Counter) when grout begins curing. | Level Reactions |
| `restoration-victory.mp3` | **"UNESCO Restoration Grand Finale"** | Level 5 (Masterpiece Restoration) completing both puzzle and grouting stages. | Victory & Failure Reactions |

---

## Architectural Guarantees & Graceful Missing-File Handling

1. **Zero Game Crashes:** If any voice file is not yet placed in this folder, the game runs completely normally. The Web Audio procedural sound effects (squelch, scrape, sponge buff, chimes, fanfare) continue to provide full ASMR audio feedback.
2. **Visual Asset Status in Soundboard:** The in-game audio soundboard automatically checks this directory. Available files display `INSTALLED`, while unpopulated files display `AWAITING FILE (Drop in public/audio/voices/)`.
3. **Autoplay Resilience:** If the browser blocks audio autoplay on fresh page load, a gentle *"🔊 Tap to hear the Mistri"* prompt appears in the header and plays the opening clip upon the first valid player interaction.
4. **Single Voice Concurrency Lock:** Playing any voice clip immediately halts any previously playing voice clip. Voice lines never overlap or drown out gameplay sound effects.
5. **No AI Voice Clones / No TTS:** There are zero browser speech synthesis or artificial voice generation APIs in the game. All voice lines are designed exclusively for authentic, user-provided audio recordings.
