import { accessNotice, escapeHtml, orgPlace, purposeText, visitorCopy } from "./shared.js";

const app = document.querySelector("#app");
let locale = "en";
let record = null;
let purposes = [];
let org = null;
let visitorName = "";
let mobile = "";
const choices = new Map();

async function loadState() {
  const response = await fetch("/api/state");
  const data = await response.json();
  org = data.org;
  purposes = data.purposes.filter((purpose) => purpose.active);
}

function choiceButtons(purpose) {
  const selected = choices.get(purpose.id);
  const copy = visitorCopy[locale];
  return `
    <div class="choices">
      <button type="button" data-choice="${escapeHtml(purpose.id)}" data-status="granted" aria-pressed="${selected === "granted"}">${copy.allow}</button>
      <button type="button" data-choice="${escapeHtml(purpose.id)}" data-status="denied" aria-pressed="${selected === "denied"}">${copy.deny}</button>
    </div>`;
}

function renderForm() {
  const copy = visitorCopy[locale];
  document.documentElement.lang = locale;
  app.innerHTML = `
    <div class="top">
      <div class="mark">${escapeHtml(org.name)}</div>
      <div class="langs">
        <button type="button" data-lang="en" aria-pressed="${locale === "en"}">English</button>
        <button type="button" data-lang="hi" aria-pressed="${locale === "hi"}">हिन्दी</button>
      </div>
    </div>
    <h1>${copy.kicker}</h1>
    <p class="lede">${copy.lede}</p>
    <p class="fine">${escapeHtml(orgPlace(org))}${org.phone ? ` · ${escapeHtml(org.phone)}` : ""}</p>
    <p class="access">${accessNotice(org, locale)}</p>
    <form id="consent-form">
      <div class="identity">
        <label>${copy.name} <input name="visitorName" autocomplete="name" value="${escapeHtml(visitorName)}" required></label>
        <label>${copy.mobile} <input name="mobile" inputmode="numeric" autocomplete="tel" value="${escapeHtml(mobile)}" required></label>
      </div>
      <div class="stack">
        ${purposes.map((purpose) => {
          const text = purposeText(purpose, locale);
          return `
            <article class="purpose">
              <header>
                <h2>${escapeHtml(text.title)}</h2>
                <span class="tag ${purpose.optional ? "optional" : ""}">${purpose.optional ? copy.optional : copy.required}</span>
              </header>
              <dl>
                <dt>${copy.data}</dt><dd>${escapeHtml(purpose.dataItems)}</dd>
                <dt>${copy.why}</dt><dd>${escapeHtml(text.description)}</dd>
                <dt>${copy.keep}</dt><dd>${escapeHtml(purpose.retention)}</dd>
              </dl>
              ${choiceButtons(purpose)}
            </article>`;
        }).join("")}
      </div>
      <p class="fine">${copy.rights} ${escapeHtml(org.contact)}${org.phone ? `, ${escapeHtml(org.phone)}` : ""}${org.email ? `, ${escapeHtml(org.email)}` : ""}. ${copy.board}</p>
      <p class="error" id="error"></p>
      <div class="bar"><button class="save" type="submit">${copy.save}</button></div>
    </form>
  `;
  document.querySelector("#consent-form").addEventListener("submit", onSubmit);
}

function renderReceipt() {
  const copy = visitorCopy[locale];
  const refused = record.decisions.some((item) => !item.optional && item.status === "denied");
  app.innerHTML = `
    <p class="kicker">${escapeHtml(org.name)}</p>
    <h1>${copy.saved}</h1>
    <p class="lede">${escapeHtml(record.visitorName)} · ${escapeHtml(record.mobile)}</p>
    <div class="receipt-list">
      ${record.decisions.map((item) => {
        const title = locale === "hi" ? item.titleHi : item.title;
        const status = item.status === "granted" ? copy.allow : item.status === "withdrawn" ? copy.withdrawn : copy.deny;
        return `
          <div class="receipt-item">
            <div>
              <strong>${escapeHtml(title)}</strong>
              <div class="${item.status === "granted" ? "ok" : "no"}">${status}</div>
            </div>
            ${item.status === "granted" ? `<button class="text-btn" type="button" data-withdraw="${escapeHtml(item.purposeId)}">${copy.withdraw}</button>` : ""}
          </div>`;
      }).join("")}
    </div>
    <p class="fine">${copy.staff}</p>
    ${refused ? `<p class="error">${copy.refused}</p>` : ""}
    <p class="fine">${copy.rights} ${escapeHtml(org.contact)}${org.phone ? `, ${escapeHtml(org.phone)}` : ""}${org.email ? `, ${escapeHtml(org.email)}` : ""}. ${copy.board}</p>
    <button class="text-btn" type="button" id="another">Take another consent</button>
  `;
}

async function onSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const missing = purposes.some((purpose) => !choices.has(purpose.id));
  if (missing) {
    document.querySelector("#error").textContent = visitorCopy[locale].missing;
    return;
  }
  const response = await fetch("/api/consents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      visitorName: form.visitorName.value,
      mobile: form.mobile.value,
      locale,
      decisions: purposes.map((purpose) => ({ purposeId: purpose.id, status: choices.get(purpose.id) })),
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    document.querySelector("#error").textContent = payload.error;
    return;
  }
  record = payload;
  renderReceipt();
  notifyParent("consent.saved", record);
}

app.addEventListener("click", async (event) => {
  const lang = event.target.closest("[data-lang]");
  if (lang && !record) {
    locale = lang.dataset.lang;
    renderForm();
    return;
  }
  const choice = event.target.closest("[data-choice]");
  if (choice) {
    choices.set(choice.dataset.choice, choice.dataset.status);
    renderForm();
    return;
  }
  const withdraw = event.target.closest("[data-withdraw]");
  if (withdraw && record) {
    const response = await fetch(`/api/consents/${record.id}/withdraw`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purposeId: withdraw.dataset.withdraw }),
    });
    const payload = await response.json();
    if (response.ok) {
      record = payload;
      renderReceipt();
      notifyParent("consent.withdrawn", record);
    }
    return;
  }
  if (event.target.id === "another") {
    record = null;
    visitorName = "";
    mobile = "";
    choices.clear();
    renderForm();
  }
});

app.addEventListener("input", (event) => {
  if (event.target.name === "visitorName") visitorName = event.target.value;
  if (event.target.name === "mobile") mobile = event.target.value;
});

function notifyParent(type, consent) {
  if (window.parent === window) return;
  window.parent.postMessage({ source: "openconsent", type, consent }, "*");
}

await loadState();
renderForm();
