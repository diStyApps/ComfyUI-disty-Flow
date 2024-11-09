export async function fetchflowConfig(flowName) {
    try {
        let flow = flowName;
        if (!flow) {
            const paths = window.location.pathname.split('/').filter(Boolean);
            if (paths[0] === 'flow' && paths[1]) {
                flow = paths[1];
            } else {
                throw new Error('Invalid path: Expected /flow/{name}');
            }
        }
        const cacheBuster = `?cacheFlow=${Date.now()}`;
        const jsonPath = `/flow/${encodeURIComponent(flow)}/flowConfig.json${cacheBuster}`;
        const response = await fetch(jsonPath);
        if (!response.ok) {
            throw new Error(`Failed to fetch flowConfig.json for flow '${flow}'. HTTP status: ${response.status}`);
        }
        const flowConfig = await response.json();
        return flowConfig;
    } catch (error) {
        console.error('Failed to load flowConfig.json:', error);
        throw error;
    }
}
