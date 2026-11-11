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
(function () {
  var layers = document.querySelectorAll("[data-pan]");
  if (!layers.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var waiting = false;

  function update() {
    waiting = false;
    Array.prototype.forEach.call(layers, function (layer) {
      var start = parseFloat(layer.getAttribute("data-pan-start")) || 0;
      var end = parseFloat(layer.getAttribute("data-pan-end"));
      if (isNaN(end)) end = 100;

      var progress = 0;   // people who prefer less motion get a still picture
      if (!reduceMotion.matches) {
        var range = layer.getAttribute("data-pan") === "hero"
          ? layer.parentNode.offsetHeight
          : document.documentElement.scrollHeight - window.innerHeight;
        if (range > 0) progress = Math.min(Math.max(window.scrollY / range, 0), 1);
      }
      layer.style.backgroundPositionY = start + (end - start) * progress + "%";
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
