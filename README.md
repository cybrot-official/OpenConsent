# OpenConsent

A free, local desk for collecting and recording consent under India's Digital Personal Data Protection Act, 2023.

A business sets its purposes once. A visitor gets a standalone notice, in English or Hindi, and chooses allow or don't allow for each purpose. The record stays on this computer. You can also append a copy to a Google Sheet, send it to a webhook, or download CSV and JSON.

This is a consent tool for a data fiduciary. It is not a Consent Manager registered with the Data Protection Board.

## Run

```bash
npm start
```

Open [http://127.0.0.1:8787](http://127.0.0.1:8787) for the desk and [http://127.0.0.1:8787/visit](http://127.0.0.1:8787/visit) for the visitor screen.

Requires Node.js 22 or newer. Records are stored in `data/openconsent.db`, which is not part of this repository.

## Add it to a website

On the Setup screen, copy the one-line snippet:

```html
<script src="http://127.0.0.1:8787/embed.js"></script>
```

Paste it on the page that asks for personal data. Point the script at the host where OpenConsent is running.

## License

MIT
