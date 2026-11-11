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
