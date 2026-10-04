# CLAUDE.md

Vanilla Minecraft **Java Edition** server for a home LAN, run with Docker Compose using the
[`itzg/minecraft-server`](https://docker-minecraft-server.readthedocs.io/) image. This repo holds config only: no app code.

## Layout

- `docker-compose.yml`: container wiring only (port, volume, `EULA`). Loads all settings via `env_file: .env`.
- `.env.example` → copy to `.env` (gitignored, claudeignored): every server setting, passed to the container as-is, so names must be [image env vars](https://docker-minecraft-server.readthedocs.io/en/latest/variables/). `server.properties` is generated from them. Compose refuses to start without `.env`.
- `data/`: world, logs, generated `server.properties`, `whitelist.json`. Gitignored. **This is the save game. Never delete it.**
- `package.json`: npm scripts wrapping Docker Compose (`prestart`/`prerestart` run `setup` first), plus Prettier + Husky. No build.

## Network

- Minecraft is raw TCP on `25565`, not HTTP, and has no TLS. Traefik can't route it by hostname (`HostSNI` needs TLS), so
  the port is published straight from the container instead of going through the existing Traefik proxy.
- Players connect to `mc.<domain>.duckdns.org` (or the host's LAN IP). That name needs to resolve to the Docker host's LAN
  IP, the same way the other LAN-only `*.duckdns.org` services do. Default port, so clients don't need `:25565`.
- LAN-only: **never** port-forward 25565 on the router.

## Commands

```bash
npm run setup                             # scripts/setup.js: create .env if missing, ask for empty OPS / ENABLE_WHITELIST / WHITELIST, save to .env
npm start                                 # setup + start / apply config changes
npm restart                               # setup + force-recreate the container
docker compose logs -f minecraft          # logs
docker exec -i minecraft rcon-cli         # server console (e.g. `whitelist add Name`, `op Name`, `save-all`)
docker compose down                       # stop (world is saved on shutdown)
npm run prettier -- <file>                # format
```

## Rules

- The game version is pinned via `VERSION` in `.env` (the image falls back to the newest release if it is missing). Never use `LATEST`, and only bump it manually after
  both players' launchers have the new version. World upgrades are one-way, so back up `data/` first and never downgrade.
  To find the latest release:
  `curl -s https://piston-meta.mojang.com/mc/game/version_manifest_v2.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["latest"]["release"])'`
- `ONLINE_MODE` stays on (the default): every player needs a paid Java account. Don't turn it off.
- Keep the whitelist enforced.
- Prettier settings: YAML/JSON use 2 spaces and double quotes; everything else uses 4 spaces and single quotes, 140 columns.
