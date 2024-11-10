import { initializeSaveOptions, updateWorkflowConfig } from './configHandler.js';
import { initializeFileHandlers } from './fileHandler.js';
import { displayNodes, displayNodeInfo } from './nodeHandler.js';
import { initializeMultiComponentHandler } from './multiComponentHandler.js';

const state = {
    nodeToCustomNodeMap: {},
    assignedComponents: [],
    multiComponents: [],
    components: [],
    flowId: '',
    flowName: '',
    flowUrl: '',
    componentCounters: {},
    flowDescription: '',
    thumbnail: null, 
};

function generateFlowId() {
    return Math.random().toString(36).substring(2, 7);
}

function toKebabCase(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function generateFlowUrl(flowId, flowName) {
    return `${flowId}-${toKebabCase(flowName)}`;
}

function initializeApp() {
    const nodeDropdown = document.getElementById('nodeDropdown');
    const nodeInfoElement = document.getElementById('nodeInfo');
    const flowNameInput = document.getElementById('flowName');
    const flowDescriptionInput = document.getElementById('flowDescription');

    if (!nodeDropdown || !nodeInfoElement || !flowNameInput || !flowDescriptionInput) return;

    initializeSaveOptions(state);

    flowNameInput.addEventListener('input', () => {
        state.flowName = flowNameInput.value.trim();
        if (!state.flowName) {
            state.flowId = '';
            state.flowUrl = '';
        } else {
            if (!state.flowId) state.flowId = generateFlowId();
            state.flowUrl = generateFlowUrl(state.flowId, state.flowName);
        }
        updateWorkflowConfig(state);
    });

    flowDescriptionInput.addEventListener('input', () => {
        state.flowDescription = flowDescriptionInput.value.trim();
        updateWorkflowConfig(state);
    });

    initializeFileHandlers(state, displayNodes);

    nodeDropdown.addEventListener('change', function () {
        const nodeId = this.value;
        if (nodeId) {
            const nodeInfo = state.nodeToCustomNodeMap[nodeId];
            displayNodeInfo(nodeId, nodeInfo, state);
        } else {
            nodeInfoElement.innerHTML = '';
        }
    });

    initializeMultiComponentHandler(state);
}

document.addEventListener('DOMContentLoaded', initializeApp);
export { state };
