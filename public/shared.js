export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatWhen(iso) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function consentSummary(decisions) {
  const granted = decisions.filter((item) => item.status === "granted").length;
  const withdrawn = decisions.filter((item) => item.status === "withdrawn").length;
  if (withdrawn && withdrawn === decisions.length) return "Withdrawn";
  if (withdrawn) return "Partly withdrawn";
  if (granted === decisions.length) return "All allowed";
  if (granted === 0) return "None allowed";
  return `${granted} allowed`;
}

export const visitorCopy = {
  en: {
    lang: "en",
    kicker: "Permission for this visit",
    lede: "Read this notice on its own. Each purpose is a separate choice.",
    name: "Your name",
    mobile: "Mobile number",
    required: "Needed for the visit",
    optional: "Optional",
    data: "Data",
    why: "Why",
    keep: "Kept for",
    allow: "Allow",
    deny: "Don't allow",
    save: "Save my choices",
    saved: "Choices saved",
    staff: "The desk can see this record. They may use a purpose only while it stays allowed.",
    withdraw: "Withdraw",
    withdrawn: "Withdrawn",
    rights: "You can ask the desk to see, correct, or erase these details.",
    board: "A complaint can be made to the Data Protection Board of India.",
    missing: "Choose allow or don't allow for every purpose.",
    refused: "The visit purpose was not allowed. The desk should not continue that use.",
  },
  hi: {
    lang: "hi",
    kicker: "इस मुलाकात के लिए अनुमति",
    lede: "यह सूचना अलग से पढ़ें। हर उद्देश्य के लिए अलग विकल्प है।",
    name: "आपका नाम",
    mobile: "मोबाइल नंबर",
    required: "मुलाकात के लिए ज़रूरी",
    optional: "वैकल्पिक",
    data: "डेटा",
    why: "क्यों",
    keep: "कितने समय तक",
    allow: "अनुमति दें",
    deny: "अनुमति न दें",
    save: "मेरे विकल्प सहेजें",
    saved: "विकल्प सहेज लिए गए",
    staff: "डेस्क यह रिकॉर्ड देख सकती है। कोई उद्देश्य तभी उपयोग हो सकता है जब वह अनुमति पर हो।",
    withdraw: "वापस लें",
    withdrawn: "वापस ले ली गई",
    rights: "आप डेस्क से इन विवरणों को देखने, सुधारने या मिटाने को कह सकते हैं।",
    board: "शिकायत भारत के डेटा संरक्षण बोर्ड से की जा सकती है।",
    missing: "हर उद्देश्य के लिए अनुमति दें या अनुमति न दें चुनें।",
    refused: "मुलाकात की अनुमति नहीं दी गई। डेस्क को वह उपयोग जारी नहीं रखना चाहिए।",
  },
};

export function orgPlace(org) {
  return [org.address, org.city, org.pincode].filter(Boolean).join(", ");
}

export function accessNotice(org, locale = "en") {
  const copies = [];
  if (org.sheetEnabled) copies.push(locale === "hi" ? "उनकी Google Sheet में एक प्रति जुड़ती है" : "A copy is added to their Google Sheet");
  if (org.webhookEnabled) copies.push(locale === "hi" ? "एक प्रति उनके जुड़े सिस्टम को भेजी जाती है" : "A copy is sent to another system they have connected");
  const extra = copies.length ? ` ${copies.join(". ")}.` : "";
  if (locale === "hi") {
    return `${org.name} आपका नाम, मोबाइल नंबर और ये विकल्प अपने सिस्टम में सहेजता है। डेस्क इन्हें देख सकती है।${extra} संपर्क: ${org.contact}${org.phone ? `, ${org.phone}` : ""}.`;
  }
  return `${org.name} saves your name, mobile number, and these choices on their system. The desk can open them.${extra} Contact ${org.contact}${org.phone ? ` on ${org.phone}` : ""}.`;
}

export function purposeText(purpose, locale) {
  return {
    title: locale === "hi" ? purpose.titleHi : purpose.title,
    description: locale === "hi" ? purpose.descriptionHi : purpose.description,
  };
}
