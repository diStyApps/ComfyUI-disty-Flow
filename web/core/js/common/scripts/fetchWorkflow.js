import { loadWorkflow } from './workflowLoader.js';

export async function fetchWorkflow(flowName) {
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
        const wfpath_url = `/flow/${encodeURIComponent(flow)}/wf.json${cacheBuster}`;
        const workflow = await loadWorkflow(wfpath_url);
        return workflow;
    } catch (error) {
        console.error('Failed to load wf.json:', error);
        throw error;
    }
}
