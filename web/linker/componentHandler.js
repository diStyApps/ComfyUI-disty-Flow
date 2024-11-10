import { componentTypes } from '/core/js/common/scripts/componentTypes.js';
import { componentTemplates } from '/core/js/common/scripts/templates.js'; 
import { updateWorkflowConfig } from './configHandler.js';
import { attachMultiComponentListEventListeners } from './multiComponentHandler.js';

function nodeSelectDisplayComponentForm(nodeId, nodeInfo, state, existingComponent = null, componentIndex = null, containerId = 'nodeToComponentSection', multiIndex = null) {
    const section = document.getElementById(containerId);
    if (!section) return;

    section.innerHTML = generateComponentFormHTML(nodeInfo, existingComponent);
    if (existingComponent) displayComponentParams(section, existingComponent.type, existingComponent.params);

    attachComponentFormEvents(section, nodeId, nodeInfo, state, existingComponent, componentIndex, multiIndex);
}

function editDisplayComponentForm(nodeId, nodeInfo, state, existingComponent, componentIndex, containerId = 'componentsList', multiIndex = null) {
    const section = document.getElementById(containerId);
    if (!section) return;

    section.innerHTML = generateEditComponentFormHTML(nodeInfo, existingComponent);
    if (existingComponent) displayComponentParams(section, existingComponent.type, existingComponent.params);

    attachEditComponentFormEvents(section, nodeId, nodeInfo, state, existingComponent, componentIndex, multiIndex);
}

function generateComponentFormHTML(nodeInfo, existingComponent) {
    const componentOptions = generateComponentOptions(existingComponent);
    const inputPathOptions = generateInputPathOptions(nodeInfo, existingComponent);
    const templateOptions = generateTemplateOptions(nodeInfo); 
    console.log('nodeInfo:', nodeInfo);
    return `
        ${nodeInfo.classType ? `<h3>Node Type: ${nodeInfo.classType}</h3>` : ''}

        <h4>Preset Linking</h4>
        <select class="templateSelect">
            <option value="">Select a template</option>
            ${templateOptions}
        </select>

        <h3>Manual Linking</h3>
        <select class="inputPathSelect">
            <option value="">Select an input path</option>
            ${inputPathOptions}
        </select>        
        <select class="componentSelect">
            <option value="">Select a component</option>
            ${componentOptions}
        </select>
        <div class="componentParams"></div>
        <button class="addComponentFormButton">${existingComponent ? 'Update Component' : 'Save Component'}</button>
        <button class="cancelAddComponentFormButton" style="${existingComponent ? '' : 'display: none'}">${existingComponent ? 'Cancel' : ''}</button>
    `;
}

function generateEditComponentFormHTML(nodeInfo, existingComponent) {
    const componentOptions = generateComponentOptions(existingComponent);
    const inputPathOptions = generateInputPathOptions(nodeInfo, existingComponent);
    
    return `
        ${nodeInfo.classType ? `<h3>Node Type: ${nodeInfo.classType}</h3>` : ''}

        <h3>Manual Linking</h3>
        <select class="inputPathSelect">
            <option value="">Select an input path</option>
            ${inputPathOptions}
        </select>        
        <select class="componentSelect">
            <option value="">Select a component</option>
            ${componentOptions}
        </select>
        <div class="componentParams"></div>
        <button class="editComponentFormButton">${existingComponent ? 'Update Component' : 'Save Component'}</button>
        <button class="cancelEditComponentFormButton" style="${existingComponent ? '' : 'display: none'}">${existingComponent ? 'Cancel' : ''}</button>
    `;
}

