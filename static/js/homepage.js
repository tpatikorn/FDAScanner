document.addEventListener('DOMContentLoaded', function () {
    const tutorialOverlay = document.getElementById('tutorialOverlay');
    const closeButton = document.getElementById('closeTutorialBtn');

    if (!sessionStorage.getItem('tutorialShown')) {
        setTimeout(() => {
            tutorialOverlay.classList.add('show');
        }, 500);
        sessionStorage.setItem('tutorialShown', 'true');
    }

    function hideTutorial() {
        tutorialOverlay.classList.remove('show');
    }

    closeButton.addEventListener('click', hideTutorial);

    tutorialOverlay.addEventListener('click', function (event) {
        if (event.target === tutorialOverlay) {
            hideTutorial();
        }
    });
});
