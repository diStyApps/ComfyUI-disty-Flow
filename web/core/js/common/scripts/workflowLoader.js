export async function loadWorkflow(wfpath) {
    const response = await fetch(wfpath);
    if (!response.ok) {
        throw new Error('Failed to load workflow: ' + response.statusText);
    }
    return await response.json();
}
