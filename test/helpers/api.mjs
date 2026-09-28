import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
// Synthetic signing material, never a real site's credential.
export const adminKey = `${'a'.repeat(24)}:${'b'.repeat(64)}`;

export async function fixtureApi(handler) {
    const requests = [];
    const errors = [];
    const server = createServer(async (req, res) => {
        try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const raw = Buffer.concat(chunks).toString();
            const request = {
                method: req.method,
                url: new URL(req.url, 'http://localhost'),
                headers: req.headers,
                raw,
                body: req.headers['content-type']?.includes('application/json') && raw ? JSON.parse(raw) : undefined
            };
            requests.push(request);
            const response = await handler(request);
            if (!response) throw new Error(`Unexpected request: ${req.method} ${req.url}`);
            res.writeHead(response.status || 200, {'content-type': 'application/json'});
            const body = response.body ?? response;
            // Ghost browse responses carry pagination even with a single result.
            if (req.method === 'GET' && /\/(posts|pages|members|subscribers)\/$/.test(request.url.pathname) && !response.status) {
                body.meta = {pagination: {page: 1, pages: 1, limit: 15, total: Object.values(body)[0].length, next: null, prev: null}};
            }
            res.end(JSON.stringify(body));
        } catch (error) {
            errors.push(error);
            res.writeHead(500, {'content-type': 'application/json'});
            res.end(JSON.stringify({errors: [{message: error.message, type: 'TestFixtureError'}]}));
        }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return {
        url: `http://127.0.0.1:${server.address().port}`,
        requests,
        errors,
        close: () => new Promise(resolve => {
            server.close(resolve);
            server.closeAllConnections();
        })
    };
}

export function runDemo(file, args = [], env = {}) {
    return new Promise((resolve, reject) => {
        // Pass only test configuration and coverage, never ambient site credentials.
        const child = spawn(process.execPath, [file, ...args], {
            cwd: root,
            env: {
                PATH: process.env.PATH,
                NODE_V8_COVERAGE: process.env.NODE_V8_COVERAGE,
                ...env
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        const timer = setTimeout(() => child.kill('SIGKILL'), 12000);
        child.on('error', error => { clearTimeout(timer); reject(error); });
        child.on('close', (code, signal) => {
            clearTimeout(timer);
            if (signal) reject(new Error(`${file} terminated with ${signal}: ${stderr}`));
            else resolve({code, stdout, stderr});
        });
    });
}

export const apiFailure = {
    status: 404,
    body: {errors: [{message: 'Fixture resource missing', type: 'NotFoundError'}]}
};
