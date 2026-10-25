// Checks every plugin in plugins/. Mirrors the checks Kucedr runs at install.
// Usage: node scripts/validate.mjs [--base origin/main]
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

const ROOT = 'plugins';
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const ICON = /^[\w-]+\.(?:png|svg|jpe?g|webp)$/;
const MAX_FILE = 256 * 1024;
const PROVIDER_KEYS = [
    'authentication', 'apiKeyUrl', 'icon_dark_url', 'icon_light_url', 'instructions', 'models',
    'mcp_servers', 'vector_databases', 'web_search', 'storage', 'bots', 'settings',
];

const text = z.string().refine((s) => s.trim() !== '', 'must not be empty');
const Manifest = z
    .object({
        schemaVersion: z.literal(5),
        id: z.string().regex(ID, 'must be kebab-case').refine((s) => s !== 'kucedr', 'is reserved'),
        title: text,
        version: z.string().regex(SEMVER, 'must be semver'),
        description: text,
        categories: z.array(text).optional(),
        author: text.optional(),
        minAppVersion: z.string().regex(SEMVER, 'must be semver').optional(),
        icon: z.string().regex(ICON, 'must be a png, svg, jpg or webp file name').optional(),
        iconDark: z.string().regex(ICON, 'must be a png, svg, jpg or webp file name').optional(),
        ...Object.fromEntries(PROVIDER_KEYS.map((k) => [k, z.any()])),
    })
    .strict();

const Skill = z.object({
    name: z.string().max(64).regex(ID, 'must be kebab-case'),
    description: text.pipe(z.string().max(1024)),
    license: z.string().optional(),
    compatibility: z.string().min(1).max(500).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    'allowed-tools': text.optional(),
});

const zodErrors = (prefix, error) =>
    error.issues.map((i) => `${prefix}${i.path.length ? i.path.join('.') + ' ' : ''}${i.message}`);

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

// Visible entries of a folder; [] when it doesn't exist.
const entries = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => !n.startsWith('.')) : []);

function walk(dir, errors, rel = '') {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        const relPath = rel + name;
        const stat = lstatSync(path);
        if (stat.isSymbolicLink()) {
            errors.push(`${relPath} is a symlink`);
        } else if (stat.isDirectory()) {
            if (name === 'node_modules') errors.push(`${relPath}/ must not be committed; bundle the server instead`);
            else walk(path, errors, relPath + '/');
        } else if (name === 'package.json') {
            try {
                const scripts = readJson(path).scripts ?? {};
                for (const s of ['install', 'preinstall', 'postinstall']) {
                    if (s in scripts) errors.push(`${relPath} has an "${s}" script; Kucedr never runs npm install`);
                }
            } catch {
                errors.push(`${relPath} is not valid JSON`);
            }
        }
    }
}

function checkApp(dir, appId, errors) {
    const p = `apps/${appId}/`;
    const file = join(dir, 'manifest.json');
    if (!existsSync(file)) return errors.push(`${p}manifest.json is missing`);
    let m;
    try {
        m = readJson(file);
    } catch {
        return errors.push(`${p}manifest.json is not valid JSON`);
    }
    const str = (v) => typeof v === 'string' && v.trim() !== '';
    if (!str(m.title)) errors.push(`${p}manifest.json: title must be a non-empty string`);
    if (!str(m.description)) errors.push(`${p}manifest.json: description must be a non-empty string`);
    if (m.handle !== undefined && !/^@[a-z0-9][a-z0-9._-]*$/i.test(m.handle)) {
        errors.push(`${p}manifest.json: handle must look like @name`);
    }
    if (m.mode !== undefined && !['extension', 'window'].includes(m.mode)) {
        errors.push(`${p}manifest.json: mode must be "extension" or "window"`);
    }
    const md = m.metadata;
    if (typeof md !== 'object' || md === null || Array.isArray(md)) {
        return errors.push(`${p}manifest.json: metadata must be an object`);
    }
    if (!str(md.version)) errors.push(`${p}manifest.json: metadata.version must be a non-empty string`);
    if (!str(md.category)) errors.push(`${p}manifest.json: metadata.category must be a non-empty string`);
    const entry = md.entry;
    const safe =
        typeof entry === 'string' &&
        entry.endsWith('.html') &&
        !entry.startsWith('/') &&
        !entry.includes('\\') &&
        entry.split('/').every((s) => s !== '' && s !== '.' && s !== '..');
    if (!safe) errors.push(`${p}manifest.json: metadata.entry must be a relative path to an .html file`);
    else if (!existsSync(join(dir, entry))) errors.push(`${p}${entry} (metadata.entry) does not exist`);
}

function checkSkill(dir, skillId, errors) {
    const p = `skills/${skillId}/SKILL.md`;
    const file = join(dir, 'SKILL.md');
    if (!existsSync(file)) return errors.push(`${p} is missing`);
    if (lstatSync(file).size > MAX_FILE) return errors.push(`${p} is larger than 256 KB`);
    let data;
    try {
        data = matter(readFileSync(file, 'utf8')).data;
    } catch (e) {
        return errors.push(`${p}: frontmatter is invalid (${e.message})`);
    }
    const r = Skill.safeParse(data);
    if (!r.success) errors.push(...zodErrors(`${p}: `, r.error));
    else if (data.name !== skillId) errors.push(`${p}: name "${data.name}" must equal the folder name "${skillId}"`);
}

