#!/usr/bin/env node
// Creates .env file (if doesn't exist), and updates the server/minecraft settings when empty

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline/promises');

const MC_USERNAME_REGEX = /^\w{3,16}$/;
const HOSTNAME_REGEX = /^[\w.-]+$/;
const QUOTED_VALUE_REGEX = /^"(.*)"$/;
const YES_NO_REGEX = /^(y(es)?|no?)$/i;
// Loopback, Docker/VM bridges and VPNs: not reachable by players on the LAN
const VIRTUAL_INTERFACE_REGEX = /^(lo|docker|br-|veth|virbr|tailscale|wg)/;
// `KEY=value` line in .env, value captured
const ENV_LINE_REGEX = key => new RegExp(`^${key}=(.*)$`, 'm');

const projectRootPath = path.join(__dirname, '..');
const projectEnvPath = path.join(projectRootPath, '.env');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

main().catch(error => {
    // Ctrl+C rejects the pending rl.question()
    if (error.code !== 'ABORT_ERR') {
        throw error;
    }
    process.exit(130);
});

async function main() {
    if (!fs.existsSync(projectEnvPath)) {
        fs.copyFileSync(path.join(projectRootPath, '.env.example'), projectEnvPath);
        console.log('Created .env from .env.example');
    }
    let env = fs.readFileSync(projectEnvPath, 'utf8');

    if (!get(env, 'SERVER_ADDRESS')) {
        const serverIp = getServerIp();
        const question = `Address players connect to, without port (hostname/IP)${serverIp ? ` [${serverIp}]` : ''}: `;

        // Empty answer is only allowed when there's a detected IP to fall back to
        const address = await askMatching(question, HOSTNAME_REGEX, 'Hostname or IP only, no port.', Boolean(serverIp));
        env = set(env, 'SERVER_ADDRESS', address || serverIp);
    }

    if (!get(env, 'ONLINE_MODE')) {
        const offline = await askYesNo('Allow unofficial launchers like TLauncher (offline mode)? [y/N] ');
        env = set(env, 'ONLINE_MODE', offline ? 'FALSE' : 'TRUE');
    }

    // Offline players get a name-based UUID: `:offline` makes the image generate it instead of looking up the official account
    const usernameSuffix = get(env, 'ONLINE_MODE').toUpperCase() === 'FALSE' ? ':offline' : '';

    if (!get(env, 'OPS')) {
        env = set(env, 'OPS', (await askUsername('Admin username: ')) + usernameSuffix);
    }

    if (!get(env, 'ENABLE_WHITELIST')) {
        const enable = await askYesNo('Enable whitelist? [y/N] ');
        env = set(env, 'ENABLE_WHITELIST', enable ? 'TRUE' : 'FALSE');
    }

    if (get(env, 'ENABLE_WHITELIST').toUpperCase() === 'TRUE' && !get(env, 'WHITELIST')) {
        // Admins are always whitelisted
        const names = new Set(get(env, 'OPS').split(',').filter(Boolean));
        console.log(`Whitelisted usernames, one per line, empty line to finish (already added: ${[...names].join(', ')})`);
        while (true) {
            const name = await askUsername('> ', true);
            if (!name) {
                break

            }
            names.add(name + usernameSuffix);
        }
        env = set(env, 'WHITELIST', [...names].join(','));
    }

    rl.close();
    fs.writeFileSync(projectEnvPath, env);
}

function get(env, key) {
    const match = env.match(ENV_LINE_REGEX(key));
    return match ? match[1].trim().replace(QUOTED_VALUE_REGEX, '$1') : '';
}

function set(env, key, value) {
    const line = ENV_LINE_REGEX(key);
    return line.test(env) ? env.replace(line, `${key}=${value}`) : `${env.trimEnd()}\n${key}=${value}\n`;
}

// Empty answer means no
async function askYesNo(question) {
    const answer = await askMatching(question, YES_NO_REGEX, '', true);
    return answer.toLowerCase().startsWith('y');
}

function askUsername(question, allowEmpty = false) {
    return askMatching(question, MC_USERNAME_REGEX, 'Usernames are 3-16 characters: letters, digits, underscore.', allowEmpty);
}

async function askMatching(question, regex, hint, allowEmpty = false) {
    while (true) {
        const answer = await ask(question);
        if ((allowEmpty && !answer) || regex.test(answer)) {
            return answer;
        }
        console.log(hint);
    }
}

function ask(question) {
    // Check if possible to read from the terminal
    if (!process.stdin.isTTY) {
        console.error(`No terminal to answer "${question.trim()}": fill the empty values in .env manually.`);
        process.exit(1);
    }
    return rl.question(question).then(answer => answer.trim());
}

function getServerIp() {
    const addresses = Object.entries(os.networkInterfaces())
        .filter(([name]) => !VIRTUAL_INTERFACE_REGEX.test(name))
        .flatMap(([, list]) => list);
    return addresses.find(address => address.family === 'IPv4' && !address.internal)?.address ?? '';
}
