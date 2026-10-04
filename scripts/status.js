#!/usr/bin/env node
// Prints whether the server container is running, whether it accepts players, and the address to connect to

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// "container_name" in docker-compose.yaml
const CONTAINER_NAME = 'minecraft';
// Docker health of the image's `mc-health` check (a Minecraft server list ping)
const HEALTH_LABELS = {
    healthy: 'ready to connect',
    starting: 'starting up, try again in a minute',
    unhealthy: 'not responding, check: "docker compose logs minecraft"',
};

const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    console.error('No .env yet: run `npm run setup` first.');
    process.exit(1);
}

process.loadEnvFile(envPath);
const { SERVER_ADDRESS, SERVER_PORT } = process.env;

const [state, health] = inspectContainer();

console.log(`Container: ${state ?? 'not created, run: "npm start"'}`);
if (state === 'running') {
    console.log(`Server:   ${HEALTH_LABELS[health] ?? health}`);
}
console.log(`Address:   ${SERVER_ADDRESS}:${SERVER_PORT}`);
process.exitCode = health === 'healthy' ? 0 : 1;

function inspectContainer() {
    try {
        const format = '{{.State.Status}} {{.State.Health.Status}}';
        const output = execFileSync('docker', ['inspect', '--format', format, CONTAINER_NAME], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return output.trim().split(' ');
    } catch {
        // No such container, or Docker isn't running
        return [];
    }
}
