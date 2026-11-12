// Mobile menu: show/hide the navigation when the Menu button is pressed.
(function () {
  var button = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (!button || !nav) return;

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
  }

  button.addEventListener("click", function () {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });

  // Close with the Escape key and return focus to the button
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      button.focus();
    }
  });

  // One-page layout: a menu link jumps to a section on this page, so close the menu after the tap
  nav.addEventListener("click", function (event) {
    if (event.target.closest && event.target.closest('a[href^="#"]')) setOpen(false);
  });
})();

// One-page layout: underline the menu link of the section that is in view.
(function () {
  var links = document.querySelectorAll('.site-nav a[href^="#"]');
  if (!links.length) return;

  var sections = [];
  Array.prototype.forEach.call(links, function (link) {
    var section = document.getElementById(link.getAttribute("href").slice(1));
    if (section) sections.push({ link: link, section: section });
  });
  if (!sections.length) return;

  var header = document.querySelector(".site-header");
  var waiting = false;

  function update() {
    waiting = false;
    // The current section is the last one whose top has passed a line a little below the header
    var line = (header ? header.offsetHeight : 0) + window.innerHeight * 0.25;
    var current = sections[0];
    sections.forEach(function (item) {
      if (item.section.getBoundingClientRect().top <= line) current = item;
    });
    // At the very bottom the last section may be too short to reach the line
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      current = sections[sections.length - 1];
    }
    sections.forEach(function (item) {
      if (item === current) item.link.setAttribute("aria-current", "true");
      else item.link.removeAttribute("aria-current");
    });
  }

  function requestUpdate() {
    if (!waiting) {
      waiting = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  update();
})();

// Sliding backgrounds: the picture pans slowly while the page scrolls.
// data-pan="hero": the movement follows the scroll over the hero section.
// data-pan="page": it follows the scroll over the whole page.
// data-pan-start / data-pan-end: vertical position of the picture in percent (0 = top, 100 = bottom).
// Without those two, the start comes from --hero-y and the distance from --hero-pan in css/style.css.
(function () {
  var layers = document.querySelectorAll("[data-pan]");
  if (!layers.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var waiting = false;

  function update() {
    waiting = false;
    Array.prototype.forEach.call(layers, function (layer) {
      var start, end;
      if (layer.hasAttribute("data-pan-start")) {
        start = parseFloat(layer.getAttribute("data-pan-start")) || 0;
        end = parseFloat(layer.getAttribute("data-pan-end"));
        if (isNaN(end)) end = 100;
      } else {
        // No start/end on the element: take them from the CSS (--hero-y and --hero-pan in css/style.css),
        // so desktop and phones can have different values. The picture never slides past its bottom edge.
        var css = window.getComputedStyle(layer);
        start = parseFloat(css.getPropertyValue("--hero-y")) || 0;
        end = Math.min(start + (parseFloat(css.getPropertyValue("--hero-pan")) || 0), 100);
      }

      var progress = 0;   // people who prefer less motion get a still picture
      if (!reduceMotion.matches) {
        var range = layer.getAttribute("data-pan") === "hero"
          ? layer.parentNode.offsetHeight
          : document.documentElement.scrollHeight - window.innerHeight;
        if (range > 0) progress = Math.min(Math.max(window.scrollY / range, 0), 1);
      }
      var position = start + (end - start) * progress + "%";
      layer.style.backgroundPositionY = position;
      layer.style.setProperty("--pan-y", position);   // used by the home page picture
    });
  }

  function requestUpdate() {
    if (!waiting) {
      waiting = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  update();
})();

// Paintings behind the sections (one-page layout): the paintings listed in index.html follow one another
// while the page scrolls. Each painting has its "station" along the page; between two stations the next
// painting fades in over the previous one, and every painting drifts slowly while it is on screen.
(function () {
  var holder = document.querySelector(".inner-bg");
  if (!holder) return;
  var layers = Array.prototype.slice.call(holder.querySelectorAll(".painting"));
  if (!layers.length) return;

  var block = holder.parentNode;   // the part of the page that sits on the paintings
  var FADE = 0.45;                 // share of the way between two paintings that the fade takes (0.1 = quick, 1 = always fading)
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var waiting = false;

  holder.classList.add("has-paintings");

  function clamp(value) { return Math.min(Math.max(value, 0), 1); }

  // A painting is only downloaded shortly before its turn
  function load(layer) {
    if (layer.painted) return;
    layer.painted = true;
    layer.style.backgroundImage = 'url("' + layer.getAttribute("data-painting") + '")';
    var x = parseFloat(layer.getAttribute("data-x"));
    if (!isNaN(x)) layer.style.backgroundPositionX = x + "%";
  }

  function update() {
    waiting = false;
    var last = layers.length - 1;
    var range = block.offsetHeight - window.innerHeight;
    var progress = range > 0 ? clamp(-block.getBoundingClientRect().top / range) : 0;
    var place = progress * last;   // 0 = at the first painting, 1 = at the second, ...

    var opacities = layers.map(function (layer, i) {
      if (i === 0) return 1;
      var t = clamp((place - (i - 1) - (1 - FADE) / 2) / FADE);
      return t * t * (3 - 2 * t);   // eased, so the fade starts and ends softly
    });

    layers.forEach(function (layer, i) {
      if (place >= i - 1.25) load(layer);

      // A painting completely covered by the next one is switched off
      var covered = i < last && opacities[i + 1] >= 1;
      layer.style.opacity = covered ? 0 : opacities[i];

      // Drift: from data-pan-start to data-pan-end over the stretch where this painting can be seen
      var start = parseFloat(layer.getAttribute("data-pan-start")) || 0;
      var end = parseFloat(layer.getAttribute("data-pan-end"));
      if (isNaN(end)) end = start;
      var from = Math.max(i - 1, 0);
      var to = Math.min(i + 1, last);
      var local = to > from ? clamp((place - from) / (to - from)) : progress;
      if (reduceMotion.matches) local = 0;   // people who prefer less motion get still pictures
      layer.style.backgroundPositionY = start + (end - start) * local + "%";
    });
  }

  function requestUpdate() {
    if (!waiting) {
      waiting = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  update();
})();

// Click-to-load videos: nothing is requested from YouTube until the visitor presses play.
(function () {
  var buttons = document.querySelectorAll(".video-play");
  Array.prototype.forEach.call(buttons, function (button) {
    button.addEventListener("click", function () {
      var id = button.getAttribute("data-video-id");
      if (!id || id === "VIDEO_ID") return;   // placeholder id: nothing to play yet

      var frame = document.createElement("iframe");
      frame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
      frame.title = button.getAttribute("data-title") || "Video";
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      button.parentNode.replaceChild(frame, button);
    });
  });
})();

// Newsletter form: until a real sign-up address is set in newsletter.html
// (the form's action is still SIGNUP_URL), show a message instead of sending.
(function () {
  var form = document.querySelector(".signup");
  if (!form) return;

  form.addEventListener("submit", function (event) {
    if (form.getAttribute("action") !== "SIGNUP_URL") return;   // real address set: send normally
    event.preventDefault();
    var note = form.querySelector(".form-note");
    if (note) note.textContent = "Sign-up is not open yet. Please check back soon.";
  });
})();
