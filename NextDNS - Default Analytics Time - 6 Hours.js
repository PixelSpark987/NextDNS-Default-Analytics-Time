// ==UserScript==
// @name         NextDNS - Default Analytics Time - 6 Hours
// @description  Forces NextDNS to show the last 6 hours in Analytics
// @author       PixelSpark987 - https://is.gd/PS987
// @icon         https://my.nextdns.io/favicon.ico
// @version      1.2
// @namespace    http://tampermonkey.net/
// @match        *://my.nextdns.io/*/analytics
// @grant        none
// ==/UserScript==

// ==============================================================================
// --- DESKTOP LOGIC ---
// ==============================================================================
(function() {
    'use strict';

    const triggerClick = (el) => {
        const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        el.dispatchEvent(event);
    };

    const setTimeframeDesktop = () => {
        if (!window.location.pathname.includes('/analytics')) return;

        // 1. Find the main dropdown button
        const dropdown = Array.from(document.querySelectorAll('button'))
            .find(b => b.innerText && b.innerText.includes('Last '));

        if (dropdown && !dropdown.innerText.includes('6 hours')) {
            triggerClick(dropdown);

            // 2. Wait for the menu items to appear
            setTimeout(() => {
                // NextDNS usually puts these in a portal/dropdown list at the end of the body
                const options = Array.from(document.querySelectorAll('button, [role="menuitem"], .dropdown-item'));
                const target = options.find(o => o.innerText && o.innerText.toLowerCase().includes('6 hours'));

                if (target) {
                    triggerClick(target);
                    // Close the menu if it stays open
                    dropdown.blur();
                }
            }, 150);
        }
    };

    // Watch for page navigation
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(setTimeframeDesktop, 600);
        }
    });
    observer.observe(document.body, { subtree: true, childList: true });

    // Run on initial load
    setTimeout(setTimeframeDesktop, 1200);
})();

// ==============================================================================
// --- MOBILE LOGIC ---
// ==============================================================================
(function() {
    'use strict';

    const setTimeframeMobile = () => {
        if (!window.location.pathname.includes('/analytics')) return;

        // 1. Find the timeframe selector (looks for the "Last X" text)
        const elements = document.querySelectorAll('button, div, span');
        const dropdown = Array.from(elements).find(el =>
            el.innerText && /^Last\s.*\d+/i.test(el.innerText.trim()) && el.offsetWidth > 0
        );

        if (dropdown && !dropdown.innerText.includes('6 hours')) {
            dropdown.click();

            // 2. Mobile menus take a moment to animate in
            setTimeout(() => {
                // Look for the option in the entire document since mobile menus
                // are often attached to the end of the <body>
                const options = document.querySelectorAll('button, div, span, li');
                const target = Array.from(options).find(o =>
                    o.innerText && o.innerText.trim() === 'Last 6 hours'
                );

                if (target) {
                    // Use a sequence of events to ensure the mobile browser registers it
                    ['touchstart', 'touchend', 'click'].forEach(type => {
                        target.dispatchEvent(new Event(type, { bubbles: true }));
                    });
                }
            }, 400); // 400ms allows for the slide-up animation to finish
        }
    };

    // Watch for internal navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(setTimeframeMobile, 800);
        }
    }).observe(document.body, { subtree: true, childList: true });

    // Initial load check
    setTimeout(setTimeframeMobile, 1500);
})();