function generateTemplateOptions(nodeInfo) {
    const nodeClassType = nodeInfo.classType;
    const nodeInputs = nodeInfo.inputs ? Object.keys(nodeInfo.inputs) : [];

    return Object.keys(componentTemplates)
        .filter(templateName => {
            const template = componentTemplates[templateName];

            // Filter out templates not matching the nodeClassType
            if (template.nodeClass && template.nodeClass !== nodeClassType) {
                return false;
            }

            // Ensure all required inputs are present
            let requiredInputs = [];
            if (template.type === 'component') {
                const compTemplate = template.component;
                const inputName = getInputNameFromNodePath(compTemplate.params.nodePath);
                requiredInputs.push(inputName);
            } else if (template.type === 'components' || template.type === 'multiComponent') {
                template.components.forEach(compTemplate => {
                    const inputName = getInputNameFromNodePath(compTemplate.params.nodePath);
                    requiredInputs.push(inputName);
                });
            }

            const missingInputs = requiredInputs.filter(input => !nodeInputs.includes(input));
            if (missingInputs.length > 0) {
                return false;
            }

            return true;
        })
        .map(templateName => `<option value="${templateName}">${templateName}</option>`)
        .join('');
}

function getInputNameFromNodePath(nodePath) {
    const parts = nodePath.split('.');
    return parts[parts.length - 1]; 
}

function generateComponentOptions(existingComponent) {
    return Object.keys(componentTypes)
        .filter(type => type !== 'multiComponent') 
        .map(type => `<option value="${type}" ${existingComponent && existingComponent.type === type ? 'selected' : ''}>${type}</option>`)
        .join('');
}

function generateInputPathOptions(nodeInfo, existingComponent) {
    return Object.entries(nodeInfo.inputPaths || {})
        .map(([name, path]) => `<option value="${path}" ${existingComponent && existingComponent.params.nodePath === path ? 'selected' : ''}>${name}: ${path}</option>`)
        .join('');
}

function attachComponentFormEvents(section, nodeId, nodeInfo, state, existingComponent, componentIndex, multiIndex = null) {
    const componentSelect = section.querySelector('.componentSelect');
    const templateSelect = section.querySelector('.templateSelect');
    const addComponentButton = section.querySelector('.addComponentFormButton');
    const cancelAddComponentButton = section.querySelector('.cancelAddComponentFormButton');
    const inputPathSelect = section.querySelector('.inputPathSelect');
    const componentParams = section.querySelector('.componentParams');

    if (!componentSelect || !addComponentButton || !templateSelect) return;

    componentSelect.addEventListener('change', () => {
        const componentType = componentSelect.value;
        componentType ? displayComponentParams(section, componentType, existingComponent ? existingComponent.params : {}) : clearComponentParams(section);
    });

    templateSelect.addEventListener('change', () => {
        const templateName = templateSelect.value;
        if (templateName) {
            applyTemplate(nodeId, nodeInfo, state, templateName);
            // clearComponentForm(section);
        }
    });

    addComponentButton.addEventListener('click', () => {
        const componentType = componentSelect.value;
        if (!inputPathSelect) return;
        const nodePath = inputPathSelect.value;
        if (componentType && nodePath) {

            console.log('existingComponent:', existingComponent);

            saveComponent(section, nodeId, componentType, nodePath, state, existingComponent, componentIndex, multiIndex);

        } else {
            alert('Please select a component and an input path.');
        }
    });

    
    cancelAddComponentButton.addEventListener('click', () => {
        
        updateComponentsList(state);
        updateWorkflowConfig(state);
    });
}

function attachEditComponentFormEvents(section, nodeId, nodeInfo, state, existingComponent, componentIndex, multiIndex = null) {
    const componentSelect = section.querySelector('.componentSelect');
    const inputPathSelect = section.querySelector('.inputPathSelect');
    const editComponentButton = section.querySelector('.editComponentFormButton');
    const cancelEditComponentButton = section.querySelector('.cancelEditComponentFormButton');
    const componentParams = section.querySelector('.componentParams');

    if (!componentSelect || !editComponentButton) return;

    componentSelect.addEventListener('change', () => {
        const componentType = componentSelect.value;
        componentType ? displayComponentParams(section, componentType, existingComponent ? existingComponent.params : {}) : clearComponentParams(section);
    });

    editComponentButton.addEventListener('click', () => {
        const componentType = componentSelect.value;
        const nodePath = inputPathSelect ? inputPathSelect.value : '';
        if (componentType && nodePath) {

            console.log('existingComponent:', existingComponent);

            saveComponent(section, nodeId, componentType, nodePath, state, existingComponent, componentIndex, multiIndex);

        } else {
            alert('Please select a component and an input path.');
        }
    });

    cancelEditComponentButton.addEventListener('click', () => {
        
        updateComponentsList(state);
        updateWorkflowConfig(state);
    });
}

