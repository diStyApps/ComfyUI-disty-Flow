
import { updateWorkflow, getValueFromWorkflow } from './workflowManager.js';

const basePath = window.location.pathname.split('/flow/')[1];

function getFlowConfig() {
    const storedConfig = localStorage.getItem('FlowConfig');
    return storedConfig ? JSON.parse(storedConfig) : {};
}

function setFlowConfig(config) {
    localStorage.setItem('FlowConfig', JSON.stringify(config));
}

export async function populateDropdown(loaderId, items, customLabel, workflowPath, workflow, storeInLocalStorage = true, loadFromWorkflow = true) {
    const container = document.getElementById(loaderId);
    const label = document.createElement('label');
    label.htmlFor = `${loaderId}Dropdown`;
    label.textContent = customLabel;

    const select = document.createElement('select');
    select.id = `${loaderId}Dropdown`;

    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item.replace(/\\\\/g, '\\\\\\\\');
        select.appendChild(option);
    });

    const datalist = document.createElement('datalist');
    datalist.id = `${loaderId}List`;

    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item.replace(/\\\\/g, '\\\\\\\\');
        datalist.appendChild(option);
    });

    container.appendChild(label);
    container.appendChild(select);
    container.appendChild(datalist);

    applyInitialValue();

    select.addEventListener('change', () => {
        updateSelection(select.value);
    });

    select.addEventListener('mousedown', (event) => {
        handleSelectMousedown(event);
    });

    function applyInitialValue() {
        let initialValue = null;
        if (storeInLocalStorage) {
            const flowConfig = getFlowConfig();
            if (flowConfig[basePath]) {
                const config = flowConfig[basePath].find(item => item.id === loaderId);
                if (config) {
                    initialValue = config.value;
                }
            }
        }
        if (loadFromWorkflow && !initialValue) {
            initialValue = getValueFromWorkflow(workflow, workflowPath);
        }
        if (initialValue) {
            if (!items.includes(initialValue)) {
                const option = document.createElement('option');
                option.value = initialValue;
                option.textContent = initialValue;
                select.appendChild(option);
            }
            select.value = initialValue;
            updateSelection(initialValue);
        }
    }

    function updateSelection(value) {
        if (value !== '') {
            updateWorkflow(workflow, workflowPath, value);
            if (storeInLocalStorage) {
                const flowConfig = getFlowConfig();
                if (!flowConfig[basePath]) {
                    flowConfig[basePath] = [];
                }
                const existingConfig = flowConfig[basePath].find(item => item.id === loaderId);
                if (existingConfig) {
                    existingConfig.value = value;
                } else {
                    flowConfig[basePath].push({ id: loaderId, value: value });
                }
                setFlowConfig(flowConfig);
            }
        }
        
        Array.from(select.options).forEach(option => {
            if (items.includes(option.value)) {
                option.style.color = '';
                option.style.backgroundColor = '';
            } else {
                option.style.color = 'white';
                option.style.backgroundColor = '#ff4444';
            }
        });

        select.style.color = items.includes(value) ? '' : 'white';
        select.style.backgroundColor = items.includes(value) ? '' : '#ff4444';
    }

    function handleSelectMousedown(event) {
        if (event.target.tagName === 'SELECT' && !searchInput) {
            event.preventDefault();
            createSearchInput();
        }
    }

    let searchInput = null;

    function createSearchInput() {
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = `${loaderId}Search`;
        searchInput.setAttribute('list', `${loaderId}List`);
        searchInput.style.width = `100%`;

        searchInput.addEventListener('change', () => {
            const selectedOption = Array.from(select.options).find(option => option.value === searchInput.value);
            if (selectedOption) {
                selectedOption.selected = true;
            } else {
                const newOption = document.createElement('option');
                newOption.value = searchInput.value;
                newOption.textContent = searchInput.value;
                select.appendChild(newOption);
                newOption.selected = true;
            }
            updateSelection(searchInput.value);
            finalizeSearchInput();
        });

        searchInput.addEventListener('blur', () => {
            finalizeSearchInput();
        });

        container.insertBefore(searchInput, select);
        select.style.display = 'none';
        searchInput.focus();
    }

    function finalizeSearchInput() {
        if (searchInput) {
            container.removeChild(searchInput);
            searchInput = null;
            select.style.display = 'inline-block';
        }
    }
}
