document.addEventListener('DOMContentLoaded', () => {
    // Select all menu toggles by class instead of ID
    const menuToggles = document.querySelectorAll('.menu-toggle');

    menuToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            // Find the closest header container relative to the clicked toggle
            const header = toggle.closest('.page-header');
            if (header) {
                // Find the nav-menu specifically within THIS header
                const navMenu = header.querySelector('.nav-menu');
                if (navMenu) {
                    navMenu.classList.toggle('active');
                    
                    // Optional: Toggle aria-expanded
                    const isExpanded = navMenu.classList.contains('active');
                    toggle.setAttribute('aria-expanded', isExpanded);
                }
            }
        });
    });
});
