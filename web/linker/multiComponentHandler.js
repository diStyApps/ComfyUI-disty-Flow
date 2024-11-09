

import { updateWorkflowConfig } from './configHandler.js';
import { nodeSelectDisplayComponentForm, updateComponentsList } from './componentHandler.js';

function initializeMultiComponentHandler(state) {
    const createButton = document.getElementById('createMultiComponentButton');
    if (createButton) {
        createButton.addEventListener('click', () => displayMultiComponentForm(state));
    }
}

function displayMultiComponentForm(state, existingMultiComponent = null, multiIndex = null) {
    const nodeToComponentSection = document.getElementById('nodeToComponentSection');
    if (!nodeToComponentSection) return;

    nodeToComponentSection.innerHTML = generateMultiComponentFormHTML(state, existingMultiComponent);
    attachMultiComponentFormEvents(state, existingMultiComponent, multiIndex);
}

function generateMultiComponentFormHTML(state, existingMultiComponent = null) {
    const existingComponentsOptions = generateExistingComponentsOptions(state);

    const multiComponentName = existingMultiComponent ? existingMultiComponent.label : '';
    const buttonText = existingMultiComponent ? 'Update MultiComponent' : 'Save MultiComponent';

    return `
        <h3>${existingMultiComponent ? 'Edit MultiComponent' : 'Create MultiComponent'}</h3>
        <div>
            <label>MultiComponent Group Name:</label>
            <input type="text" id="multiComponentName" value="${multiComponentName}" placeholder="Enter name">
        </div>
        <div>
            <label>Select a Component to Add:</label>
            <select id="existingComponentsSelect">
                <option value="">Select a component...</option>
                ${existingComponentsOptions}
            </select>
            <button id="addComponentToMultiButton">Add to MultiComponent</button>
        </div>
        <div id="multiComponentComponentsList">
            <h3>Components in MultiComponent</h3>
            <!-- Components will be listed here -->
        </div>
        <button id="saveMultiComponentButton">${buttonText}</button>
    `;
}

function generateExistingComponentsOptions(state) {
    const options = [];
    for (const [nodeId, components] of Object.entries(state.assignedComponents)) {
        components.forEach((component, index) => {
            if (!component.inMultiComponent) {
                options.push(
                    `<option value="${nodeId}|${index}">${component.params.label || component.params.id} (Node ID: ${nodeId}, Type: ${component.type})</option>`
                );
            }
        });
    }
    return options.join('');
}

function attachMultiComponentFormEvents(state, existingMultiComponent = null, multiIndex = null) {
    const existingComponentsSelect = document.getElementById('existingComponentsSelect');
    const addComponentButton = document.getElementById('addComponentToMultiButton');
    const componentsListElement = document.getElementById('multiComponentComponentsList');
    const saveMultiComponentButton = document.getElementById('saveMultiComponentButton');
    const multiComponentNameInput = document.getElementById('multiComponentName');

    
    const multiComponent = existingMultiComponent ? { ...existingMultiComponent } : {
        id: `multiComponent${Math.random().toString(36).substring(2, 8)}`,
        label: '',
        components: [],
    };

    if (existingMultiComponent) {
        
        multiComponent.components = existingMultiComponent.components.map(comp => ({
            nodeId: comp.nodeId,
            component: state.assignedComponents[comp.nodeId][comp.index],
            index: comp.index,
        }));
    }

    updateMultiComponentComponentsList(multiComponent, state, multiIndex);
    updateExistingComponentsOptions(state);

    
    addComponentButton.addEventListener('click', () => {
        const selectedValue = existingComponentsSelect.value;
        if (selectedValue) {
            const [nodeId, componentIndex] = selectedValue.split('|');
            const index = parseInt(componentIndex, 10);
            const component = state.assignedComponents[nodeId][index];

            
            component.inMultiComponent = true;
            multiComponent.components.push({ nodeId, component, index });

            updateMultiComponentComponentsList(multiComponent, state, multiIndex);
            updateExistingComponentsOptions(state);
            updateComponentsList(state);
        }
    });

    
    saveMultiComponentButton.addEventListener('click', () => {
        multiComponent.label = multiComponentNameInput.value.trim();
        if (!multiComponent.label) {
            alert('Please enter a name for the MultiComponent.');
            return;
        }

        if (existingMultiComponent && multiIndex !== null) {
            state.multiComponents[multiIndex] = multiComponent;
        } else {
            state.multiComponents.push(multiComponent);
        }

        updateComponentsList(state);
        updateWorkflowConfig(state);
        attachMultiComponentListEventListeners(state);
        clearMultiComponentForm();
    });
}

function updateExistingComponentsOptions(state) {
    const existingComponentsSelect = document.getElementById('existingComponentsSelect');
    if (!existingComponentsSelect) return;
    existingComponentsSelect.innerHTML = `
        <option value="">Select a component...</option>
        ${generateExistingComponentsOptions(state)}
    `;
}

