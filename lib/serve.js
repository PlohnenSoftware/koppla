"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serve = void 0;
const promises_1 = require("fs/promises");
const http_1 = require("http");
function serve(sourceFile, port, generator) {
    let updated = Date.now();
    (async () => {
        const watcher = (0, promises_1.watch)(sourceFile, { recursive: false });
        for await (const _ of watcher) {
            const stats = await (0, promises_1.stat)(sourceFile);
            updated = stats.mtime.getTime();
        }
    })();
    const server = (0, http_1.createServer)(async (req, res) => {
        const url = new URL(req.url ?? "", `http://${req.headers.host}`);
        if (url.searchParams.has("lastUpdated")) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                updated,
            }));
            return;
        }
        try {
            const { content, type } = await generator(sourceFile);
            res.writeHead(200, { "Content-Type": type });
            res.end(content);
        }
        catch (err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end(`${err}`);
        }
    });
    server.on("listening", () => {
        console.log(`Listening on http://localhost:${port}`);
    });
    server.listen(port);
}
exports.serve = serve;
//# sourceMappingURL=serve.js.map