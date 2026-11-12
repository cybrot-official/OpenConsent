import { getOrg, saveDeliveryStatus } from "./db.js";

async function postJson(url, payload, secret) {
  const headers = { "content-type": "application/json" };
  if (secret) headers.authorization = `Bearer ${secret}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`The destination returned ${response.status}.`);
  return "Sent";
}

export async function deliver(event, consent, only) {
  const org = getOrg();
  const payload = {
    event,
    id: consent.id,
    visitorName: consent.visitorName,
    mobile: consent.mobile,
    locale: consent.locale,
    noticeHash: consent.noticeHash,
    createdAt: consent.createdAt,
    decisions: consent.decisions,
    organisation: org.name,
  };
  const delivery = {};
  if ((!only || only === "sheet") && org.sheetEnabled && org.sheetUrl) {
    try {
      delivery.sheet = await postJson(org.sheetUrl, payload);
      saveDeliveryStatus("sheet", `${delivery.sheet} ${new Date().toISOString()}`);
    } catch (error) {
      delivery.sheet = error.message;
      saveDeliveryStatus("sheet", `Failed: ${error.message}`);
    }
  }
  if ((!only || only === "webhook") && org.webhookEnabled && org.webhookUrl) {
    try {
      delivery.webhook = await postJson(org.webhookUrl, payload, org.webhookSecret);
      saveDeliveryStatus("webhook", `${delivery.webhook} ${new Date().toISOString()}`);
    } catch (error) {
      delivery.webhook = error.message;
      saveDeliveryStatus("webhook", `Failed: ${error.message}`);
    }
  }
  return delivery;
}
