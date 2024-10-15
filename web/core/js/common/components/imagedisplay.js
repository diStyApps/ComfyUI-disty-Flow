export function displayImagesInDiv(imageUrls, addToHistory = true) {
    const imageContainer = document.getElementById('image-container');
    if (!imageContainer) {
        // console.error('Image container not found');
        return;
    }

    function loadMedia(mediaUrl) {
        const isVideo = /\.(mp4|webm|ogg)$/i.test(mediaUrl);
        // console.log(`Loading media: ${mediaUrl}, isVideo: ${isVideo}`);

        let mediaElement;

        if (isVideo) {
            // console.log(`Video URL detected: ${mediaUrl}`);
            mediaElement = document.createElement('video');
            mediaElement.src = mediaUrl;  
            mediaElement.autoplay = true;
            mediaElement.loop = true;
            mediaElement.controls = true;
            mediaElement.muted = true;
            mediaElement.style.position = 'absolute';
            mediaElement.style.top = '0';
            mediaElement.style.left = '0';
            mediaElement.style.width = '100%';
            mediaElement.style.height = '100%';
            mediaElement.style.objectFit = 'cover';
    
            mediaElement.onloadeddata = () => {
                // console.log('Video loaded successfully');
                imageContainer.innerHTML = '';
                imageContainer.appendChild(mediaElement);
            };
    
            mediaElement.onerror = () => {
                console.error('Failed to load video');
                imageContainer.innerHTML = '<p>Failed to load video.</p>';
            };
        } else {
            mediaElement = document.createElement('img');
            mediaElement.src = mediaUrl;
            mediaElement.alt = 'Generated Image';
            mediaElement.style.maxWidth = '100%';
            mediaElement.style.maxHeight = '100%';
            mediaElement.style.width = 'auto';
            mediaElement.style.height = 'auto';
            mediaElement.style.position = 'absolute';
            mediaElement.style.top = '50%';
            mediaElement.style.left = '50%';
            mediaElement.style.transform = 'translate(-50%, -50%)';
            mediaElement.style.objectFit = 'contain';

            mediaElement.onload = () => {
                // console.log('Image loaded successfully');
            };

            mediaElement.onerror = (e) => {
                console.error('Failed to load image', e);
                imageContainer.innerHTML = '<p>Failed to load image.</p>';
            };
        }

        imageContainer.innerHTML = '';
        imageContainer.appendChild(mediaElement);
        // console.log('Media element appended to container');
    }

    if (addToHistory) {
        imageUrls.forEach(imageUrl => {
            addImageToHistory(imageUrl);
        });
    }

    const lastImageUrl = imageUrls[imageUrls.length - 1];
    loadMedia(lastImageUrl);
}

export function addImageToHistory(imageUrl) {
    const historyContainer = document.getElementById('images-container');
    if (!historyContainer) {
        console.error('History container not found');
        return;
    }

    const existingMedia = Array.from(historyContainer.querySelectorAll('img, video')).map(media => media.src);

    if (existingMedia.includes(imageUrl)) {
        // console.log('Media already exists in history. Skipping addition.');
        return;
    }

    const thumbnailDiv = document.createElement('div');
    thumbnailDiv.classList.add('history-thumbnail');

    const isVideo = /\.(mp4|webm|ogg)$/i.test(imageUrl);
    // console.log(`Adding media to history: ${imageUrl}, isVideo: ${isVideo}`);

    let mediaElement;

    if (isVideo) {
        mediaElement = document.createElement('video');
        mediaElement.src = imageUrl;
        mediaElement.preload = 'metadata';
        mediaElement.muted = true;
        mediaElement.loop = true;
        mediaElement.style.width = '100%';
        mediaElement.style.height = 'auto';
        mediaElement.onloadeddata = function() {
            this.currentTime = 0;
            this.pause();
            // console.log('Thumbnail video loaded');
        };
        thumbnailDiv.addEventListener('mouseenter', () => {
            mediaElement.play();
        });
        thumbnailDiv.addEventListener('mouseleave', () => {
            mediaElement.pause();
            mediaElement.currentTime = 0;
        });
    } else {
        mediaElement = document.createElement('img');
        mediaElement.src = imageUrl;
        mediaElement.alt = 'History Image';
        mediaElement.loading = 'lazy';

        mediaElement.onload = () => {
            // console.log('Thumbnail image loaded');
        };

        mediaElement.onerror = (e) => {
            console.error('Failed to load thumbnail image', e);
        };
    }

    thumbnailDiv.appendChild(mediaElement);

    thumbnailDiv.addEventListener('click', () => {
        displayImagesInDiv([imageUrl], false);
    });

    historyContainer.prepend(thumbnailDiv);

    const maxHistoryItems = 10;
    if (historyContainer.children.length > maxHistoryItems) {
        historyContainer.removeChild(historyContainer.lastChild);
    }
}

export function updateProgress(max = 0, value = 0) {
    const progressbar = document.getElementById('main-progress');
    if (!progressbar) {
        console.error('Progress bar element not found');
        return;
    }
    progressbar.max = max;
    progressbar.value = value;
    // console.log(`Progress updated: ${value}/${max}`);
}
