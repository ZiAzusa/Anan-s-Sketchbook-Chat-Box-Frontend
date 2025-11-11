const config = {
    TEXT_BOX_TOPLEFT: [119, 450],
    IMAGE_BOX_BOTTOMRIGHT: [119 + 279, 450 + 175],
    FONT_FILE: {
        'Source Han Sans CN': {
            family: '"Source Han Sans CN", sans-serif',
            file: 'css/SourceHanSansCN-Regular.woff2',
            displayText: '印刷体（思源）'
        },
        'Allseto': {
            family: '"Allseto", sans-serif',
            file: 'css/Allseto.woff2',
            displayText: '手写体（全濑）'
        }
    },
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
    bracketColor: '#6a5acd',
    textColor: '#000000'
}

document.addEventListener('DOMContentLoaded', () => {
    let currentEmotion = '普通';
    let currentFont = 'Source Han Sans CN';
    let uploadedImage = null;
    let baseImages = {};
    let overlayImage = new Image();
    let canvas = document.getElementById('previewCanvas');
    let ctx = canvas.getContext('2d');
    let currentFontSize = 32;
    let loadComplete = false;
    let gifState = {
        file: null,
        frames: null,
        currentIndex: 0,
        timer: null,
        width: 0,
        height: 0,
        loopCount: null
    }
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const emotionButtonsContainer = document.getElementById('emotionButtonsContainer');
    const fontButtonsContainer = document.getElementById('fontButtonsContainer');
    const totalResources = Object.keys(config.BASEIMAGE_MAPPING).length + 1 + Object.keys(config.FONT_FILE).length;
    let loadedResources = 0;

    function disableControls() {
        document.querySelectorAll('.emotion-buttons button, .font-buttons button').forEach(btn => {
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
        progressContainer.style.display = 'none';
        loadingOverlay.style.display = 'none';
        document.querySelectorAll('.emotion-buttons button, .font-buttons button').forEach(btn => {
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

    function updateProgress() {
        const progress = Math.round((loadedResources / totalResources) * 100);
        progressBar.style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${progress}%`;
        if (progress === 100) {
            setTimeout(() => progressContainer.style.display = 'none', 500);
        }
    }

    function generateEmotionButtons() {
        emotionButtonsContainer.innerHTML = '';
        Object.keys(config.BASEIMAGE_MAPPING).forEach(emotion => {
            const button = document.createElement('button');
            button.dataset.emotion = emotion;
            button.textContent = emotion;
            button.classList.toggle('active', emotion === currentEmotion);
            button.addEventListener('click', (e) => setEmotion(e.target.dataset.emotion));
            emotionButtonsContainer.appendChild(button);
        });
    }

    function generateFontButtons() {
        fontButtonsContainer.innerHTML = '';
        Object.keys(config.FONT_FILE).forEach(fontKey => {
            const fontInfo = config.FONT_FILE[fontKey];
            const button = document.createElement('button');
            button.dataset.font = fontKey;
            button.textContent = fontInfo.displayText;
            button.classList.toggle('active', fontKey === currentFont);
            button.addEventListener('click', (e) => setFont(e.target.dataset.font));
            fontButtonsContainer.appendChild(button);
        });
    }

    function preloadAllImages() {
        return new Promise((resolve) => {
            const imagePaths = [...Object.values(config.BASEIMAGE_MAPPING), config.BASE_OVERLAY_FILE];
            let loaded = 0;

            imagePaths.forEach(path => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = typeof path === 'object' ? path.PATH : path;
                img.onload = () => {
                    loaded++;
                    loadedResources++;
                    updateProgress();
                    if (path === config.BASE_OVERLAY_FILE) {
                        overlayImage = img;
                    } else {
                        const emotion = Object.keys(config.BASEIMAGE_MAPPING).find(key => config.BASEIMAGE_MAPPING[key] === path);
                        if (emotion) baseImages[emotion] = img;
                    }
                    if (loaded >= imagePaths.length) resolve();
                }
            });
        });
    }

    function preloadAllFonts() {
        return new Promise((resolve) => {
            const fontPromises = Object.keys(config.FONT_FILE).map(fontKey => {
                const fontInfo = config.FONT_FILE[fontKey];
                const fontFace = new FontFace(fontKey, `url(${fontInfo.file})`, { style: 'normal', weight: '400' });
                return fontFace.load()
                .then(() => document.fonts.add(fontFace))
                .finally(() => {
                    loadedResources++;
                    updateProgress();
                });
            });
            Promise.allSettled(fontPromises).then(resolve);
        });
    }

    function updatefontSizeCtrl(target) {
        const min = parseInt(target.min);
        const max = parseInt(target.max);
        const current = parseInt(target.value);
        target.style.setProperty('--progress', `${((current - min) / (max - min)) * 100}%`);
    }

    function showNotification(message, type = 'default') {
        document.querySelector('.notification')?.remove();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 1000);
    }

    function dataURLToBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new Blob([u8arr], { type: mime });
    }

    function getBoxCoordinates() {
        const baseConfig = config.BASEIMAGE_MAPPING[currentEmotion];
        if (typeof baseConfig !== 'string') {
            return {
                topLeft: baseConfig.TEXT_BOX_TOPLEFT,
                bottomRight: baseConfig.IMAGE_BOX_BOTTOMRIGHT
            }
        }
        return {
            topLeft: config.TEXT_BOX_TOPLEFT,
            bottomRight: config.IMAGE_BOX_BOTTOMRIGHT
        }
    }

    function stopGifAnimation() {
        if (gifState.timer) {
            clearTimeout(gifState.timer);
            gifState.timer = null;
        }
        gifState = {
            file: null,
            frames: null,
            currentIndex: 0,
            timer: null,
            width: 0,
            height: 0,
            loopCount: null
        }
    }

    function startGifAnimation() {
        if (!gifState.frames || !gifState.frames.length) return;
        const animate = () => {
            gifState.currentIndex = (gifState.currentIndex + 1) % gifState.frames.length;
            generateImage();
            const delay = gifState.frames[gifState.currentIndex].delay || 100;
            gifState.timer = setTimeout(animate, delay);
        }
        generateImage();
        gifState.timer = setTimeout(animate, gifState.frames[0].delay || 100);
    }

    function drawGifFrame() {
        if (!gifState.frames) return;
        const { topLeft: [x1, y1], bottomRight: [x2, y2] } = getBoxCoordinates();
        const frame = gifState.frames[gifState.currentIndex];
        const maxWidth = x2 - x1;
        const maxHeight = y2 - y1;
        let width = frame.dims.width;
        let height = frame.dims.height;
        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
        }
        if (height > maxHeight) {
            const ratio = maxHeight / height;
            height = maxHeight;
            width = width * ratio;
        }
        const x = x1 + (maxWidth - width) / 2;
        const y = y1 + (maxHeight - height) / 2;
        ctx.drawImage(frame.bitmap, x, y, width, height);
    }

    function composeGifBlob() {
        return new Promise((resolve, reject) => {
            const gif = new window.GIF({
                workers: 2,
                quality: 10,
                width: canvas.width,
                height: canvas.height,
                workerScript: 'js/gif/gif.worker.js'
            });
            const originalIndex = gifState.currentIndex;

            (async () => {
                for (let i = 0; i < gifState.frames.length; i++) {
                    drawBaseImage();
                    gifState.currentIndex = i;
                    drawGifFrame();
                    if (config.USE_BASE_OVERLAY && overlayImage.complete) ctx.drawImage(overlayImage, 0, 0);
                    gif.addFrame(canvas, { copy: true, delay: gifState.frames[i].delay || 100 });
                    await new Promise(r => setTimeout(r, 0));
                }
                gifState.currentIndex = originalIndex;
                gif.on('finished', resolve);
                gif.on('abort', () => reject(new Error('GIF编码被中止')));
                gif.render();
            })();
        });
    }

    function drawBaseImage() {
        if (!loadComplete || !baseImages[currentEmotion]?.complete) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseImages[currentEmotion], 0, 0);
    }

    function pasteImageAuto(img) {
        const { topLeft: [x1, y1], bottomRight: [x2, y2] } = getBoxCoordinates();
        const maxWidth = x2 - x1;
        const maxHeight = y2 - y1;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
        }
        if (height > maxHeight) {
            const ratio = maxHeight / height;
            height = maxHeight;
            width = width * ratio;
        }
        const x = x1 + (maxWidth - width) / 2;
        const y = y1 + (maxHeight - height) / 2;
        ctx.drawImage(img, x, y, width, height);
    }

    function generateImage() {
        if (!loadComplete) return;
        const text = document.getElementById('textInput').value.trim();
        drawBaseImage();
        if (gifState.frames) {
            drawGifFrame();
        } else if (uploadedImage) {
            pasteImageAuto(uploadedImage);
        } else if (text) {
            drawTextWithFontSize(text, currentFontSize);
        }
        if (config.USE_BASE_OVERLAY && overlayImage.complete) ctx.drawImage(overlayImage, 0, 0);
    }

    function drawTextWithFontSize(text, fontSize) {
        const { topLeft: [x1, y1], bottomRight: [x2, y2] } = getBoxCoordinates();
        const regionWidth = x2 - x1;
        const regionHeight = y2 - y1;
        const segments = parseColorSegments(text);
        const lineHeight = fontSize * 1.2;
        const lines = wrapText(segments, fontSize, regionWidth, ctx);
        const totalTextHeight = lines.length * lineHeight;
        const yStart = y1 + (regionHeight - totalTextHeight) / 2;
        ctx.font = `${fontSize}px ${config.FONT_FILE[currentFont].family}`;
        ctx.textBaseline = 'top';

        lines.forEach((line, index) => {
            let x = x1;
            const y = yStart + index * lineHeight;
            const lineWidth = line.reduce((sum, seg) => sum + ctx.measureText(seg.text).width, 0);
            if (lineWidth < regionWidth) x += (regionWidth - lineWidth) / 2;
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
        if (!text) return segments;
        for (const char of text) {
            if (char === '[' || char === '【') {
                if (currentText) {
                    segments.push({ text: currentText, color: config.textColor });
                    currentText = '';
                }
                currentText += char;
                inBracket = true;
            } else if (char === ']' || char === '】') {
                currentText += char;
                segments.push({ text: currentText, color: config.bracketColor });
                currentText = '';
                inBracket = false;
            } else {
                currentText += char;
            }
        }
        if (currentText) segments.push({ text: currentText, color: config.textColor });
        return segments;
    }

    function wrapText(segments, fontSize, maxWidth, ctx) {
        ctx.font = `${fontSize}px ${config.FONT_FILE[currentFont].family}`;
        const lines = [];
        let currentLine = [];
        let currentWidth = 0;
        const splitSingleLongSeg = (seg, remainingWidth) => {
            const text = seg.text;
            let start = 0;
            for (let i = 1; i <= text.length; i++) {
                const substr = text.slice(start, i);
                const substrWidth = ctx.measureText(substr).width;
                if (substrWidth > remainingWidth || i === text.length) {
                    const cutIdx = substrWidth > remainingWidth ? i - 1 : i;
                    const cutText = text.slice(start, cutIdx);
                    currentLine.push({ ...seg, text: cutText });
                    lines.push([...currentLine]);
                    currentLine = [];
                    currentWidth = 0;
                    start = cutIdx;
                    remainingWidth = maxWidth;
                    i = cutIdx;
                }
            }
        }

        segments.forEach(seg => {
            if (seg.text.includes('\n')) {
                const parts = seg.text.split('\n');
                parts.forEach((part, i) => {
                    if (part) {
                        const partWidth = ctx.measureText(part).width;
                        if (currentWidth + partWidth > maxWidth) {
                            if (currentLine.length) {
                                lines.push([...currentLine]);
                                currentLine = [];
                                currentWidth = 0;
                            }
                            partWidth > maxWidth 
                                ? splitSingleLongSeg({ ...seg, text: part }, maxWidth)
                                : (currentLine.push({ ...seg, text: part }), currentWidth += partWidth);
                        } else {
                            currentLine.push({ ...seg, text: part });
                            currentWidth += partWidth;
                        }
                    }
                    if (i < parts.length - 1) {
                        lines.push([...currentLine]);
                        currentLine = [];
                        currentWidth = 0;
                    }
                });
            } else {
                const segWidth = ctx.measureText(seg.text).width;
                if (currentWidth + segWidth > maxWidth) {
                    if (currentLine.length) {
                        lines.push([...currentLine]);
                        currentLine = [];
                        currentWidth = 0;
                    }
                    segWidth > maxWidth 
                        ? splitSingleLongSeg(seg, maxWidth)
                        : (currentLine.push(seg), currentWidth += segWidth);
                } else {
                    currentLine.push(seg);
                    currentWidth += segWidth;
                }
            }
        });
        if (currentLine.length) lines.push(currentLine);
        return lines;
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

    function setFont(font) {
        if (!loadComplete) return;
        currentFont = font;
        document.querySelectorAll('.font-buttons button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.font === font);
        });
        generateImage();
    }

    function handleUploadButtonClick(e) {
        if (uploadedImage || gifState.file) {
            e.preventDefault();
            removeImage();
        }
    }

    function handleImageUpload(e) {
        if (!loadComplete) return;
        const file = e.target.files[0];
        if (!file) return;

        if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
            stopGifAnimation();
            const reader = new FileReader();
            reader.onload = async (event) => {
                const arrayBuffer = event.target.result;
                const uint8 = new Uint8Array(arrayBuffer);
                const gifReader = new window.GifReader(uint8);
                const framesCount = gifReader.numFrames();
                const frames = [];
                for (let i = 0; i < framesCount; i++) {
                    const info = gifReader.frameInfo(i);
                    const pixels = new Uint8Array(gifReader.width * gifReader.height * 4);
                    gifReader.decodeAndBlitFrameRGBA(i, pixels);
                    const imgData = new ImageData(new Uint8ClampedArray(pixels.buffer), gifReader.width, gifReader.height);
                    const bitmap = await createImageBitmap(imgData);
                    frames.push({
                        bitmap,
                        delay: (info.delay > 0 ? info.delay : 10) * 10, // 转换为ms
                        dims: { width: gifReader.width, height: gifReader.height }
                    });
                }
                gifState = {
                    file: new Blob([arrayBuffer], { type: 'image/gif' }),
                    frames,
                    currentIndex: 0,
                    timer: null,
                    width: gifReader.width,
                    height: gifReader.height,
                    loopCount: null
                }
                const previewContainer = document.getElementById('previewImage');
                previewContainer.innerHTML = `<img src="${URL.createObjectURL(gifState.file)}" alt="预览图">`;
                previewContainer.style.display = 'block';
                document.getElementById('uploadBtnLabel').textContent = '删除图片';
                document.getElementById('imageUpload').value = '';
                startGifAnimation();
            }
            reader.readAsArrayBuffer(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                uploadedImage = img;
                const previewContainer = document.getElementById('previewImage');
                previewContainer.innerHTML = `<img src="${event.target.result}" alt="预览图">`;
                previewContainer.style.display = 'block';
                generateImage();
                document.getElementById('uploadBtnLabel').textContent = '删除图片';
                document.getElementById('imageUpload').value = '';
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    }

    function removeImage() {
        stopGifAnimation();
        uploadedImage = null;
        const previewContainer = document.getElementById('previewImage');
        previewContainer.innerHTML = '';
        previewContainer.style.display = 'none';
        generateImage();
        document.getElementById('uploadBtnLabel').textContent = '选择图片';
        document.getElementById('imageUpload').value = '';
    }

    function copyCanvasToClipboard() {
        if (!loadComplete || !baseImages[currentEmotion]?.complete) return;
        try {
            const dataURL = canvas.toDataURL('image/png');
            const blob = dataURLToBlob(dataURL);
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item])
            .then(() => showNotification(gifState.frames ? "已复制当前帧到剪贴板" : '已复制图片到剪贴板'))
            .catch(err => showNotification(`复制失败: ${err}`, 'error'));
        } catch (err) {
            showNotification(`复制失败: ${err}`, 'error');
        }
    }

    function downloadImage() {
        if (!loadComplete) return;
        if (gifState.frames) {
            composeGifBlob()
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = '安安的素描本.gif';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
            return;
        }
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '安安的素描本.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    function init() {
        disableControls();
        const fontSizeCtrl = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        progressContainer.style.display = 'block';
        updatefontSizeCtrl(fontSizeCtrl);

        Promise.all([preloadAllImages(), preloadAllFonts()])
        .then(() => {
            generateEmotionButtons();
            generateFontButtons();
            loadComplete = true;
            enableControls();
            canvas.width = baseImages[currentEmotion].width;
            canvas.height = baseImages[currentEmotion].height;
            drawBaseImage();
            document.getElementById('textInput').addEventListener('input', generateImage);
            document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
            document.getElementById('uploadBtnLabel').addEventListener('click', handleUploadButtonClick);
            document.getElementById('downloadBtn').addEventListener('click', downloadImage);
            canvas.crossOrigin = 'anonymous';
            canvas.style.webkitTouchCallout = 'default';
            canvas.style.touchAction = 'manipulation';
            fontSizeCtrl.addEventListener('input', (e) => {
                currentFontSize = parseInt(e.target.value);
                fontSizeValue.textContent = `${currentFontSize}px`;
                updatefontSizeCtrl(e.target);
                generateImage();
            });
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && 
                    document.activeElement.id !== 'textInput' && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    copyCanvasToClipboard();
                }
            });
            canvas.addEventListener('click', copyCanvasToClipboard);
        });
    }

    init();
});