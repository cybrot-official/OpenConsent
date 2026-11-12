import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, "openconsent.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS org (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    city TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS purposes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_hi TEXT NOT NULL,
    data_items TEXT NOT NULL,
    description TEXT NOT NULL,
    description_hi TEXT NOT NULL,
    optional INTEGER NOT NULL,
    retention TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS consents (
    id TEXT PRIMARY KEY,
    visitor_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    locale TEXT NOT NULL,
    decisions TEXT NOT NULL,
    notice_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

for (const [column, definition] of [
  ["address", "TEXT NOT NULL DEFAULT ''"],
  ["pincode", "TEXT NOT NULL DEFAULT ''"],
  ["phone", "TEXT NOT NULL DEFAULT ''"],
  ["email", "TEXT NOT NULL DEFAULT ''"],
  ["sheet_enabled", "INTEGER NOT NULL DEFAULT 0"],
  ["sheet_url", "TEXT NOT NULL DEFAULT ''"],
  ["sheet_status", "TEXT NOT NULL DEFAULT ''"],
  ["webhook_enabled", "INTEGER NOT NULL DEFAULT 0"],
  ["webhook_url", "TEXT NOT NULL DEFAULT ''"],
  ["webhook_secret", "TEXT NOT NULL DEFAULT ''"],
  ["webhook_status", "TEXT NOT NULL DEFAULT ''"],
]) {
  const columns = db.prepare("PRAGMA table_info(org)").all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE org ADD COLUMN ${column} ${definition}`);
  }
}

function seed() {
  const existing = db.prepare("SELECT id FROM org WHERE id = 1").get();
  if (existing) return;
  db.prepare(`
    INSERT INTO org (id, name, contact, city, address, pincode, phone, email)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "Shree Clinic",
    "Reception",
    "Delhi",
    "14, Lane 3, Karol Bagh",
    "110005",
    "011-4000-1200",
    "desk@shreeclinic.example",
  );
  const insert = db.prepare(`
    INSERT INTO purposes (
      id, title, title_hi, data_items, description, description_hi,
      optional, retention, sort_order, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insert.run(
    "appointment",
    "Appointment and treatment",
    "मुलाकात और इलाज",
    "Name, mobile number, symptoms",
    "To book this visit and keep a treatment note.",
    "इस मुलाकात को दर्ज करने और इलाज का नोट रखने के लिए।",
    0,
    "For 1 year after the last visit",
    1,
  );
  insert.run(
    "whatsapp_tips",
    "Health tips on WhatsApp",
    "व्हाट्सऐप पर स्वास्थ्य सुझाव",
    "Mobile number",
    "Occasional messages about checkups and health tips. This visit does not depend on this choice.",
    "जाँच और स्वास्थ्य सुझावों के कभी-कभार संदेश। यह मुलाकात इस विकल्प पर निर्भर नहीं करती।",
    1,
    "Until you withdraw, or 1 year",
    2,
  );
  recordConsent({
    visitorName: "Ravi Kumar",
    mobile: "9810001122",
    locale: "hi",
    decisions: [
      { purposeId: "appointment", status: "granted" },
      { purposeId: "whatsapp_tips", status: "denied" },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  });
}

function mapPurpose(row) {
  return {
    id: row.id,
    title: row.title,
    titleHi: row.title_hi,
    dataItems: row.data_items,
    description: row.description,
    descriptionHi: row.description_hi,
    optional: Boolean(row.optional),
    retention: row.retention,
    sortOrder: row.sort_order,
    active: Boolean(row.active),
  };
}

export function getOrg() {
  const row = db.prepare(`
    SELECT name, contact, city, address, pincode, phone, email,
           sheet_enabled, sheet_url, sheet_status,
           webhook_enabled, webhook_url, webhook_secret, webhook_status
    FROM org WHERE id = 1
  `).get();
  return {
    name: row.name,
    contact: row.contact,
    city: row.city,
    address: row.address || "",
    pincode: row.pincode || "",
    phone: row.phone || "",
    email: row.email || "",
    sheetEnabled: Boolean(row.sheet_enabled),
    sheetUrl: row.sheet_url || "",
    sheetStatus: row.sheet_status || "",
    webhookEnabled: Boolean(row.webhook_enabled),
    webhookUrl: row.webhook_url || "",
    webhookSecret: row.webhook_secret || "",
    webhookStatus: row.webhook_status || "",
  };
}

export function listPurposes(activeOnly = false) {
  const sql = activeOnly
    ? "SELECT * FROM purposes WHERE active = 1 ORDER BY sort_order, title"
    : "SELECT * FROM purposes ORDER BY sort_order, title";
  return db.prepare(sql).all().map(mapPurpose);
}

export function noticeHash() {
  const org = getOrg();
  const body = JSON.stringify({
    org: org.name,
    contact: org.contact,
    city: org.city,
    address: org.address,
    pincode: org.pincode,
    phone: org.phone,
    email: org.email,
    purposes: listPurposes(true).map((purpose) => ({
      id: purpose.id,
      title: purpose.title,
      titleHi: purpose.titleHi,
      dataItems: purpose.dataItems,
      description: purpose.description,
      descriptionHi: purpose.descriptionHi,
      optional: purpose.optional,
      retention: purpose.retention,
    })),
  });
  return createHash("sha256").update(body).digest("hex").slice(0, 16);
}

function mapConsent(row) {
  return {
    id: row.id,
    visitorName: row.visitor_name,
    mobile: row.mobile,
    locale: row.locale,
    decisions: JSON.parse(row.decisions),
    noticeHash: row.notice_hash,
    createdAt: row.created_at,
  };
}

export function getState() {
  const consents = db
    .prepare("SELECT * FROM consents ORDER BY created_at DESC")
    .all()
    .map(mapConsent);
  return {
    org: getOrg(),
    purposes: listPurposes(false),
    consents,
    noticeHash: noticeHash(),
  };
}

export function saveOrg(input) {
  const clean = {
    name: String(input.name || "").trim(),
    contact: String(input.contact || "").trim(),
    city: String(input.city || "").trim(),
    address: String(input.address || "").trim(),
    pincode: String(input.pincode || "").trim(),
    phone: String(input.phone || "").trim(),
    email: String(input.email || "").trim(),
  };
  if (!clean.name || !clean.address || !clean.city || !clean.pincode || !clean.phone || !clean.contact) {
    throw new Error("Name, address, city, PIN code, phone, and grievance contact are required.");
  }
  if (!/^\d{6}$/.test(clean.pincode)) throw new Error("Enter a 6-digit PIN code.");
  if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) throw new Error("Enter a valid email address.");
  db.prepare(`
    UPDATE org
    SET name = ?, contact = ?, city = ?, address = ?, pincode = ?, phone = ?, email = ?
    WHERE id = 1
  `).run(clean.name, clean.contact, clean.city, clean.address, clean.pincode, clean.phone, clean.email);
  return getState();
}

export function saveDelivery(input) {
  const sheetUrl = String(input.sheetUrl || "").trim();
  const webhookUrl = String(input.webhookUrl || "").trim();
  const webhookSecret = String(input.webhookSecret || "").trim();
  const sheetEnabled = Boolean(input.sheetEnabled);
  const webhookEnabled = Boolean(input.webhookEnabled);
  if (sheetEnabled && !sheetUrl) throw new Error("Paste the Google Sheet web app URL.");
  if (webhookEnabled && !webhookUrl) throw new Error("Paste the webhook URL.");
  if (sheetUrl && !/^https:\/\//.test(sheetUrl)) throw new Error("The Google Sheet URL must start with https.");
  if (webhookUrl && !/^https?:\/\//.test(webhookUrl)) throw new Error("The webhook URL must start with http:// or https://.");
  db.prepare(`
    UPDATE org
    SET sheet_enabled = ?, sheet_url = ?, webhook_enabled = ?, webhook_url = ?, webhook_secret = ?
    WHERE id = 1
  `).run(sheetEnabled ? 1 : 0, sheetUrl, webhookEnabled ? 1 : 0, webhookUrl, webhookSecret);
  if (!sheetEnabled) saveDeliveryStatus("sheet", "");
  if (!webhookEnabled) saveDeliveryStatus("webhook", "");
  return getState();
}

export function saveDeliveryStatus(target, message) {
  const column = target === "sheet" ? "sheet_status" : "webhook_status";
  db.prepare(`UPDATE org SET ${column} = ? WHERE id = 1`).run(String(message).slice(0, 280));
}

export function listConsentRows() {
  return getState().consents.flatMap((consent) => consent.decisions.map((decision) => ({
    consentId: consent.id,
    savedAt: consent.createdAt,
    name: consent.visitorName,
    mobile: consent.mobile,
    language: consent.locale,
    noticeHash: consent.noticeHash,
    purposeId: decision.purposeId,
    purpose: decision.title,
    status: decision.status,
    withdrawnAt: decision.withdrawnAt || "",
  })));
}

export function savePurpose(input) {
  const purpose = {
    id: String(input.id || "").trim() || randomUUID().slice(0, 8),
    title: String(input.title || "").trim(),
    titleHi: String(input.titleHi || "").trim(),
    dataItems: String(input.dataItems || "").trim(),
    description: String(input.description || "").trim(),
    descriptionHi: String(input.descriptionHi || "").trim(),
    optional: input.optional ? 1 : 0,
    retention: String(input.retention || "").trim(),
  };
  if (!purpose.title || !purpose.titleHi || !purpose.dataItems || !purpose.description || !purpose.descriptionHi || !purpose.retention) {
    throw new Error("Fill every purpose field, including Hindi.");
  }
  const current = db.prepare("SELECT id, sort_order FROM purposes WHERE id = ?").get(purpose.id);
  if (current) {
    db.prepare(`
      UPDATE purposes
      SET title = ?, title_hi = ?, data_items = ?, description = ?, description_hi = ?,
          optional = ?, retention = ?, active = 1
      WHERE id = ?
    `).run(
      purpose.title,
      purpose.titleHi,
      purpose.dataItems,
      purpose.description,
      purpose.descriptionHi,
      purpose.optional,
      purpose.retention,
      purpose.id,
    );
  } else {
    const next = db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM purposes").get().n;
    db.prepare(`
      INSERT INTO purposes (
        id, title, title_hi, data_items, description, description_hi,
        optional, retention, sort_order, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      purpose.id,
      purpose.title,
      purpose.titleHi,
      purpose.dataItems,
      purpose.description,
      purpose.descriptionHi,
      purpose.optional,
      purpose.retention,
      next,
    );
  }
  return getState();
}

