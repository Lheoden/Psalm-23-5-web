// Opening.js

// Function to handle the splash screen "Touch anywhere"
function handleTouch() {
    const splash = document.querySelector('.splash-container');

    // Stop if splash already hidden
    if (splash.classList.contains('hidden')) return;

    const selection = document.getElementById('selection-screen');

    document.body.style.transition = "opacity 0.5s ease";
    document.body.style.opacity = "0";

    setTimeout(() => {
        splash.classList.add('hidden');
        selection.classList.remove('hidden');
        document.body.style.opacity = "1";
    }, 500);
}

// Function to handle when a specific option (card) is clicked
// We accept the 'event' parameter so we can stop bubbling
function selectOption(option, event) {
    event.stopPropagation();

    // Save customer's order type
    const orderType = option === 'Dine In' ? 'Dine-in' : 'Take-out';
    localStorage.setItem("orderType", orderType);

    // Proceed to the actual kiosk menu
    window.location.href = "Kiosk.html";
}