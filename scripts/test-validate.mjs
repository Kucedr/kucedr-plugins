// Self-check: validate.mjs passes on the hello-skill fixture and fails on each broken copy of it.
// Usage: node scripts/test-validate.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const validate = resolve('scripts/validate.mjs');
const json = (f, edit) => writeFileSync(f, JSON.stringify(edit(JSON.parse(readFileSync(f, 'utf8')))));

const cases = {
    'passes as is': [() => {}, null],
    'folder name ≠ id': [(p) => renameSync(p, p + '-x'), /id "hello-skill" must equal the folder name/],
    'unknown manifest key': [(p) => json(join(p, 'manifest.json'), (m) => ({ ...m, extra: 1 })), /Unrecognized key/],
    'missing author': [(p) => json(join(p, 'manifest.json'), ({ author, ...m }) => m), /manifest\.json: author/],
    'missing icon file': [(p) => rmSync(join(p, 'assets/icon.svg')), /icon assets\/icon\.svg does not exist/],
    symlink: [(p) => symlinkSync('/etc/hosts', join(p, 'assets/link')), /assets\/link is a symlink/],
    'skill name ≠ folder': [
        (p) => renameSync(join(p, 'skills/hello-skill'), join(p, 'skills/other')),
        /name "hello-skill" must equal the folder name "other"/,
    ],
    'mcp local + remote': [
        (p) => {
            mkdirSync(join(p, 'mcp/echo'), { recursive: true });
            mkdirSync(join(p, 'mcp/docs'), { recursive: true });
            writeFileSync(join(p, 'mcp/echo/manifest.json'), JSON.stringify({ id: 'echo', name: 'E', description: 'D', command: 'node', args: ['index.js'] }));
            writeFileSync(join(p, 'mcp/docs/manifest.json'), JSON.stringify({ id: 'docs', name: 'D', description: 'D', url: 'https://example.com/mcp' }));
        },
        null,
    ],
    'models manifest': [(p) => (mkdirSync(join(p, 'models')), writeFileSync(join(p, 'models/manifest.json'), '[{"id":"m","name":"M"}]')), null],
    'models manifest missing': [(p) => mkdirSync(join(p, 'models')), /models\/manifest\.json is missing/],
    'models without name': [(p) => (mkdirSync(join(p, 'models')), writeFileSync(join(p, 'models/manifest.json'), '[{"id":"m"}]')), /models\/manifest\.json: 0\.name/],
    'mcp manifest missing': [(p) => mkdirSync(join(p, 'mcp/echo'), { recursive: true }), /mcp\/echo\/manifest\.json is missing/],
    'mcp neither url nor command': [
        (p) => {
            mkdirSync(join(p, 'mcp/echo'), { recursive: true });
            writeFileSync(join(p, 'mcp/echo/manifest.json'), JSON.stringify({ id: 'echo', name: 'E', description: 'D' }));
        },
        /needs exactly one of url \(remote\) or command \(local\)/,
    ],
    'app entry missing': [
        (p) => {
            mkdirSync(join(p, 'apps/counter'), { recursive: true });
            writeFileSync(
                join(p, 'apps/counter/manifest.json'),
                JSON.stringify({ title: 'C', description: 'D', metadata: { version: '1.0.0', category: 'x', entry: 'index.html' } }),
            );
        },
        /apps\/counter\/index\.html \(metadata\.entry\) does not exist/,
    ],
};

for (const [name, [mutate, expected]] of Object.entries(cases)) {
    const cwd = mkdtempSync(join(tmpdir(), 'kucedr-'));
    const plugin = join(cwd, 'plugins/hello-skill');
    cpSync('scripts/fixtures/hello-skill', plugin, { recursive: true });
    mutate(plugin);
    const r = spawnSync(process.execPath, [validate], { cwd, encoding: 'utf8' });
    rmSync(cwd, { recursive: true, force: true });
    if (expected === null) assert.equal(r.status, 0, `${name}: ${r.stderr}`);
    else {
        assert.equal(r.status, 1, `${name}: expected failure`);
        assert.match(r.stderr, expected, name);
    }
    console.log(`ok: ${name}${expected ? ' → ' + r.stderr.trim().split('\n')[0] : ''}`);
}
