import { displayWorkflowFormat } from './workflowHandler.js';
import { displayNodes } from './nodeHandler.js';
import { updateWorkflowConfig } from './configHandler.js';
import { updateComponentsList } from './componentHandler.js';
import { attachMultiComponentListEventListeners } from './multiComponentHandler.js';

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(new Error(`Failed to read the file: ${e.target.error.message}`));
        reader.readAsText(file);
    });
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(new Error(`Failed to read the file: ${e.target.error.message}`));
        reader.readAsDataURL(file);
    });
}

function parseJson(jsonString) {
    const data = JSON.parse(jsonString);
    if (data === null || Array.isArray(data) || typeof data !== 'object') {
        throw new Error('Parsed data is not a valid object.');
    }
    return data;
}

function processWorkflowData(workflowData) {
    const nodeToCustomNodeMap = {};

    for (const [nodeId, nodeData] of Object.entries(workflowData)) {
        if (nodeData && nodeData.class_type) {
            const inputPaths = {};

            for (const inputName of Object.keys(nodeData.inputs || {})) {
                inputPaths[inputName] = `${nodeId}.inputs.${inputName}`;
            }

            nodeToCustomNodeMap[nodeId] = {
                classType: nodeData.class_type,
                count: nodeData.count || 1,
                inputPaths,
                inputs: nodeData.inputs || {}, 
            };
        }
    }

    return nodeToCustomNodeMap;
}

function handleThumbnailUpload(file, state) {
    if (!file) {
        state.thumbnail = null;
        document.getElementById('thumbnailImage').src = '/core/media/ui/drop_image_rect_no_border_trans.png';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        state.thumbnail = e.target.result; 
        const thumbnailImage = document.getElementById('thumbnailImage');
        if (thumbnailImage) {
            thumbnailImage.src = e.target.result;
        }
    };

    reader.onerror = function(e) {
        console.error('Error reading thumbnail file:', e);
        alert('Failed to load thumbnail image. Please try again.');
    };

    reader.readAsDataURL(file);
}

async function handleFileUpload(event, state, displayNodes) {
    try {
        const file = event.target.files[0];
        if (!file) throw new Error('No file selected.');

        const fileContents = await readFileAsText(file);
        const workflowData = parseJson(fileContents);

        displayWorkflowFormat();

        const nodeMap = processWorkflowData(workflowData);
        state.nodeToCustomNodeMap = nodeMap;

        displayNodes(state);
    } catch (error) {
        console.error('Error processing uploaded file:', error);
    }
}

async function handleFlowConfigLoad(event, state) {
    try {
        const file = event.target.files[0];
        if (!file) throw new Error('No flowConfig.json file selected.');

        const fileContents = await readFileAsText(file);
        const flowConfig = parseJson(fileContents);

        state.flowId = flowConfig.id || '';
        state.flowUrl = flowConfig.url || '';
        const flowNameInput = document.getElementById('flowName');
        const flowDescriptionInput = document.getElementById('flowDescription');
        if (flowNameInput) flowNameInput.value = flowConfig.name || '';
        if (flowDescriptionInput) flowDescriptionInput.value = flowConfig.description || '';

        resetComponentCounters(state, flowConfig);
        populateAssignedComponents(state, flowConfig);

        updateComponentsList(state);
        updateWorkflowConfig(state);
    } catch (error) {
        console.error('Error loading flowConfig.json:', error);
    }
}

