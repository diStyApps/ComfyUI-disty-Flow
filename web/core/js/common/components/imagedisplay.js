
let previousMediaElement = null;

class ImageLoader {
    constructor(containerId) {
        this.imageContainer = document.getElementById(containerId);
        if (!this.imageContainer) {
            console.error(`Image container with ID '${containerId}' not found.`);
        }
    }

    loadMedia(mediaUrl, isFinalImage = false) {
        if (!this.imageContainer) return;

        const isVideo = /\.(mp4|webm|ogg)$/i.test(mediaUrl);
        let mediaElement;

        if (isVideo) {
            mediaElement = this.createVideoElement(mediaUrl);
        } else {
            mediaElement = this.createImageElement(mediaUrl);
        }

        mediaElement.onerror = () => {
            console.error(`Failed to load ${isVideo ? 'video' : 'image'}: ${mediaUrl}`);
            this.imageContainer.innerHTML = `<p>Failed to load ${isVideo ? 'video' : 'image'}.</p>`;
        };

        mediaElement.onload = mediaElement.onloadeddata = () => {
            this.imageContainer.appendChild(mediaElement);
            requestAnimationFrame(() => {
                mediaElement.style.opacity = '1';
            });

            setTimeout(() => {
                if (previousMediaElement && previousMediaElement.parentNode) {
                    previousMediaElement.parentNode.removeChild(previousMediaElement);
                }
                previousMediaElement = mediaElement;
            }, 500);
        };
    }

    createImageElement(src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Generated Image';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.width = 'auto';
        img.style.position = 'absolute';
        img.style.top = '50%';
        img.style.left = '50%';
        img.style.transform = 'translate(-50%, -50%)';
        img.style.objectFit = 'contain';
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.5s';
        img.style.zIndex = '2';
        return img;
    }

    createVideoElement(src) {
        const video = document.createElement('video');
        video.src = src;
        video.autoplay = true;
        video.loop = true;
        video.controls = true;
        video.muted = true;
        video.style.position = 'absolute';
        video.style.top = '50%';
        video.style.left = '50%';
        video.style.width = 'auto';
        video.style.transform = 'translate(-50%, -50%)';
        video.style.objectFit = 'contain';
        video.style.opacity = '0';
        video.style.transition = 'opacity 0.5s';
        video.style.zIndex = '2';
        return video;
    }
}

class HistoryManager {
    constructor(containerId, maxItems = 50) {
        this.historyContainer = document.getElementById(containerId);
        if (!this.historyContainer) {
            console.error(`History container with ID '${containerId}' not found.`);
        }
        this.maxItems = maxItems;
        this.history = [];
        this.activeLightboxes = new Set(); 
        this.lastInteractedLightboxInstance = null; 
    }

    addImage(imageUrl) {
        if (!this.historyContainer) return;

        if (this.history.includes(imageUrl)) {
            return;
        }

        this.history.unshift(imageUrl);
        this.renderThumbnail(imageUrl);

        if (this.history.length > this.maxItems) {
            this.history.pop();
            this.historyContainer.removeChild(this.historyContainer.lastChild);
        }
    }

    renderThumbnail(imageUrl) {
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.classList.add('history-thumbnail');

        const isVideo = /\.(mp4|webm|ogg)$/i.test(imageUrl);
        let mediaElement;

        if (isVideo) {
            mediaElement = this.createVideoThumbnail(imageUrl);
        } else {
            mediaElement = this.createImageThumbnail(imageUrl);
        }

        thumbnailDiv.appendChild(mediaElement);

        let clickTimeout = null;
        const CLICK_DELAY = 250; 

        thumbnailDiv.addEventListener('click', (e) => {
            if (clickTimeout !== null) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
                this.handleDoubleClick(imageUrl);
            } else {
                clickTimeout = setTimeout(() => {
                    this.handleSingleClick(imageUrl);
                    clickTimeout = null;
                }, CLICK_DELAY);
            }
        });

