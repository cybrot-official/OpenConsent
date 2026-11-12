import { accessNotice, consentSummary, escapeHtml, formatWhen, orgPlace, purposeText, visitorCopy } from "./shared.js";

const screens = [
  ["desk", "Desk"],
  ["purposes", "Purposes"],
  ["notice", "Notice"],
  ["log", "Consent log"],
  ["setup", "Setup"],
];

const state = { data: null, screen: location.hash.slice(1) || "desk", noticeLocale: "en", message: "" };
const main = document.querySelector("#main");
const nav = document.querySelector("#nav");

function activePurposes() {
  return state.data.purposes.filter((purpose) => purpose.active);
}

async function load() {
  const response = await fetch("/api/state");
  state.data = await response.json();
  render();
}

function renderNav() {
  nav.innerHTML = screens.map(([id, label]) => `
    <button type="button" data-screen="${id}" ${state.screen === id ? 'aria-current="page"' : ""}>${label}</button>
  `).join("");
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function summaryClass(decisions) {
  const granted = decisions.filter((item) => item.status === "granted").length;
  const withdrawn = decisions.filter((item) => item.status === "withdrawn").length;
  if (withdrawn || granted === 0) return "warn";
  if (granted === decisions.length) return "ok";
  return "";
}

function statusChip(item) {
  const label = item.status === "granted" ? "Allowed" : item.status === "denied" ? "Refused" : "Withdrawn";
  const tone = item.status === "granted" ? "ok" : "warn";
  return `<span class="chip ${tone}">${label}</span>`;
}

function renderDesk() {
  const { org, consents, noticeHash } = state.data;
  const latest = consents.slice(0, 6);
  const purposes = activePurposes().length;
  main.innerHTML = `
    <header class="mast">
      <div>
        <p class="eyebrow">Desk</p>
        <h1>${escapeHtml(org.name)}</h1>
        <p class="lede">${escapeHtml(orgPlace(org))}</p>
        <p class="lede">${escapeHtml(org.phone)}${org.email ? ` · ${escapeHtml(org.email)}` : ""}</p>
      </div>
      <div class="stats">
        <div class="stat"><b>${consents.length}</b><span>Records</span></div>
        <div class="stat"><b>${purposes}</b><span>Purposes</span></div>
        <div class="stat"><b>${escapeHtml(noticeHash.slice(0, 4))}</b><span>Notice</span></div>
      </div>
    </header>
    <div class="grid">
      <section class="card">
        <h2>Latest visitors</h2>
        ${latest.length ? `<ul class="people">
          ${latest.map((consent) => `<li>
            <span class="avatar">${escapeHtml(initials(consent.visitorName))}</span>
            <div>
              <div class="who">${escapeHtml(consent.visitorName)}</div>
              <div class="meta">${escapeHtml(consent.mobile)} · ${formatWhen(consent.createdAt)}</div>
            </div>
            <span class="chip ${summaryClass(consent.decisions)}">${consentSummary(consent.decisions)}</span>
          </li>`).join("")}
        </ul>` : `<p>No consent yet. Open the counter screen and take the first one.</p>`}
      </section>
      <section class="handoff">
        <p class="eyebrow">Counter</p>
        <h2>Hand this to the visitor</h2>
        <ol>
          <li>They read the notice in English or Hindi.</li>
          <li>They tap Allow or Don't allow for each purpose.</li>
          <li>The record shows up on this desk.</li>
        </ol>
        <a class="counter-link" href="/visit" target="_blank" rel="noreferrer">Open counter screen</a>
        <p class="url">127.0.0.1:8787/visit</p>
      </section>
    </div>
  `;
}

function renderPurposes() {
  const purposes = state.data.purposes;
  main.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Notice content</p>
        <h1>Purposes</h1>
        <p class="lede">Each purpose becomes its own choice on the counter screen. Optional purposes cannot be required for the visit.</p>
      </div>
    </header>
    <div class="grid">
      <section class="card">
        <h2>On the notice</h2>
        <div class="purpose-list">
          ${purposes.filter((item) => item.active).map((purpose) => `
            <article class="purpose ${purpose.optional ? "optional" : ""}">
              <div>
                <strong>${escapeHtml(purpose.title)}</strong>
                <div class="meta">${escapeHtml(purpose.titleHi)} · ${escapeHtml(purpose.dataItems)}</div>
                <p>${escapeHtml(purpose.description)}</p>
              </div>
              <div class="actions">
                <span class="chip ${purpose.optional ? "optional" : "ok"}">${purpose.optional ? "Optional" : "Needed"}</span>
                <button class="btn-ghost" type="button" data-edit="${escapeHtml(purpose.id)}">Edit</button>
                <button class="btn-danger" type="button" data-archive="${escapeHtml(purpose.id)}">Remove</button>
              </div>
            </article>
          `).join("") || "<p>No active purposes.</p>"}
        </div>
      </section>
      <form class="card stack" id="purpose-form">
        <h2>Add or edit</h2>
        <input type="hidden" name="id">
        <div class="pair">
          <label>English title <input name="title" required></label>
          <label>Hindi title <input name="titleHi" required></label>
        </div>
        <label>Data used <input name="dataItems" placeholder="Name, mobile number" required></label>
        <label>Why, in English <textarea name="description" required></textarea></label>
        <label>Why, in Hindi <textarea name="descriptionHi" required></textarea></label>
        <label>How long it is kept <input name="retention" required></label>
        <label class="check"><input type="checkbox" name="optional"> Optional. The visit still happens if this is refused.</label>
        <p class="error" id="form-error"></p>
        <div class="actions">
          <button class="btn" type="submit">Save purpose</button>
          <button class="btn-ghost" type="reset">Clear</button>
        </div>
      </form>
    </div>
  `;
  document.querySelector("#purpose-form").addEventListener("submit", onPurposeSubmit);
  document.querySelector("#purpose-form").addEventListener("reset", () => {
    document.querySelector('[name="id"]').value = "";
  });
}

function fillPurpose(id) {
  const purpose = state.data.purposes.find((item) => item.id === id);
  const form = document.querySelector("#purpose-form");
  if (!purpose || !form) return;
  form.id.value = purpose.id;
  form.title.value = purpose.title;
  form.titleHi.value = purpose.titleHi;
  form.dataItems.value = purpose.dataItems;
  form.description.value = purpose.description;
  form.descriptionHi.value = purpose.descriptionHi;
  form.retention.value = purpose.retention;
  form.optional.checked = purpose.optional;
}

async function onPurposeSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const body = {
    id: form.id.value,
    title: form.title.value,
    titleHi: form.titleHi.value,
    dataItems: form.dataItems.value,
    description: form.description.value,
    descriptionHi: form.descriptionHi.value,
    retention: form.retention.value,
    optional: form.optional.checked,
  };
  const response = await fetch("/api/purposes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    document.querySelector("#form-error").textContent = payload.error;
    return;
  }
  state.data = payload;
  render();
}

function renderNotice() {
  const locale = state.noticeLocale;
  const copy = visitorCopy[locale];
  const { org } = state.data;
  const blocks = activePurposes().map((purpose) => {
    const text = purposeText(purpose, locale);
    return `
      <section class="notice-block">
        <span class="chip ${purpose.optional ? "optional" : ""}">${purpose.optional ? copy.optional : copy.required}</span>
        <h3>${escapeHtml(text.title)}</h3>
        <p><strong>${copy.data}.</strong> ${escapeHtml(purpose.dataItems)}</p>
        <p><strong>${copy.why}.</strong> ${escapeHtml(text.description)}</p>
        <p><strong>${copy.keep}.</strong> ${escapeHtml(purpose.retention)}</p>
      </section>`;
  }).join("");
  main.innerHTML = `
    <header class="page-head narrow">
      <div>
        <p class="eyebrow">Visitor copy</p>
        <h1>Notice</h1>
        <p class="lede">This is the standalone notice. It is the same text the visitor sees on the counter screen.</p>
      </div>
      <div class="lang">
        <button class="btn-ghost" type="button" data-locale="en" ${locale === "en" ? 'aria-pressed="true"' : ""}>English</button>
        <button class="btn-ghost" type="button" data-locale="hi" ${locale === "hi" ? 'aria-pressed="true"' : ""}>हिन्दी</button>
      </div>
    </header>
    <article class="sheet" lang="${locale}">
      <p class="meta">${escapeHtml(org.name)}</p>
      <p class="meta">${escapeHtml(orgPlace(org))}</p>
      <p class="meta">${escapeHtml(org.phone)}${org.email ? ` · ${escapeHtml(org.email)}` : ""} · ${escapeHtml(org.contact)}</p>
      <h3>${copy.kicker}</h3>
      <p>${copy.lede}</p>
      ${blocks}
      <p>${accessNotice(org, locale)}</p>
      <p>${copy.rights} ${escapeHtml(org.contact)}. ${copy.board}</p>
      <p class="hash">Notice version ${escapeHtml(state.data.noticeHash)}</p>
    </article>
  `;
}

function renderLog() {
  const consents = state.data.consents;
  const body = consents.map((consent, index) => {
    const span = Math.max(consent.decisions.length, 1);
    const band = index % 2 === 0 ? "band" : "";
    const decisions = consent.decisions.length ? consent.decisions : [{ title: "No purposes", status: "denied", purposeId: "" }];
    return decisions.map((item, row) => `
      <tr class="${band}">
        ${row === 0 ? `
          <td rowspan="${span}">
            <div class="who">${escapeHtml(consent.visitorName)}</div>
            <div class="meta">${escapeHtml(consent.mobile)}</div>
          </td>
          <td rowspan="${span}">${formatWhen(consent.createdAt)}</td>
          <td rowspan="${span}">${consent.locale === "hi" ? "Hindi" : "English"}</td>
          <td rowspan="${span}"><code class="notice-code">${escapeHtml(consent.noticeHash)}</code></td>
          <td rowspan="${span}"><span class="chip ${summaryClass(consent.decisions)}">${consentSummary(consent.decisions)}</span></td>
        ` : ""}
        <td>${escapeHtml(item.title)}</td>
        <td>${item.purposeId ? statusChip(item) : ""}</td>
        <td>
          ${item.status === "granted" ? `<button class="btn-danger" type="button" data-withdraw="${escapeHtml(consent.id)}" data-purpose="${escapeHtml(item.purposeId)}">Withdraw</button>` : ""}
          ${item.withdrawnAt ? `<div class="meta">${formatWhen(item.withdrawnAt)}</div>` : ""}
        </td>
      </tr>
    `).join("");
  }).join("");
  main.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Records</p>
        <h1>Consent log</h1>
        <p class="lede">${consents.length} consent record${consents.length === 1 ? "" : "s"}. Each purpose is its own row. Withdrawal keeps the notice version.</p>
      </div>
    </header>
    <p class="error" id="log-error">${escapeHtml(state.message)}</p>
    <div class="table-wrap">
      <table class="consent-table">
        <thead>
          <tr>
            <th>Visitor</th>
            <th>When</th>
            <th>Language</th>
            <th>Notice</th>
            <th>Record</th>
            <th>Purpose</th>
            <th>Choice</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${body || `<tr><td colspan="8">No records yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderSetup() {
  const { org } = state.data;
  const origin = location.origin;
  const snippet = `<script src="${origin}/embed.js"><\/script>`;
  const sheetScript = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActive().getSheetByName("Consents") || SpreadsheetApp.getActive().insertSheet("Consents");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Saved at", "Event", "Consent id", "Name", "Mobile", "Language", "Notice version", "Decisions", "Organisation"]);
  }
  var decisions = (data.decisions || []).map(function (item) {
    return item.purposeId + ":" + item.status;
  }).join("; ");
  sheet.appendRow([data.createdAt, data.event, data.id, data.visitorName, data.mobile, data.locale, data.noticeHash, decisions, data.organisation]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}`;
  main.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Organisation</p>
        <h1>Setup</h1>
        <p class="lede">Your details go on the notice. The snippet below is what you paste into a website page that collects personal data.</p>
      </div>
    </header>
    <div class="grid">
      <form class="card stack" id="org-form">
        <h2>On the notice</h2>
        <label>Organisation name <input name="name" value="${escapeHtml(org.name)}" required></label>
        <label>Address <textarea name="address" required>${escapeHtml(org.address)}</textarea></label>
        <div class="pair">
          <label>City <input name="city" value="${escapeHtml(org.city)}" required></label>
          <label>PIN code <input name="pincode" inputmode="numeric" value="${escapeHtml(org.pincode)}" required></label>
        </div>
        <div class="pair">
          <label>Phone <input name="phone" type="tel" value="${escapeHtml(org.phone)}" required></label>
          <label>Email <input name="email" type="email" value="${escapeHtml(org.email)}"></label>
        </div>
        <label>Grievance contact <input name="contact" value="${escapeHtml(org.contact)}" required></label>
        <p class="error" id="form-error"></p>
        <button class="btn" type="submit">Save setup</button>
      </form>
      <section class="card stack">
        <h2>Add to a website</h2>
        <ol class="steps">
          <li>Set the purposes on the Purposes screen first.</li>
          <li>Paste this one line where the page asks for personal data.</li>
          <li>The consent screen appears there. Saved choices show in the consent log.</li>
        </ol>
        <pre class="snippet" id="embed-code">${escapeHtml(snippet)}</pre>
        <div class="actions">
          <button class="btn" type="button" id="copy-snippet">Copy snippet</button>
          <a class="btn-ghost" href="/example.html" target="_blank" rel="noreferrer">Open a sample page</a>
        </div>
        <p class="meta" id="copy-status">To keep the consent id in your own database, listen for the <code>openconsent</code> event on that page.</p>
      </section>
    </div>
    <section class="card stack records">
      <h2>Where records go</h2>
      <p class="access">${accessNotice(org, "en")}</p>
      <p class="meta">This is the line visitors see on the notice. It changes when you save the options below.</p>
      <div class="actions">
        <a class="btn-ghost" href="/api/export.csv" download="openconsent.csv">Download CSV</a>
        <a class="btn-ghost" href="/api/export.json" download="openconsent.json">Download JSON</a>
      </div>
      <form class="stack" id="delivery-form">
        <label class="check"><input type="checkbox" name="sheetEnabled" ${org.sheetEnabled ? "checked" : ""}> Also add each consent to a Google Sheet</label>
        <label>Google Sheet web app URL <input name="sheetUrl" value="${escapeHtml(org.sheetUrl)}" placeholder="https://script.google.com/macros/s/..."></label>
        <p class="meta">In the Sheet: Extensions, Apps Script, paste the script, Deploy as a web app, execute as you, allow anyone. Paste that URL here.</p>
        <pre class="snippet">${escapeHtml(sheetScript)}</pre>
        <p class="meta">${escapeHtml(org.sheetStatus || "Google Sheet has not received a record yet.")}</p>
        <label class="check"><input type="checkbox" name="webhookEnabled" ${org.webhookEnabled ? "checked" : ""}> Also send each consent to another system</label>
        <label>Webhook URL <input name="webhookUrl" value="${escapeHtml(org.webhookUrl)}" placeholder="https://example.com/hooks/consent"></label>
        <label>Webhook secret, optional <input name="webhookSecret" value="${escapeHtml(org.webhookSecret)}" placeholder="Sent as Bearer token"></label>
        <p class="meta">${escapeHtml(org.webhookStatus || "The webhook has not received a record yet.")}</p>
        <p class="error" id="delivery-error"></p>
        <div class="actions">
          <button class="btn" type="submit">Save record options</button>
          <button class="btn-ghost" type="button" id="test-sheet">Send test to Sheet</button>
          <button class="btn-ghost" type="button" id="test-webhook">Send test to webhook</button>
        </div>
      </form>
    </section>
  `;
  document.querySelector("#copy-snippet").addEventListener("click", async () => {
    await navigator.clipboard.writeText(snippet);
    document.querySelector("#copy-status").textContent = "Copied. Paste it into the website page.";
  });
  document.querySelector("#delivery-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/delivery", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sheetEnabled: form.sheetEnabled.checked,
        sheetUrl: form.sheetUrl.value,
        webhookEnabled: form.webhookEnabled.checked,
        webhookUrl: form.webhookUrl.value,
        webhookSecret: form.webhookSecret.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      document.querySelector("#delivery-error").textContent = payload.error;
      return;
    }
    state.data = payload;
    render();
  });
  for (const [id, target] of [["test-sheet", "sheet"], ["test-webhook", "webhook"]]) {
    document.querySelector(`#${id}`).addEventListener("click", async () => {
      const response = await fetch("/api/delivery/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const payload = await response.json();
      if (!response.ok) {
        document.querySelector("#delivery-error").textContent = payload.error;
        return;
      }
      const fresh = await fetch("/api/state").then((item) => item.json());
      state.data = fresh;
      render();
    });
  }
  document.querySelector("#org-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/org", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name.value,
        address: form.address.value,
        city: form.city.value,
        pincode: form.pincode.value,
        phone: form.phone.value,
        email: form.email.value,
        contact: form.contact.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      document.querySelector("#form-error").textContent = payload.error;
      return;
    }
    state.data = payload;
    state.screen = "desk";
    history.replaceState(null, "", "#desk");
    render();
  });
}

