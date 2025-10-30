document.addEventListener('DOMContentLoaded', () => {
    const controlButton = document.getElementById('playStopBtn');
    const audio = document.getElementById('ttsAudio');
    if (controlButton && audio) {
        const buttonIcon = controlButton.querySelector('.icon');
        const buttonText = controlButton.querySelector('.text');
        let isPlaying = false;

        const updateButtonUI = () => {
            if (isPlaying) {
                buttonIcon.textContent = '⏹️';
                buttonText.textContent = 'หยุดอ่าน';
            } else {
                buttonIcon.textContent = '▶️';
                buttonText.textContent = 'ออกเสียงข้อมูล';
            }
        };

        controlButton.addEventListener('click', () => {
            if (!isPlaying) {
                audio.play();
                isPlaying = true;
            } else {
                audio.pause();
                audio.currentTime = 0;
                isPlaying = false;
            }
            updateButtonUI();
        });

        audio.addEventListener('ended', () => {
            isPlaying = false;
            updateButtonUI();
        });
    }
});
