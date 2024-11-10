import { componentTypes } from '/core/js/common/scripts/componentTypes.js';
function updateWorkflowConfig(state) {
    const workflowConfigElement = document.getElementById('workflowConfig');
    const saveOptionsElement = document.getElementById('saveOptions');
    if (!workflowConfigElement || !saveOptionsElement) return;

    const workflowConfig = buildWorkflowConfig(state);
    const isCompactFormat = isCompactFormatSelected();
    const isLeanFormat = isLeanFormatSelected();
    const indentation = isCompactFormat ? 0 : 2;
    const fullConfigJSON = JSON.stringify(workflowConfig, null, indentation);

    workflowConfigElement.textContent = fullConfigJSON;
    updateDownloadLink(fullConfigJSON, saveOptionsElement);
}

function buildWorkflowConfig(state) {
    const flowNameInput = document.getElementById('flowName');
    const flowDescriptionInput = document.getElementById('flowDescription');

    const workflowConfig = {
        id: state.flowId || "linker",
        name: flowNameInput.value || "linker",
        url: state.flowUrl || "linker",
        description: flowDescriptionInput.value || "Flow linker"
    };
    Object.keys(componentTypes).forEach(type => {
        const pluralType = `${type}s`;
        if (type !== 'multiComponent') {
            workflowConfig[pluralType] = [];
        }
    });

    const multiComponentIndices = new Set();
    state.multiComponents.forEach(multiComponent => {
        multiComponent.components.forEach(({ index }) => {
            multiComponentIndices.add(index);
        });
    });

    state.assignedComponents.forEach(({ nodeId, component }, index) => {
        if (component.inMultiComponent) return;

        const { type, params } = component;
        const fieldName = `${type}s`;

        if (!workflowConfig[fieldName]) return;

        params.id = ensureUniqueComponentId(workflowConfig[fieldName], params.id);
        const componentData = extractComponentData(component, type);

        if (type === 'dimensionSelector') {
            componentData.nodePath = `${nodeId}.inputs`;
        }
        workflowConfig[fieldName].push(componentData);
    });

    if (state.multiComponents && state.multiComponents.length > 0) {
        workflowConfig.multiComponents = state.multiComponents.map(multiComponent => {
            const componentGroups = {};

            multiComponent.components.forEach(({ component, index }) => {
                const { type } = component;
                const componentData = extractComponentData(component, type);

                const fieldName = `${type}s`;

                if (!componentGroups[fieldName]) {
                    componentGroups[fieldName] = [];
                }

                componentGroups[fieldName].push(componentData);
            });

            return {
                id: multiComponent.id,
                label: multiComponent.label,
                ...componentGroups,
            };
        });
    }

    const isLeanFormat = isLeanFormatSelected();     
    if (isLeanFormat) {
        removeEmptyFields(workflowConfig, ['id', 'name', 'url', 'description']);
    }

    return workflowConfig;
}