function applyTemplate(nodeId, nodeInfo, state, templateName) {
    const template = componentTemplates[templateName];
    if (!template) return;

    
    if (template.type === 'component') {
        
        const compTemplate = template.component;
        const params = { ...compTemplate.params };
        params.nodePath = params.nodePath.replace('{nodeId}', nodeId);
        generateComponentId(compTemplate.type, state, params);

        if (compTemplate.type === 'dropdown') {
            enrichDropdownComponentParams(params, state, nodeId);
        }

        updateAssignedComponents(state, nodeId, compTemplate.type, params);
    } else if (template.type === 'components') {
        
        template.components.forEach(compTemplate => {
            const params = { ...compTemplate.params };
            params.nodePath = params.nodePath.replace('{nodeId}', nodeId);
            generateComponentId(compTemplate.type, state, params);

            if (compTemplate.type === 'dropdown') {
                enrichDropdownComponentParams(params, state, nodeId);
            }

            updateAssignedComponents(state, nodeId, compTemplate.type, params);
        });
    } else if (template.type === 'multiComponent') {
        const multiComponent = {
            id: `multiComponent${Math.random().toString(36).substring(2, 8)}`,
            label: template.label || templateName,
            components: [],
        };

        template.components.forEach(compTemplate => {
            const params = { ...compTemplate.params };
            params.nodePath = params.nodePath.replace('{nodeId}', nodeId);
            generateComponentId(compTemplate.type, state, params);

            if (compTemplate.type === 'dropdown') {
                enrichDropdownComponentParams(params, state, nodeId);
            }

            const componentData = {
                type: compTemplate.type,
                params,
                inMultiComponent: true, 
            };

            state.assignedComponents.push({ nodeId, component: componentData });
            const componentIndex = state.assignedComponents.length - 1;

            multiComponent.components.push({
                nodeId,
                component: componentData,
                index: componentIndex,
            });
        });

        state.multiComponents.push(multiComponent);
    }

    updateComponentsList(state);
    updateWorkflowConfig(state);
}

function displayComponentParams(section, componentType, existingParams = {}) {
    const paramsContainer = section.querySelector('.componentParams');
    if (!paramsContainer) return;

    paramsContainer.innerHTML = '<div class="parameter-group"></div>';
    const paramGroup = paramsContainer.querySelector('.parameter-group');

    const parameters = componentTypes[componentType] || [];
    parameters.forEach(param => {
        if (['nodePath', 'id', 'key', 'url'].includes(param.name)) return;
        const value = existingParams[param.name] !== undefined ? existingParams[param.name] : param.value || '';
        paramGroup.appendChild(createParameterInput(param, value));
    });
}

function createParameterInput(param, value = '') {
    const paramElement = document.createElement('div');
    paramElement.className = 'parameter-item';
    let inputField = '';

    if (param.type === 'textarea') {
        inputField = `<textarea class="parameter-input" name="${param.name}">${value}</textarea>`;
    } else if (param.type === 'number') {
        inputField = `<input type="number" class="parameter-input" name="${param.name}" value="${value}"${param.min !== undefined ? ` min="${param.min}"` : ''}${param.max !== undefined ? ` max="${param.max}"` : ''}${param.step !== undefined ? ` step="${param.step}"` : ''}>`;
    } else if (param.type === 'select') {
        inputField = generateSelectInput(param, value);
    } else {
        inputField = `<input type="${param.type}" class="parameter-input" name="${param.name}" value="${value}">`;
    }

    paramElement.innerHTML = `<label class="parameter-label" for="${param.name}">${param.label}</label>${inputField}`;
    return paramElement;
}

