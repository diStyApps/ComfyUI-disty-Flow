export async function fetchflowConfig() {
    try {
        const paths = window.location.pathname.split('/').filter(Boolean);
        if (paths[0] === 'flow' && paths[1]) {
            const jsonPath = `/flow/${paths[1]}/flowConfig.json?cacheFlow=${new Date().getTime()}`;
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const flowConfig = await response.json();
            return flowConfig;
        } else {
            throw new Error('Invalid path: Expected /flow/{name}');
        }
    } catch (error) {
        console.error('Failed to load flowConfig.json:', error);
        throw error;
    }
}