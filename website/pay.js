/*
 * Payments.lk pay button, version 2.
 *
 *   <button data-payments-lk-checkout="/create-checkout">Pay Rs. 1,450</button>
 *   <script src="https://payments.lk/js/pay.js" defer></script>
 *
 * A click posts to the endpoint on your own server named in
 * data-payments-lk-checkout. Your server creates the checkout with its
 * secret key and answers {"url": checkout.url}. The button then sends the
 * customer to that hosted checkout, so your secret key never reaches a
 * browser.
 */
(function () {
  "use strict";

  var VERSION = "2";
  var SELECTOR = "[data-payments-lk-checkout]";
  var SUBSCRIBE = "[data-payments-lk-subscribe]";
  var PLANS = "[data-payments-lk-plans]";
  var GENERIC_FAILURE = "The payment could not be started. Please try again.";
  var OFFLINE_FAILURE = "The payment could not be started. Check your connection and try again.";
  var LINK_CODE = /^[A-Za-z0-9_-]{8,64}$/;
  var PRICE_ID = /^price_[0-9a-z]{20,32}$/;
  var LANGS = { si: true, ta: true };

  if (window.PaymentsLk && window.PaymentsLk.payButton) return;

  var SITE = (function () {
    var script = document.currentScript;
    var src = script && script.getAttribute("src");
    try {
      var url = new URL(src || "https://payments.lk/js/pay.js", window.location.href);
      if (url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") return url.origin;
    } catch {
      // Fall through to public site
    }
    return "https://payments.lk";
  })();

  function extraOrigins(button) {
    var value = button.getAttribute("data-payments-lk-origin") || "";
    return value
      .split(",")
      .map(function (origin) {
        return origin.trim();
      })
      .filter(Boolean);
  }

  function isCheckoutUrl(value, allowedOrigins) {
    if (typeof value !== "string") return false;
    var url;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    if (url.username || url.password) return false;
    if ((allowedOrigins || []).indexOf(url.origin) !== -1) return true;
    if (url.protocol !== "https:") return false;
    return url.hostname === "payments.lk" || /\.payments\.lk$/.test(url.hostname);
  }

  function idempotencyKey() {
    var crypto = window.crypto;
    if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.prototype.map
      .call(bytes, function (b) {
        return (b + 256).toString(16).slice(1);
      })
      .join("");
  }

  function emit(button, type, detail) {
    button.dispatchEvent(new CustomEvent(type, { bubbles: true, detail: detail }));
  }

  function fail(button, message) {
    var selector = button.getAttribute("data-payments-lk-error-target");
    if (selector) {
      var target = document.querySelector(selector);
      if (target) {
        target.textContent = message;
        target.style.display = 'block';
      }
    }
    emit(button, "payments-lk:error", { message: message });
  }

  function release(button) {
    button.removeAttribute("aria-busy");
    button.disabled = button.getAttribute("data-payments-lk-was-disabled") === "true";
    button.removeAttribute("data-payments-lk-was-disabled");
  }

  function start(button) {
    if (button.getAttribute("aria-busy") === "true") return Promise.resolve(false);
    var endpoint = button.getAttribute("data-payments-lk-checkout");
    var body = button.getAttribute("data-payments-lk-body") || "{}";
    try {
      JSON.parse(body);
    } catch {
      fail(button, "This button's data-payments-lk-body is not valid JSON.");
      return Promise.resolve(false);
    }

    button.setAttribute("data-payments-lk-was-disabled", button.disabled ? "true" : "false");
    button.setAttribute("aria-busy", "true");
    button.disabled = true;

    return fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json", "Idempotency-Key": idempotencyKey() },
      body: body,
    }).then(
      function (response) {
        return response
          .json()
          .catch(function () {
            return null;
          })
          .then(function (data) {
            var url = data && data.url;
            if (!response.ok || !isCheckoutUrl(url, extraOrigins(button))) {
              release(button);
              fail(button, data && typeof data.message === "string" && data.message ? data.message : GENERIC_FAILURE);
              return false;
            }
            emit(button, "payments-lk:redirect", { url: url });
            window.location.assign(url);
            return true;
          });
      },
      function () {
        release(button);
        fail(button, OFFLINE_FAILURE);
        return false;
      },
    );
  }

  function linkUrl(options) {
    var code = options && options.code;
    if (typeof code !== "string" || !LINK_CODE.test(code)) return null;
    var lang = options.lang && LANGS[options.lang] ? "/" + options.lang : "";
    var url = SITE + lang + "/s/" + code + (options.embed ? "/embed" : "");
    var query = [];
    if (typeof options.plan === "string" && PRICE_ID.test(options.plan)) query.push("plan=" + options.plan);
    if (typeof options.email === "string" && options.email.length <= 254 && options.email.indexOf("@") > 0) query.push("email=" + encodeURIComponent(options.email));
    return query.length ? url + "?" + query.join("&") : url;
  }

  function optionsOf(element, embed) {
    return {
      code: element.getAttribute(embed ? "data-payments-lk-plans" : "data-payments-lk-subscribe"),
      plan: element.getAttribute("data-payments-lk-plan") || undefined,
      email: element.getAttribute("data-payments-lk-email") || undefined,
      lang: element.getAttribute("data-payments-lk-lang") || undefined,
      embed: embed,
    };
  }

  function subscribe(button) {
    var url = linkUrl(optionsOf(button, false));
    if (!url) {
      fail(button, "This button's data-payments-lk-subscribe is not a subscription link code.");
      return false;
    }
    emit(button, "payments-lk:redirect", { url: url });
    window.location.assign(url);
    return true;
  }

  function mountPlans() {
    var elements = document.querySelectorAll(PLANS);
    var mounted = 0;
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      if (element.getAttribute("data-payments-lk-mounted") === "true") continue;
      var url = linkUrl(optionsOf(element, true));
      if (!url) continue;
      var frame = document.createElement("iframe");
      frame.setAttribute("src", url);
      frame.setAttribute("title", "Subscribe");
      frame.setAttribute("loading", "lazy");
      frame.setAttribute("referrerpolicy", "strict-origin");
      frame.setAttribute("scrolling", "no");
      frame.style.width = "100%";
      frame.style.border = "0";
      frame.style.display = "block";
      frame.style.minHeight = "420px";
      element.appendChild(frame);
      element.setAttribute("data-payments-lk-mounted", "true");
      mounted++;
    }
    return mounted;
  }

  function onMessage(event) {
    if (event.origin !== SITE) return;
    var data = event.data;
    if (!data || data.source !== "payments-lk" || data.type !== "embed-height") return;
    var height = Number(data.height);
    if (!(height > 0)) return;
    var frames = document.querySelectorAll(PLANS + " iframe");
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === event.source) frames[i].style.height = Math.min(Math.max(Math.ceil(height), 200), 4000) + "px";
    }
  }

  document.addEventListener("click", function (event) {
    var origin = event.target;
    if (!origin || typeof origin.closest !== "function") return;
    var button = origin.closest(SELECTOR);
    if (button) {
      event.preventDefault();
      start(button);
      return;
    }
    var link = origin.closest(SUBSCRIBE);
    if (link) {
      event.preventDefault();
      subscribe(link);
    }
  });

  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    var busy = document.querySelectorAll(SELECTOR + '[aria-busy="true"]');
    for (var i = 0; i < busy.length; i++) release(busy[i]);
  });

  window.addEventListener("message", onMessage);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountPlans);
  else mountPlans();

  window.PaymentsLk = window.PaymentsLk || {};
  window.PaymentsLk.payButton = { version: VERSION, start: start, isCheckoutUrl: isCheckoutUrl };
  window.PaymentsLk.subscriptions = { version: VERSION, site: SITE, linkUrl: linkUrl, subscribe: subscribe, mountPlans: mountPlans, onMessage: onMessage };
})();