function generateSelectInput(param, value) {
    const options = (param.options || []).map(option => `<option value="${option.value}" ${option.value === value ? 'selected' : ''}>${option.label}</option>`).join('');
    return `<select class="parameter-input" name="${param.name}">${options}</select>`;
}

function clearComponentParams(section) {
    const paramsContainer = section.querySelector('.componentParams');
    if (paramsContainer) paramsContainer.innerHTML = '';
}

function saveComponent(section, nodeId, componentType, nodePath, state, existingComponent = null, componentIndex = null, multiIndex = null) {
    const params = collectComponentParams(section, componentType);
    params.nodePath = nodePath;
    generateComponentId(componentType, state, params);

    if (componentType === 'dropdown') {
        enrichDropdownComponentParams(params, state, nodeId);
    }

    if (multiIndex !== null && multiIndex !== undefined) {
        
        const multiComponent = state.multiComponents[multiIndex];
        if (multiComponent) {
            
            const multiComp = multiComponent.components.find(comp => comp.index === componentIndex);
            if (multiComp) {
                multiComp.component = { type: componentType, params };
                updateComponentsList(state);
                updateWorkflowConfig(state);
                clearComponentParams(section);
                return;
            }
        }
    }

    
    updateAssignedComponents(state, nodeId, componentType, params, existingComponent, componentIndex);
    updateComponentsList(state);
    updateWorkflowConfig(state);

    
    if (existingComponent !== null) {
        clearComponentParams(section);
    } else {
        // clearComponentForm();
    }
}

function collectComponentParams(section, componentType) {
    const params = {};
    const parameters = componentTypes[componentType] || [];

    parameters.forEach(param => {
        if (['nodePath', 'id'].includes(param.name)) return;
        const inputElement = section.querySelector(`[name="${param.name}"]`);
        if (inputElement) {
            let value = inputElement.value;
            if (param.type === 'number') value = value !== '' ? Number(value) : null;
            params[param.name] = value;
        }
    });

    return params;
}

function generateComponentId(componentType, state, params) {
    
    const existingIds = getAllComponentIds(state);
    let newId;
    do {
        newId = `${componentType}${Math.random().toString(36).substring(2, 8)}`;
    } while (existingIds.includes(newId));
    params.id = newId;
}

function getAllComponentIds(state) {
    const ids = [];
    state.assignedComponents.forEach(({ component }) => {
        if (component.params && component.params.id) {
            ids.push(component.params.id);
        }
    });
    state.multiComponents.forEach(multiComponent => {
        if (multiComponent.id) ids.push(multiComponent.id);
    });
    return ids;
}

function enrichDropdownComponentParams(params, state, nodeId) {
    const nodeInfo = state.nodeToCustomNodeMap[nodeId];
    const nodeName = nodeInfo.classType;
    const inputName = params.nodePath.split('.').pop();

    if (!params.key) params.key = inputName;
    if (!params.url) params.url = nodeName;
}

function updateAssignedComponents(state, nodeId, componentType, params, existingComponent = null, componentIndex = null) {
    const newComponent = { type: componentType, params };

    if (existingComponent && componentIndex !== null) {
        const assignedCompIndex = state.assignedComponents.findIndex(ac => ac.nodeId === nodeId && ac.component.params.id === existingComponent.params.id);
        if (assignedCompIndex !== -1) {
            state.assignedComponents[assignedCompIndex].component = newComponent;
        }
    } else {
        state.assignedComponents.push({ nodeId, component: newComponent });
    }
}

