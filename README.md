# My Home Minecraft

This project contains configurations and instructions on how to set up a Minecraft server in the local network.

![My Home Banner](./public/banner.png)

## 🛠️ Setup

### Requirements

- [Docker](https://docs.docker.com/engine/install/) with Docker Compose
- [Node.js](https://nodejs.org/) 22+ (only used for helper scripts)

### Start the server

```bash
npm start
```

On the first run `npm start` creates `.env` from [`.env.example`](.env.example) and asks for some defaults for the server (address, admin usernames, whitelisting, etc.).
The answers are saved to `.env`

Once the Minecraft server is ready, it prints the address to connect to:

```
Container: running
Server:    ready to connect
Address:   192.168.0.10:25565
```

### Connect

I use [TLauncher](https://tlauncher.org/) for my setup, but you can use any other.

In Minecraft: **Multiplayer** → **Add Server** → paste the printed address. With the default port `25565` (unless changed in `.env`).

The game version of every player must match the server's `VERSION`.

To use a hostname instead of the IP (e.g. `mc.example.duckdns.org`), point it to the host's LAN IP in your local DNS and enter it as the
server address.

### Configuration

All settings live in `.env` and are passed to the [itzg/minecraft-server](https://docker-minecraft-server.readthedocs.io/) image,
so any of its [variables](https://docker-minecraft-server.readthedocs.io/en/latest/variables/) can be added there.
Apply changes with `npm restart`.

> [!WARNING]
> Pin `VERSION` to a specific release (e.g. `26.3`) instead of `LATEST`. World upgrades are one-way, so back up `data/` before changing it, and never downgrade.

The world and all server files are stored in `data/`. Back it up to keep your world.
### Commands

To set up the `.env` file:

```bash
npm run setup
```

To restart the server:

```bash
npm restart
```

To check the server status and exposed address:

```bash
npm run status
```

## ❓ Questions

If you have any questions you can start a discussion.  
If you think something works not as expected or you want to request a new feature, you can create an issue with the appropriate template selected.

## 🤝 Contributing

Pull requests are welcome.  
For major changes, please open an issue first to discuss what you would like to change.

## 🎫 License

[PolyForm Noncommercial 1.0.0](LICENSE): free for personal and other noncommercial use. Contact me for commercial use.
