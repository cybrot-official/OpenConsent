import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  archivePurpose,
  getConsent,
  getState,
  listConsentRows,
  recordConsent,
  saveDelivery,
  saveOrg,
  savePurpose,
  withdrawConsent,
} from "./db.js";
import { deliver } from "./deliver.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 8787);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
  });
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function serveStatic(res, pathname) {
  const requested = pathname === "/" ? "owner.html" : pathname === "/visit" ? "visit.html" : pathname.replace(/^\/+/, "");
  if (requested.includes("..")) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }
  const filePath = normalize(join(publicDir, requested));
  if (!filePath.startsWith(publicDir)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }
  try {
    const body = await readFile(filePath);
    send(res, 200, body, types[extname(filePath)] || "application/octet-stream");
  } catch {
    send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  try {
    if (url.pathname === "/api/state" && req.method === "GET") {
      sendJson(res, 200, getState());
      return;
    }
    if (url.pathname === "/api/org" && req.method === "PUT") {
      sendJson(res, 200, saveOrg(await readJson(req)));
      return;
    }
    if (url.pathname === "/api/delivery" && req.method === "PUT") {
      sendJson(res, 200, saveDelivery(await readJson(req)));
      return;
    }
    if (url.pathname === "/api/delivery/test" && req.method === "POST") {
      const body = await readJson(req);
      const sample = {
        id: "test",
        visitorName: "Test record",
        mobile: "9999999999",
        locale: "en",
        noticeHash: "test",
        createdAt: new Date().toISOString(),
        decisions: [{ purposeId: "account", title: "Account", status: "granted" }],
      };
      const delivery = await deliver("consent.test", sample, body.target);
      sendJson(res, 200, { delivery });
      return;
    }
    if (url.pathname === "/api/export.json" && req.method === "GET") {
      send(res, 200, JSON.stringify({ exportedAt: new Date().toISOString(), rows: listConsentRows() }, null, 2), "application/json; charset=utf-8");
      return;
    }
    if (url.pathname === "/api/export.csv" && req.method === "GET") {
      const rows = listConsentRows();
      const headers = ["consentId", "savedAt", "name", "mobile", "language", "noticeHash", "purposeId", "purpose", "status", "withdrawnAt"];
      const lines = [headers.join(",")];
      for (const row of rows) {
        lines.push(headers.map((key) => csvCell(row[key])).join(","));
      }
      send(res, 200, `${lines.join("\n")}\n`, "text/csv; charset=utf-8");
      return;
    }
    if (url.pathname === "/api/purposes" && req.method === "POST") {
      sendJson(res, 200, savePurpose(await readJson(req)));
      return;
    }
    if (url.pathname.startsWith("/api/purposes/") && req.method === "DELETE") {
      sendJson(res, 200, archivePurpose(decodeURIComponent(url.pathname.split("/").pop())));
      return;
    }
    if (url.pathname === "/api/consents" && req.method === "POST") {
      const consent = recordConsent(await readJson(req));
      const delivery = await deliver("consent.saved", consent);
      sendJson(res, 201, { ...consent, delivery });
      return;
    }
    const consentMatch = url.pathname.match(/^\/api\/consents\/([^/]+)$/);
    if (consentMatch && req.method === "GET") {
      const consent = getConsent(decodeURIComponent(consentMatch[1]));
      if (!consent) {
        sendJson(res, 404, { error: "Consent record not found." });
        return;
      }
      sendJson(res, 200, consent);
      return;
    }
    const withdrawMatch = url.pathname.match(/^\/api\/consents\/([^/]+)\/withdraw$/);
    if (withdrawMatch && req.method === "POST") {
      const body = await readJson(req);
      const consent = withdrawConsent(decodeURIComponent(withdrawMatch[1]), body.purposeId);
      const delivery = await deliver("consent.withdrawn", consent);
      sendJson(res, 200, { ...consent, delivery });
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      sendJson(res, 404, { error: "Unknown API route." });
      return;
    }
    await serveStatic(res, url.pathname);
  } catch (error) {
    const message = error instanceof SyntaxError ? "Invalid JSON." : error.message || "Request failed.";
    sendJson(res, 400, { error: message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`OpenConsent desk  http://127.0.0.1:${port}`);
  console.log(`Counter screen    http://127.0.0.1:${port}/visit`);
});