function updateComponentsList(state) {
    const componentsListElement = document.getElementById('componentsList');
    if (!componentsListElement) return;

    componentsListElement.innerHTML = '<h2>Components List</h2>';

    
    state.multiComponents.forEach((multiComponent, index) => {
        const multiComponentItem = createMultiComponentListItem(multiComponent, index, state);
        componentsListElement.appendChild(multiComponentItem);
    });

    
    state.assignedComponents.forEach((assignedComp, index) => {
        const { nodeId, component } = assignedComp;
        const nodeInfo = state.nodeToCustomNodeMap[nodeId];
        const nodeType = nodeInfo ? nodeInfo.classType : 'Unknown';

        if (component.inMultiComponent) return; 
        const componentItem = createComponentListItem(nodeId, component, index, state);
        componentsListElement.appendChild(componentItem);
    });

    
    attachComponentsListEventListeners(componentsListElement, state);
    attachMultiComponentListEventListeners(state);
}

function createComponentListItem(nodeId, component, index, state) {
    const item = document.createElement('div');
    item.className = 'component-item';

    console.log('state.nodeToCustomNodeMap:', state.nodeToCustomNodeMap);

    const nodeInfo = state.nodeToCustomNodeMap[nodeId];
    const nodeType = nodeInfo ? nodeInfo.classType : 'Unknown';

    item.innerHTML = `
        <p><strong>${component.params.label || component.params.id}</strong></p>
        <p>Node ID: ${nodeId} | Type: ${component.type}</p>
        <p>Node Type: ${nodeType}</p>
        <div class="button-group">
        <button data-index="${index}" class="move-top-button" title="Move to Top">↑↑</button>
        <button data-index="${index}" class="move-up-button" title="Move Up">↑</button>
        <button data-index="${index}" class="move-down-button" title="Move Down">↓</button>
        <button data-index="${index}" class="move-bottom-button" title="Move to Bottom">↓↓</button>
            <button data-index="${index}" class="edit-component-button">Edit</button>
            <button data-index="${index}" class="delete-component-button">Delete</button>
        </div>
    `;

    return item;
}

function createMultiComponentListItem(multiComponent, index, state) {
    const item = document.createElement('div');
    item.className = 'component-item multi-component-item';

    item.innerHTML = `
        <p><strong>MultiComponent: ${multiComponent.label}</strong></p>
        <p>ID: ${multiComponent.id}</p>
        <div class="button-group">
            <button data-multi-index="${index}" class="edit-multicomponent-button">Edit</button>
            <button data-multi-index="${index}" class="delete-multicomponent-button">Delete</button>
            </div>
            `;
            // <button data-multi-index="${index}" class="move-top-multicomponent-button" title="Move MultiComponent to Top">↑↑</button>
            // <button data-multi-index="${index}" class="move-up-multicomponent-button" title="Move MultiComponent Up">↑</button>
            // <button data-multi-index="${index}" class="move-down-multicomponent-button" title="Move MultiComponent Down">↓</button>
            // <button data-multi-index="${index}" class="move-bottom-multicomponent-button" title="Move MultiComponent to Bottom">↓↓</button>

    return item;
}

