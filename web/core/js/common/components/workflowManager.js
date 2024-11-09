export function updateWorkflowValue(workflow, pathId, value, workflowConfig) {
    const pathConfig = workflowConfig.prompts.find(path => path.id === pathId);

    if (pathConfig) {
        const { nodePath } = pathConfig;
        const [a, b, c] = nodePath.split('.');
        workflow[a][b][c] = value;
    } else {
        console.warn(`Workflow path not found for ID: ${pathId}`);
    }
}

export function getValueFromWorkflow(workflow, nodePath) {
    const pathParts = nodePath.split('.');
    let value = workflow;
    for (const part of pathParts) {
        if (value.hasOwnProperty(part)) {
            value = value[part];
        } else {
            return null;
        }
    }
    return value;
}

export function updateWorkflow(workflow, path, value) {
    const pathParts = path.split(".");
    let target = workflow;
    for (let i = 0; i < pathParts.length - 1; i++) {
        if (!target[pathParts[i]]) {
            target[pathParts[i]] = {};
        }
        target = target[pathParts[i]];
    }
    target[pathParts[pathParts.length - 1]] = value;
}