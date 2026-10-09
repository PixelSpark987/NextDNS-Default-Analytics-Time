// ==UserScript==
// @name         NextDNS - Default Analytics Time - 6 Hours
// @description  Forces NextDNS to show the last 6 hours in Analytics
// @author       PixelSpark987 - https://is.gd/PS987
// @icon         https://my.nextdns.io/favicon.ico
// @version      1.7
// @downloadURL  https://raw.githubusercontent.com/PixelSpark987/NextDNS-Default-Analytics-Time/refs/heads/main/NextDNS%20-%20Default%20Analytics%20Time%20-%206%20Hours.js
// @updateURL    https://raw.githubusercontent.com/PixelSpark987/NextDNS-Default-Analytics-Time/refs/heads/main/NextDNS%20-%20Default%20Analytics%20Time%20-%206%20Hours.js
// @namespace    http://tampermonkey.net/
// @match        *://my.nextdns.io/*
// @grant        none
// ==/UserScript==

// Wrap everything in an Immediately Invoked Function Expression (IIFE) to avoid cluttering global window scope.
(function() {
    // Enforce strict mode to prevent accidental implicit globals and catch silent errors.
    'use strict';

    // Flag variable used as a lock to prevent duplicate execution when MutationObserver triggers rapid events.
    let isProcessing = false;

    // Track the last seen URL to detect SPA navigation tab switches.
    let lastUrl = location.href;

    // Helper function that accepts a DOM element and fires a sequence of click events on it.
    const triggerClick = (el) => {
        // Loop through touch and click event types to ensure full compatibility across mobile and desktop browsers.
        ['touchstart', 'touchend', 'click'].forEach(type => {
            // Dispatch a synthetic Event marked as bubbling and cancelable so React synthetic event listeners pick it up.
            el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
        });
    };

    // Primary function responsible for finding the dropdown, expanding it, and selecting the 6-hour timeframe.
    const selectSixHours = () => {
        // If an operation is already in progress, or if the current URL path isn't analytics, abort execution immediately.
        if (isProcessing || !window.location.pathname.includes('/analytics')) return;

        // Query all elements with the '.dropdown-toggle' class on the page and convert the NodeList to an Array.
        const toggleBtn = Array.from(document.querySelectorAll('.dropdown-toggle'))
            // Find the button element whose visible text content includes the phrase 'Last '.
            .find(btn => btn.textContent && btn.textContent.includes('Last '));

        // LINE 49 (Target string check 1/3): If no toggle button is found, or if it already reads 'Last 6 hours', abort execution.
        if (!toggleBtn || toggleBtn.textContent.trim() === 'Last 6 hours') return;

        // Activate the processing lock to freeze additional observer calls while running this selection sequence.
        isProcessing = true;

        // LINE 56 (Target string check 2/3): Query menu items to see if the target option 'Last 6 hours' is already present in the DOM.
        let targetOption = Array.from(document.querySelectorAll('.dropdown-menu .dropdown-item'))
            // Filter array to find the item matching our target text string.
            .find(opt => opt.textContent && opt.textContent.trim() === 'Last 6 hours');

        // If the dropdown option is already visible/rendered, click it directly without re-opening the menu.
        if (targetOption) {
            // Trigger our click helper on the discovered option element.
            triggerClick(targetOption);
            // Set a 300ms delay to release the execution lock after React handles the DOM update.
            setTimeout(() => { isProcessing = false; }, 300);
            // Return early to finish execution.
            return;
        }

        // Check if the dropdown menu is collapsed by inspecting its 'aria-expanded' HTML attribute.
        if (toggleBtn.getAttribute('aria-expanded') !== 'true') {
            // Fire a click event on the toggle button to trigger the React state change that opens the menu.
            triggerClick(toggleBtn);
        }

        // Initialize a step counter to keep track of how many polling attempts have occurred.
        let attempts = 0;
        // Start a zero-delay interval timer to repeatedly scan the DOM on every available thread tick.
        const checkInterval = setInterval(() => {
            // Increment the counter on each tick iteration.
            attempts++;
            
            // LINE 84 (Target string check 3/3): Search the DOM specifically for the target '.dropdown-menu .dropdown-item' containing 'Last 6 hours'.
            targetOption = Array.from(document.querySelectorAll('.dropdown-menu .dropdown-item'))
                // Filter the elements by their trimmed text content.
                .find(opt => opt.textContent && opt.textContent.trim() === 'Last 6 hours');

            // Check if our targeted menu item has appeared in the DOM tree.
            if (targetOption) {
                // Clear the active interval timer to stop polling immediately.
                clearInterval(checkInterval);
                // Dispatch the synthetic click events to select the 'Last 6 hours' option.
                triggerClick(targetOption);
                // Schedule unlocking of the processing flag after 300ms to allow React UI state to stabilize.
                setTimeout(() => { isProcessing = false; }, 300);
            // Fallback check: If target hasn't appeared after 200 ticks (~200ms), terminate loop to prevent runaway background execution.
            } else if (attempts > 200) {
                // Clear the interval timer to stop polling.
                clearInterval(checkInterval);
                // Release processing lock so future DOM mutations can attempt again if needed.
                isProcessing = false;
            }
        }, 0); // Pass 0 milliseconds to execute polling at the maximum speed allowed by the browser engine.
    };

    // Helper to check for route transitions and force execution when landing on /analytics.
    const checkUrlChange = () => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // Force reset processing flag on tab transition to allow execution on new view.
            isProcessing = false;
            if (window.location.pathname.includes('/analytics')) {
                selectSixHours();
            }
        }
    };

    // Monkey-patch history.pushState and history.replaceState to listen for SPA tab switches.
    const wrapHistoryMethod = (type) => {
        const orig = history[type];
        return function() {
            const rv = orig.apply(this, arguments);
            checkUrlChange();
            return rv;
        };
    };
    history.pushState = wrapHistoryMethod('pushState');
    history.replaceState = wrapHistoryMethod('replaceState');

    // Listen for browser back/forward navigation.
    window.addEventListener('popstate', checkUrlChange);

    // Initialize a tracking variable to manage requestAnimationFrame scheduling state.
    let pending = false;
    
    // Create a MutationObserver instance to detect dynamically rendered content changes in the SPA.
    const observer = new MutationObserver(() => {
        // Also check for URL shifts on DOM mutations in case pushState was bypassed.
        checkUrlChange();

        // Exit early if a check is already pending, processing is locked, or current path is not analytics.
        if (pending || isProcessing || !window.location.pathname.includes('/analytics')) return;

        // Set pending flag to true to lock out duplicate observer callbacks on the same frame.
        pending = true;
        
        // Pass selection execution to requestAnimationFrame to align with the browser paint cycle and prevent layout thrashing.
        requestAnimationFrame(() => {
            // Run the selection routine.
            selectSixHours();
            // Reset the pending flag once the frame executes.
            pending = false;
        });
    });

    // Configure the observer to watch the document body for added/removed nodes and deep subtree mutations.
    observer.observe(document.body, { childList: true, subtree: true });

    // Execute an initial manual call on script injection.
    selectSixHours();
})();
