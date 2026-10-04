#!/usr/bin/env node
// Creates .env file (if doesn't exist), and updates the server/minecraft settings when empty

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');

const MC_USERNAME_REGEX = /^\w{3,16}$/;
const QUOTED_VALUE_REGEX = /^"(.*)"$/;
const NO_ANSWER_REGEX = /^n/i;
// `KEY=value` line in .env, value captured
const ENV_LINE_REGEX = key => new RegExp(`^${key}=(.*)$`, 'm');

const projectRootPath = path.join(__dirname, '..');
const projectEnvPath = path.join(projectRootPath, '.env');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const QUESTIONS = {
    OPS: {
        question: 'Admin username: ',
    },
    ENABLE_WHITELIST: {
        question: 'Enable whitelist? [Y/n] ',
    }
}

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

    if (!get(env, 'OPS')) {
        env = set(env, 'OPS', await askUsername('Admin username: '));
    }
    if (!get(env, 'ENABLE_WHITELIST')) {
        const enable = !NO_ANSWER_REGEX.test(await ask('Enable whitelist? [Y/n] '));
        env = set(env, 'ENABLE_WHITELIST', enable ? 'TRUE' : 'FALSE');
    }
    if (get(env, 'ENABLE_WHITELIST').toUpperCase() === 'TRUE' && !get(env, 'WHITELIST')) {
        // Admins are always whitelisted
        const names = new Set(get(env, 'OPS').split(',').filter(Boolean));
        console.log(`Whitelisted usernames, one per line, empty line to finish (already added: ${[...names].join(', ')})`);
        while (true) {
            const name = await askUsername('> ', true);
            if (name) {
                names.add(name);
            } else {
                break;
            }
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

function ask(question) {
    // Check if possible to read from the terminal
    if (!process.stdin.isTTY) {
        console.error(`No terminal to answer "${question.trim()}": fill the empty values in .env manually.`);
        process.exit(1);
    }
    return rl.question(question).then(answer => answer.trim());
}

async function askUsername(question, allowEmpty = false) {
    for (;;) {
        const name = await ask(question);
        if ((allowEmpty && !name) || MC_USERNAME_REGEX.test(name)) return name;
        console.log('Usernames are 3-16 characters: letters, digits, underscore.');
    }
}
