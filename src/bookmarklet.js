(() => {
  const clone = document.documentElement.cloneNode(true);
  clone
    .querySelectorAll('script, style, link[rel="stylesheet"], svg, noscript')
    .forEach((el) => {
      el.remove();
    });
  clone.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (attr.name.startsWith("on") || attr.name === "style")
        el.removeAttribute(attr.name);
    });
  });
  clone.querySelectorAll("[href]").forEach((el) => {
    try {
      el.setAttribute(
        "href",
        new URL(el.getAttribute("href"), document.baseURI).href,
      );
    } catch (e) {}
  });
  clone.querySelectorAll("[src]").forEach((el) => {
    try {
      el.setAttribute(
        "src",
        new URL(el.getAttribute("src"), document.baseURI).href,
      );
    } catch (e) {}
  });
  clone.querySelectorAll("[action]").forEach((el) => {
    try {
      el.setAttribute(
        "action",
        new URL(el.getAttribute("action"), document.baseURI).href,
      );
    } catch (e) {}
  });
  const cleanedHTML = clone.outerHTML
    .replace(/\s{2,}/g, " ")
    .replace(/>\s+</g, ">\n<");
  const forms = document.querySelectorAll("form");
  let formOut = "";
  const formElementsSet = new Set();
  forms.forEach((form, fi) => {
    const rect = form.getBoundingClientRect();
    const scrollY = Math.round(rect.top + window.scrollY);
    formOut += `[Form ${fi}] action="${form.action || ""}" method="${form.method}" scrollY=${scrollY}\n`;
    form
      .querySelectorAll("input, select, textarea, button")
      .forEach((el, ei) => {
        formElementsSet.add(el);
        const r = el.getBoundingClientRect();
        const sY = Math.round(r.top + window.scrollY);
        const label = (
          el.getAttribute("aria-label") ||
          el.value ||
          el.textContent ||
          ""
        )
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 60);
        formOut += `   [${fi}.${ei}] <${el.tagName.toLowerCase()}> type="${el.type || ""}" name="${el.name || ""}" scrollY=${sY} label="${label}"\n`;
      });
    formOut += "\n";
  });
  let otherOut = "";
  let idx = 0;
  document
    .querySelectorAll("a, button, input, select, textarea, [role]")
    .forEach((el) => {
      if (formElementsSet.has(el) || el.closest("form")) return;
      const rect = el.getBoundingClientRect();
      const scrollY = Math.round(rect.top + window.scrollY);
      const label = (
        el.getAttribute("aria-label") ||
        el.textContent ||
        el.value ||
        ""
      )
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 60);
      const href = el.href ? el.href : "";
      const role = el.getAttribute("role") || "";
      const tag = el.tagName.toLowerCase();
      const ac = el.getAttribute("aria-controls") || "";
      const ae = el.getAttribute("aria-expanded");
      const asel = el.getAttribute("aria-selected");
      const submitish =
        el.type === "submit" ||
        el.type === "reset" ||
        el.name === "intent" ||
        /\b(submit|save|reset|cancel|delete)\b/i.test(label);
      const reveal =
        !href &&
        !submitish &&
        (role === "tab" ||
          !!ac ||
          ae !== null ||
          asel !== null ||
          tag === "button" ||
          role === "button");
      otherOut += `[${idx}] <${tag}> role="${role}" scrollY=${scrollY} name="${label}"${href ? ` href="${href}"` : ""}${ac ? ` aria-controls="${ac}"` : ""}${ae !== null ? ` aria-expanded="${ae}"` : ""}${asel !== null ? ` aria-selected="${asel}"` : ""}${reveal ? " reveal=1" : ""}\n`;
      idx++;
    });
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false,
  );
  const textParts = [];
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (!parent || !["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) {
      const t = node.nodeValue.replace(/\s+/g, " ").trim();
      if (t) textParts.push(t);
    }
    node = walker.nextNode();
  }
  const plainText = textParts
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
  let pageURL = "";
  try {
    pageURL = window.top.location.href;
  } catch (e) {
    pageURL = location.href;
  }
  pageURL = pageURL.split("#RB:")[0];
  const combined =
    "=== Page URL ===\n" +
    pageURL +
    "\n\n=== Forms & Form Elements ===\n" +
    formOut +
    "\n=== Other Interactive Elements ===\n" +
    otherOut +
    "\n=== Plain Text (including hidden) ===\n" +
    plainText +
    "\n\n=== Cleaned HTML (absolute links) ===\n" +
    cleanedHTML;
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (err) {}
    document.body.removeChild(ta);
  } /* Delivery. The clipboard CANNOT be relied on here: after the omnibox runs this,
   focus usually stays in the address bar, so navigator.clipboard.writeText
   rejects with NotAllowedError ("Document is not focused") roughly half the time
   and the dump is silently lost. A page cannot focus itself, so there is no fix
   from in here. location.hash needs no focus and no permission, and the caller
   reads it straight off the tab URL - that is the reliable channel. The
   clipboard write stays as a best-effort bonus (documented behavior) and its
   failure no longer matters. The hash is cleared afterwards so the address bar
   is not left holding the whole dump. */
  try {
    location.hash = `RB:${encodeURIComponent(combined)}`;
    setTimeout(() => {
      try {
        history.replaceState(null, "", location.pathname + location.search);
      } catch (e) {}
    }, 20000);
  } catch (e) {}
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(combined).catch(() => {
        fallbackCopy(combined);
      });
    } else {
      fallbackCopy(combined);
    }
  } catch (e) {}
})();
