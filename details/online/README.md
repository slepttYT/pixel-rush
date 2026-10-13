# Pixel Rush Online (Versus Race)

Plug and play for 1 to 4 players: one person runs the server, everyone else pastes its join code into the game.

## Play in 3 steps

1. **Host:** double-click `Pixel-Rush-Server.exe` (Mac/Linux: `./start-server.sh`, needs [Node.js](https://nodejs.org) 18 or newer).
   Windows may say the app is unrecognised; click *More info* and then *Run anyway*.
   - The first time it asks **two questions**: how many players (1-4) and an optional password. Press Enter to accept the suggestion.
   - It then shows your **JOIN CODE**, for example `PR-7K2Q-9XMB-4TZ0A`. That code is also the server's name. On Windows it is already copied, so just paste it (Ctrl+V) to your friends. It is also saved in `JOIN-CODE.txt`.
   - It opens the port on your router by itself (UPnP) and uses the next free port if 7777 is busy. Keep the window open while you play.
2. **Everyone:** open Pixel Rush (the HTML file or `Pixel-Rush-Game.exe`), choose **ONLINE**, paste the code and press **JOIN**. You play under your save's player name.
3. **Lobby:** the first player in is the **host** (crown). Everyone else waits in the lobby until the host presses **START**.
   - **Pick:** everyone picks a fighter and a weapon, then presses **LOCK IN** (25 seconds).
   - **Vote:** everyone votes on a world (15 seconds). Only worlds that **every** player has unlocked are on the ballot. If someone only has World 1, it is World 1 and there is no vote. Most votes wins; a tie is picked at random.
   - **Race:** the first player to clear the target wave wins. Every wave you clear sends extra enemies to your rivals, and there are twice as many enemies as in a solo run.

Over the internet, if friends cannot join, forward **TCP port 7777** on the host's router (most routers are opened automatically).

The join code hides the IP address from screens and chat. It is not a VPN: the game still connects straight to the host's PC.

Note: the version of the game hosted on a secure `https://` page cannot reach a plain local server. Use the downloaded HTML file or the EXE for online play.

## Settings

Edit `online_config.json` next to the server, or pass options on the command line:

| Option | Default | Meaning |
|---|---|---|
| `--port` | 7777 | Port to listen on |
| `--max` | 4 | Maximum players (1 to 4) |
| `--password` | (none) | Players must type it to join |
| `--region` | Local | Shown in the browser |
| `--registry` | (none) | URL of another Pixel Rush server to be listed on (heartbeat every 5 s) |
| `--motd` | Have fun! | Message shown in the lobby |

Example: `Pixel-Rush-Server.exe --password pizza --max 2`  (run with `--setup` to answer the two questions again)

Any server can act as a **registry**: start your other servers with `--registry http://main-server:7777`, and every game that knows the main server will see them all in its browser.

## What is where (architecture)

This follows the *Plug-and-Play Multiplayer Architecture* plan, adapted for a browser game:

- **Transport:** WebSockets instead of ENet, because browsers cannot use UDP.
- **Accounts and leaderboards:** a small built-in JSON store instead of Nakama, so there is no Docker or database to install.

| Plan | Here |
|---|---|
| Game.exe | `Pixel_Rush_0.6.html` / `Pixel-Rush-Game.exe` |
| Online SDK (Core, Network, ServerBrowser, Identity, Leaderboards, Events) | the `Online` object inside the game |
| Dedicated GameServer.exe | `pixel-rush-server.js` / `Pixel-Rush-Server.exe`. Runs the match flow and validates every result. |
| Server registry API | built into every server: `GET /servers`, `POST /heartbeat`, entries expire after 15 s |
| Accounts | guest accounts. The server issues a token per player (kept by the game) and the name is free to choose. |
| Leaderboards | `GET /leaderboard?board=wins\|best_wave\|races`. Written only by the server, from races it watched. |

**Security rules**
- The client never submits its own final score.
- The server checks that waves rise one at a time and no faster than real play allows, and that scores are possible.
- Anything suspicious is shown as *not counted* and kept off the leaderboards.
- Limits: 20 messages per second per player, 6 connections per address, 4 KB messages, version check on join, optional password.
- Heartbeat listings take the address the heartbeat really came from.

### HTTP endpoints

- `GET /` is a status page.
- `GET /info` returns the server listing.
- `GET /servers` returns the registry list.
- `POST /heartbeat` registers or refreshes a server.
- `GET /leaderboard?board=...` returns the top 25.

### WebSocket protocol (`/ws`, JSON messages)

**Client to server**
- `hello{v,game,name,token,maxWorld,pw,ch,wt}`
- `settings{target,diff,mods}` (host only, in the lobby)
- `start` (host only): begins the pick phase
- `pick{ch,wt,lock}`: fighter, weapon, lock in
- `vote{w}`: world vote
- `status{wave,hp,maxhp,score,kills}`, sent once a second
- `clear{wave}`
- `dead`
- `finish`
- `chat{text}`
- `leave`

**Server to client**
- `welcome{id,token,name,motd,server}`
- `room{state: lobby|pick|vote|countdown|race, left, options, tally, players[...]}`
- `voted{world,tally}`
- `countdown{n}`
- `go{world,target,diff,mods,ch,wt}`
- `race{players}`, sent once a second
- `attack{from,n}`
- `results{rows}`
- `chat`, `info`, `error`

Data lives in `pixel-rush-data/` next to the server (`identities.json`, `leaderboards.json`).