        this.historyContainer.prepend(thumbnailDiv);
    }

    createImageThumbnail(src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'History Image';
        img.loading = 'lazy';
        img.style.width = '100%';
        img.style.height = 'auto';
        img.onerror = (e) => {
            console.error('Failed to load thumbnail image', e);
        };
        return img;
    }

    createVideoThumbnail(src) {
        const video = document.createElement('video');
        video.src = src;
        video.preload = 'metadata';
        video.muted = true;
        video.loop = true;
        video.style.width = '100%';
        video.style.height = 'auto';

        video.onloadeddata = function() {
            this.currentTime = 0;
            this.pause();
        };

        video.addEventListener('mouseenter', () => {
            video.play();
        });

        video.addEventListener('mouseleave', () => {
            video.pause();
            video.currentTime = 0;
        });

        return video;
    }

    getMediaAt(index) {
        if (index < 0 || index >= this.history.length) return null;
        return this.history[index];
    }

    getCount() {
        return this.history.length;
    }

    updateLightboxIndicator() {
        let indicator = document.getElementById('lightbox-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'lightbox-indicator';
            indicator.style.position = 'fixed';
            indicator.style.bottom = '10px';
            indicator.style.right = '10px';
            indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            indicator.style.color = '#fff';
            indicator.style.padding = '5px 10px';
            indicator.style.zIndex = '2000';
            indicator.style.fontSize = '14px';
            indicator.style.pointerEvents = 'none';
            document.body.appendChild(indicator);
        }
        indicator.textContent = `Active Lightboxes: ${this.activeLightboxes.size}`;
    }

    handleSingleClick(imageUrl) {
        const index = this.history.indexOf(imageUrl);
        if (index !== -1) {
            let lastLightbox = this.getLastInteractedLightbox();
            if (lastLightbox && lastLightbox.isOpen) {
                lastLightbox.setMedia(index);
            } else if (this.activeLightboxes.size > 0) {
                lastLightbox = Array.from(this.activeLightboxes).pop();
                if (lastLightbox.isOpen) {
                    this.setLastInteractedLightbox(lastLightbox);
                    lastLightbox.setMedia(index);
                } else {
                    this.openNewLightbox(imageUrl, index);
                }
            } else {
                this.openNewLightbox(imageUrl, index);
            }
        }
    }

    handleDoubleClick(imageUrl) {
        const index = this.history.indexOf(imageUrl);
        if (index !== -1) {
            this.openNewLightbox(imageUrl, index);
        }
    }

    openNewLightbox(imageUrl, index) {
        const newLightbox = new Lightbox(this, imageUrl, index);
        newLightbox.open();
        this.activeLightboxes.add(newLightbox);
        this.setLastInteractedLightbox(newLightbox);
    }

    setLastInteractedLightbox(lightboxInstance) {
        this.lastInteractedLightboxInstance = lightboxInstance;
    }

    getLastInteractedLightbox() {
        return this.lastInteractedLightboxInstance;
    }

    removeLightbox(lightboxInstance) {
        this.activeLightboxes.delete(lightboxInstance);
        if (this.lastInteractedLightboxInstance === lightboxInstance) {
            this.lastInteractedLightboxInstance = null;
        }
    }
}

class Lightbox {
    static counter = 0;
    static topZIndex = 1001;

    constructor(historyManager, mediaUrl, index) {
        this.historyManager = historyManager;
        this.currentIndex = index;
        this.mediaUrl = mediaUrl;
        Lightbox.counter += 1;
        this.instanceId = Lightbox.counter;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeDirection = null; 
        this.mediaNaturalWidth = 0; 
        this.mediaNaturalHeight = 0; 
        this.isOpen = false; 
        this.createLightboxElements();
        this.addEventListeners();
        this.overlay.style.zIndex = Lightbox.topZIndex++;
    }

    bringToFront() {
        this.overlay.style.zIndex = Lightbox.topZIndex++;
    }

