// Builds dist/index.json and dist/icons/ from plugins/ and the released .tgz files.
// Run after the release step: each plugin's .tgz is either in dist/ (just released)
// or downloaded from its existing release, so integrity always matches what was published.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const REPO = process.env.GITHUB_REPOSITORY ?? 'Kucedr/kucedr-plugins';
const [owner, name] = REPO.split('/');
const PAGES = `https://${owner.toLowerCase()}.github.io/${name}`;
const BASE_KEYS = new Set([
    'schemaVersion', 'id', 'title', 'version', 'description', 'categories', 'author', 'minAppVersion', 'icon', 'iconDark',
]);

const visible = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => !n.startsWith('.')) : []);

mkdirSync('dist/icons', { recursive: true });

const plugins = visible('plugins')
    .sort()
    .map((id) => {
        const dir = join('plugins', id);
        const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
        const tag = `${id}-v${m.version}`;
        const file = `${id}-${m.version}.tgz`;
        const tgz = join('dist', file);
        if (!existsSync(tgz)) {
            execFileSync('gh', ['release', 'download', tag, '--pattern', file, '--dir', 'dist', '--repo', REPO], { stdio: 'inherit' });
        }

        const publishIcon = (file, suffix) => {
            if (!file) return undefined;
            const out = `${id}${suffix}${extname(file)}`;
            copyFileSync(join(dir, 'assets', file), join('dist/icons', out));
            return `${PAGES}/icons/${out}`;
        };
        const icon = publishIcon(m.icon, '');
        const iconDark = publishIcon(m.iconDark, '-dark');

        // validate.mjs ran first and only allows provider fields beyond BASE_KEYS.
        const contains = [
            visible(join(dir, 'apps')).length && 'apps',
            visible(join(dir, 'mcp')).length && 'mcp',
            Object.keys(m).some((k) => !BASE_KEYS.has(k)) && 'providers',
            visible(join(dir, 'skills')).length && 'skills',
        ].filter(Boolean);

        return {
            id,
            title: m.title,
            description: m.description,
            author: m.author,
            categories: m.categories,
            icon,
            iconDark,
            version: m.version,
            minAppVersion: m.minAppVersion,
            url: `https://github.com/${REPO}/releases/download/${tag}/${file}`,
            integrity: 'sha512-' + createHash('sha512').update(readFileSync(tgz)).digest('base64'),
            contains,
        };
    });

const index = { schemaVersion: 1, generatedAt: new Date().toISOString(), plugins };
writeFileSync('dist/index.json', JSON.stringify(index, null, 4) + '\n');
console.log(`dist/index.json: ${plugins.length} plugin(s)`);
