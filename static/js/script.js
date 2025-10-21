// script.js (เวอร์ชันรวมระบบกล้อง, ซูม, และเมนูด้านข้าง)

document.addEventListener("DOMContentLoaded", () => {

    // ======================================
    //     ส่วนควบคุมกล้องและการสแกน
    // ======================================
    let isFrontCamera = false;
    let currentStream = null;
    let videoTrack = null; // <-- ตัวแปรสำหรับเก็บ video track เพื่อควบคุมการซูม

    // Element references
    const videoElement = document.getElementById("videoElement");
    const canvas = document.getElementById("canvas");
    const switchCameraButton = document.getElementById("switchCamera");
    const captureButton = document.getElementById("capture");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const errorMessage = document.getElementById("errorMessage");
    const zoomContainer = document.getElementById("zoom-container");
    const zoomSlider = document.getElementById("zoomSlider");


    // ฟังก์ชันสำหรับใช้การซูม
    function applyZoom() {
        if (videoTrack && 'zoom' in videoTrack.getCapabilities()) {
            try {
                videoTrack.applyConstraints({advanced: [{zoom: zoomSlider.value}]});
            } catch (err) {
                console.error('applyConstraints(zoom) failed: ', err);
            }
        }
    }

    // เปิดกล้อง
    async function startCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        // ซ่อนแถบซูมก่อนเริ่มเสมอ
        if (zoomContainer) {
            zoomContainer.style.display = 'none';
        }

        const constraints = {
            video: {facingMode: isFrontCamera ? "user" : "environment"},
            audio: false
        };

        try {
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = currentStream;
            videoElement.style.transform = isFrontCamera ? "scaleX(-1)" : "scaleX(1)";
            if (errorMessage) errorMessage.innerText = "";

            // --- ตรรกะการซูม ---
            videoTrack = currentStream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();

            // ตรวจสอบว่าเบราว์เซอร์และกล้องรองรับการซูมหรือไม่
            if ('zoom' in capabilities) {
                // ถ้าใช่ ให้แสดงแถบเลื่อน
                if (zoomContainer) zoomContainer.style.display = 'flex';

                // ตั้งค่า min, max, step ของแถบเลื่อนตามความสามารถจริงของกล้อง
                if (zoomSlider) {
                    zoomSlider.min = capabilities.zoom.min;
                    zoomSlider.max = capabilities.zoom.max;
                    zoomSlider.step = capabilities.zoom.step;

                    // ตั้งค่าเริ่มต้นของแถบเลื่อน
                    const currentZoom = videoTrack.getSettings().zoom || capabilities.zoom.min;
                    zoomSlider.value = currentZoom;

                    // เพิ่ม Event Listener ให้กับแถบเลื่อน
                    zoomSlider.addEventListener('input', applyZoom);
                }

            } else {
                console.log("Zoom is not supported by this camera.");
            }
            // --- จบตรรกะการซูม ---

        } catch (err) {
            console.error("ไม่สามารถเปิดกล้อง:", err);
            if (errorMessage) errorMessage.innerText = "❌ ไม่สามารถเปิดกล้องได้ โปรดตรวจสอบการอนุญาต";
        }
    }

    // สลับกล้อง (จะเรียก startCamera ซึ่งมี logic การซูมอยู่แล้ว)
    async function switchCamera() {
        isFrontCamera = !isFrontCamera;
        await startCamera();
    }

    // จับภาพ, ส่งไปสแกน, และเปลี่ยนหน้า
    async function captureAndScan() {
        if (captureButton) captureButton.disabled = true;
        if (errorMessage) errorMessage.innerText = "";
        if (loadingIndicator) loadingIndicator.style.display = 'block';

        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext("2d");

        if (isFrontCamera) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");

        try {
            const response = await fetch("/fda_scan/scan", {
                method: "POST",
                body: formData
            });
            const data = await response.json();
            if (response.ok && data.number && data.number !== "ไม่พบเลข") {
                if (data.number.length === 13) {
                    window.location.href = `/fda_scan/result?number=${data.number}&image=${data.image_filename}`;
                } else {
                    throw new Error(data.error || `พบเลข อย. 13 หลักที่ไม่ชัดเจน ${data.number}`);
                }
            } else {
                throw new Error(data.error || "ไม่พบเลข อย. 13 หลักที่ชัดเจน");
            }
        } catch (err) {
            console.error("เกิดข้อผิดพลาด:", err);
            if (errorMessage) errorMessage.innerText = `❌ ${err.message}`;
            if (captureButton) captureButton.disabled = false;
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    // Event Listeners สำหรับกล้อง
    if (switchCameraButton) switchCameraButton.addEventListener("click", switchCamera);
    if (captureButton) captureButton.addEventListener("click", captureAndScan);

    // เริ่มต้นการทำงานของกล้อง (ตรวจสอบให้แน่ใจว่า Element ของกล้องมีอยู่ในหน้านี้)
    if (videoElement) {
        startCamera();
    }

});