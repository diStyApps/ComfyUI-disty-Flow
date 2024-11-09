const FAVICON_BASE_PATH = '/core/media/ui/';

const FAVICONS = {
    DEFAULT: 'flow_logo.png',  
    RUNNING: 'g_flow_logo.png',
    ERROR: 'r_flow_logo.png'
};

export const setFaviconStatus = {
    Default() {
        updateFavicon(FAVICONS.DEFAULT);
    },
    Running() {
        updateFavicon(FAVICONS.RUNNING);
    },
    Error() {
        updateFavicon(FAVICONS.ERROR);
    }
};

function updateFavicon(iconUrl) {
    const link = document.querySelector('link[rel="icon"]') || createFaviconLink();
    link.href = `${FAVICON_BASE_PATH}${iconUrl}`;
}

function createFaviconLink() {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    document.head.appendChild(link);
    return link;
}

setFaviconStatus.Default();
