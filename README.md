# OpenConsent

A free desk for collecting and recording consent under India's Digital Personal Data Protection Act, 2023, and the Digital Personal Data Protection Rules, 2025.

A business sets its purposes once. A visitor gets a standalone notice, in English or Hindi, and chooses **Allow** or **Don't allow** for each purpose. The record stays on this computer. You can also append a copy to a Google Sheet, send it to a webhook, or download CSV and JSON.

This is a consent tool for a **data fiduciary** (the shop, clinic, or website that collects the data). It is not a Consent Manager registered with the Data Protection Board. It is not legal advice. Check the official Act, Rules, and any later notification before you rely on it.

The consent and notice duties are scheduled to apply from **13 May 2027**. Consent Manager registration is a separate regime and starts earlier. Confirm the current commencement notification before you treat any date as final.

## Why this exists

The Act says consent must be free, specific, informed, unconditional, and unambiguous, given by a clear affirmative action. A pre-ticked box, or one "I agree" that covers every use, does not meet that test.

Before or at the time of the request, the fiduciary must give a notice the person can read on its own. The Rules say that notice must, at least:

- list the personal data, item by item
- state each purpose, and the goods or services that processing enables
- be in clear and plain language
- be available in English or any language in the Eighth Schedule of the Constitution
- tell the person how to withdraw consent, with ease comparable to giving it
- tell the person how to exercise their rights
- tell the person how to complain to the Data Protection Board

The fiduciary has to be able to show that this notice was given and that consent was taken. Withdrawal must stop further use of that data for that purpose. Processing already done stays lawful.

A small shop and a large company follow the same consent rule. There is no automatic exemption for a small business. The government can notify a narrower exemption. None had been notified as of October 2026.

Personal or domestic use by an individual is outside the Act. A paper register that is never typed into a phone or computer is outside it. The moment those details are stored digitally, the consent rule applies.

## What the law requires, and what this tool does

| DPDP requirement | In this tool |
| --- | --- |
| Standalone notice with itemised data and each purpose | Notice screen, generated from the purpose list |
| Clear affirmative choice, not a pre-ticked box | Allow and Don't allow, both start unselected |
| Optional uses cannot be bundled into the main service | A purpose can be marked optional |
| English or an Eighth Schedule language | English and Hindi |
| Withdrawal about as easy as giving consent | One Withdraw button on the log and on the receipt |
| Proof of what was shown and what was chosen | Notice version hash, time, language, and each choice |
| The person is told the record is saved and who can see it | Notice line names the organisation, the desk, and any Sheet or webhook |
| Stop using a purpose after withdrawal | The log marks that purpose withdrawn. Your own app must actually stop |
| Rights to access, correct, erase, and nominate | The notice says the person can ask the desk. There is no request queue yet |
| Children's data and verifiable parental consent | Not built |
| Security safeguards, breach notice, retention and erasure schedules | Not built, beyond keeping the file on this computer |
| Legitimate uses, where consent is not the basis | Not a separate record type yet |

## What it covers

- Organisation profile: name, address, city, PIN code, phone, email, and grievance contact
- A purpose list: data used, why, Hindi and English text, optional or needed, and how long it is kept
- A visitor screen for a counter, a QR, or a website
- One-line website embed: `<script src="http://127.0.0.1:8787/embed.js"></script>`
- A consent log table: visitor, time, language, notice version, purpose, choice, and withdraw
- Local storage in SQLite (`data/openconsent.db`)
- Download of the log as CSV or JSON
- Optional copy to a Google Sheet, through an Apps Script web app
- Optional webhook to another system, with an optional bearer secret
- Works on one computer with no internet after the page has loaded

## What it does not cover

- Registration as a Consent Manager. That is an Indian company, a net-worth test, certification, and Board registration. A shop collecting consent for its own customers does not need that registration.
- A guarantee that your business is compliant. The tool records the choice. Your staff, website, and vendors have to honour it.
- All 22 Eighth Schedule languages. Only English and Hindi are included.
- A guardian flow for anyone under 18, or a block on tracking and targeted advertising directed at children.
- A queue for access, correction, erasure, nomination, or grievances, and no clock for how fast those requests are answered.
- Accounts, passwords, or a lock on the desk. Anyone who can open the computer can open the log.
- Encryption of the database, breach notification, or a retention job that deletes personal data when the purpose ends.
- Legitimate-use processing (for example a medical emergency), kept separate from consent.
- Proof stronger than the stored notice hash. It does not keep a screenshot of the screen the person saw.
- Identity other than a name and a 10-digit Indian mobile number.
- Editing a Google Sheet in place. The Sheet connection only appends rows, and only after you deploy the Apps Script shown on the Setup screen.

## What is still remaining

