# Pixel Rush Online (Versus Race)

Plug and play: one person runs the server, everyone else types its address in the game.

## Play in 3 steps

1. **Host:** start the server.
   - Windows: double-click `PixelRushServer.exe` (or `Start-Server.bat`).
     Windows may say the app is unrecognised; click *More info* and then *Run anyway*.
   - Mac/Linux: run `./start-server.sh` (needs [Node.js](https://nodejs.org) 18 or newer).

   The window shows the address to use, for example `192.168.1.20:7777`. Keep it open while you play.
2. **Everyone:** open Pixel Rush (the HTML file or `Pixel_Rush_0.5.exe`) and choose **ONLINE**.
   Type your name, type the address, then press **JOIN**.
   Servers you have joined are remembered, along with every server they list, and appear in the **server browser** with their ping.
3. **Race:** press **READY**. The leader (crown icon) picks the world, the target wave (10, 20 or 30), the difficulty and the modifiers, then presses **START RACE**.
   - The first player to clear the target wave wins.
   - Every wave you clear sends extra enemies to all your rivals.
   - The left side of the screen shows everyone's wave and hearts live.

**Same Wi-Fi** works right away. **Over the internet:** the host forwards **TCP port 7777** on their router to the PC running the server, then shares `their-public-IP:7777`.

Note: the version of the game hosted on a secure `https://` page cannot reach a plain local server. Use the downloaded HTML file or the EXE for online play.

## Settings

Edit `online_config.json` next to the server, or pass options on the command line:

| Option | Default | Meaning |
|---|---|---|
| `--port` | 7777 | Port to listen on |
| `--name` | Pixel Rush Server | Name shown in the server browser |
| `--max` | 8 | Maximum players (up to 16) |
| `--password` | (none) | Players must type it to join |
| `--region` | Local | Shown in the browser |
| `--registry` | (none) | URL of another Pixel Rush server to be listed on (heartbeat every 5 s) |
| `--motd` | Have fun! | Message shown in the lobby |

Example: `PixelRushServer.exe --name "Friday Night" --password pizza --max 4`

Any server can act as a **registry**: start your other servers with `--registry http://main-server:7777`, and every game that knows the main server will see them all in its browser.

## What is where (architecture)

This follows the *Plug-and-Play Multiplayer Architecture* plan, adapted for a browser game:

- **Transport:** WebSockets instead of ENet, because browsers cannot use UDP.
- **Accounts and leaderboards:** a small built-in JSON store instead of Nakama, so there is no Docker or database to install.

| Plan | Here |
|---|---|
| Game.exe | `Pixel_Rush_0.5.html` / `Pixel_Rush_0.5.exe` |
| Online SDK (Core, Network, ServerBrowser, Identity, Leaderboards, Events) | the `Online` object inside the game |
| Dedicated GameServer.exe | `pixel-rush-server.js` / `PixelRushServer.exe`. Runs the match flow and validates every result. |
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
- `hello{v,game,name,token,maxWorld,pw}`
- `ready{on}`
- `settings{world,target,diff,mods}` (leader only)
- `start` (leader only)
- `status{wave,hp,maxhp,score,kills}`, sent once a second
- `clear{wave}`
- `dead`
- `finish`
- `chat{text}`
- `leave`

**Server to client**
- `welcome{id,token,name,motd,server}`
- `room{...}`
- `countdown{n}`
- `go{world,target,diff,mods}`
- `race{players}`, sent once a second
- `attack{from,n}`
- `results{rows}`
- `chat`, `info`, `error`

Data lives in `pixel-rush-data/` next to the server (`identities.json`, `leaderboards.json`).
