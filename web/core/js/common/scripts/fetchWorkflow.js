import { loadWorkflow } from './workflowLoader.js';

export async function fetchWorkflow() {
    try {
        const paths = window.location.pathname.split('/').filter(Boolean);
        if (paths[0] === 'flow' && paths[1]) {
            const wfpath_url = `/flow/${paths[1]}/wf.json?cacheFlow=${new Date().getTime()}`;
            const workflow = await loadWorkflow(wfpath_url);
            return workflow;
        } else {
            throw new Error('Invalid path: Expected /flow/{name}');
        }
    } catch (error) {
        console.error('Failed to load wf.json:', error);
        throw error;
    }
}
