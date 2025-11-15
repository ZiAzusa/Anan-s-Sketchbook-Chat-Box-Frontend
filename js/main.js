document.addEventListener('DOMContentLoaded', () => {
    const config = window.APP_CONFIG || {
        DEFAULT: {
            TEXT_BOX_TOPLEFT: [119, 450],
            IMAGE_BOX_BOTTOMRIGHT: [119 + 279, 450 + 175],
            TEXT_COLOR: '#000000',
            BRACKET_COLOR: '#6a5acd',
            TEXT_STROKE_ENABLED: false,
            TEXT_STROKE_COLOR: '#ffffff',
            USE_BASE_OVERLAY: true,
            BASE_OVERLAY_FILE: 'images/base_overlay.png'
        },
        FONT_FILE: {
            'Source Han Sans CN': {
                family: '"Source Han Sans CN", sans-serif',
                file: 'css/SourceHanSansCN-Regular.woff2',
                displayText: '印刷体（思源）'
            }
        },
        BASEIMAGE_MAPPING: {
            '普通': 'images/base/base.png'
        }
    }
    const totalResources = Object.keys(config.BASEIMAGE_MAPPING).length + 1 + Object.keys(config.FONT_FILE).length;
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
    const imageUploadInput = document.getElementById('imageUpload');
    const measureCache = new Map();
    let loadedResources = 0;
    let textRenderToken = 0;
    let rafPending = false;
    let lastRequestedArgs = null;

    function getEmotionCfg(emotionName) {
        const entry = config.BASEIMAGE_MAPPING[emotionName];
        if (typeof entry === 'string') {
            const cfg = Object.create(config.DEFAULT);
            return { PATH: entry, config: cfg };
        }
        if (entry && typeof entry === 'object') {
            const path = entry.PATH || entry.path || '';
            const merged = Object.create(config.DEFAULT);
            Object.keys(entry).forEach(k => {
                if (k === 'PATH' || k === 'path') return;
                merged[k] = entry[k];
            });
            return { PATH: path, config: merged };
        }
        return { PATH: '', config: Object.create(config.DEFAULT) };
    }

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

    function adjustButtonLayout(containerSelector, maxPerRow) {
        const container = document.querySelector(containerSelector);
        const buttons = container.querySelectorAll('button');
        const buttonCount = buttons.length;
        if (buttonCount === 0) return;
        const perRowCount = ((c, m) => {
            let divisor = 1;
            while (Math.ceil(c / divisor) > m) divisor++;
            return Math.ceil(c / divisor);
        })(buttonCount, maxPerRow);
        const gap = 8;
        const totalGap = gap * (perRowCount - 1);
        const buttonWidth = `calc((100% - ${totalGap}px) / ${perRowCount})`;
        buttons.forEach(button => button.style.width = buttonWidth);
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
        adjustButtonLayout('.emotion-buttons', 6);
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
        adjustButtonLayout('.font-buttons', 3);
    }

    function preloadAllImages() {
        return new Promise((resolve) => {
            const emotions = Object.keys(config.BASEIMAGE_MAPPING);
            const pathMap = {};
            const imagePaths = [];
            emotions.forEach(em => {
                const { PATH } = getEmotionCfg(em);
                pathMap[PATH] = em;
                imagePaths.push(PATH);
            });
            imagePaths.push(config.DEFAULT.BASE_OVERLAY_FILE);
            let loaded = 0;
            imagePaths.forEach(path => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = path;
                img.onload = () => {
                    loaded++;
                    loadedResources++;
                    updateProgress();
                    if (path === config.DEFAULT.BASE_OVERLAY_FILE) {
                        overlayImage = img;
                    } else {
                        const emotion = pathMap[path];
                        if (emotion) baseImages[emotion] = img;
                    }
                    if (loaded >= imagePaths.length) resolve();
                }
                img.onerror = () => {
                    loaded++;
                    loadedResources++;
                    updateProgress();
                    const emotion = pathMap[path];
                    if (emotion) {
                        delete baseImages[emotion];
                        const btn = emotionButtonsContainer.querySelector(`button[data-emotion="${emotion}"]`);
                        if (btn) btn.remove();
                    }
                    if (loaded >= imagePaths.length) resolve();
                }
            });
        });
    }

    function preloadAllFonts() {
        const fontPromises = Object.keys(config.FONT_FILE).map(fontKey => {
            const { file: filePath } = config.FONT_FILE[fontKey];
            const fileType = ((p) => p.endsWith('/')
                ? 'folder' : p.endsWith('.css')
                ? 'css' : ['.ttf', '.otf', '.woff', '.woff2'].includes(`.${p.split('.').pop()?.toLowerCase()}`)
                ? 'font' : null
            )(filePath);
            if (fileType == 'folder' || fileType == 'css') {
                const cssHref = fileType === 'folder' ? `${filePath.replace(/\/$/, '')}/result.css` : filePath;
                return new Promise(resolve => {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = cssHref;
                    link.onload = link.onerror = () => {
                        loadedResources++;
                        updateProgress();
                        resolve();
                    };
                    document.head.appendChild(link);
                });
            }
            if (fileType == 'font') {
                return new FontFace(fontKey, `url(${filePath})`, { style: 'normal', weight: '400' })
                    .load()
                    .then(font => document.fonts.add(font))
                    .finally(() => {
                        loadedResources++;
                        updateProgress();
                    });
            }
            loadedResources++;
            updateProgress();
            return Promise.resolve();
        });
        return Promise.allSettled(fontPromises);
    }

    function checkFontLoaded(fontFamily, fontSize, text) {
        const font = `${fontSize}px ${fontFamily}`;
        const checkText = text.trim() || '水';
        return new Promise(resolve => {
            document.fonts.check(font, checkText)
                ? resolve(true) : Promise.race([
                    document.fonts.load(font, checkText),
                    new Promise(rej => setTimeout(() => rej(), 5000))
                ])
                .then(() => resolve(true))
                .catch(() => resolve(false));
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
        const { config: emotionCfg } = getEmotionCfg(currentEmotion);
        const [x1, y1] = emotionCfg.TEXT_BOX_TOPLEFT;
        const [x2, y2] = emotionCfg.IMAGE_BOX_BOTTOMRIGHT;
        return { x1, y1, x2, y2 };
    }

    function calcMixedLayout(img, box) {
        const { x1, y1, x2, y2 } = box;
        const regionWidth = x2 - x1;
        const regionHeight = y2 - y1;
        const spacing = 10;
        const isVertical = img.height * (regionWidth / regionHeight) > img.width;
        let imgBox = {};
        let textBox = {};
        if (isVertical) {
            const half = (regionWidth - spacing) / 2;
            imgBox = { x1, y1, x2: x1 + half, y2 };
            textBox = { x1: x1 + half + spacing, y1, x2, y2 };
        } else {
            const textHeight = Math.min(regionHeight / 2, 100);
            imgBox = { x1, y1, x2, y2: y1 + (regionHeight - textHeight) };
            textBox = { x1, y1: imgBox.y2 + spacing, x2, y2 };
        }
        return { imgBox: imgBox, textBox: textBox };
    }

    function drawFittedImage(img, box) {
        const { x1, y1, x2, y2 } = box;
        const maxWidth = x2 - x1;
        const maxHeight = y2 - y1;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height *= ratio;
        }
        if (height > maxHeight) {
            const ratio = maxHeight / height;
            height = maxHeight;
            width *= ratio;
        }
        const x = x1 + (maxWidth - width) / 2;
        const y = y1 + (maxHeight - height) / 2;
        ctx.drawImage(img, x, y, width, height);
    }

    function drawTextBlock(text, fontSize, fontFamily, box, emotionCfg) {
        const { x1, y1, x2, y2 } = box;
        const w = x2 - x1;
        const h = y2 - y1;
        const segments = parseColorSegments(text, emotionCfg);
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        const lineHeight = fontSize * 1.2;
        const lines = wrapText(segments, fontSize, w, ctx, fontFamily);
        const totalHeight = lines.length * lineHeight;
        const yStart = y1 + (h - totalHeight) / 2;
        const strokeEnabled = emotionCfg.TEXT_STROKE_ENABLED || false;
        const strokeColor = emotionCfg.TEXT_STROKE_COLOR || '#ffffff';
        const strokeWidth = Math.min(Math.max(Math.round(fontSize / 12), 1), 2);
        lines.forEach((line, i) => {
            const y = yStart + i * lineHeight;
            const rowWidth = line.reduce((s, seg) => s + ctx.measureText(seg.text).width, 0);
            let x = x1 + (w - rowWidth) / 2;
            line.forEach(seg => {
                if (strokeEnabled) {
                    ctx.lineWidth = strokeWidth;
                    ctx.strokeStyle = strokeColor;
                    ctx.strokeText(seg.text, x, y);
                }
                ctx.fillStyle = seg.color;
                ctx.fillText(seg.text, x, y);
                x += ctx.measureText(seg.text).width;
            });
        });
    }

    function layoutMixedContent(img, text, fontSize, emotionCfg, token) {
        if (token !== textRenderToken) return;
        const fontFamily = config.FONT_FILE[currentFont].family;
        checkFontLoaded(fontFamily, fontSize, text).then(isLoaded => {
            if (token !== textRenderToken) return;
            const finalFont = isLoaded ? fontFamily : '';
            const box = getBoxCoordinates();
            const { imgBox, textBox } = calcMixedLayout(img, box);
            drawFittedImage(img, imgBox);
            drawTextBlock(text, fontSize, finalFont, textBox, emotionCfg);
            if (emotionCfg.USE_BASE_OVERLAY && overlayImage.complete) ctx.drawImage(overlayImage, 0, 0);
        });
    }

    function stopGifAnimation() {
        if (gifState.timer) {
            clearTimeout(gifState.timer);
            gifState.timer = null;
        }
        if (gifState.frames) {
            gifState.frames.forEach(f => {
                if (f.bitmap && f.bitmap.close && typeof f.bitmap.close === 'function') {
                    try { f.bitmap.close(); } catch (_) {}
                } else {
                    f.bitmap = null;
                }
            });
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
            requestGenerateImage();
            const delay = gifState.frames[gifState.currentIndex].delay || 100;
            gifState.timer = setTimeout(animate, delay);
        }
        requestGenerateImage();
        gifState.timer = setTimeout(animate, gifState.frames[0].delay || 100);
    }

    function composeGifBlob() {
        return new Promise(async (resolve, reject) => {
            const gif = new window.GIF({
                workers: 2,
                quality: 10,
                width: canvas.width,
                height: canvas.height,
                workerScript: 'js/gif/gif.worker.js'
            });
            const text = document.getElementById('textInput').value.trim();
            const originalIndex = gifState.currentIndex;
            const { config: emotionCfg } = getEmotionCfg(currentEmotion);
            const fontFamily = config.FONT_FILE[currentFont].family;
            try {
                await checkFontLoaded(fontFamily, currentFontSize, text);
                const finalFont = fontFamily;
                const box = getBoxCoordinates();
                let imgBox = box;
                let textBox = box;
                if (text && gifState.frames.length) {
                    const firstFrame = gifState.frames[0].bitmap;
                    const layout = calcMixedLayout(firstFrame, box);
                    imgBox = layout.imgBox;
                    textBox = layout.textBox;
                }
                const baseFrameCanvas = document.createElement('canvas');
                const baseFrameCtx = baseFrameCanvas.getContext('2d');
                baseFrameCanvas.width = canvas.width;
                baseFrameCanvas.height = canvas.height;
                const originalCtx = ctx;
                ctx = baseFrameCtx;
                drawBaseImage();
                if (text) {
                    measureCache.clear();
                    drawTextBlock(text, currentFontSize, finalFont, textBox, emotionCfg);
                }
                if (emotionCfg.USE_BASE_OVERLAY && overlayImage.complete) {
                    ctx.drawImage(overlayImage, 0, 0);
                }
                ctx = originalCtx;
                for (let i = 0; i < gifState.frames.length; i++) {
                    gifState.currentIndex = i;
                    const frame = gifState.frames[i];
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(baseFrameCanvas, 0, 0);
                    drawFittedImage(frame.bitmap, imgBox);
                    gif.addFrame(canvas, {
                        copy: true,
                        delay: frame.delay || 100
                    });
                    await new Promise(r => requestAnimationFrame(r));
                }
                gifState.currentIndex = originalIndex;
                gif.on('finished', resolve);
                gif.on('abort', () => reject(new Error('GIF编码被中止')));
                gif.render();
            } catch (err) {
                reject(err);
            }
        });
    }

    function drawBaseImage() {
        if (!loadComplete || !baseImages[currentEmotion]?.complete) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseImages[currentEmotion], 0, 0);
    }

    function drawText(text, fontSize, emotionCfg, token) {
        if (token !== textRenderToken) return;
        const fontFamily = config.FONT_FILE[currentFont].family;
        checkFontLoaded(fontFamily, fontSize, text).then(isLoaded => {
            if (token !== textRenderToken) return;
            const finalFont = isLoaded ? fontFamily : '';
            const box = getBoxCoordinates();
            drawTextBlock(text, fontSize, finalFont, box, emotionCfg);
            if (emotionCfg.USE_BASE_OVERLAY && overlayImage.complete) ctx.drawImage(overlayImage, 0, 0);
        });
    }

    function parseColorSegments(text, cfg) {
        const segments = [];
        let inBracket = false;
        let currentText = '';
        if (!text) return segments;
        for (const char of text) {
            if (char === '[' || char === '【') {
                if (currentText) {
                    segments.push({ text: currentText, color: cfg.TEXT_COLOR });
                    currentText = '';
                }
                currentText += char;
                inBracket = true;
            } else if (char === ']' || char === '】') {
                currentText += char;
                segments.push({ text: currentText, color: cfg.BRACKET_COLOR });
                currentText = '';
                inBracket = false;
            } else {
                currentText += char;
            }
        }
        if (currentText) segments.push({ text: currentText, color: cfg.TEXT_COLOR });
        return segments;
    }

    function wrapText(segments, fontSize, maxWidth, ctx, fontFamily) {
        ctx.font = `${fontSize}px ${fontFamily}`;
        const lines = [];
        let currentLine = [];
        let currentWidth = 0;
        const measureTextCached = (text) => {
            if (!text) return 0;
            let w = measureCache.get(text);
            if (w !== undefined) return w;
            w = ctx.measureText(text).width;
            if (/[\u{1F300}-\u{1FAFF}]/u.test(text)) w += text.length * fontSize * 0.05;
            measureCache.set(text, w);
            return w;
        };
        for (const seg of segments) {
            const parts = seg.text.split('\n');
            for (let p = 0; p < parts.length; p++) {
                const part = parts[p];
                if (part) {
                    const tokens = /[A-Za-z]/.test(part)
                        ? (() => {
                            const arr = [];
                            let buf = '';
                            for (const ch of part) {
                                if (/[A-Za-z0-9]/.test(ch)) buf += ch;
                                else { if (buf) arr.push(buf); arr.push(ch); buf = ''; }
                            }
                            if (buf) arr.push(buf);
                            return arr;
                        })()
                        : [...part];
                    for (const tk of tokens) {
                        const w = measureTextCached(tk);
                        if (currentWidth + w > maxWidth) {
                            if (currentLine.length) {
                                lines.push([...currentLine]);
                                currentLine.length = 0;
                                currentWidth = 0;
                            }
                            if (w > maxWidth) {
                                let t = tk;
                                let remain = maxWidth;
                                while (t.length) {
                                    let low = 1;
                                    let high = t.length;
                                    while (low < high) {
                                        const mid = (low + high + 1) >> 1;
                                        const mw = measureTextCached(t.slice(0, mid));
                                        if (mw <= remain) low = mid;
                                        else high = mid - 1;
                                    }
                                    const slice = t.slice(0, low);
                                    currentLine.push({ ...seg, text: slice });
                                    currentWidth += measureTextCached(slice);
                                    t = t.slice(low);
                                    if (!t.length) break;
                                    lines.push([...currentLine]);
                                    currentLine.length = 0;
                                    currentWidth = 0;
                                    remain = maxWidth;
                                }
                            } else {
                                currentLine.push({ ...seg, text: tk });
                                currentWidth = w;
                            }
                        } else {
                            currentLine.push({ ...seg, text: tk });
                            currentWidth += w;
                        }
                    }
                }
                if (p < parts.length - 1) {
                    lines.push([...currentLine]);
                    currentLine.length = 0;
                    currentWidth = 0;
                }
            }
        }
        if (currentLine.length) lines.push(currentLine);
        return lines;
    }

    function requestGenerateImage() {
        lastRequestedArgs = true;
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
            rafPending = false;
            if (lastRequestedArgs) {
                lastRequestedArgs = null;
                generateImage();
            }
        });
    }

    function generateImage() {
        if (!loadComplete) return;
        const text = document.getElementById('textInput').value.trim();
        const { config: emotionCfg } = getEmotionCfg(currentEmotion);
        const token = ++textRenderToken;
        measureCache.clear();
        drawBaseImage();
        if (gifState.frames && text) {
            const frame = gifState.frames[gifState.currentIndex];
            layoutMixedContent(frame.bitmap, text, currentFontSize, emotionCfg, token);
        } else if (gifState.frames) {
            const frame = gifState.frames[gifState.currentIndex];
            drawFittedImage(frame.bitmap, getBoxCoordinates());
            if (emotionCfg.USE_BASE_OVERLAY && overlayImage.complete) ctx.drawImage(overlayImage, 0, 0);
        } else if (uploadedImage && text) {
            layoutMixedContent(uploadedImage, text, currentFontSize, emotionCfg, token);
        } else if (uploadedImage) {
            drawFittedImage(uploadedImage, getBoxCoordinates());
            if (emotionCfg.USE_BASE_OVERLAY && overlayImage.complete) ctx.drawImage(overlayImage, 0, 0);
        } else if (text) {
            drawText(text, currentFontSize, emotionCfg, token);
        }
    }

    function setEmotion(emotion) {
        if (!loadComplete) return;
        currentEmotion = emotion;
        document.querySelectorAll('.emotion-buttons button').forEach(btn => btn.classList.toggle('active', btn.dataset.emotion === emotion));
        canvas.width = baseImages[emotion].width;
        canvas.height = baseImages[emotion].height;
        requestGenerateImage();
    }

    function setFont(font) {
        if (!loadComplete) return;
        currentFont = font;
        document.querySelectorAll('.font-buttons button').forEach(btn => btn.classList.toggle('active', btn.dataset.font === font));
        requestGenerateImage();
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
                        delay: (info.delay > 0 ? info.delay : 10) * 10,
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
                imageUploadInput.value = '';
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
                requestGenerateImage();
                document.getElementById('uploadBtnLabel').textContent = '删除图片';
                imageUploadInput.value = '';
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
        requestGenerateImage();
        document.getElementById('uploadBtnLabel').textContent = '选择图片';
        imageUploadInput.value = '';
    }

    function copyCanvasToClipboard() {
        if (!loadComplete || !baseImages[currentEmotion]?.complete) return;
        const dataURL = canvas.toDataURL('image/png');
        const blob = dataURLToBlob(dataURL);
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item])
        .then(() => showNotification(gifState.frames ? "已复制当前帧到剪贴板" : '已复制图片到剪贴板'))
        .catch(err => showNotification(`复制失败: ${err}`, 'error'));
    }

    function pauseClipboardToCanvas() {
        if (!loadComplete) return;
        navigator.clipboard.read()
        .then(async clipboardData => {
            if (clipboardData.length <= 0) return;
            const lastItem = clipboardData[clipboardData.length - 1];
            const imageTypes = lastItem.types.filter(type => type.startsWith('image/'));
            if (imageTypes.length <= 0) return;
            const blob = await lastItem.getType(imageTypes[0]);
            if (!blob) return;
            const file = new File([blob], `pasted-image.${imageTypes[0].split('/')[1] || 'png'}`, { type: blob.type });
            const dt = new DataTransfer();
            dt.items.add(file);
            imageUploadInput.value = '';
            imageUploadInput.files = dt.files;
            handleImageUpload({ target: imageUploadInput });
        })
        .catch(err => showNotification(`粘贴失败: ${err}`, 'error'));
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
            document.getElementById('textInput').addEventListener('input', requestGenerateImage);
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
                requestGenerateImage();
            });
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && document.activeElement.id !== 'textInput' && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    copyCanvasToClipboard();
                }
            });
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && document.activeElement.id !== 'textInput' && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    pauseClipboardToCanvas();
                }
            });
            canvas.addEventListener('click', copyCanvasToClipboard);
        });
    }

    init();
});
