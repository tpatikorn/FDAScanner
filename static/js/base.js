// Base JavaScript for common functionality

// Side Navigation Menu
const menuIcon = document.getElementById('menuIcon');
const sideNav = document.getElementById('sideNav');
const overlay = document.getElementById('overlay');

function openNav() {
    if (sideNav) sideNav.classList.add('open');
    if (overlay) overlay.classList.add('active');
}

function closeNav() {
    if (sideNav) sideNav.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

if (menuIcon) {
    menuIcon.addEventListener('click', () => {
        if (sideNav.classList.contains('open')) {
            closeNav();
        } else {
            openNav();
        }
    });
}

if (overlay) {
    overlay.addEventListener('click', closeNav);
}