function checkPlugin(id) {
    const dir = join(ROOT, id);
    const errors = [];
    walk(dir, errors);

    const manifestFile = join(dir, 'manifest.json');
    let m = {};
    if (!existsSync(manifestFile)) {
        errors.push('manifest.json is missing');
    } else {
        try {
            m = readJson(manifestFile);
            const r = Manifest.safeParse(m);
            if (!r.success) errors.push(...zodErrors('manifest.json: ', r.error));
        } catch {
            errors.push('manifest.json is not valid JSON');
        }
    }
    if (m.id !== undefined && m.id !== id) errors.push(`manifest.json: id "${m.id}" must equal the folder name "${id}"`);
    for (const key of ['icon', 'iconDark']) {
        if (typeof m[key] !== 'string' || !ICON.test(m[key])) continue;
        const file = join(dir, 'assets', m[key]);
        if (!existsSync(file)) errors.push(`manifest.json: ${key} assets/${m[key]} does not exist`);
        else if (lstatSync(file).size > MAX_FILE) errors.push(`assets/${m[key]} is larger than 256 KB`);
    }

    const folders = (kind, allow = []) =>
        entries(join(dir, kind)).filter((n) => {
            if (allow.includes(n)) return false;
            if (lstatSync(join(dir, kind, n)).isDirectory()) return true;
            errors.push(`${kind}/${n} must be a folder`);
            return false;
        });
    const apps = folders('apps');
    const mcpDirs = folders('mcp', ['servers.json']);
    const skills = folders('skills');

    let mcpKeys = [];
    const serversFile = join(dir, 'mcp', 'servers.json');
    if (existsSync(serversFile)) {
        try {
            const s = readJson(serversFile);
            if (typeof s !== 'object' || s === null || Array.isArray(s)) errors.push('mcp/servers.json must be a JSON object');
            else mcpKeys = Object.keys(s);
        } catch {
            errors.push('mcp/servers.json is not valid JSON');
        }
    }
    for (const k of mcpKeys) if (mcpDirs.includes(k)) errors.push(`mcp server "${k}" is both a folder and a key in mcp/servers.json`);
    for (const s of mcpDirs) {
        const file = join(dir, 'mcp', s, 'mcp.json');
        if (!existsSync(file)) errors.push(`mcp/${s}/mcp.json is missing`);
        else try { readJson(file); } catch { errors.push(`mcp/${s}/mcp.json is not valid JSON`); }
    }

    for (const a of apps) checkApp(join(dir, 'apps', a), a, errors);
    for (const s of skills) checkSkill(join(dir, 'skills', s), s, errors);

    const isProvider = PROVIDER_KEYS.some((k) => k in m);
    if (!apps.length && !mcpDirs.length && !mcpKeys.length && !skills.length && !isProvider) {
        errors.push('must contain at least one app, MCP server, skill, or provider field');
    }
    return errors;
}

// Numeric major.minor.patch comparison; pre-release and build tags are ignored.
const newer = (a, b) => {
    const pa = a.split(/[-+]/)[0].split('.').map(Number);
    const pb = b.split(/[-+]/)[0].split('.').map(Number);
    for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i];
    return false;
};

function checkBump(base, ids) {
    const errors = [];
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const changed = new Set(
        git('diff', '--name-only', `${base}...HEAD`, '--', ROOT)
            .split('\n')
            .filter(Boolean)
            .map((f) => f.split('/')[1]),
    );
    for (const id of changed) {
        if (!ids.includes(id)) {
            // Deletions are allowed only with a code owner's approval, which branch protection enforces.
            console.log(`notice: plugins/${id} is deleted; a code owner must approve`);
            continue;
        }
        let old;
        try {
            old = JSON.parse(git('show', `${base}:${ROOT}/${id}/manifest.json`)).version;
        } catch {
            continue; // new plugin
        }
        let now;
        try {
            now = readJson(join(ROOT, id, 'manifest.json')).version;
        } catch {
            continue; // reported by checkPlugin
        }
        if (typeof now !== 'string' || !newer(now, old)) {
            errors.push(`plugins/${id}: version ${now} must be higher than ${old} on ${base}`);
        }
    }
    return errors;
}

const baseIdx = process.argv.indexOf('--base');
const base = baseIdx === -1 ? null : process.argv[baseIdx + 1];
const ids = entries(ROOT).filter((n) => lstatSync(join(ROOT, n)).isDirectory());

const errors = ids.flatMap((id) => checkPlugin(id).map((e) => `plugins/${id}: ${e}`));
if (base) errors.push(...checkBump(base, ids));

if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
}
console.log(`ok: ${ids.length} plugin(s) valid`);
