/* CreativeVox Media: subtle UI sounds (Web Audio, synthesized, no audio files).
   Off by default. A header toggle turns it on; the choice is remembered. */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || !window.matchMedia) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (navigator.connection && navigator.connection.saveData) return;

  var KEY = 'creativevox-sound';
  var on = false;
  try { on = localStorage.getItem(KEY) === 'on'; } catch (e) {}

  var ctx = null, master = null;
  function ensure() {
    if (!ctx) {
      try { ctx = new AC(); } catch (e) { return false; }
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  // one short enveloped tone, optional pitch glide
  function tone(type, f0, f1, dur, vol, delay) {
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  var SOUNDS = {
    pop:   function () { tone('sine', 480, 780, 0.09, 0.9); },
    tick:  function () { tone('triangle', 1500, 1100, 0.035, 0.45); },
    open:  function () { tone('sine', 300, 720, 0.16, 0.8); tone('sine', 600, 1080, 0.14, 0.25, 0.03); },
    close: function () { tone('sine', 640, 280, 0.14, 0.7); },
    on:    function () { tone('sine', 660, 660, 0.09, 0.8); tone('sine', 990, 990, 0.12, 0.8, 0.08); },
    off:   function () { tone('sine', 520, 520, 0.08, 0.6); }
  };

  var last = {};
  function play(name, gap) {
    if (!on || document.hidden || !ensure()) return;
    var now = performance.now();
    if (last[name] && now - last[name] < (gap || 60)) return;
    last[name] = now;
    SOUNDS[name]();
  }

  // ---- toggle button (inserted next to the theme toggle) ----
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-toggle sound-toggle';
  btn.id = 'sound-toggle';
  function paint() {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Turn interface sounds off' : 'Turn interface sounds on');
    btn.title = on ? 'Sound on' : 'Sound off';
    btn.innerHTML = '<span class="theme-toggle-icon" aria-hidden="true">' + (on ? '🔊' : '🔇') + '</span><span class="sound-label">' + (on ? 'Sound' : 'Muted') + '</span>';
  }
  paint();
  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn && themeBtn.parentNode) themeBtn.parentNode.insertBefore(btn, themeBtn);
  else return;

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    on = !on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (err) {}
    paint();
    if (on) { ensure(); SOUNDS.on(); } else if (ctx) { ensure(); SOUNDS.off(); }
  }, true);

  // ---- hooks (event delegation, so nothing else on the page changes) ----
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a.button, button, .textlink, .linkedin-link');
    if (!el || el === btn || !on) return;
    if (el.id === 'nav-toggle') { play(el.getAttribute('aria-expanded') === 'true' ? 'close' : 'open'); return; }
    if (el.id === 'theme-toggle') { play('tick'); return; }
    if (el.matches('[id$="-close"], [id$="-dismiss"]')) return; // dialog observer plays "close"
    play('pop');
  }, true);

  var hoverEls = '#services .service, #work .work-card';
  document.addEventListener('pointerenter', function (e) {
    if (e.pointerType !== 'mouse' || !e.target.matches) return;
    if (e.target.matches(hoverEls)) play('tick', 120);
  }, true);

  // dialogs: sound on open / close
  var dialogs = document.querySelectorAll('dialog');
  var mo = new MutationObserver(function (list) {
    list.forEach(function (m) {
      var d = m.target;
      var wasOpen = m.oldValue !== null;
      var isOpen = d.hasAttribute('open');
      if (isOpen && !wasOpen) play('open', 150);
      else if (!isOpen && wasOpen) play('close', 150);
    });
  });
  dialogs.forEach(function (d) { mo.observe(d, { attributes: true, attributeFilter: ['open'], attributeOldValue: true }); });
})();
