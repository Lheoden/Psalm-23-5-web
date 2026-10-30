// Opening.js

let isStarting = false;

// Draws a gold ripple where the screen was touched
function triggerRipple(e) {
    if (typeof e.clientX !== 'number') return;

    const ripple = document.createElement('div');
    ripple.className = 'ripple-effect';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    document.body.appendChild(ripple);

    setTimeout(() => ripple.remove(), 800);
}

// Handles the opening screen: touching anywhere starts the order
function handleTouch(e) {
    const splash = document.querySelector('.splash-container');

    // Stop if splash already hidden or a transition is already running
    if (splash.classList.contains('hidden') || isStarting) return;
    isStarting = true;

    if (e) triggerRipple(e);

    const selection = document.getElementById('selection-screen');

    document.body.style.transition = "opacity 0.5s ease";
    document.body.style.opacity = "0";

    setTimeout(() => {
        splash.classList.add('hidden');
        selection.classList.remove('hidden');
        document.body.style.opacity = "1";
    }, 500);
}

// Handles when a specific option (card) is clicked
// We accept the 'event' parameter so we can stop bubbling
let isSelecting = false;

function selectOption(option, event) {
    event.stopPropagation();
    if (isSelecting) return;
    isSelecting = true;

    // Gold ripple so the touch feels acknowledged
    triggerRipple(event);

    // Save customer's order type
    // (on-screen wording is "Enjoy Here" / "Take Away", saved values are unchanged)
    const orderType = option === 'Dine In' ? 'Dine-in' : 'Take-out';
    localStorage.setItem("orderType", orderType);

    // Proceed to the actual kiosk menu after a brief moment for the ripple
    setTimeout(() => {
        window.location.href = "Kiosk.html";
    }, 300);
}