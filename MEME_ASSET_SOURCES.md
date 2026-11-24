# GROUT — Authentic Meme Culture & Audio Asset Sources

This document tracks all Indian meme references, audio assets, contextual game roles, copyright status, and attribution requirements for **GROUT** ("Isme Grout Bhar Denge").

---

## Legal & Compliance Principles

1. **Zero AI Speech Synthesis:** Browser-generated synthetic voices (`window.speechSynthesis`, `SpeechSynthesisUtterance`) have been completely purged from the codebase.
2. **Authentic Cultural Identity:** Dialogue and reactions are anchored in genuine Indian construction culture, thekedar-mistri dynamics, and viral Hindi/Hinglish internet memes.
3. **Strict Copyright Protection:** No copyrighted audio from commercial films, television shows, or private creators is pirated or bundled without documentation. Slots for commercial/licensed meme dialogues are architected as ready asset slots for user-provided files.
4. **Graceful Asset Architecture:** The audio playback system preloads, throttles, respects mute state, stops previous clips, and gracefully handles missing audio slots without throwing runtime errors or disrupting gameplay.

---

## Curated Indian Meme References

| Reference ID | Meme Title / Quote | Original Context / Source | Game Role & Trigger Moment | Audio Filename | License / Permission Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `grout_bhar_denge` | **"Isme Grout Bhar Denge!"** | The original viral Indian construction video where a contractor shows a massive 2-inch gap between tiles and the mistri confidently declares: *"Koi na saab, isme grout bhar denge!"* | Central game theme; first joint completed; soundboard centerpiece. | `meme-grout-bhar-denge.mp3` | **Bundled** (Project Signature Audio). Core creative identity of GROUT. |
| `thekedar_shocked` | **"Thekedar Shocked, Mistri Rocked!"** | Popular Hindi construction meme celebrating raw desi jugaad outperforming textbook engineering calculations. | Level completion celebration fanfare; victory modal. | `meme-thekedar-shocked.mp3` | **Bundled** (Desi Mistri Victory Audio). Open attribution. |
| `kya_bana_diya` | **"Bhai Ye Kya Bana Diya?!"** | Viral home inspector reel walking into a site with crooked stairs and nonsensical architectural angles. | Level start on irregular/crooked tile layouts (e.g. Level 4, Level 5). | `meme-kya-bana-diya.mp3` | **Bundled** (Site Inspection Despair Audio). |
| `sukoon_asmr` | **"Sukoon Hi Sukoon"** | Classic Hindi relaxation phrase representing absolute inner peace and satisfaction. | 100% haze cleaning completion; pure ASMR buffing soundboard. | `meme-sukoon-asmr.mp3` | **Bundled** (Artisanal ASMR Chime & Sponge Sound). |
| `heavy_driver` | **"Bete Mauj Kardi! (Heavy Driver)"** | The legendary 2020 Indian viral paragliding video by Vipin Kumar (*"Arrey betaji, mauj kardi! Tum toh bade heavy driver nikle!"*). | Awarded when reaching a 12x or 24x continuous trowel joint combo. | `meme-heavy-driver.mp3` | **User Asset Slot Ready** (Slot open for user-provided clip; gracefully silent if absent). |
| `paisa_barbaad` | **"Paisa Barbaad BC!"** | Legendary CarryMinati rant reaction used universally across Indian social media when an effort collapses. | Reset level button click; wiping progress. | `meme-paisa-barbaad.mp3` | **User Asset Slot Ready** (Pop-culture quote slot). |
| `gajab_beizzati` | **"Gajab Beizzati Hai Yaar"** | Famous scene from TVF's *Panchayat* (Season 1) spoken by character Vinod when snubbed. | Triggered if player fills 100% grout but attempts to finish with 0% haze cleaning. | `meme-gajab-beizzati.mp3` | **User Asset Slot Ready** (Slot open for licensed OTT quote). |
| `control_uday` | **"Control Uday Control"** | Nana Patekar's iconic self-restraint mantra from the comedy film *Welcome* (2007). | Triggered when player moves mouse too rapidly, spilling excessive haze. | `meme-control-uday.mp3` | **User Asset Slot Ready** (Slot open for user-provided clip). |
| `kehna_kya_chahte_ho` | **"Arrey Kehna Kya Chahte Ho?!"** | Omi Vaidya (Chatur / Silencer) reacting to incomprehensible jargon in *3 Idiots* (2009). | Loading complex geometry (Pisa Tower, Hexagons, Broken Tile). | `meme-kehna-kya-chahte-ho.mp3` | **User Asset Slot Ready** (Slot open for user-provided clip). |
| `bilkul_riks_nahi` | **"Bilkul Riks Nahi Lene Ka"** | Paresh Rawal's timeless Babu Rao dialogue from *Hera Pheri* (2000) on taking zero chances. | Cleaning the final 5% remaining haze to achieve 100% perfection. | `meme-bilkul-riks-nahi.mp3` | **User Asset Slot Ready** (Slot open for user-provided clip). |

---

## Audio Asset Architecture & Directory Structure

All audio files reside in `public/audio/memes/`:

```
public/
  audio/
    memes/
      meme-grout-bhar-denge.mp3
      meme-thekedar-shocked.mp3
      meme-kya-bana-diya.mp3
      meme-sukoon-asmr.mp3
      meme-heavy-driver.mp3        [User Drop-In Slot]
      meme-paisa-barbaad.mp3       [User Drop-In Slot]
      meme-gajab-beizzati.mp3      [User Drop-In Slot]
      meme-control-uday.mp3        [User Drop-In Slot]
      meme-kehna-kya-chahte-ho.mp3 [User Drop-In Slot]
      meme-bilkul-riks-nahi.mp3    [User Drop-In Slot]
```

### Player Guarantees
1. **Single-Voice Lock:** Playing any meme clip immediately interrupts and stops any previously playing meme voice.
2. **Procedural Independence:** Web Audio procedural SFX (wet squelches, metallic trowel scrapes, sponge squeaks, combo chimes) run on independent oscillators and continue uninterrupted.
3. **Mute Compliance:** All meme playback checks `audio.muted` and halts immediately if muted.
4. **Spam Throttling:** Contextual gameplay triggers enforce a minimum 5-second cooldown to ensure voice lines feel earned and deliberate rather than repetitive.
5. **Missing File Resilience:** If a user asset slot has not yet been populated by the user, the player catches the 404 cleanly, logs an informational notice, and updates the soundboard slot with `[Slot Ready — Drop file in public/audio/memes/]` without throwing an unhandled exception or breaking gameplay.
