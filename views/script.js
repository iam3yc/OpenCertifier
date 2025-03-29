document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const nameMarker = document.getElementById('nameMarker');
    const previewBtn = document.getElementById('previewBtn');
    const saveBtn = document.getElementById('saveBtn');
    const xCoord = document.getElementById('xCoord');
    const yCoord = document.getElementById('yCoord');
    const previewContainer = document.querySelector('.preview-container');

    let templateImage = null;
    let markerPosition = { x: 0, y: 0 };
    let originalImageSize = { width: 0, height: 0 };

    previewBtn.addEventListener('click', () => {
        const fileInput = document.getElementById('templateFile');
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                templateImage = new Image();
                templateImage.onload = () => {
                    originalImageSize.width = templateImage.width;
                    originalImageSize.height = templateImage.height;
                    canvas.width = templateImage.width;
                    canvas.height = templateImage.height;
                    ctx.drawImage(templateImage, 0, 0);
                    
                    nameMarker.style.display = 'block';
                    nameMarker.innerHTML = '<div class="name-marker-label">Set Name Position</div>';
                    
                    const initialX = canvas.offsetWidth / 2;
                    nameMarker.style.left = `${initialX}px`;
                    nameMarker.style.top = '50px';
                };
                templateImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    let isDragging = false;

    nameMarker.addEventListener('mousedown', (e) => {
        isDragging = true;
        nameMarker.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        nameMarker.style.left = `${x}px`;
        nameMarker.style.top = `${y}px`;
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        markerPosition.x = Math.round(x * scaleX);
        markerPosition.y = Math.round(y * scaleY);
        
        xCoord.textContent = markerPosition.x;
        yCoord.textContent = markerPosition.y;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        nameMarker.style.cursor = 'grab';
    });

    function updateCoordinateDisplay() {
        markerPosition.x = Math.max(0, Math.min(markerPosition.x, originalImageSize.width));
        markerPosition.y = Math.max(0, Math.min(markerPosition.y, originalImageSize.height));
        
        xCoord.textContent = markerPosition.x;
        yCoord.textContent = markerPosition.y;
    }

    saveBtn.addEventListener('click', async () => {
        const fileInput = document.getElementById('templateFile');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a certificate template file');
            return;
        }

        const formData = new FormData();
        formData.append('template', file);
        formData.append('sheetId', document.getElementById('sheetId').value);
        formData.append('sheetName', document.getElementById('sheetName').value);
        formData.append('mailSubject', document.getElementById('mailSubject').value);
        formData.append('mailBody', document.getElementById('mailBody').value);
        formData.append('namePosition', JSON.stringify({
            x: markerPosition.x,
            y: markerPosition.y
        }));

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Sending...';

            const response = await fetch('/send_certificates', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            alert('Certificates generated successfully!');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error sending certificate data: ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Settings';
        }
    });

    window.addEventListener('resize', () => {
        if (templateImage) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const x = (rect.left) * scaleX;
            const y = (rect.top) * scaleY;

            const visualX = rect.left - (nameMarker.offsetWidth / 2);
            const visualY = rect.top - (nameMarker.offsetHeight / 2);

            nameMarker.style.left = `${visualX}px`;
            nameMarker.style.top = `${visualY}px`;
            
            markerPosition.x = Math.round(x);
            markerPosition.y = Math.round(y);
            
            updateCoordinateDisplay();
        }
    });
}); 