async function handleUrlLoad(event, state, displayNodes) {
    try {
        const urlInput = document.getElementById('urlInput');
        if (!urlInput) return;
        const flowUrl = urlInput.value.trim();
        if (!flowUrl) {
            alert('Please enter a valid URL.');
            return;
        }
        const cacheBuster = `?t=${Date.now()}`;

        
        const wfResponse = await fetch(`/flow/${encodeURIComponent(flowUrl)}/wf.json${cacheBuster}`);
        if (!wfResponse.ok) {
            alert(`Failed to load wf.json from /flow/${flowUrl}/wf.json`);
            return;
        }
        const wfJson = await wfResponse.json();
        
        
        const wfBlob = new Blob([JSON.stringify(wfJson)], { type: 'application/json' });
        const wfFile = new File([wfBlob], 'wf.json', { type: 'application/json' });

        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(wfFile);

        
        const fileInput = document.querySelector('input[type="file"]'); 
        if (fileInput) {
            fileInput.files = dataTransfer.files;
        }
        
        const nodeMap = processWorkflowData(wfJson);
        state.nodeToCustomNodeMap = nodeMap;


        displayWorkflowFormat();
        displayNodes(state);

        
        const flowConfigResponse = await fetch(`/flow/${encodeURIComponent(flowUrl)}/flowConfig.json${cacheBuster}`);
        if (!flowConfigResponse.ok) {
            alert(`Failed to load flowConfig.json from /flow/${flowUrl}/flowConfig.json`);
            return;
        }
        const flowConfig = await flowConfigResponse.json();

        state.flowId = flowConfig.id || '';
        state.flowUrl = flowConfig.url || '';
        const flowNameInput = document.getElementById('flowName');
        const flowDescriptionInput = document.getElementById('flowDescription');
        if (flowNameInput) flowNameInput.value = flowConfig.name || '';
        if (flowDescriptionInput) flowDescriptionInput.value = flowConfig.description || '';

        resetComponentCounters(state, flowConfig);
        populateAssignedComponents(state, flowConfig);

        updateComponentsList(state);
        updateWorkflowConfig(state);

        
        await loadThumbnailFromFlowUrl(flowUrl, state);

        
        window.parent.postMessage({ type: 'loadFlow', flowUrl: flowUrl }, '*');

    } catch (error) {
        console.error('Error loading flow from URL:', error);
        alert('Error loading flow from URL. Please check the console for details.');
    }
}

async function loadThumbnailFromFlowUrl(flowUrl, state) {
    const thumbnailPath = `/flow/${encodeURIComponent(flowUrl)}/media/thumbnail.jpg`;

    try {
        const response = await fetch(thumbnailPath, { cache: 'no-cache' });
        if (!response.ok) {
            console.warn(`Thumbnail not found at ${thumbnailPath}. Using default placeholder.`);
            return;
        }

        const blob = await response.blob();
        const dataUrl = await readBlobAsDataURL(blob);
        state.thumbnail = dataUrl;
        const thumbnailImage = document.getElementById('thumbnailImage');
        if (thumbnailImage) {
            thumbnailImage.src = dataUrl;
        }
    } catch (error) {
        console.error('Error loading thumbnail from URL:', error);
        
    }
}

function readBlobAsDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function(e) {
            reject(new Error('Failed to convert blob to Data URL.'));
        };
        reader.readAsDataURL(blob);
    });
}

function resetComponentCounters(state, flowConfig) {
    state.componentCounters = {};

    for (const [componentTypePlural, components] of Object.entries(flowConfig)) {
        if (['id', 'name', 'url', 'description', 'multiComponents'].includes(componentTypePlural)) continue;

        if (Array.isArray(components)) {
            const singularType = componentTypePlural.slice(0, -1);
            state.componentCounters[singularType] = components.length > 0 ? components.length + 1 : 1;
        }
    }
}

