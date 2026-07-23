/** Static dev server: build once, serve plainly (workers need un-gated chunks). */
import { join } from "node:path";

const root = join(import.meta.dir, "dist");
const port = Number(process.env.PORT ?? 4790);

Bun.serve({
  port,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const file = Bun.file(join(root, path === "/" ? "index.html" : path.slice(1)));
    if (await file.exists()) return new Response(file);
    return new Response("not found", { status: 404 });
  },
});

console.log(`geofarm → http://localhost:${port}`);