function updateMultiComponentComponentsList(multiComponent, state, multiIndex) {
    const componentsListElement = document.getElementById('multiComponentComponentsList');
    if (!componentsListElement) return;

    componentsListElement.innerHTML = '<h3>Components in MultiComponent</h3>';
    multiComponent.components.forEach(({ nodeId, component, index }, idx) => {
        const componentItem = document.createElement('div');
        componentItem.className = 'component-item';

        componentItem.innerHTML = `
            <div class="component-info">
                <strong>${idx + 1}. ${component.params.label || component.params.id}</strong><br>
                Label: "${component.params.label || ''}"<br>
                Node ID: ${nodeId} | Type: "${component.type}"
            </div>
            <div class="button-group">
                <button data-node-id="${nodeId}" data-component-index="${index}" data-multi-index="${multiIndex}" class="edit-component-button">Edit</button>
                <button data-node-id="${nodeId}" data-component-index="${index}" class="remove-component-button">Remove</button>
                <button data-node-id="${nodeId}" data-component-index="${index}" class="delete-component-button">Delete</button>
            </div>
        `;

        componentsListElement.appendChild(componentItem);
    });

    attachComponentItemEvents(multiComponent, state, multiIndex);
}

function attachComponentItemEvents(multiComponent, state, multiIndex) {
    const editButtons = document.querySelectorAll('#multiComponentComponentsList .edit-component-button');
    const removeButtons = document.querySelectorAll('#multiComponentComponentsList .remove-component-button');
    const deleteButtons = document.querySelectorAll('#multiComponentComponentsList .delete-component-button');

    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const nodeId = button.getAttribute('data-node-id');
            const componentIndex = parseInt(button.getAttribute('data-component-index'), 10);
            const multiIndexAttr = button.getAttribute('data-multi-index');
            const multiIdx = multiIndexAttr !== null && multiIndexAttr !== undefined ? parseInt(multiIndexAttr, 10) : null;
            const component = state.assignedComponents[nodeId][componentIndex];
            const nodeInfo = state.nodeToCustomNodeMap[nodeId];
            
            
            nodeSelectDisplayComponentForm(
                nodeId,
                nodeInfo,
                state,
                component,
                componentIndex,
                'componentsList',
                multiIdx 
            );
        });
    });

    removeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const nodeId = button.getAttribute('data-node-id');
            const componentIndex = parseInt(button.getAttribute('data-component-index'), 10);
            removeComponentFromMultiComponent(multiComponent, nodeId, componentIndex, state);
            updateComponentsList(state);
        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const nodeId = button.getAttribute('data-node-id');
            const componentIndex = parseInt(button.getAttribute('data-component-index'), 10);
            deleteComponentFromMultiComponent(multiComponent, nodeId, componentIndex, state);
            updateComponentsList(state);
        });
    });
}

function removeComponentFromMultiComponent(multiComponent, nodeId, componentIndex, state) {
    multiComponent.components = multiComponent.components.filter(
        item => !(item.nodeId === nodeId && item.index === componentIndex)
    );
    state.assignedComponents[nodeId][componentIndex].inMultiComponent = false;
    updateExistingComponentsOptions(state);
    updateMultiComponentComponentsList(multiComponent, state, null);
    updateComponentsList(state);
}

function deleteComponentFromMultiComponent(multiComponent, nodeId, componentIndex, state) {
    multiComponent.components = multiComponent.components.filter(
        item => !(item.nodeId === nodeId && item.index === componentIndex)
    );
    state.assignedComponents[nodeId].splice(componentIndex, 1);
    if (state.assignedComponents[nodeId].length === 0) delete state.assignedComponents[nodeId];
    updateExistingComponentsOptions(state);
    updateMultiComponentComponentsList(multiComponent, state, null);
    updateWorkflowConfig(state);
    updateComponentsList(state);
}

function deleteMultiComponent(multiIndex, state) {
    const multiComponent = state.multiComponents[multiIndex];

    multiComponent.components.forEach(({ nodeId, index }) => {
        state.assignedComponents[nodeId][index].inMultiComponent = false;
    });

    state.multiComponents.splice(multiIndex, 1);

    updateComponentsList(state);
    updateWorkflowConfig(state);
    attachMultiComponentListEventListeners(state);
}

function attachMultiComponentListEventListeners(state) {
    const componentsListElement = document.getElementById('componentsList');
    if (!componentsListElement) return;

    const editMultiButtons = componentsListElement.querySelectorAll('.edit-multicomponent-button');
    const deleteMultiButtons = componentsListElement.querySelectorAll('.delete-multicomponent-button');

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
}

function clearMultiComponentForm() {
    const nodeToComponentSection = document.getElementById('nodeToComponentSection');
    if (nodeToComponentSection) nodeToComponentSection.innerHTML = '';
}

export { initializeMultiComponentHandler, attachMultiComponentListEventListeners };