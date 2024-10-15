export class ConfigurationLoader {
    constructor() {
        this.basePath = window.location.pathname.split('/flow/')[1];
        this.configPath = `/flow/${this.basePath}/flowConfig.json`;
    }
    async load() {
        try {
            const response = await fetch(this.configPath);
            if (!response.ok) {
                throw new Error(`Failed to load config from ${this.configPath}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading configuration:', error);
            throw error;
        }
    }
}

export class UIUpdater {
    static updateTitle(title) {
        document.title = title;
    }

    static updateHeader(headerText) {
        const headerElement = document.querySelector('header h2');
        if (headerElement) {
            headerElement.textContent = headerText;
        }
    }
}

(async function initApp() {
    try {
        const configLoader = new ConfigurationLoader();
        const config = await configLoader.load();
        UIUpdater.updateTitle(config.name);
        UIUpdater.updateHeader(config.name);
    } catch (error) {
        console.error('Initialization failed:', error);
    }
})();