1. More Eighth Schedule languages, added as packs rather than hard-coded screens.
2. A guardian step for a person under 18, and a flag that blocks tracking and targeted ads for that record.
3. Request screens for access, correction, completion, erasure, and nomination, with the grievance contact and a response clock.
4. A legitimate-use marker so those cases are not stored as consent.
5. A login for the desk, and clearer separation so staff cannot tap Allow for the visitor.
6. Email as an identifier, for websites that do not collect a mobile number.
7. A retention job: when a purpose ends or consent is withdrawn, delete or stop the personal data, and keep the consent proof.
8. A vendor list per purpose, and a stop notice you can send when someone withdraws.
9. Stronger proof: store the exact notice text with the record, not only the hash.
10. A hosted mode for a public website, with the database on the server instead of one shop computer.

## Setup

You need Node.js 22 or newer. No extra packages are installed.

```bash
git clone https://github.com/advisoraman/OpenConsent.git
cd OpenConsent
npm start
```

Then open:

- Desk: [http://127.0.0.1:8787](http://127.0.0.1:8787)
- Visitor screen: [http://127.0.0.1:8787/visit](http://127.0.0.1:8787/visit)
- Sample website page: [http://127.0.0.1:8787/example.html](http://127.0.0.1:8787/example.html)

The first run creates a sample clinic so the screens are not empty. Replace it with your own details.

### 1. Organisation

Open **Setup**. Fill the name, address, city, PIN code, phone, email, and the person who handles a complaint. Save.

### 2. Purposes

Open **Purposes**. Add one entry for each use of personal data.

- Needed: the visit or the account cannot proceed without it.
- Optional: the main service still happens if the person refuses. Offers and WhatsApp tips belong here.

Write the reason in English and Hindi. Say which data is used, and how long you keep it. Removing a purpose hides it from new notices. Old records stay as they were.

### 3. Read the notice

Open **Notice** and switch between English and Hindi. This is the text the visitor sees. Any change to the purposes or the organisation details changes the notice version. Old consents stay tied to the version they were given under.

### 4. Take consent

On a counter, open **Desk** and choose **Open counter screen**. Hand the screen to the visitor, or let them open `http://127.0.0.1:8787/visit` from the shop Wi-Fi. The computer must stay on. The phone does not need mobile data if it is on that Wi-Fi.

The visitor enters their name and mobile number, chooses Allow or Don't allow for every purpose, and saves. The row appears in **Consent log**.

### 5. Put it on a website

On **Setup**, copy the snippet and paste it into the page that collects personal data:

```html
<script src="http://127.0.0.1:8787/embed.js"></script>
```

Use the real host instead of `127.0.0.1` when the site is not on the same computer. The consent screen appears where you placed the line. When the visitor saves, the page can listen for the result:

```html
<script>
  window.addEventListener("openconsent", function (event) {
    var consent = event.detail.consent;
    console.log(consent.id, consent.decisions);
  });
</script>
<script src="http://127.0.0.1:8787/embed.js"></script>
```

Create the account only for purposes marked `granted`. Store `consent.id` with the user. Before a later email or SMS, read `GET /api/consents/:id` and continue only while that purpose is still `granted`.

A page on another domain cannot call the API from the browser. Call it from your website's server, or serve OpenConsent on the same domain.

### 6. Withdraw

In **Consent log**, each allowed purpose has **Withdraw**. The visitor can also withdraw from the receipt on their own screen. Withdrawal does not delete the row. It marks that purpose withdrawn from that moment on.

### 7. Export, Google Sheet, and webhook

On **Setup**, under **Where records go**:

- **Download CSV** or **Download JSON** for a copy you can open in a spreadsheet.
- **Google Sheet:** in the Sheet, open Extensions, then Apps Script, paste the script shown on the page, and deploy it as a web app. Execute as yourself and allow anyone to access it. Paste that web app URL here and turn the option on. New consents and withdrawals are appended. Past rows are not edited.
- **Webhook:** turn it on and paste a URL. Each consent is sent as JSON. An optional secret is sent as `Authorization: Bearer ...`. Use **Send test** before you rely on it.

The Sheet and the webhook are extra copies. The legal record on this computer is the SQLite file. Back that file up. Do not commit it.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/state` | Organisation, purposes, consents, notice hash |
| PUT | `/api/org` | Save organisation details |
| POST | `/api/purposes` | Add or update a purpose |
| DELETE | `/api/purposes/:id` | Hide a purpose from new notices |
| POST | `/api/consents` | Save a visitor's choices |
| GET | `/api/consents/:id` | Read one record |
| POST | `/api/consents/:id/withdraw` | Withdraw one purpose. Body: `{ "purposeId": "..." }` |
| PUT | `/api/delivery` | Save the Sheet and webhook settings |
| POST | `/api/delivery/test` | Send a test payload. Body: `{ "target": "sheet" }` or `"webhook"` |
| GET | `/api/export.csv` | Download the log as CSV |
| GET | `/api/export.json` | Download the log as JSON |

A consent body looks like this:

```json
{
  "visitorName": "Meera Shah",
  "mobile": "9876543210",
  "locale": "en",
  "decisions": [
    { "purposeId": "appointment", "status": "granted" },
    { "purposeId": "whatsapp_tips", "status": "denied" }
  ]
}
```

`locale` is `en` or `hi`. `status` is `granted` or `denied`. The mobile number must be 10 digits starting with 6, 7, 8, or 9.

## License

MIT
