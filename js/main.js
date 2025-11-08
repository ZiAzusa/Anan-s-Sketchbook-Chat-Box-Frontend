document.addEventListener('DOMContentLoaded', () => {
    const config = {
        TEXT_BOX_TOPLEFT: [119, 450],
        IMAGE_BOX_BOTTOMRIGHT: [119 + 279, 450 + 175],
        FONT_FILE: '"Source Han Sans CN", sans-serif',
        BASEIMAGE_MAPPING: {
            '普通': 'images/base/base.png',
            '开心': 'images/base/开心.png',
            '生气': 'images/base/生气.png',
            '无语': 'images/base/无语.png',
            '脸红': 'images/base/脸红.png',
            '病娇': 'images/base/病娇.png'
        },
        BASE_OVERLAY_FILE: 'images/base_overlay.png',
        USE_BASE_OVERLAY: true,
        bracketColor: '#800080',
        textColor: '#000000'
    };

    let currentEmotion = '普通';
    let uploadedImage = null;
    let baseImages = {};
    let overlayImage = new Image();
    let canvas = document.getElementById('previewCanvas');
    let ctx = canvas.getContext('2d');
    let currentFontSize = 18;
    let loadComplete = false;

    function createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.fontSize = '1.2rem';
        overlay.style.color = '#8b5a2b';
        overlay.textContent = '请等待加载完成...';
        document.body.appendChild(overlay);
    }

    function disableControls() {
        document.querySelectorAll('.emotion-buttons button').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
        document.getElementById('textInput').disabled = true;
        document.getElementById('fontSize').disabled = true;
        document.querySelector('.upload-btn').style.pointerEvents = 'none';
        document.querySelector('.upload-btn').style.opacity = '0.5';
        document.getElementById('downloadBtn').disabled = true;
        document.getElementById('downloadBtn').style.opacity = '0.5';
    }

    function enableControls() {
        document.querySelectorAll('.emotion-buttons button').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        document.getElementById('textInput').disabled = false;
        document.getElementById('fontSize').disabled = false;
        document.querySelector('.upload-btn').style.pointerEvents = 'auto';
        document.querySelector('.upload-btn').style.opacity = '1';
        document.getElementById('downloadBtn').disabled = false;
        document.getElementById('downloadBtn').style.opacity = '1';
    }

    function preloadAllImages() {
        return new Promise((resolve) => {
            const imagePaths = Object.values(config.BASEIMAGE_MAPPING);
            imagePaths.push(config.BASE_OVERLAY_FILE);
            const total = imagePaths.length;
            let loaded = 0;

            imagePaths.forEach(path => {
                const img = new Image();
                img.src = path;
                img.onload = () => {
                    loaded++;
                    if (path === config.BASE_OVERLAY_FILE) {
                        overlayImage = img;
                    } else {
                        const emotion = Object.keys(config.BASEIMAGE_MAPPING).find(key => 
                            config.BASEIMAGE_MAPPING[key] === path
                        );
                        if (emotion) baseImages[emotion] = img;
                    }
                    if (loaded >= total) resolve();
                };
            });
        });
    }

    function init() {
        createLoadingOverlay();
        disableControls();

        preloadAllImages().then(() => {
            loadComplete = true;
            document.getElementById('loadingOverlay').remove();
            enableControls();

            canvas.width = baseImages[currentEmotion].width;
            canvas.height = baseImages[currentEmotion].height;
            drawBaseImage();

            document.querySelectorAll('.emotion-buttons button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    setEmotion(e.target.dataset.emotion);
                    generateImage();
                });
            });

            document.getElementById('textInput').addEventListener('input', generateImage);
            
            document.getElementById('imageUpload').addEventListener('change', (e) => {
                handleImageUpload(e);
            });

            const fontSizeCtrl = document.getElementById('fontSize');
            const fontSizeValue = document.getElementById('fontSizeValue');
            fontSizeCtrl.addEventListener('input', (e) => {
                currentFontSize = parseInt(e.target.value);
                fontSizeValue.textContent = `${currentFontSize}px`;
                generateImage();
            });

            document.getElementById('downloadBtn').addEventListener('click', downloadImage);
        });
    }

    function setEmotion(emotion) {
        if (!loadComplete) return;
        currentEmotion = emotion;
        document.querySelectorAll('.emotion-buttons button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.emotion === emotion);
        });
        canvas.width = baseImages[emotion].width;
        canvas.height = baseImages[emotion].height;
        generateImage();
    }

    function handleImageUpload(e) {
        if (!loadComplete) return;
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                uploadedImage = img;
                const previewContainer = document.getElementById('previewImage');
                previewContainer.innerHTML = `<img src="${event.target.result}" alt="预览图">`;
                previewContainer.style.display = 'block';
                generateImage();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function drawBaseImage() {
        if (!loadComplete || !baseImages[currentEmotion].complete) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseImages[currentEmotion], 0, 0);
    }

    function generateImage() {
        if (!loadComplete) return;
        const text = document.getElementById('textInput').value.trim();
        
        drawBaseImage();
        
        if (uploadedImage) {
            pasteImageAuto(uploadedImage);
        } else if (text) {
            drawTextWithFontSize(text, currentFontSize);
        }
        
        if (config.USE_BASE_OVERLAY && overlayImage.complete) {
            ctx.drawImage(overlayImage, 0, 0);
        }
    }

    function drawTextWithFontSize(text, fontSize) {
        const [x1, y1] = config.TEXT_BOX_TOPLEFT;
        const [x2, y2] = config.IMAGE_BOX_BOTTOMRIGHT;
        const regionWidth = x2 - x1;
        const regionHeight = y2 - y1;

        const segments = parseColorSegments(text);
        
        const lineHeight = fontSize * 1.2;
        
        const lines = wrapText(segments, fontSize, regionWidth);
        
        const totalTextHeight = lines.length * lineHeight;
        const yStart = y1 + (regionHeight - totalTextHeight) / 2;
        
        ctx.font = `${fontSize}px ${config.FONT_FILE}`;
        ctx.textBaseline = 'top';
        
        lines.forEach((line, index) => {
            let x = x1;
            const y = yStart + index * lineHeight;
            
            let lineWidth = 0;
            line.forEach(seg => {
                lineWidth += ctx.measureText(seg.text).width;
            });
            
            if (lineWidth < regionWidth) {
                x += (regionWidth - lineWidth) / 2;
            }
            
            line.forEach(seg => {
                ctx.fillStyle = seg.color;
                ctx.fillText(seg.text, x, y);
                x += ctx.measureText(seg.text).width;
            });
        });
    }

    function parseColorSegments(text) {
        const segments = [];
        let inBracket = false;
        let currentText = '';
        
        for (const char of text) {
            if (char === '[' || char === '【') {
                if (currentText) {
                    segments.push({
                        text: currentText,
                        color: inBracket ? config.bracketColor : config.textColor
                    });
                    currentText = '';
                }
                segments.push({ text: char, color: config.bracketColor });
                inBracket = true;
            } else if (char === ']' || char === '】') {
                if (currentText) {
                    segments.push({ text: currentText, color: config.bracketColor });
                    currentText = '';
                }
                segments.push({ text: char, color: config.bracketColor });
                inBracket = false;
            } else {
                currentText += char;
            }
        }
        
        if (currentText) {
            segments.push({
                text: currentText,
                color: inBracket ? config.bracketColor : config.textColor
            });
        }
        
        return segments;
    }

    function wrapText(segments, fontSize, maxWidth) {
        ctx.font = `${fontSize}px ${config.FONT_FILE}`;
        const lines = [];
        let currentLine = [];
        let currentWidth = 0;
        
        segments.forEach(seg => {
            if (seg.text.includes('\n')) {
                const parts = seg.text.split('\n');
                parts.forEach((part, i) => {
                    if (part) {
                        const partWidth = ctx.measureText(part).width;
                        if (currentWidth + partWidth > maxWidth && currentLine.length > 0) {
                            lines.push([...currentLine]);
                            currentLine = [];
                            currentWidth = 0;
                        }
                        currentLine.push({ ...seg, text: part });
                        currentWidth += partWidth;
                    }
                    
                    if (i < parts.length - 1) {
                        lines.push([...currentLine]);
                        currentLine = [];
                        currentWidth = 0;
                    }
                });
            } else {
                const segWidth = ctx.measureText(seg.text).width;
                if (currentWidth + segWidth > maxWidth && currentLine.length > 0) {
                    lines.push([...currentLine]);
                    currentLine = [];
                    currentWidth = 0;
                }
                currentLine.push(seg);
                currentWidth += segWidth;
            }
        });
        
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    function pasteImageAuto(contentImage) {
        const [x1, y1] = config.TEXT_BOX_TOPLEFT;
        const [x2, y2] = config.IMAGE_BOX_BOTTOMRIGHT;
        const padding = 12;
        
        const regionWidth = (x2 - x1) - 2 * padding;
        const regionHeight = (y2 - y1) - 2 * padding;
        
        const scaleWidth = regionWidth / contentImage.width;
        const scaleHeight = regionHeight / contentImage.height;
        const scale = Math.min(scaleWidth, scaleHeight, 1);
        
        const newWidth = Math.max(1, Math.round(contentImage.width * scale));
        const newHeight = Math.max(1, Math.round(contentImage.height * scale));
        const x = x1 + padding + (regionWidth - newWidth) / 2;
        const y = y1 + padding + (regionHeight - newHeight) / 2;
        
        ctx.drawImage(contentImage, x, y, newWidth, newHeight);
    }

    function downloadImage() {
        if (!loadComplete || canvas.width === 0 || canvas.height === 0) return;
        
        const link = document.createElement('a');
        link.download = '安安的素描本.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    init();
});