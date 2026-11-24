# GROUT — Authentic Meme Culture & Voice Asset Architecture

This document tracks all Indian meme voice references, procedural sound effects, contextual game roles, copyright principles, and asset placement rules for **GROUT** ("Isme Grout Bhar Denge").

---

## 1. Legal & Audio Architecture Principles

1. **Zero AI Speech Synthesis / Zero TTS:** Browser-generated synthetic voices (`window.speechSynthesis`, `SpeechSynthesisUtterance`) and synthetic voice clones are completely purged from this repository.
2. **User-Provided Voice Recording Slots:** All spoken meme dialogue assets reside in `public/audio/voices/` as designated user-provided slots. Players/maintainers download and provide authentic recordings directly. No copyrighted film, television, creator, or meme audio is pirated or illegally bundled.
3. **Procedural Web Audio Sound Effects:** Physical tactile sounds (wet grout extrusion squelches, metallic trowel smoothing scrapes, limestone sponge buffing squeaks, harmonic combo chimes, brass fanfare) are synthesized entirely in real-time via the Web Audio API on native oscillator, biquad filter, and gain nodes. These are procedural ASMR sound effects, not spoken meme dialogue.
4. **Single-Voice Concurrency Lock:** Only one spoken voice clip plays at any time. Triggering any voice immediately halts any currently playing voice.
5. **Graceful Asset Absence:** Missing voice files in `public/audio/voices/` never throw unhandled exceptions or interrupt gameplay. The soundboard visually indicates whether each voice file is `INSTALLED` or `AWAITING FILE (Drop in public/audio/voices/)`.

---

## 2. Central Voice Asset Manifest (`public/audio/voices/`)

| Voice Event ID | Filename | Spoken Meme Reference / Quote | Original Cultural Context | Game Trigger Moment | Soundboard Section |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `intro_grout_bhar_denge` | `intro-grout-bhar-denge.mp3` | **"Isme Grout Bhar Denge!"** | The original viral Indian construction clip where contractor inspects a massive gap and the mistri replies: *"Koi na saab, isme grout bhar denge!"* | Page open / refresh; opening interaction prompt; soundboard signature clip. | Signature GROUT Voice |
| `laura_phir_agya_tu` | `laura-phir-agya-tu.mp3` | **"Laura, Phir Aa Gaya Tu!"** | Viral reaction meme expressing exasperated amusement when an indomitable character returns. | Continuous streak reaches 5x combo threshold (fires once per streak). | Streak Reactions |
| `level_complete_mistri_op` | `level-complete-mistri-op.mp3` | **"Thekedar Shocked, Mistri Rocked!"** | Celebratory construction meme cheering pure desi jugaad outperforming textbook engineering. | Level completion victory modal. | Victory & Failure Reactions |
| `level_failure_reaction` | `level-failure-reaction.mp3` | **"Paisa Barbaad BC!"** | Iconic CarryMinati frustration reaction to a total catastrophe. | Level failure: blowout penalty, color mismatch, cured cement timeout, or shattered fragility. | Victory & Failure Reactions |
| `hexagon_challenge` | `hexagon-challenge.mp3` | **"Thekedar: 3-Way Hexagon Joints!"** | Site inspection despair at intricate hexagonal multi-angle floor joints. | Level 2 (Hexagon Bathroom Floor) start or blowout recovery. | Level Reactions |
| `mosaic_color_reaction` | `mosaic-color-reaction.mp3` | **"Moroccan Color Harmony"** | Artisan master warning: *"Rang galat mat lagao, Moroccan carpet jaisa design hai!"* | Level 3 (Moroccan Mosaic) color selection / section transition. | Level Reactions |
| `cafe_timer_warning` | `cafe-timer-warning.mp3` | **"30-Second Curing Alert"** | Mistri panic: *"Jaldi kar bhai! Grout 30 second me pathar ban jayega!"* | Level 4 (Speed-Run Café Counter) when surface grout transitions to cured state. | Level Reactions |
| `restoration_victory` | `restoration-victory.mp3` | **"UNESCO Restoration Victory"** | Archaeological chief stunned as ancient Roman mosaic is restored with pure grout jugaad. | Level 5 (Masterpiece Restoration) completing Stage 1 puzzle + Stage 2 grouting. | Victory & Failure Reactions |

---

## 3. Procedural Web Audio API Sound Effects (Non-Voice)

These are procedural physics-based sound effects generated in real-time in `js/audio.js`, completely decoupled from the voice player:

| Sound Function | Audio Node Pipeline | Purpose / Gameplay Trigger |
| :--- | :--- | :--- |
| `audio.playSquelch(intensity)` | Bandpass filtered pink noise + sine modulation ($120\text{Hz} \to 280\text{Hz}$) | Wet grout extrusion along joint cavity when dragging trowel. |
| `audio.playScrape()` | Sawtooth oscillator ($340\text{Hz} \to 250\text{Hz}$) + high-Q bandpass ($1500\text{Hz}$) | Metallic trowel blade smoothing over stone edge; tile snapping into puzzle socket. |
| `audio.playSponge()` | Dual-frequency modulated sine ($620\text{Hz} \to 990\text{Hz} \to 550\text{Hz}$) | Wet limestone sponge friction buffing surface haze. |
| `audio.playChime(noteIndex)` | Pure sine wave on pentatonic frequencies ($261\text{Hz} \to 784\text{Hz}$) with gentle decay | Positive feedback on combo increments and clean tile passes. |
| `audio.playFanfare()` | Polyphonic chord progression ($[C, E, G], [E, G, C], [F, A, C], [G, B, D, G]$) | Level completion celebratory musical flourish. |
| `audio.playErrorTone()` | Low frequency square wave ($110\text{Hz} \to 65\text{Hz}$) with rapid tremolo | Blowout warning, wrong-color application, or fragility damage penalty. |

---

## 4. How to Test Voice File Integration

Place any standard `.mp3` file into `public/audio/voices/` (e.g. `public/audio/voices/intro-grout-bhar-denge.mp3`).
The web application automatically detects installed files and flips their status pill from `AWAITING FILE` to `INSTALLED` in the Desi Soundboard library.