function populateAssignedComponents(state, flowConfig) {
    state.assignedComponents = [];
    state.multiComponents = []; 

    
    for (const [componentTypePlural, components] of Object.entries(flowConfig)) {
        if (['id', 'name', 'url', 'description', 'multiComponents'].includes(componentTypePlural)) continue;

        if (Array.isArray(components)) {
            const singularType = componentTypePlural.slice(0, -1);
            components.forEach(component => {
                const { id, label, nodePath, ...otherParams } = component;
                if (!nodePath) return;

                const nodeId = getNodeIdFromNodePath(nodePath);
                if (!nodeId) return;

                state.assignedComponents.push({
                    nodeId,
                    component: { type: singularType, params: { id, label: label || '', nodePath, ...otherParams }, inMultiComponent: false },
                });
            });
        }
    }

    
    if (Array.isArray(flowConfig.multiComponents)) {
        flowConfig.multiComponents.forEach(multiComponent => {
            const components = [];

            for (const [componentTypePlural, compData] of Object.entries(multiComponent)) {
                if (['id', 'label'].includes(componentTypePlural)) continue;

                const singularType = componentTypePlural.slice(0, -1);

                if (Array.isArray(compData)) {
                    compData.forEach(component => {
                        addComponentToState(state, component, singularType, true);
                        const result = findComponentInState(state, component.id, component.nodePath);
                        if (result) {
                            const { nodeId, component: assignedComponent, index } = result;
                            components.push({ nodeId, component: assignedComponent, index });
                        }
                    });
                } else if (typeof compData === 'object' && compData !== null) {
                    addComponentToState(state, compData, singularType, true);
                    const result = findComponentInState(state, compData.id, compData.nodePath);
                    if (result) {
                        const { nodeId, component: assignedComponent, index } = result;
                        components.push({ nodeId, component: assignedComponent, index });
                    }
                }
            }

            state.multiComponents.push({
                id: multiComponent.id,
                label: multiComponent.label,
                components,
            });
        });
    }

    attachMultiComponentListEventListeners(state);
}

function getNodeIdFromNodePath(nodePath) {
    const match = nodePath.match(/^(\d+)\./);
    return match ? match[1] : null;
}

function addComponentToState(state, componentData, singularType, inMultiComponent) {
    const { id, label, nodePath, ...otherParams } = componentData;
    if (!nodePath) return;

    const nodeId = getNodeIdFromNodePath(nodePath);
    if (!nodeId) return;

    state.assignedComponents.push({
        nodeId,
        component: { type: singularType, params: { id, label: label || '', nodePath, ...otherParams }, inMultiComponent },
    });
}

function findComponentInState(state, componentId, nodePath) {
    const nodeId = getNodeIdFromNodePath(nodePath);
    if (!nodeId) return null;

    const index = state.assignedComponents.findIndex(ac => ac.nodeId === nodeId && ac.component.params.id === componentId);
    if (index === -1) return null;

    const component = state.assignedComponents[index].component;
    return { nodeId, component, index };
}

function initializeFileHandlers(state, displayNodes) {
    const fileInput = document.getElementById('fileInput');
    const flowConfigInput = document.getElementById('flowConfigInput');
    const urlLoadButton = document.getElementById('urlLoadButton');
    const thumbnailInputHidden = document.getElementById('thumbnailInputHidden');
    const thumbnailPreview = document.getElementById('thumbnailPreview');

    if (!fileInput || !flowConfigInput || !urlLoadButton || !thumbnailInputHidden || !thumbnailPreview) return;

    fileInput.addEventListener('change', event => handleFileUpload(event, state, displayNodes));
    flowConfigInput.addEventListener('change', event => handleFlowConfigLoad(event, state));
    urlLoadButton.addEventListener('click', event => handleUrlLoad(event, state, displayNodes));

    
    thumbnailPreview.addEventListener('dragover', event => {
        event.preventDefault();
        thumbnailPreview.classList.add('dragover');
    });

    thumbnailPreview.addEventListener('dragleave', event => {
        event.preventDefault();
        thumbnailPreview.classList.remove('dragover');
    });

    thumbnailPreview.addEventListener('drop', event => {
        event.preventDefault();
        thumbnailPreview.classList.remove('dragover');
        const files = event.dataTransfer.files;
        if (files && files[0]) {
            handleThumbnailUpload(files[0], state);
        }
    });

    
    thumbnailPreview.addEventListener('dblclick', () => {
        thumbnailInputHidden.click();
    });

    
    thumbnailInputHidden.addEventListener('change', event => {
        const file = event.target.files[0];
        if (file) {
            handleThumbnailUpload(file, state);
            
            thumbnailInputHidden.value = '';
        }
    });
}

export { initializeFileHandlers };