function generateUniqueHash(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let hash = '';
    for (let i = 0; i < length; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
}

function ensureUniqueComponentId(componentsArray, compId) {
    const existingIds = componentsArray.map(comp => comp.id);
    if (!existingIds.includes(compId)) return compId;

    const uniqueHash = generateUniqueHash();
    const newId = `${compId}_${uniqueHash}`;
    if (existingIds.includes(newId)) {
        return ensureUniqueComponentId(componentsArray, compId);
    }
    return newId;
}

function extractComponentData(component, type) {
    const { params } = component;
    const fieldsToInclude = componentTypes[type].map(param => param.name).concat('nodePath');

    const componentData = {};
    fieldsToInclude.forEach(field => {
        if (params[field] !== undefined && params[field] !== '') {
            componentData[field] = params[field];
        }
    });

    return componentData;
}

function isCompactFormatSelected() {
    const compactFormatCheckbox = document.getElementById('compactFormatCheckbox');
    return compactFormatCheckbox ? compactFormatCheckbox.checked : false;
}

function isLeanFormatSelected() {
    const leanFormatCheckbox = document.getElementById('leanFormatCheckbox');
    return leanFormatCheckbox ? leanFormatCheckbox.checked : false;
}

function removeEmptyFields(config, requiredFields) {
    Object.keys(config).forEach(key => {
        if (requiredFields.includes(key)) return; 
        if (Array.isArray(config[key]) && config[key].length === 0) {
            delete config[key];
        }
    });
}

function updateDownloadLink(content, saveOptionsElement) {
    const jsonDownloadLink = saveOptionsElement.querySelector('.json-download');
    if (!jsonDownloadLink) return;

    if (jsonDownloadLink.href && jsonDownloadLink.href.startsWith('blob:')) {
        URL.revokeObjectURL(jsonDownloadLink.href);
    }

    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    jsonDownloadLink.href = url;
    jsonDownloadLink.download = 'workflowConfig.json';
}

function downloadConfig() {
    const jsonDownloadButton = document.querySelector('.json-download');
    const workflowConfigElement = document.getElementById('workflowConfig');
    
    if (!jsonDownloadButton || !workflowConfigElement) return;
    
    const content = workflowConfigElement.textContent;
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    
    const tempLink = document.createElement('a');
    tempLink.href = URL.createObjectURL(blob);
    tempLink.download = 'workflowConfig.json';
    
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(tempLink.href);
}

function initializeSaveOptions(state) {
    const saveOptionsElement = document.getElementById('saveOptions');
    const workflowConfigElement = document.getElementById('workflowConfig');
    if (!saveOptionsElement || !workflowConfigElement) return;

    
    const formatToggle = document.createElement('div');
    formatToggle.style.display = 'none';

    formatToggle.innerHTML = `
        <label>
            <input type="checkbox" id="compactFormatCheckbox"> Compact Indentation
        </label>
    `;
    formatToggle.querySelector('#compactFormatCheckbox').addEventListener('change', () => updateWorkflowConfig(state));

    
    const leanFormatToggle = document.createElement('div');
    leanFormatToggle.style.display = 'none';
    leanFormatToggle.innerHTML = `
        <label>
            <input type="checkbox" id="leanFormatCheckbox" checked > Lean Format
        </label>
    `;
    leanFormatToggle.querySelector('#leanFormatCheckbox').addEventListener('change', () => updateWorkflowConfig(state));

    
    const PreviewFlowButton = document.createElement('button');
    PreviewFlowButton.textContent = 'Preview';
    PreviewFlowButton.className = 'save-to-server-button';
    PreviewFlowButton.addEventListener('click', () => previewFlow(workflowConfigElement, state));

    const ResetPreviewButton = document.createElement('button');
    ResetPreviewButton.textContent = 'Reset Preview';
    ResetPreviewButton.className = 'reset-preview-button';
    ResetPreviewButton.addEventListener('click', () => resetPreview());

    const createFlowButton = document.createElement('button');
    createFlowButton.textContent = 'Create';
    createFlowButton.className = 'create-flow-button';
    createFlowButton.addEventListener('click', () => createFlow(workflowConfigElement, state));

    const updateFlowButton = document.createElement('button');
    updateFlowButton.textContent = 'Update';
    updateFlowButton.className = 'update-flow-button';
    updateFlowButton.addEventListener('click', () => updateFlow(workflowConfigElement, state));

    const deleteFlowButton = document.createElement('button');
    deleteFlowButton.textContent = 'Delete';
    deleteFlowButton.className = 'delete-flow-button';
    deleteFlowButton.addEventListener('click', () => deleteFlow(workflowConfigElement));

    const jsonDownloadButton = document.createElement('button');
    jsonDownloadButton.textContent = 'Download JSON';
    jsonDownloadButton.className = 'download-button json-download';
    jsonDownloadButton.addEventListener('click', downloadConfig);

    const copyJsonButton = document.createElement('button');
    copyJsonButton.textContent = 'Copy JSON';
    copyJsonButton.className = 'copy-json-button';
    copyJsonButton.addEventListener('click', () => copyJsonToClipboard(workflowConfigElement.textContent));

    
    const copyFlowButton = document.createElement('button');
    copyFlowButton.textContent = 'Copy';
    copyFlowButton.className = 'copy-flow-button';
    copyFlowButton.addEventListener('click', () => copyFlow(state));

    
    saveOptionsElement.append(
        formatToggle,
        leanFormatToggle, 
        PreviewFlowButton,
        ResetPreviewButton,
        createFlowButton,
        updateFlowButton,
        deleteFlowButton,
        // jsonDownloadButton,
        // copyJsonButton,
        copyFlowButton 
    );
}

function generateFlowId() {
    return Math.random().toString(36).substring(2, 7);
}

function toKebabCase(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function generateFlowUrl(flowId, flowName) {
    return `${flowId}-${toKebabCase(flowName)}`;
}

function copyFlow(state) {
    const newFlowId = generateFlowId();
    state.flowId = newFlowId;
    const flowNameInput = document.getElementById('flowName');
    console.log(flowNameInput.value );
    state.flowUrl = generateFlowUrl(state.flowId, flowNameInput.value);
    updateWorkflowConfig(state);
}

async function previewFlow(workflowConfigElement, state) {
    try {
        updateWorkflowConfig(state);
        const config = JSON.parse(workflowConfigElement.textContent);
        const previewConfig = { ...config, id: "linker", url: "linker", name: "Flow linker", description: "Link your workflows."};
        const fileInput = document.getElementById('fileInput');
        const wfFile = fileInput.files[0];

        if (!wfFile || wfFile.type !== 'application/json') {
            alert('Please upload a valid JSON file for the workflow.');
            return;
        }

        const formData = new FormData();
        formData.append('flowConfig', new Blob([JSON.stringify(previewConfig)], { type: 'application/json' }));
        formData.append('wf', wfFile);

        fetch('/api/preview-flow', { method: 'POST', body: formData })
            .then(response => {
                if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
                return response.json();
            })
            .then(response => {
                window.parent.postMessage({ type: 'loadFlow', flowUrl: "linker" }, '*');

            })            
            .catch(() => alert('Failed to save configuration. Please try again.'));
    } catch (error) {
        console.error('Error during preview:', error);
        alert('Invalid configuration. Please check your configuration and try again.');
    }
}

function resetPreview() {
    fetch('/api/reset-preview', { method: 'POST' })
        .then(response => {
            if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
            return response.json();
        })
        .then(data => {
         window.parent.postMessage('refreshflowFrame', '*');
        })
        .catch(error => {
            console.error('Error resetting preview:', error);
            alert('Failed to reset preview. Please try again.');
        });
}

function createFlow(workflowConfigElement, state) {
    console.log('state:', state);
    if (state.thumbnail) {
        console.log('Thumbnail included in workflow config:', workflowConfig.thumbnail);
    }
    try {
        const config = JSON.parse(workflowConfigElement.textContent);
        const fileInput = document.getElementById('fileInput');
        const wfFile = fileInput.files[0];
        
        if (!wfFile || wfFile.type !== 'application/json') {
            alert('Please upload a valid JSON file for the workflow.');
            return;
        }

        const formData = new FormData();
        formData.append('flowConfig', new Blob([JSON.stringify(config)], { type: 'application/json' }));
        formData.append('wf', wfFile);
        formData.append('thumbnail', state.thumbnail);

        fetch('/api/create-flow', { method: 'POST', body: formData })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => { throw new Error(text); });
                }
                return response.json();
            })
            .then(() => {
                alert('Flow created successfully!');
                // resetPreview();
                // window.parent.postMessage('refreshMainFrame', '*');
            })
            .catch(error => alert(`Failed to create flow. ${error.message}`));
    } catch {
        alert('Invalid configuration. Please check your configuration and try again.');
    }
}