function render() {
  renderNav();
  const view = {
    desk: renderDesk,
    purposes: renderPurposes,
    notice: renderNotice,
    log: renderLog,
    setup: renderSetup,
  }[state.screen] || renderDesk;
  view();
}

document.body.addEventListener("click", async (event) => {
  const screenButton = event.target.closest("[data-screen]");
  if (screenButton) {
    state.screen = screenButton.dataset.screen;
    state.message = "";
    history.replaceState(null, "", `#${state.screen}`);
    render();
    return;
  }
  const localeButton = event.target.closest("[data-locale]");
  if (localeButton) {
    state.noticeLocale = localeButton.dataset.locale;
    render();
    return;
  }
  const editButton = event.target.closest("[data-edit]");
  if (editButton) {
    fillPurpose(editButton.dataset.edit);
    return;
  }
  const archiveButton = event.target.closest("[data-archive]");
  if (archiveButton) {
    const response = await fetch(`/api/purposes/${archiveButton.dataset.archive}`, { method: "DELETE" });
    state.data = await response.json();
    render();
    return;
  }
  const withdrawButton = event.target.closest("[data-withdraw]");
  if (withdrawButton) {
    const response = await fetch(`/api/consents/${withdrawButton.dataset.withdraw}/withdraw`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purposeId: withdrawButton.dataset.purpose }),
    });
    const payload = await response.json();
    if (!response.ok) {
      state.message = payload.error;
      render();
      return;
    }
    const index = state.data.consents.findIndex((item) => item.id === payload.id);
    state.data.consents[index] = payload;
    state.message = "";
    render();
  }
});

load();
