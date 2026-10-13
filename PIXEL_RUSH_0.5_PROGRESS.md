# Pixel Rush 0.5 — The Expansion & Polish Update — Progress

This file is the single source of truth for 0.5. Re-read it after any context compaction.
Quality over speed. Never claim something works unless it was tested.

## Ground rules (from the 0.5 brief)
- Inspect code before changing it. Preserve existing systems unless told to change them.
- Never remove enemies, bosses, animations, cosmetics or mechanics.
- Original pixel art in the game's style. Test features alone and together. Fix regressions.
- Do not silently skip hard features. If a choice has options, pick the recommended one (user's standing instruction: don't ask, choose the recommended option).
- Do NOT add: a loading screen (EXCEPTION, user asked later: a save-loading screen when picking a save, instead of bouncing to the saves screen — done, #bootld), rotating gameplay tips, loading-screen hints, new animated main-menu icons, world-skipping mechanics.
- Keep the main menu's existing animations.

## Versioning / delivery
- Branch: `pixel-rush-0.5`. Game file: `Pixel_Rush_0.5.html` (git mv from 0.3; 0.4 was a planning list and is folded into 0.5). `main` must always hold the newest version.
- Release has BOTH: Pixel Rush 0.5 HTML and Pixel Rush 0.5 EXE (Windows).
- From now on every update ships BOTH (0.6 HTML + 0.6 EXE etc). One shared codebase: the EXE wraps the same HTML file.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` + `Claude-Session: https://claude.ai/code/session_015yUFKQD8b9Fm2HypkTXkfA`. No model ids in pushed files.
- Playable copy for the user is published as a Claude artifact: https://claude.ai/artifact/58r36B8qAFcDmcB5x3Berm (republish same file path).

## EXACT weapon evolution paths (must match exactly)
| Family | Stage 1 | Stage 2 | Final |
|---|---|---|---|
| Blade | Knife | Machete | Sword |
| Gun | Pistol | Shotgun | Rifle |
| Explosive | Grenade | Cannonball | Bomb |
| Fist | Bare Fist | Knuckle Wrap | Brass Knuckles |
| Boomerang | Default Boomerang | Metal Boomerang | Three-Prong Boomerang |
| Magic | Stick | Magic Wand | Staff |
| Bow | Bow and Arrow | Compact Bow | Crossbow |
| Mace | Mace | Two-Headed Mace | Three-Headed Mace |

## Feature checklist
Legend: [ ] todo, [~] in progress, [x] done and tested.

### 1. New Run screen overhaul
Flow: New Run → Select Character → Configure Run → Start Game.
- [x] Config screen (#cfg, renderCfg/drawCfgPrev; Fighter -> Configure -> Start; GO AGAIN also opens it; tested desk+phone): LEFT large animated idle preview of the character HOLDING the selected weapon (weapon changes instantly). RIGHT: weapon select, world select, challenge modifiers, confirm button.
- [x] Keep unlock rules (characters, weapons, worlds). Locked content not selectable. No world skipping.
- [x] Challenge modifiers (MODS, cfgMods saved in cinder-mods, runMods saved with Save&Exit, on HUD #modhud, postcard, panel note; effects tested): clearly described before the run. Decision (recommended set): Glass Cannon (x2 dmg dealt, 1 heart), Swarm (+50% enemies, +25% coins), Fast Forward (enemies +25% speed, +20% XP), No Dash, Elites Only-ish "Evolved" (all mobs evolved), Pacifist Shop (no ability shop, +50% coins), Iron Body (no healing between waves, +30% XP). Modifiers give reward multipliers; shown on HUD; saved with run; runs with modifiers still count for records unless the modifier makes the run easier (none of them do).

### 2. Weapon evolution overhaul
- [x] Rename/redraw lines exactly as the table above (WLINES punch/gun/bomb; new art wrap, dbarrel, grenade, cball, bigger bomb, brass bar; weapon-box skins use the exact stage names, their look stays on the final stage). Each form visually distinct; the in-hand sprite matches the evolution.
- [x] New families (tabs r/m/a/c, WLINES boomer/magic/bow/mace, starters st_boom/st_magic/st_bow/st_mace, mastery WM_* + specials, 1 cosmetic box each, achievements wmr/wmm/wma/wmc; tested damage + unlock chain + shop): Boomerang (thrown, returns, pierces), Magic (homing bolt), Bow (charged arrows that pierce), Mace (slow heavy spin smash with knockback). Each with mastery track, unlock chain after Bomb (Bomb → Boomerang → Magic → Bow → Mace), shop/upgrade tabs only when unlocked.
- [x] Evolution animation (Pokémon-like) (playEvo; triggered by mastery Evolve steps and in-run evolutions; tested, skip works): old weapon shown big, flashing silhouette, transform burst, new weapon revealed, evolution jingle. Short, skippable by click.

### 3. Fist combat fix
- [x] Punch = forward jab (inJab strip hitbox, tested front/diag/behind on all 3 forms): arm visibly extends, narrow short hitbox in front only (no sweep). Distinct from slash. Holds through Bare Fist → Knuckle Wrap → Brass Knuckles (each stronger).

### 4. Main menu rotating worlds
- [x] Menu background cycles W1 → W2 → W3 → W4 → W5 → W1 every 30 s with a smooth pixel transition (drawMenuWorlds: block dissolve with a bright leading edge, 1.4 s; instant under reduced motion). Menu fight, embers, pet all kept; menu mobs wear the shown world's colours.
- [x] Button theme per world: W1 grass green, W2 stone gray, W3 sandy tan, W4 electric blue, W5 dark swamp green (#home[data-mw] CSS vars, colours fade over 1.2 s; frame, buttons, NEW RUN, stats, Continue).
- [x] New animated pixel backgrounds for World 4 (robot/cyber: plates, circuit pulses, blinking lights, chasing ring lights, scanline) and World 5 (spooky swamp: pools with bubbles, fireflies, fog, glowing mushrooms, graves). W2 (torches, crystal glints) and W3 (blowing sand) menu scenes too.

### 5. Save select & difficulty screen
- [x] Pixel-art borders, consistent type, clear slot selection, character preview per slot, better spacing. (desktop + landscape phone checked)
- [x] Remove "45 minutes per world" text.
- [x] Easy keeps the name "Easy" (user changed their mind: "change lucky to easy in difficulty select"); description kept. Medium description: "The way Pixel Rush was meant to be played. Just your average Joe experience." Keep Hard and Brutal descriptions ("You're Not Winning Bro" = Brutal tier: keep its description). Do not change balancing.

### 6. Audio overhaul (procedural, no files)
- [ ] Distinct SFX per weapon family and evolution: gun fire, sword swing, punch, boomerang throw + return, bow, magic, mace, explosive throw, explosive roll, explosion.
- [ ] Balancing: throw quiet, roll quiet, explosion louder but never painful; master limiter/compressor to stop peaks when many sounds overlap.

### 7. Enemy spawn sounds
- [ ] One spawn sound per enemy type, each type with its own 3 s cooldown. Bosses exempt (keep entrance audio).

### 8. World ambience (extremely quiet)
- [ ] W1 birds + breeze, W2 drips + cave echo, W3 desert wind, W4 electrical/mechanical hum, W5 insects + swamp wildlife. Below music and SFX, varied (not a constant loop), changes with world, respects settings/mute.

### 9. Jukebox expansion
- [ ] New original tracks; show BPM for every track; browse sorted by BPM; keep old tracks; even loudness.

### 10. Cheat menu / pause fix
- [x] Pause → Cheats hides pause menu, shows cheat menu, game stays paused. Never overlap. Closing cheats returns to pause. Only Resume resumes.

### 11. Save & Exit / Continue Run
- [x] Pause menu "Save & Exit" stores run state (character, weapon + evolution, world, wave, health, score, coins/XP earned, upgrades/abilities, modifiers, hotbar, etc) in localStorage; main menu "Continue Run" restores it. Never overwrites permanent progression. Validate/guard against corrupted saves. Works the same in the EXE.

### 12. Daily challenges
- [x] (dailyKey/dailyNext/dailyOf seeded, frozen per day in stats.daily.ch; #daily screen + home button #hdaily; dailyMode excludes best score/wave/PB times/Save&Exit; tested key boundary, completion, single claim) Refresh at 07:00 in the player's LOCAL time. Available until next local 07:00. Gold + XP reward. Uses existing mechanics/modifiers. One claim per day. Separate from normal runs.

### 13. Game over screen
- [x] Pixel-art framing, animation, consistent type, clear stats (fighter portrait, run time, world; buttons sticky on phones; toasts cleared). Keep existing post-run info and buttons.

### 14. Run postcards & mailbox
- [x] Small mailbox icon near Updates/Tutorial (static icon + unread dot). Opens a pixel postcard of the latest completed run: character, weapon, world reached, highest wave, final score, total run time, with character + weapon art. Updated after each completed run, stored locally.

### 15. Personal bests
- [x] Best completion time per world (stats.pbt, first clear of wave 100, no cheats/boss rush), kept separate, shown in a stats/progression screen. Run time on the postcard.

### 16. Small QoL (recommended set, keep it modest)
- [x] Damage numbers toggle in Settings. [x] Pause when the window loses focus (setting, + visibilitychange). [x] Run timer shown in pause menu. [x] Confirm before abandoning a run from pause.

### Save data management (Settings)
- [x] "Save Data Management" section: Export Save Data (downloads a JSON backup of all progress incl. unfinished run) and Import Save Data (file picker).
- [x] Import shows pixel popup: "WARNING: Overwrite Save Data?" / "Importing this file will overwrite your current save data and replace it with the progress stored in the selected file." / "Are you sure you want to continue?" / [Cancel] [Import & Overwrite]. Cancel = no change. Import backs up current save first. Invalid file = keep existing save.
- [~] Same format in HTML and EXE (Neutralino native dialogs coded; verify in EXE build) (cross import/export). Autosave stays on.

### 17. HTML + EXE release
- [ ] `Pixel_Rush_0.5.html` standalone.
- [~] Windows EXE wrapping the same HTML (shared code). desktop/build.sh <ver> -> releases/Pixel_Rush_<ver>.exe (Neutralino 6.5.0, single exe with embedded resources, ~5 MB). Verified with the Linux build of the same package under Xvfb: game renders, native API works (Neutralino.os/filesystem), localStorage persists across launches.
  - Gotchas found: Neutralino 6.0.0 win binary cannot embed (no .rsrc) -> use 6.5.0; injectGlobals does nothing for our page -> the game HTML loads /js/neutralino.js then /__neutralino_globals.js itself when served from localhost; tokenSecurity must be "none" (one-time token broke the page); FIXED port 47923 is required or saves vanish (localStorage is keyed by port).
  - Rebuild the EXE at release from the final HTML; commit releases/Pixel_Rush_0.5.exe then. Saves work in the EXE (its own storage) and transfer via export/import.

### 18. Final QA (all must pass)
Five worlds work; menu rotation 30 s; button colors per world; previews show weapon; exact evolution paths; evolution animation; punches front-only; spawn cooldowns per type; ambience balanced; BPM sort; cheat/pause never overlap and never resume; Save & Exit restores; daily resets at local 07:00; postcards accurate; PBs save; existing bosses/enemies/progression/cosmetics/achievements intact; HTML + EXE work; keyboard, mouse, controller, touch.

### Worlds 4 and 5 (needed by sections 4, 8, 18)
(Code map of every world-specific path: scratchpad/world_map.md in the session scratchpad. If lost, re-run an Explore agent: grep world===2/3, w3Open, ZONES3, FIN_CFG, SB_ART, MOB_ART, MAPS, drawWorldBg.)
- [ ] World 4 "Robot/Cyber" and World 5 "Spooky Swamp" are playable: arena backgrounds, mob looks, 10 bosses each + a final boss each, unlock W4 after beating W3, W5 after W4 (no skipping).

## Carried over from 0.3 work (unfinished)
- [ ] Boss fights push runs past 45 min on harder difficulties/worlds (sim: W1 34–75 min, W2 46–94, W3 55–110 with bare fists). Plan: soften boss HP scaling from difficulty and world so a run to wave 100 is ~45 min (+ breaks) on every difficulty.
- [ ] Report the progression simulation results to the user (sim tooling: scratchpad/sim/bot.js, tools/simall.js).
- [ ] "Make getting new ability progression good": ability rarities gated by fighter level (Rare L2, Epic L4, Legendary L6, Mythic L8) and wave (4/8/14/20). Re-check with sim XP numbers and smooth it.

## User requests log (verbatim, newest last). ALWAYS re-check this list after compaction
1. "auto go with your recommended one if theres 3 options you want me to pick from dont ask just pick the recomended one"
2. "change lucky to easy in difficulty select" -> DONE (Easy name kept).
3. "make it say continue instead of start if theres alr save data and make a loading screen so it doesnt have to take you back to the saves screen" -> DONE (CONTINUE label, #bootld save loading screen).
4. "make it so when you hover over a character in the select screen it shows it stats" -> DONE (hover/focus previews info panel + pixel stat bars + big preview; touch: 1st tap shows a stats card at the bottom, 2nd tap picks). New characters/families later must keep charStats() correct.
5. "rember to add the droped xp and coins you have to pick up after killing a mob" -> DONE for W1-3 (kill(): gold pickup = shop gold, XP gem = 3% of wave XP each, wave-clear XP x0.6; small 72px pull). STILL REQUIRED for W4/W5 + new weapons (automatic via kill()): EVERY mob kill must drop XP and coins on the floor that you walk over to pick up (not just gold/green mobs). Must also work in Worlds 4 and 5 and with all 8 weapon families. Check kill() and spillLoot.
7. (PDF "Plug-and-Play Multiplayer Architecture": Game.exe + reusable Online SDK (Core, Network, ServerBrowser, Identity, Leaderboards, Events) + ENet transport + Nakama (auth, leaderboards) + dedicated GameServer.exe (authoritative: validates inputs/results) + small server registry API (register, heartbeats every few s, drop stale, browser list with map/region/players/max/version/ping/password flag, never expose private addresses) + leaderboard rule: never trust client score, server validates, rate limits, impossible-result checks; roadmap: prototype -> authoritative loop -> registry -> join flow (version check) -> accounts/leaderboards -> SDK packaging (config template, docs, sample) -> security.)
   User: "make a plug n play online system with the information from this pdf (NEED TO BE SIMPLE EASY TO RUN AND PLAY)" -> DONE (core): online/pixel-rush-server.js (+ online_config.json, Start-Server.bat, start-server.sh, build-exe.sh -> releases/PixelRushServer.exe via Node SEA, README.md); in-game Online SDK + ONLINE screen (browser w/ ping, join by address, password, lobby w/ leader settings, ready/start, chat, race HUD, attacks, results, leaderboards). Tested: server integration (t1/t2 in /tmp/mptest), browser e2e 2 players, SEA build runs (Linux equivalent). TODO at release: ship releases/PixelRushServer.exe (86 MB; zip it), mention SmartScreen. Decisions (recommended, adapted to an HTML/JS game): WebSocket instead of ENet/UDP (browsers can't do UDP); one zero-dependency Node server (pixel-rush-server.js, also a double-click Windows exe) that is game server + server registry + guest identity + leaderboards (JSON file) instead of Nakama (needs Docker + DB, not simple); in-game JS "Online SDK" module with the PDF's modules; mode = ONLINE VERSUS RACE (2-8 players, same seed/world/modifiers, live scoreboard, clearing waves sends extra enemies to rivals, server runs the match flow and validates results), plus global leaderboards and a server browser with ping + join by address.
6. "make sure before shrink down the context window you save all that i said in a md file make sure to check the md file to make sure you got everything" -> this log + the full 0.5 checklist above. Re-read this file after every compaction and before reporting done.

Earlier standing requests (pre-0.5, still apply): runs to wave 100 ~45 min on every difficulty with wave timer only on normal waves + 3 s break; "make getting new abbility progression good"; "fix all overlapping text"; dash gives 0.6 s invulnerability; boss attack tiers (boss n does n+1 attacks then staggers).

## Decisions log
- 0.4 skipped as a release name; its boss overhaul items (cinematic entrances, boss polish) already shipped in 0.3 work.
- Brutal = the existing hardest difficulty "You're Not Winning Bro" (keep its name and description).

## Done in this version
(append as items complete)
- Hotfix pushed to 0.3/main: an unescaped apostrophe in the changelog stopped the game loading (build.sh now syntax-checks every build).
- Save select redesign; Lucky/Average Joe text; cheat menu from pause (tested: stays paused, Esc/back return to pause, focus loss stays paused, only Resume resumes); run HUD hidden under menus.

- Game over redesign; run timer (runT, play+shop only); postcard (cinder-postcard per save) + mailbox; PBs on Account screen and win badge. Helpers: fmtT, WNAME, drawFighter(g,ch,sk,ws,x,gy,U,t,world) for previews.
- Save & Exit/Continue: checkpoint at wave start + wave clear/shop close (runSnap), stored in cinder-run per save, consumed on continue, validated; not in boss rush/tutorial; difficulty of the run used then restored on showHome. pxAsk() generic confirm popup (Esc/back = cancel, Cancel focused first).
- Export/import: format 'pixel-rush-save' fv1 {data:{cinder-*}}; backup in pxr-backup-prev + RESTORE button; invalid/oversized files rejected; quota failure restores old data.
- Shotgun fires pellets (w.pel); Cannonball rolls along the ground (w.roll), bursts on the first enemy it touches, quiet roll rumble.
- User requests mid-0.5: Easy keeps name EASY; save screen button says CONTINUE for saves with data (START for empty); save loading screen on save switch reload (#bootld, html.booting set in <head>).
- New families mechanics: boomers[] (out/back, pierce, max 1 or 2 in flight, hidden in hand while thrown); magic = pbul kind 'magic' with homing; bow = pbul kind 'arrow' (every 3rd = charged, Volley spec); mace = wide arc, knockback x kb, Earthshaker spec. Title fighter only uses f/k/g/b mythics.

## Known bugs
(append as found)

- Stage C: World 4/5 achievements (w4a–e,w4k,w4bs,w5a–e,w5k,w5bs,slayomega,slaylevi) and 50-boss Boss Rush (BR_N) committed and tested through boss 50.
- Phone menu: ONLINE spans the full row (VERSUS badge no longer overflows).