    createLightboxElements() {
        this.overlayId = `lightbox-overlay-${this.instanceId}`;
        this.contentId = `lightbox-content-${this.instanceId}`;
        this.resizeHandleId = `lightbox-resize-handle-${this.instanceId}`;

        const lightboxHTML = `
            <div id="${this.overlayId}" class="lightbox-overlay">
                <div id="${this.contentId}" class="lightbox-content">
                    <!-- Close Button -->
                    <span class="lightbox-close">&times;</span>
                                        
                    <!-- Media Container -->
                    <div class="lightbox-media-container">
                        <!-- Media Element will be injected here -->
                    </div>
                    
                    <!-- Navigation Buttons -->
                    <div class="lightbox-navigation">
                        <a class="lightbox-prev">&#10094;</a>
                        <a class="lightbox-next">&#10095;</a>
                    </div>

                    <!-- Resize Handle -->
                    <div id="${this.resizeHandleId}" class="lightbox-resize-handle"></div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', lightboxHTML);

        this.overlay = document.getElementById(this.overlayId);
        this.content = document.getElementById(this.contentId);
        this.closeBtn = this.content.querySelector('.lightbox-close');
        this.prevBtn = this.content.querySelector('.lightbox-prev');
        this.nextBtn = this.content.querySelector('.lightbox-next');
        this.mediaContainer = this.content.querySelector('.lightbox-media-container');
        this.resizeHandle = document.getElementById(this.resizeHandleId);

        this.centerLightbox();
    }


    addEventListeners() {
        this.closeBtn.addEventListener('click', () => this.close());

        this.content.addEventListener('click', (e) => {
            e.stopPropagation();
            this.bringToFront(); 
        });
        this.prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showPrev();
        });
        this.nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showNext();
        });

        this.overlay.addEventListener('click', (e) => {
            this.bringToFront(); 
            e.stopPropagation();
        });

        this.handleKeyDown = (e) => {
            if (this.overlay.style.display === 'block') {
                if (e.key === 'ArrowLeft') {
                    this.showPrev();
                } else if (e.key === 'ArrowRight') {
                    this.showNext();
                } else if (e.key === 'Escape') {
                    this.close();
                }
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);

        this.content.addEventListener('mousedown', (e) => this.initiateDrag(e));

        this.resizeHandle.addEventListener('mousedown', (e) => this.initiateResize(e));

        this.overlay.addEventListener('transitionend', () => {
            if (this.overlay.style.display === 'none') {
                this.historyManager.removeLightbox(this.instanceId);
                this.removeEventListeners();
                this.overlay.remove(); 
            }
        });

        this.overlay.addEventListener('mousedown', (e) => {
            this.historyManager.setLastInteractedLightbox(this);
        });

        this.content.addEventListener('mousedown', (e) => {
            this.historyManager.setLastInteractedLightbox(this);
        });
    }

    removeEventListeners() {
        this.closeBtn.removeEventListener('click', () => this.close());
        this.prevBtn.removeEventListener('click', () => this.showPrev());
        this.nextBtn.removeEventListener('click', () => this.showNext());
        this.content.removeEventListener('mousedown', () => this.initiateDrag());
        this.resizeHandle.removeEventListener('mousedown', () => this.initiateResize());
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    initiateDrag(e) {
        this.bringToFront(); 

        if (
            e.target.classList.contains('lightbox-prev') ||
            e.target.classList.contains('lightbox-next') ||
            e.target.classList.contains('lightbox-close') ||
            e.target.tagName.toLowerCase() === 'img' ||
            e.target.tagName.toLowerCase() === 'video' ||
            e.target.classList.contains('lightbox-resize-handle')
        ) {
            return;
        }

        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;

        const rect = this.content.getBoundingClientRect();

        this.content.style.width = `${rect.width}px`;
        this.content.style.height = `${rect.height}px`;

        this.content.style.position = 'absolute';

        const left = rect.left + window.pageXOffset;
        const top = rect.top + window.pageYOffset;

        this.content.style.left = `${left}px`;
        this.content.style.top = `${top}px`;

        this.content.style.transform = 'none';

        this.initialLeft = left;
        this.initialTop = top;

        document.addEventListener('mousemove', this.handleDragMove);
        document.addEventListener('mouseup', this.stopDrag);

        e.preventDefault();
    }

    handleDragMove = (e) => {
        if (!this.isDragging) return;

        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;

        let newLeft = this.initialLeft + dx;
        let newTop = this.initialTop + dy;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const lightboxRect = this.content.getBoundingClientRect();
        const lightboxWidth = lightboxRect.width;
        const lightboxHeight = lightboxRect.height;

        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft + lightboxWidth > viewportWidth) newLeft = viewportWidth - lightboxWidth;
        if (newTop + lightboxHeight > viewportHeight) newTop = viewportHeight - lightboxHeight;

        this.content.style.left = `${newLeft}px`;
        this.content.style.top = `${newTop}px`;
    }


    stopDrag = (e) => {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.handleDragMove);
        document.removeEventListener('mouseup', this.stopDrag);
    }

    initiateResize(e) {
        e.stopPropagation();
        this.isResizing = true;
        this.startX = e.clientX;
        this.startY = e.clientY;

        const rect = this.content.getBoundingClientRect();
        this.initialWidth = rect.width;
        this.initialHeight = rect.height;

        this.initialLeft = rect.left;
        this.initialTop = rect.top;

        this.resizeDirection = 'se'; 

        document.addEventListener('mousemove', this.handleResizeMove);
        document.addEventListener('mouseup', this.stopResize);

        e.preventDefault();
    }

    handleResizeMove = (e) => {
        if (!this.isResizing) return;

        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;

        let newWidth = this.initialWidth + dx;
        let newHeight = this.initialHeight + dy;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const maxWidth = Math.min(this.mediaNaturalWidth, viewportWidth - this.initialLeft - 1) || (viewportWidth - this.initialLeft - 1);
        const maxHeight = Math.min(this.mediaNaturalHeight, viewportHeight - this.initialTop - 1) || (viewportHeight - this.initialTop - 1);

        const minWidth = 300;
        const minHeight = 200;

        if (newWidth < minWidth) newWidth = minWidth;
        if (newHeight < minHeight) newHeight = minHeight;
        if (newWidth > maxWidth) newWidth = maxWidth;
        if (newHeight > maxHeight) newHeight = maxHeight;

        this.content.style.width = `${newWidth}px`;
        this.content.style.height = `${newHeight}px`;
    }

    stopResize = (e) => {
        this.isResizing = false;
        document.removeEventListener('mousemove', this.handleResizeMove);
        document.removeEventListener('mouseup', this.stopResize);
    }

    centerLightbox() {
        this.content.style.left = '50%';
        this.content.style.top = '50%';
        this.content.style.transform = 'translate(-50%, -50%)';
    }
    setMedia(index) {
        this.currentIndex = index;
        this.displayMedia();
        this.bringToFront();
    }

    open() {
        this.overlay.style.display = 'block';
        this.isOpen = true;
        this.displayMedia();
    }


    close() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.isOpen = false;
        this.historyManager.removeLightbox(this);
        this.removeEventListeners();
        this.clearMedia();
    }

    showPrev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.displayMedia();
        }
    }

    showNext() {
        if (this.currentIndex < this.historyManager.getCount() - 1) {
            this.currentIndex++;
            this.displayMedia();
        }
    }

    displayMedia() {
        const mediaUrl = this.historyManager.getMediaAt(this.currentIndex);
        if (!mediaUrl) return;

        this.clearMedia();

        const isVideo = /\.(mp4|webm|ogg)$/i.test(mediaUrl);
        if (isVideo) {
            this.mediaElement = document.createElement('video');
            this.mediaElement.src = mediaUrl;
            this.mediaElement.controls = true;
            this.mediaElement.autoplay = true;
            this.mediaElement.style.maxWidth = '100%';
            this.mediaElement.style.maxHeight = '100%';
            this.mediaElement.style.outline = 'none'; 
            this.mediaElement.src = mediaUrl;
            this.mediaElement.controls = true;
            this.mediaElement.autoplay = true;
            this.mediaElement.loop = true; 
            this.mediaElement.muted = true;

            this.mediaElement.onloadedmetadata = () => {
                this.mediaNaturalWidth = this.mediaElement.videoWidth;
                this.mediaNaturalHeight = this.mediaElement.videoHeight;

                const currentWidth = this.content.offsetWidth;
                const currentHeight = this.content.offsetHeight;

                if (currentWidth > this.mediaNaturalWidth) {
                    this.content.style.width = `${this.mediaNaturalWidth}px`;
                }

                if (currentHeight > this.mediaNaturalHeight) {
                    this.content.style.height = `${this.mediaNaturalHeight}px`;
                }
            };
        } else {
            this.mediaElement = document.createElement('img');
            this.mediaElement.src = mediaUrl;
            this.mediaElement.alt = 'Lightbox Image';
            this.mediaElement.style.maxWidth = '100%';
            this.mediaElement.style.maxHeight = '100%';
            this.mediaElement.style.outline = 'none'; 

            this.mediaElement.onload = () => {
                this.mediaNaturalWidth = this.mediaElement.naturalWidth;
                this.mediaNaturalHeight = this.mediaElement.naturalHeight;

                const currentWidth = this.content.offsetWidth;
                const currentHeight = this.content.offsetHeight;

                if (currentWidth > this.mediaNaturalWidth) {
                    this.content.style.width = `${this.mediaNaturalWidth}px`;
                }

                if (currentHeight > this.mediaNaturalHeight) {
                    this.content.style.height = `${this.mediaNaturalHeight}px`;
                }
            };
        }

        this.mediaElement.onerror = () => {
            console.error(`Failed to load media: ${mediaUrl}`);
            this.clearMedia();
            const errorMsg = document.createElement('p');
            errorMsg.textContent = 'Failed to load media.';
            errorMsg.style.color = '#fff';
            errorMsg.style.textAlign = 'center';
            this.mediaContainer.appendChild(errorMsg);
        };

        this.mediaContainer.appendChild(this.mediaElement);
    }


    clearMedia() {
        if (this.mediaElement) {
            this.mediaContainer.removeChild(this.mediaElement);
            this.mediaElement = null;
        }
        const errorMsg = this.mediaContainer.querySelector('p');
        if (errorMsg) {
            this.mediaContainer.removeChild(errorMsg);
        }
    }
}

class ProgressUpdater {
    constructor(progressBarId) {
        this.progressBar = document.getElementById(progressBarId);
        if (!this.progressBar) {
            console.error(`Progress bar with ID '${progressBarId}' not found.`);
        }
    }

    update(max = 0, value = 0) {
        if (!this.progressBar) return;
        this.progressBar.max = max;
        this.progressBar.value = value;
    }
}

class ImageDisplayApp {
    constructor() {
        this.imageLoader = new ImageLoader('image-container');
        this.historyManager = new HistoryManager('images-container');
        this.progressUpdater = new ProgressUpdater('main-progress');
    }

    displayImagesInDiv(imageUrls, addToHistory = true, isFinalImage = addToHistory) {
        if (addToHistory) {
            imageUrls.forEach(imageUrl => this.historyManager.addImage(imageUrl));
        }

        const lastImageUrl = imageUrls[imageUrls.length - 1];
        this.imageLoader.loadMedia(lastImageUrl, isFinalImage);
    }

    addImageToHistory(imageUrl) {
        this.historyManager.addImage(imageUrl);
    }

    clearImageContainer() {
        this.imageLoader.imageContainer.innerHTML = '';
        previousMediaElement = null;
    }
 
    updateProgress(max = 0, value = 0) {
        this.progressUpdater.update(max, value);
    }
}

const imageDisplayApp = new ImageDisplayApp();

export function displayImagesInDiv(imageUrls, addToHistory = true, isFinalImage = addToHistory) {
    imageDisplayApp.displayImagesInDiv(imageUrls, addToHistory, isFinalImage);
}

export function addImageToHistory(imageUrl) {
    imageDisplayApp.addImageToHistory(imageUrl);
}

export function updateProgress(max = 0, value = 0) {
    imageDisplayApp.updateProgress(max, value);
}
