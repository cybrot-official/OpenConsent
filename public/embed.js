(function () {
  var script = document.currentScript;
  if (!script || script.dataset.openconsentMounted) return;
  script.dataset.openconsentMounted = "1";

  var origin = new URL(script.src, location.href).origin;
  var frame = document.createElement("iframe");
  frame.src = origin + "/visit";
  frame.title = "Consent";
  frame.style.cssText = "display:block;width:100%;max-width:430px;height:760px;border:0;border-radius:28px;background:#fffdf9";
  script.insertAdjacentElement("afterend", frame);

  window.addEventListener("message", function (event) {
    if (event.origin !== origin) return;
    var data = event.data;
    if (!data || data.source !== "openconsent") return;
    window.dispatchEvent(new CustomEvent("openconsent", { detail: data }));
  });
})();
