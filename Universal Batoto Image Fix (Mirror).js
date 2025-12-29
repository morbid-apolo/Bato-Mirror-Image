// ==UserScript==
// @name         Universal Batoto Image Fix
// @namespace    Umbrella_Corporatiom
// @version      1.9
// @description  Rewrite Batoto-style image URLs from //k to //n with no-referrer on all mirrors (src, data-src, srcset, etc.), fixing both banner and chapter images and handling lazy-loaded/SPA content.
// @run-at       document-start
// @grant        none
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
 
/* == Changelog (v1.0 → v1.9) ==
v1.9  – Tampermonkey metadata parsing errors fixed; added safer observer startup and more robust src/srcset assignment handling.
v1.8  – Added mirror support for bato.si and expanded mirror list to full community list
v1.7  – Minor robustness fixes for dynamic DOM injection and attribute handling
v1.6  – Added attributeFilter and observer start guard to reduce overhead
v1.5  – Expanded mirror list to include many community mirrors
v1.4  – Critical: ensure property-level img.src is checked and fixed (fixes banners)
v1.3  – Added MutationObserver to handle lazy-loaded and SPA content
v1.2  – Handle additional attributes: data-original, data-srcset
v1.1  – Initial fixes for srcset parsing and referrerPolicy assignment
v1.0  – First public release: replaces //k → //n on src attributes
*/
 
(function() {
    'use strict';
 
    const DEBUG = false;
    const log = (...args) => { if (DEBUG) console.log('[BatotoFix]', ...args); };
 
    // Very small sanity check for known broken pattern
    function looksLikeBrokenBatotoUrl(str) {
        return typeof str === 'string' && str.indexOf('//k') !== -1 && str.indexOf('.mb') !== -1;
    }
 
    // Replace all occurrences of //k -> //n in a string (handles srcset with multiple URLs too)
    function replaceKwithN(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/\/\/k/g, '//n');
    }
 
    function safeSetAttribute(el, attr, val) {
        try {
            el.setAttribute(attr, val);
        } catch (e) {
            log('setAttribute failed', attr, e);
        }
    }
 
    function safeAssignSrc(img, val) {
        try {
            // prefer property assignment (browsers will reflect to attribute usually)
            img.src = val;
        } catch (e) {
            log('img.src assign failed', e);
            try { safeSetAttribute(img, 'src', val); } catch (_) {}
        }
    }
 
    function processImage(img) {
        if (!img || img.nodeType !== 1) return;
 
        const srcProperty = (img.src || '').toString();
 
        const srcCandidates = [
            srcProperty,
            img.getAttribute && img.getAttribute('src'),
            img.getAttribute && img.getAttribute('data-src'),
            img.getAttribute && img.getAttribute('data-original'),
            img.getAttribute && img.getAttribute('data-srcset'),
            img.getAttribute && img.getAttribute('srcset')
        ].filter(Boolean);
 
        if (!srcCandidates.some(looksLikeBrokenBatotoUrl)) return;
 
        log('Fixing image', img);
 
        // referrer policy: try both property and attribute (some engines disallow one)
        try { img.referrerPolicy = 'no-referrer'; } catch (e) { log('referrerPolicy property failed'); }
        try { safeSetAttribute(img, 'referrerpolicy', 'no-referrer'); } catch (e) { log('referrerpolicy attribute failed'); }
 
        // Replace in property first if needed
        if (looksLikeBrokenBatotoUrl(srcProperty)) {
            const fixed = replaceKwithN(srcProperty);
            safeAssignSrc(img, fixed);
        }
 
        // Replace in attributes (src, data-src, data-original, srcset, data-srcset)
        const attrs = ['src', 'data-src', 'data-original', 'srcset', 'data-srcset'];
        for (const attr of attrs) {
            try {
                const val = img.getAttribute && img.getAttribute(attr);
                if (val && val.indexOf('//k') !== -1) {
                    const fixedVal = replaceKwithN(val);
                    safeSetAttribute(img, attr, fixedVal);
                }
            } catch (e) {
                log('Error processing attr', attr, e);
            }
        }
    }
 
    function rewriteImages(root) {
        if (!root) root = document;
 
        // Single img node passed in
        if (root.tagName === 'IMG') {
            processImage(root);
            return;
        }
 
        // If root doesn't support querySelectorAll, fall back to document
        if (typeof root.querySelectorAll !== 'function') root = document;
 
        const imgs = root.querySelectorAll('img');
        for (const img of imgs) processImage(img);
    }
 
    // MutationObserver to handle lazy-loaded images, SPA content, attribute changes
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (!mutation) continue;
 
            if (mutation.type === 'attributes' && mutation.target && mutation.target.tagName === 'IMG') {
                processImage(mutation.target);
                continue;
            }
 
            if (mutation.type === 'childList' && mutation.addedNodes && mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    if (!node || node.nodeType !== 1) continue;
 
                    if (node.tagName === 'IMG') {
                        processImage(node);
                    } else if (typeof node.querySelectorAll === 'function') {
                        const imgs = node.querySelectorAll('img');
                        for (const img of imgs) processImage(img);
                    }
                }
            }
        }
    });
 
    let observerStarted = false;
    function startObserver() {
        if (observerStarted) return;
        observerStarted = true;
 
        try {
            observer.observe(document, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    'src',
                    'data-src',
                    'data-original',
                    'srcset',
                    'data-srcset'
                ]
            });
            log('Observer started');
        } catch (e) {
            log('Observer failed to start', e);
        }
    }
 
    function init() {
        try {
            rewriteImages(document);
            startObserver();
 
            // second pass for images inserted by early scripts after initial parse
            setTimeout(() => rewriteImages(document), 800);
        } catch (e) {
            log('init failed', e);
        }
    }
 
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();