function updateFlow(workflowConfigElement, state) {
    if (state.thumbnail) {
        
        console.log('Thumbnail included in workflow config:', workflowConfig.thumbnail);
    }
    try {
        const config = JSON.parse(workflowConfigElement.textContent);
        const flowUrl = config.url;

        if (!flowUrl) {
            alert('Flow URL is missing in the configuration.');
            return;
        }

        const fileInput = document.getElementById('fileInput');
        let wfFile = null;

        if (fileInput.files && fileInput.files.length > 0) {
            wfFile = fileInput.files[0];
        }

        const formData = new FormData();
        formData.append('flowConfig', new Blob([JSON.stringify(config)], { type: 'application/json' }));
        formData.append('thumbnail', state.thumbnail);
        if (wfFile && wfFile.type === 'application/json') {
            formData.append('wf', wfFile);
        }

        fetch('/api/update-flow', { method: 'POST', body: formData })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => { throw new Error(text); });
                }
                return response.json();
            })
            .then(() => {
                // alert('Flow updated successfully!');
                window.parent.postMessage({ type: 'loadFlow', flowUrl: config.url }, '*');
                // fileInput.value = '';
            })
            .catch(error => alert(`Failed to update flow. ${error.message}`));
    } catch (error) {
        alert(`Invalid configuration. ${error.message}`);
    }
}

function deleteFlow(workflowConfigElement) {
    try {
        const config = JSON.parse(workflowConfigElement.textContent);
        const flowUrl = config.url;

        if (!flowUrl) {
            alert('Flow URL is missing in the configuration.');
            return;
        }

        if (!confirm(`Are you sure you want to delete the flow '${flowUrl}'? This action cannot be undone.`)) {
            return;
        }

        fetch(`/api/delete-flow?url=${encodeURIComponent(flowUrl)}`, { method: 'DELETE' })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => { throw new Error(text); });
                }
                return response.json();
            })
            .then(() => {
                alert('Flow deleted successfully!');
                window.parent.postMessage('refreshMainFrame', '*');
            })
            .catch(error => alert(`Failed to delete flow. ${error.message}`));
    } catch (error) {
        alert(`Error deleting flow. ${error.message}`);
    }
}

function copyJsonToClipboard(content) {
    navigator.clipboard.writeText(content).then(() => alert('JSON copied to clipboard.')).catch(() => alert('Failed to copy JSON to clipboard.'));
}

export { updateWorkflowConfig, initializeSaveOptions };
