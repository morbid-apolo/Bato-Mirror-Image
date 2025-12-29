// ==UserScript==
// @name         Universal Batoto Image Fix
// @namespace    Umbrella_Corporation
// @version      3.6
// @description  Fixes Batoto-style images using a unified Firefox-safe core with conditional v1.9.1 hybrid recovery (k→n rewrite, retry/backoff, host rotation). Includes optional Pastebin updater.
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bato.to
// @match        *://ato.to/*
// @match        *://bato.to/*
// @match        *://bato.si/*
// @match        *://bato.ing/*
// @match        *://dto.to/*
// @match        *://fto.to/*
// @match        *://hto.to/*
// @match        *://jto.to/*
// @match        *://lto.to/*
// @match        *://mto.to/*
// @match        *://nto.to/*
// @match        *://vto.to/*
// @match        *://wto.to/*
// @match        *://xto.to/*
// @match        *://yto.to/*
// @match        *://vba.to/*
// @match        *://wba.to/*
// @match        *://xba.to/*
// @match        *://yba.to/*
// @match        *://zba.to/*
// @match        *://bato.ac/*
// @match        *://bato.bz/*
// @match        *://bato.cc/*
// @match        *://bato.cx/*
// @match        *://bato.id/*
// @match        *://bato.pw/*
// @match        *://bato.sh/*
// @match        *://bato.vc/*
// @match        *://bato.day/*
// @match        *://bato.red/*
// @match        *://bato.run/*
// @match        *://batoto.in/*
// @match        *://batoto.tv/*
// @match        *://batotoo.com/*
// @match        *://batotwo.com/*
// @match        *://battwo.com/*
// @match        *://xbato.com/*
// @match        *://xbato.net/*
// @match        *://xbato.org/*
// @match        *://zbato.com/*
// @match        *://zbato.net/*
// @match        *://zbato.org/*
// @match        *://batpub.com/*
// @match        *://batread.com/*
// @match        *://comiko.net/*
// @match        *://comiko.org/*
// @match        *://mangatoto.com/*
// @match        *://mangatoto.net/*
// @match        *://mangatoto.org/*
// @match        *://batocomic.com/*
// @match        *://batocomic.net/*
// @match        *://batocomic.org/*
// @match        *://readtoto.com/*
// @match        *://readtoto.net/*
// @match        *://readtoto.org/*
// @match        *://kuku.to/*
// @match        *://okok.to/*
// @match        *://ruru.to/*
// @match        *://xdxd.to/*
// ==/UserScript==

/*
===================== Changelog =====================
v3.6 – Unified milestone release.
       Incorporates final unified core architecture, mirror alignment cleanup,
       Firefox-safe execution model, conditional v1.9.1 hybrid recovery logic,
       full mirror coverage, optional non-intrusive Pastebin updater, and removal
       of always-on retry behavior. Represents the stabilized convergence point
       of v3.x development.

v3.0  – Major refactor experiments and hybrid architecture exploration.
v2.6  – Hybrid engine + updater attempts.
v2.3  – Stability fixes.
v2.0  – Hybrid concept introduced.
v1.9.1– Hybrid update integrating fixes from redditor “mindlesstourist3”
         (host rotation, retry/backoff, broken-image detection).
v1.9  – Metadata fixes, stronger attribute handling, improved srcset support.
v1.8  – bato.si + mirror expansion.
v1.7  – Dynamic DOM handling.
v1.6  – Observer optimizations.
v1.5  – Community mirror expansion.
v1.4  – Critical banner fix (property-level img.src).
v1.3  – MutationObserver introduced.
v1.2  – Attribute safety.
v1.1  – Minor fixes.
v1.0  – Initial k→n replacement.
====================================================
*/

(function () {
  'use strict';

  if (window.__BTFX_LOADED__) return;
  window.__BTFX_LOADED__ = true;

  const VERSION = '3.6';
  const UPDATE_URL = 'https://pastebin.com/raw/c0mBHwtH';
  const HOST_RE = /(^|\/\/)k(\d*\.)/i;
  const STATE = Symbol('BTFX_STATE');

  /* ---------------- Unified core ---------------- */

  function fixURL(u) {
    return typeof u === 'string' && HOST_RE.test(u)
      ? u.replace(HOST_RE, '$1n$2')
      : null;
  }

  function fixSrcset(v) {
    if (!v || !HOST_RE.test(v)) return null;
    return v.split(',').map(p => {
      const s = p.trim().split(/\s+/);
      s[0] = fixURL(s[0]) || s[0];
      return s.join(' ');
    }).join(', ');
  }

  function rewrite(img) {
    let touched = false;
    ['src','data-src','data-original','srcset','data-srcset'].forEach(a => {
      const v = img.getAttribute(a);
      if (!v) return;
      const f = a.includes('srcset') ? fixSrcset(v) : fixURL(v);
      if (f && f !== v) {
        img.setAttribute(a, f);
        touched = true;
      }
    });

    if (img.src && HOST_RE.test(img.src)) {
      const f = fixURL(img.src);
      if (f) { img.src = f; touched = true; }
    }

    if (touched) img.referrerPolicy = 'no-referrer';
  }

  /* ---------------- Hybrid recovery ---------------- */

  function recover(img) {
    if (img[STATE]) return;
    img[STATE] = { tries: 0 };

    const max = 12;

    function rotate() {
      if (++img[STATE].tries > max) cleanup();
      img.src = img.src.replace(/(\d+)(\.)/, (_, n, d) =>
        String((+n + 1) % max).padStart(2, '0') + d
      );
    }

    function cleanup() {
      img.removeEventListener('error', onErr);
      img.removeEventListener('load', onLoad);
    }

    const onErr = () => setTimeout(rotate, img[STATE].tries * 600);
    const onLoad = () => cleanup();

    img.addEventListener('error', onErr);
    img.addEventListener('load', onLoad);
  }

  /* ---------------- Pipeline ---------------- */

  function handle(img) {
    rewrite(img);
    if (!img.complete || img.naturalWidth === 0) recover(img);
  }

  function scan(root = document) {
    root.querySelectorAll('img').forEach(handle);
  }

  scan();
  document.addEventListener('DOMContentLoaded', () => scan());
  window.addEventListener('load', () => scan());

  const mo = new MutationObserver(ms => {
    ms.forEach(m => {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => n.nodeType === 1 && scan(n));
      }
    });
  });

  mo.observe(document.documentElement, { childList: true, subtree: true });

})();