function attachComponentsListEventListeners(componentsListElement, state) {
    
    const editButtons = componentsListElement.querySelectorAll('.edit-component-button');
    const deleteButtons = componentsListElement.querySelectorAll('.delete-component-button');
    const moveUpButtons = componentsListElement.querySelectorAll('.move-up-button');
    const moveDownButtons = componentsListElement.querySelectorAll('.move-down-button');
    const moveTopButtons = componentsListElement.querySelectorAll('.move-top-button');
    const moveBottomButtons = componentsListElement.querySelectorAll('.move-bottom-button');

    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'), 10);
            const assignedComp = state.assignedComponents[index];
            if (!assignedComp) return;
            const { nodeId, component } = assignedComp;
            const nodeInfo = state.nodeToCustomNodeMap[nodeId];
            // clearComponentForm();

            
            editDisplayComponentForm(nodeId, nodeInfo, state, component, index, 'componentsList');
        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'), 10);
            deleteComponent(index, state);
        });
    });

    moveUpButtons.forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'), 10);
            moveComponentUp(index, state);
        });
    });

    moveDownButtons.forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'), 10);
            moveComponentDown(index, state);
        });
    });

    // Attach event listeners for new Move to Top and Move to Bottom buttons
    moveTopButtons.forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'), 10);
            moveComponentToTop(index, state);
        });
    });

    moveBottomButtons.forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'), 10);
            moveComponentToBottom(index, state);
        });
    });

    
    const editMultiButtons = componentsListElement.querySelectorAll('.edit-multicomponent-button');
    const deleteMultiButtons = componentsListElement.querySelectorAll('.delete-multicomponent-button');
    const moveUpMultiButtons = componentsListElement.querySelectorAll('.move-up-multicomponent-button');
    const moveDownMultiButtons = componentsListElement.querySelectorAll('.move-down-multicomponent-button');
    const moveTopMultiButtons = componentsListElement.querySelectorAll('.move-top-multicomponent-button');
    const moveBottomMultiButtons = componentsListElement.querySelectorAll('.move-bottom-multicomponent-button');

    editMultiButtons.forEach(button => {
        button.addEventListener('click', () => {
            const multiIndex = parseInt(button.getAttribute('data-multi-index'), 10);
            const multiComponent = state.multiComponents[multiIndex];
            displayMultiComponentForm(state, multiComponent, multiIndex);
        });
    });

    deleteMultiButtons.forEach(button => {
        button.addEventListener('click', () => {
            const multiIndex = parseInt(button.getAttribute('data-multi-index'), 10);
            deleteMultiComponent(multiIndex, state);
        });
    });

    moveTopMultiButtons.forEach(button => {
        button.addEventListener('click', () => {
            const multiIndex = parseInt(button.getAttribute('data-multi-index'), 10);
            moveMultiComponentToTop(multiIndex, state);
        });
    });

    moveBottomMultiButtons.forEach(button => {
        button.addEventListener('click', () => {
            const multiIndex = parseInt(button.getAttribute('data-multi-index'), 10);
            moveMultiComponentToBottom(multiIndex, state);
        });
    });
}

function moveComponentUp(index, state) {
    if (index <= 0 || index >= state.assignedComponents.length) return;

    
    [state.assignedComponents[index - 1], state.assignedComponents[index]] =
        [state.assignedComponents[index], state.assignedComponents[index - 1]];

    updateComponentsList(state);
    updateWorkflowConfig(state);
}

function moveComponentDown(index, state) {
    if (index < 0 || index >= state.assignedComponents.length - 1) return;

    
    [state.assignedComponents[index + 1], state.assignedComponents[index]] =
        [state.assignedComponents[index], state.assignedComponents[index + 1]];

    updateComponentsList(state);
    updateWorkflowConfig(state);
}

function moveComponentToTop(index, state) {
    if (index <= 0 || index >= state.assignedComponents.length) return;

    const [component] = state.assignedComponents.splice(index, 1);
    state.assignedComponents.unshift(component);

    updateComponentsList(state);
    updateWorkflowConfig(state);
}

function moveComponentToBottom(index, state) {
    if (index < 0 || index >= state.assignedComponents.length - 1) return;

    const [component] = state.assignedComponents.splice(index, 1);
    state.assignedComponents.push(component);

    updateComponentsList(state);
    updateWorkflowConfig(state);
}

function deleteComponent(index, state) {
    if (state.assignedComponents[index]) {
        if (state.assignedComponents[index].component.inMultiComponent) {
            state.multiComponents.forEach(multiComponent => {
                multiComponent.components = multiComponent.components.filter(comp => comp.index !== index);
            });
        }
        state.assignedComponents.splice(index, 1);
    }
    updateComponentsList(state);
    updateWorkflowConfig(state);
}

