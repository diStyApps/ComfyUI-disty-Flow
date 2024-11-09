
import { nodeSelectDisplayComponentForm } from './componentHandler.js';

function displayNodes(state) {
    const nodeDropdown = document.getElementById('nodeDropdown');
    if (!nodeDropdown) {
        console.error('Node dropdown element not found.');
        return;
    }

    clearElementChildren(nodeDropdown);

    const nodeEntries = Object.entries(state.nodeToCustomNodeMap);
    if (nodeEntries.length === 0) {
        alert('Upload a valid workflow in API format.');
        console.warn('No nodes available to display.');
        return;
    }

    nodeEntries.forEach(([nodeId, nodeInfo], index) => {
        const option = createNodeOption(nodeId, nodeInfo, index + 1);
        nodeDropdown.appendChild(option);
    });

    
    nodeDropdown.removeEventListener('change', handleNodeDropdownChange); 
    nodeDropdown.addEventListener('change', (event) => handleNodeDropdownChange(event, state));

    selectFirstNodeOption(nodeDropdown);
}

function handleNodeDropdownChange(event, state) {
    const selectedNodeId = event.target.value;
    const selectedNodeInfo = state.nodeToCustomNodeMap[selectedNodeId];

    if (selectedNodeId && selectedNodeInfo) {
        
        displayNodeInfo(selectedNodeId, selectedNodeInfo, state);
        
        
        nodeSelectDisplayComponentForm(selectedNodeId, selectedNodeInfo, state);
    } else {
        console.error(`No information found for node ID: ${selectedNodeId}`);
    }
}

function displayNodeInfo(nodeId, nodeInfo, state) {
    const nodeInfoElement = document.getElementById('nodeInfo');
    const nodeInfoExtraElement = document.getElementById('nodeInfo-extra');

    if (!nodeInfoElement) {
        console.error('Node info element not found.');
        return;
    }
    
    if (!nodeInfoExtraElement) {
        console.error('Node info extra element not found.');
        return;
    }

    nodeInfoElement.innerHTML = generateNodeInfoHTML(nodeId, nodeInfo);
    nodeInfoExtraElement.innerHTML = generateNodeInfoExtraHTML(nodeId, nodeInfo);
}

function createNodeOption(nodeId, nodeInfo, index) {
    const option = document.createElement('option');
    option.value = nodeId;
    option.textContent = `Node ${index}: ${nodeId} (${nodeInfo.classType})`;
    return option;
}

function clearElementChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function selectFirstNodeOption(nodeDropdown) {
    if (nodeDropdown.options.length > 0) {
        nodeDropdown.selectedIndex = 0;
        nodeDropdown.dispatchEvent(new Event('change'));
    }
}

function generateNodeInfoHTML(nodeId, nodeInfo) {
    const { classType, pythonModule = 'N/A', count = 0, inputPaths = {} } = nodeInfo;

    const inputsHTML = Object.entries(inputPaths)
        .map(([name, path]) => `<li>${name}: ${path}</li>`)
        .join('');
    return `
            `;
}

function generateNodeInfoExtraHTML(nodeId, nodeInfo) {
    const { classType, pythonModule = 'N/A', count = 0, inputPaths = {} } = nodeInfo;

    const inputsHTML = Object.entries(inputPaths)
        .map(([name, path]) => `<li>${name}: ${path}</li>`)
        .join('');

        return `
        <div class="node-info-box">
            <h3>Node Info</h3>
            <p><strong>Node ID:</strong> ${nodeId}</p>
            <p><strong>Type:</strong> ${classType}</p>
            <p><strong>Module:</strong> ${pythonModule}</p>
            <p><strong>Count:</strong> ${count}</p>
            </div>
            <p><strong>Inputs:</strong></p>
            <ul>${inputsHTML}</ul>
            `;
}

export { displayNodes, displayNodeInfo };
