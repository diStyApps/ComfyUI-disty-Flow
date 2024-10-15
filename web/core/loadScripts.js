import { coreScriptsPath } from '/core/js/common/scripts/corePath.js';

const config = {
    // basePath: window.location.pathname.split('/')[1],
    scripts: ['/core/main.js'],    
    coreScripts: coreScriptsPath
};

const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
        console.log(`${src} loaded`);
    });
};

const loadCoreScripts = async () => {
    for (const src of config.coreScripts) {
        await loadScript(src);
    }
};

const loadAppScripts = async () => {
    for (const src of config.scripts) {
        await loadScript(src);

    }
};

const init = async () => {
    try {
        await loadCoreScripts();
        await loadAppScripts();
        console.log('All scripts loaded successfully');
    } catch (error) {
        console.error('Error loading scripts:', error);
    }
};

init();
