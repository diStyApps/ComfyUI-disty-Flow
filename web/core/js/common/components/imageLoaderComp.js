import ImageLoader from './ImageLoader.js';
import {updateWorkflow} from './workflowManager.js';

let imageLoader = null;
let isLoadMediaVisible = true;
let destroyOnHide = false;

export default function imageLoaderComp(flowConfig, workflow) {
    if (!flowConfig.imageLoaders || flowConfig.imageLoaders.length === 0) {
        // console.log('No uploaded images, skipping initialization of imageLoader.');
        return; 
    }

    const displayMediaMain = document.getElementById('display-media-main');
    if (!displayMediaMain) {
        console.error('display-media-main container not found.');
        return;
    }

    let loadImageContainer = document.getElementById('load-image-container');
    if (!loadImageContainer) {
        loadImageContainer = document.createElement('div');
        loadImageContainer.id = 'load-image-container';

        const imageContainer = document.getElementById('image-container');

        if (imageContainer && imageContainer.parentElement === displayMediaMain) {
            displayMediaMain.insertBefore(loadImageContainer, imageContainer);
        } else {
            displayMediaMain.appendChild(loadImageContainer);
        }
    }

    flowConfig.imageLoaders.forEach((imageConfig, index) => {
        const containerId = loadImageContainer.id;
        const imageDropAreaTitle = document.createElement('div');
        imageDropAreaTitle.classList.add('image-loader-title');
        imageDropAreaTitle.textContent = imageConfig.label;
        loadImageContainer.appendChild(imageDropAreaTitle);

        // console.log("image-loader-title",imageConfig.label);
        // this.imageDropAreaTitle.textContent = 'Drop an image or video here';
        const imageLoader = new ImageLoader(containerId, {
            allowedFileType: 'image',
            defaultImageSrc: '/core/media/ui/drop_image_rect_no_border_trans.png',
            showIndicator: true,
        }, (localSrc, serverResult) => {
            console.log(`Image ${index + 1} loaded:`, serverResult);
            if (serverResult && serverResult.name) {
                console.log(flowConfig.imageLoaders[index].nodePath, imageConfig.nodePath);
                updateWorkflow(workflow, imageConfig.nodePath, serverResult.name);
            } else {
                console.error("Server did not return a valid result");
            }
        });
    });
}



const loadMediaToggleBtn = document.getElementById('load-media-toggle-btn');
const displayMediaMain = document.getElementById('display-media-main');

function toggleLoadMedia() {
    isLoadMediaVisible = !isLoadMediaVisible;

    const loadImageContainer = document.getElementById('load-image-container');
    
    if (isLoadMediaVisible) {
        if (!loadImageContainer) {
            const newLoadImageContainer = document.createElement('div');
            newLoadImageContainer.id = 'load-image-container';
            displayMediaMain.insertBefore(newLoadImageContainer, displayMediaMain.firstChild);
            imageLoaderComp();
        } else {
            loadImageContainer.style.display = 'block'; 
        }
    } else {
        if (destroyOnHide) {
            if (loadImageContainer) {
                loadImageContainer.parentNode.removeChild(loadImageContainer);
            }
            if (imageLoader) {
                imageLoader.destroy();
                imageLoader = null;
            }
        } else {
            if (loadImageContainer) {
                loadImageContainer.style.display = 'none';
            }
        }
    }
}
// loadMediaToggleBtn.addEventListener('click', toggleLoadMedia);

function setDestroyOnHide(shouldDestroy) {
    destroyOnHide = shouldDestroy;
}