function editDisplayMultiComponentForm(multiIndex, multiComponent, state) {
    const container = document.getElementById('componentsList');
    if (!container) return;

    container.innerHTML = generateEditMultiComponentFormHTML(multiComponent);
    if (multiComponent) displayMultiComponentParams(container, multiComponent);

    attachEditMultiComponentFormEvents(container, multiIndex, multiComponent, state);
}

function generateEditMultiComponentFormHTML(multiComponent) {
    return `
        <h3>Edit MultiComponent: ${multiComponent.label}</h3>
        <div class="multi-component-params"></div>
        <button class="updateMultiComponentFormButton">Update MultiComponent</button>
        <button class="cancelUpdateMultiComponentFormButton">Cancel</button>
    `;
}

function displayMultiComponentParams(container, multiComponent) {
    const paramsContainer = container.querySelector('.multi-component-params');
    if (!paramsContainer) return;

    paramsContainer.innerHTML = '<div class="multi-parameter-group"></div>';
    const paramGroup = paramsContainer.querySelector('.multi-parameter-group');

    
    paramGroup.innerHTML = `
        <label for="multiLabel">Label:</label>
        <input type="text" id="multiLabel" name="label" value="${multiComponent.label || ''}">
    `;
}

function attachEditMultiComponentFormEvents(container, multiIndex, multiComponent, state) {
    const updateButton = container.querySelector('.updateMultiComponentFormButton');
    const cancelButton = container.querySelector('.cancelUpdateMultiComponentFormButton');
    const paramsContainer = container.querySelector('.multi-parameter-group');

    if (!updateButton || !cancelButton || !paramsContainer) return;

    updateButton.addEventListener('click', () => {
        const labelInput = paramsContainer.querySelector('input[name="label"]');
        if (labelInput) {
            multiComponent.label = labelInput.value.trim() || `MultiComponent${multiIndex + 1}`;
        }

        updateComponentsList(state);
        updateWorkflowConfig(state);
    });

    cancelButton.addEventListener('click', () => {
        updateComponentsList(state);
        updateWorkflowConfig(state);
    });
}

function moveMultiComponentUp(index, state) {
    if (index <= 0 || index >= state.multiComponents.length) return;

    
    [state.multiComponents[index - 1], state.multiComponents[index]] =
        [state.multiComponents[index], state.multiComponents[index - 1]];

    updateComponentsList(state);
    updateWorkflowConfig(state);
}

function moveMultiComponentDown(index, state) {
    if (index < 0 || index >= state.multiComponents.length - 1) return;

    
    [state.multiComponents[index + 1], state.multiComponents[index]] =
        [state.multiComponents[index], state.multiComponents[index + 1]];

    updateComponentsList(state);
    updateWorkflowConfig(state);
}

function moveMultiComponentToTop(index, state) {
    if (index <= 0 || index >= state.multiComponents.length) return;

    const [multiComponent] = state.multiComponents.splice(index, 1);
    state.multiComponents.unshift(multiComponent);

    updateComponentsList(state);
    updateWorkflowConfig(state);
}

function moveMultiComponentToBottom(index, state) {
    if (index < 0 || index >= state.multiComponents.length - 1) return;

    const [multiComponent] = state.multiComponents.splice(index, 1);
    state.multiComponents.push(multiComponent);

    updateComponentsList(state);
    updateWorkflowConfig(state);
}

function deleteMultiComponent(multiIndex, state) {
    const multiComponent = state.multiComponents[multiIndex];

    multiComponent.components.forEach(({ index }) => {
        if (state.assignedComponents[index]) {
            state.assignedComponents[index].component.inMultiComponent = false;
        }
    });

    state.multiComponents.splice(multiIndex, 1);

    updateComponentsList(state);
    updateWorkflowConfig(state);
    attachMultiComponentListEventListeners(state);
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export { nodeSelectDisplayComponentForm, editDisplayComponentForm, updateComponentsList };
