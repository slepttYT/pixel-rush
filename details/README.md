# Pixel Rush (details)

The two EXEs at the top of the repository are all players need. Everything else lives here.

| Path | What it is |
|---|---|
| `Pixel_Rush_0.6.html` | The whole game (one HTML file). The EXE wraps this same file. |
| `desktop/` | Builds `Pixel-Rush-Game.exe` with Neutralino: `details/desktop/build.sh 0.6` |
| `online/` | The online server (`pixel-rush-server.js`), its README, and `build-exe.sh` for `Pixel-Rush-Server.exe` |
| `docs/` | Design notes (abilities). |
| `RELEASE_NOTES.md`, `VERSION` | Text and version number for the GitHub release. |
| `PIXEL_RUSH_0.5_PROGRESS.md` | The 0.5 checklist and request log. |

A GitHub Release with both EXEs is published automatically when main gets new EXEs or a new VERSION (see `.github/workflows/release.yml`).