export function archivePurpose(id) {
  const row = db.prepare("SELECT id FROM purposes WHERE id = ?").get(id);
  if (!row) throw new Error("Purpose not found.");
  db.prepare("UPDATE purposes SET active = 0 WHERE id = ?").run(id);
  return getState();
}

export function recordConsent({ visitorName, mobile, locale, decisions, createdAt }) {
  const name = String(visitorName || "").trim();
  const phone = String(mobile || "").replace(/\s+/g, "");
  if (name.length < 2) throw new Error("Enter the visitor's name.");
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Enter a 10-digit mobile number.");
  if (locale !== "en" && locale !== "hi") throw new Error("Choose English or Hindi.");

  const purposes = listPurposes(true);
  if (!purposes.length) throw new Error("Add a purpose before taking consent.");
  const incoming = new Map((decisions || []).map((item) => [item.purposeId, item.status]));
  const snapshot = purposes.map((purpose) => {
    const status = incoming.get(purpose.id);
    if (status !== "granted" && status !== "denied") {
      throw new Error(`Choose allow or don't allow for ${purpose.title}.`);
    }
    return {
      purposeId: purpose.id,
      title: purpose.title,
      titleHi: purpose.titleHi,
      optional: purpose.optional,
      status,
    };
  });

  const id = randomUUID().slice(0, 8);
  db.prepare(`
    INSERT INTO consents (id, visitor_name, mobile, locale, decisions, notice_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    phone,
    locale,
    JSON.stringify(snapshot),
    noticeHash(),
    createdAt || new Date().toISOString(),
  );
  return mapConsent(db.prepare("SELECT * FROM consents WHERE id = ?").get(id));
}

export function withdrawConsent(consentId, purposeId) {
  const row = db.prepare("SELECT * FROM consents WHERE id = ?").get(consentId);
  if (!row) throw new Error("Consent record not found.");
  const decisions = JSON.parse(row.decisions);
  const target = decisions.find((item) => item.purposeId === purposeId);
  if (!target) throw new Error("That purpose is not on this record.");
  if (target.status !== "granted") throw new Error("Only an allowed purpose can be withdrawn.");
  target.status = "withdrawn";
  target.withdrawnAt = new Date().toISOString();
  db.prepare("UPDATE consents SET decisions = ? WHERE id = ?").run(JSON.stringify(decisions), consentId);
  return mapConsent(db.prepare("SELECT * FROM consents WHERE id = ?").get(consentId));
}

export function getConsent(id) {
  const row = db.prepare("SELECT * FROM consents WHERE id = ?").get(id);
  return row ? mapConsent(row) : null;
}

function fillBlankOrgDetails() {
  const org = getOrg();
  if (org.address || org.phone) return;
  db.prepare("UPDATE org SET address = ?, pincode = ?, phone = ?, email = ? WHERE id = 1").run(
    "14, Lane 3, Karol Bagh",
    "110005",
    "011-4000-1200",
    "desk@shreeclinic.example",
  );
}

seed();
fillBlankOrgDetails();
