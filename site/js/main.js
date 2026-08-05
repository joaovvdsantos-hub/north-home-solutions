/* North Home Solutions — interactions */
(function () {
  "use strict";

  /* ---------- Header: scrolled state + hide on scroll down ---------- */
  const header = document.querySelector(".header");
  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 40);
    if (y > 600 && y > lastY + 6) header.classList.add("hidden");
    else if (y < lastY - 6 || y < 600) header.classList.remove("hidden");
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  /* keep header reachable when tabbing into it while hidden */
  header.addEventListener("focusin", function () {
    header.classList.remove("hidden");
  });

  /* ---------- Mobile menu ---------- */
  const burger = document.querySelector(".burger");
  const menu = document.getElementById("mobile-menu");
  const mmLinks = menu.querySelectorAll("a");
  function toggleMenu(force) {
    const open = force !== undefined ? force : !menu.classList.contains("open");
    menu.classList.toggle("open", open);
    burger.classList.toggle("open", open);
    menu.setAttribute("aria-hidden", String(!open));
    document.documentElement.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
    mmLinks.forEach(function (l, i) {
      l.style.transitionDelay = open ? 0.08 + i * 0.05 + "s" : "0s";
    });
    if (open) setTimeout(function () { mmLinks[0].focus(); }, 0);
  }
  burger.addEventListener("click", function () { toggleMenu(); });
  mmLinks.forEach(function (l) {
    l.addEventListener("click", function () { toggleMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.classList.contains("open")) {
      toggleMenu(false);
      burger.focus();
    }
  });

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });

  /* ---------- Gallery filters ---------- */
  const filterBtns = document.querySelectorAll(".filters button");
  const tiles = document.querySelectorAll(".tile");
  const galleryStatus = document.getElementById("gallery-status");
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      const f = btn.dataset.filter;
      let shown = 0;
      tiles.forEach(function (t) {
        /* a tile may belong to several categories: data-cat="kitchen flooring" */
        const show = f === "all" || t.dataset.cat.split(" ").indexOf(f) !== -1;
        t.classList.toggle("hide", !show);
        if (show) shown++;
      });
      if (galleryStatus) galleryStatus.textContent = "Showing " + shown + " projects";
    });
  });

  /* ---------- Lightbox ---------- */
  const lightbox = document.querySelector(".lightbox");
  const lbImg = lightbox.querySelector("img");
  const lbCaption = lightbox.querySelector(".lb-caption");
  const lbFocusables = lightbox.querySelectorAll("button");
  const lbVideo = document.createElement("video");
  lbVideo.className = "lb-video";
  lbVideo.controls = true;
  lbVideo.muted = true; /* clips are exported without audio; muted also guarantees autoplay */
  lbVideo.loop = true;
  lbVideo.setAttribute("playsinline", "");
  lbVideo.preload = "none";
  lbVideo.style.display = "none";
  lbImg.insertAdjacentElement("afterend", lbVideo);
  /* play() racing a fresh src load can abort — retry once data is in */
  lbVideo.addEventListener("loadeddata", function () {
    if (
      lightbox.classList.contains("open") &&
      lbVideo.paused &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      lbVideo.play().catch(function () {});
    }
  });
  function stopLbVideo() {
    if (lbVideo.getAttribute("src")) {
      lbVideo.pause();
      lbVideo.removeAttribute("src");
      lbVideo.load();
    }
    lbVideo.style.display = "none";
  }
  let currentList = [];
  let currentIdx = 0;
  let lastTrigger = null;

  function visibleTiles() {
    return Array.prototype.filter.call(tiles, function (t) {
      return !t.classList.contains("hide");
    });
  }
  function tileCaption(t) {
    const cap = t.querySelector("figcaption");
    return cap ? cap.textContent : "";
  }
  function openLightbox(tile) {
    lastTrigger = tile;
    currentList = visibleTiles();
    currentIdx = currentList.indexOf(tile);
    showCurrent();
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(function () { lightbox.querySelector(".lb-close").focus(); }, 0);
  }
  function showCurrent() {
    const t = currentList[currentIdx];
    const img = t.querySelector("img");
    const caption = tileCaption(t);
    if (t.dataset.video) {
      lbImg.style.display = "none";
      if (lbVideo.getAttribute("src") !== t.dataset.video) {
        stopLbVideo();
        lbVideo.setAttribute("src", t.dataset.video);
      }
      lbVideo.setAttribute("aria-label", caption);
      lbVideo.style.display = "";
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        lbVideo.play().catch(function () {});
      }
    } else {
      stopLbVideo();
      lbImg.style.display = "";
      lbImg.src = img.dataset.full || img.src;
      lbImg.alt = caption;
    }
    lbCaption.textContent = caption + "  ·  " + (currentIdx + 1) + " / " + currentList.length;
  }
  function closeLightbox() {
    stopLbVideo();
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    if (lastTrigger) lastTrigger.focus();
  }
  function step(d) {
    currentIdx = (currentIdx + d + currentList.length) % currentList.length;
    showCurrent();
  }
  tiles.forEach(function (t, i) {
    t.setAttribute("tabindex", "0");
    t.setAttribute("role", "button");
    t.setAttribute("aria-label", (t.dataset.video ? "Play video: " : "View larger: ") + tileCaption(t));
    t.addEventListener("click", function () { openLightbox(t); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(t);
      }
    });
  });
  lightbox.querySelector(".lb-close").addEventListener("click", closeLightbox);
  lightbox.querySelector(".lb-prev").addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
  lightbox.querySelector(".lb-next").addEventListener("click", function (e) { e.stopPropagation(); step(1); });
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    /* when the video itself is focused, let arrows do native seeking */
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && e.target === lbVideo) return;
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
    if (e.key === "Tab") {
      /* trap focus among the lightbox controls (+ video when shown) */
      const list = Array.prototype.slice.call(lbFocusables);
      if (lbVideo.style.display !== "none") list.splice(2, 0, lbVideo);
      const idx = list.indexOf(document.activeElement);
      e.preventDefault();
      const next = e.shiftKey
        ? list[(idx - 1 + list.length) % list.length]
        : list[(idx + 1) % list.length];
      next.focus();
    }
  });

  /* ---------- Contact form ----------
     Paste the Formspree endpoint below (https://formspree.io/f/xxxxxxxx) and the
     form posts for real. While it is empty the mailto fallback runs instead —
     that fallback only opens the visitor's mail app and says so honestly, it
     never claims the request was received. */
  const FORM_ENDPOINT = "";
  const form = document.getElementById("quote-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const data = new FormData(form);
      const msg = form.querySelector(".form-msg");
      const err = form.querySelector(".form-err");
      const name = (data.get("name") || "").toString().trim();
      const phone = (data.get("phone") || "").toString().trim();
      err.textContent = "";
      msg.classList.remove("show");
      form.querySelectorAll("[aria-invalid]").forEach(function (el) {
        el.removeAttribute("aria-invalid");
      });
      if (!name || !phone) {
        const firstInvalid = !name ? form.querySelector("#f-name") : form.querySelector("#f-phone");
        if (!name) form.querySelector("#f-name").setAttribute("aria-invalid", "true");
        if (!phone) form.querySelector("#f-phone").setAttribute("aria-invalid", "true");
        err.textContent = "Please fill in your name and phone number.";
        firstInvalid.focus();
        return;
      }
      if (FORM_ENDPOINT) {
        const btn = form.querySelector('[type="submit"]');
        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Sending…";
        fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: data,
        })
          .then(function (r) {
            if (!r.ok) throw new Error(r.status);
            form.reset();
            msg.textContent = "Thanks — we got your request and will be in touch shortly.";
            msg.classList.add("show");
          })
          .catch(function () {
            err.textContent =
              "Something went wrong sending your request. Please call or text us at (774) 420-6728.";
          })
          .then(function () {
            btn.disabled = false;
            btn.textContent = label;
          });
        return;
      }
      const lines = [
        "Name: " + name,
        "Phone: " + phone,
        "Email: " + (data.get("email") || ""),
        "Service: " + (data.get("service") || ""),
        "Message: " + (data.get("message") || ""),
      ];
      const body = lines.map(encodeURIComponent).join("%0D%0A");
      window.location.href =
        "mailto:contact@northhomesolutions.com?subject=" +
        encodeURIComponent("Estimate request — " + name) +
        "&body=" + body;
      msg.textContent = "Your email app should open with your request. If it doesn't, call or text us directly.";
      msg.classList.add("show");
    });
  }

  /* ---------- Current year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
