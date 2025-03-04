import { updateWorkflow, getValueFromWorkflow } from './workflowManager.js';

const path_separator = navigator.platform.startsWith('Win') ? '\\' : '/';

const ADVANCED_WORKFLOW_PATHS = [
    'ckpt_name',
    'vae_name',
    'lora_name',
    'unet_name',
    'clip_name1',
    'clip_name2',
    'clip_name3',
    'pulid_file',
    'swap_model',
    'facedetection',
    'face_restore_model',
];

const DROPDOW_ELM_PREVIEW_WORKFLOW_PATHS = [
    'ckpt_name',
    'lora_name',
    'unet_name',
];

const DISPLAY_MODEL_NAME_ONLY = true;
const basePath = window.location.pathname.split('/flow/')[1];
const DEFAULT_NESTING_TRIGGER_VALUE = 3;
const modelImagePreviews = {};
const DEFAULT_PREVIEW_THUMBNAIL = '/core/media/ui/top-view_30trans.png';
const TOGGLE_STATE_STORAGE_KEY = 'FlowConfigDropdownExpandAllState';

let scrollAnimationEnabled = false;

export function enableScrollAnimation() {
    scrollAnimationEnabled = true;
}

export function disableScrollAnimation() {
    scrollAnimationEnabled = false;
}

function pathToKey(path) {
    return path.replace(/\\/g, '/');
}
function getDisplayName(fullPath) {
    const modelName = fullPath.split(/[\\/]/).pop();
    return modelName;
}
function updateVisibleUI() {
    document.querySelectorAll('.dropdownDialogContainer .dropdownDialogListContainer')
        .forEach(listContainer => applyPreviewImagesToList(listContainer));

    document.querySelectorAll('.drop-down-element').forEach(element => {
        const loaderId = element.getAttribute('data-loader-id');
        if (loaderId && isPreviewWorkflowPath(loaderId)) {
            const selectedValue = element.querySelector('input').value;
            const imgElem = element.querySelector('.dropdownElementPreviewImage');
            if (imgElem && selectedValue) {
                const key = pathToKey(selectedValue);
                if (modelImagePreviews[key]) { 
                    imgElem.src = modelImagePreviews[key];
                }
            }
        }
    });
}

function applyPreviewImagesToList(parentUl) {
    parentUl.querySelectorAll('li.dropdownItemCard').forEach(li => {
        const originalPath = li.getAttribute('data-model-path');
        const key = pathToKey(originalPath);
        const imgElem = li.querySelector('.dropdownCardImage');
        if (imgElem) {
            imgElem.src = modelImagePreviews[key] || DEFAULT_PREVIEW_THUMBNAIL;
        }
    });
}

function getFlowConfig() {
    const storedConfig = localStorage.getItem('FlowConfig');
    return storedConfig ? JSON.parse(storedConfig) : {};
}

function setFlowConfig(config) {
    localStorage.setItem('FlowConfig', JSON.stringify(config));
}

function isAdvancedLayout(workflowPath) {
    if (!workflowPath) return false;
    return ADVANCED_WORKFLOW_PATHS.some(str => workflowPath.includes(str));
}

function isPreviewWorkflowPath(workflowPath) {
    return DROPDOW_ELM_PREVIEW_WORKFLOW_PATHS.some(str => workflowPath.includes(str));
}

function buildNestedStructure(items) {
    const root = {};
    items.forEach(path => {
        const segments = path.split(/[\\/]/);
        let current = root;
        segments.forEach((segment, index) => {
            current[segment] = current[segment] || {};
            if (index === segments.length - 1) {
                current[segment]._isLeaf = true;
            }
            current = current[segment];
        });
    });
    return root;
}

function gatherLeafPaths(nestedBranch, parentPath) {
    const results = [];
    for (const key of Object.keys(nestedBranch)) {
        const val = nestedBranch[key];
        const childPath = parentPath ? `${parentPath}${path_separator}${key}` : key;
        if (val._isLeaf) {
            results.push(childPath);
        } else {
            results.push(...gatherLeafPaths(val, childPath));
        }
    }
    return results;
}

async function fetchThumbnailsForPaths(paths) {
    if (!paths || paths.length === 0) return;

    const needed = [];
    for (const p of paths) {
        const k = pathToKey(p);
        if (!modelImagePreviews[k]) {
            needed.push(p);
        }
    }
    if (needed.length === 0) return;

    const chunkSize = 50;
    for (let i = 0; i < needed.length; i += chunkSize) {
        const slice = needed.slice(i, i + chunkSize);
        await doPostRequestForSlice(slice);
        updateVisibleUI();
    }
}

async function doPostRequestForSlice(pathsSlice) {
    try {
        const payload = { paths: pathsSlice.map(pathToKey) };
        const resp = await fetch('/flow/api/model-previews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!resp.ok) {
            console.warn('Failed chunk post. Status:', resp.status);
            return;
        }
        const data = await resp.json();
        for (const [fwd, b64Url] of Object.entries(data)) {
            modelImagePreviews[fwd] = b64Url;
        }
    } catch (err) {
        console.error('Error in doPostRequestForSlice:', err);
    }
}

function scrollToSelectedItem(listContainer, selectedValue) {
    if (!selectedValue) return;
    const selectedItem = listContainer.querySelector(`li[data-model-path="${selectedValue}"]`);
    if (selectedItem) {
        selectedItem.scrollIntoView({ behavior: scrollAnimationEnabled ? 'smooth' : 'auto', block: 'center' });
        
        if (scrollAnimationEnabled) {
            // Add a temporary highlight effect
            selectedItem.classList.add('selected-item-scroll');
            setTimeout(() => {
                selectedItem.classList.remove('selected-item-scroll');
            }, 1000);
        }
    }
}

function createNestedList(nestedData, parentUl, parentPath, handleSelection, getImageUrl, selectedValue, autoExpand = false) {
    const allKeys = Object.keys(nestedData);
    const folderKeys = allKeys.filter(k => !nestedData[k]._isLeaf);
    const leafKeys = allKeys.filter(k => nestedData[k]._isLeaf);

    folderKeys.forEach(key => {
        const currentPath = parentPath ? `${parentPath}${path_separator}${key}` : key;
        const folderHtml = `
          <li>
            <div class="dropdownFolderCard">
              <div class="dropdownCardTopRow">
                <span class="dropdownFolderIcon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 4H2v16h20V6H12l-2-2z"/>
                  </svg>
                </span>
                <span class="dropdownFolderTitle">${key}</span>
              </div>
              <div class="dropdownFolderPath">${currentPath}</div>
            </div>
            <ul class="dropdownSubList" style="display: none;"></ul>
          </li>
        `;
        parentUl.insertAdjacentHTML('beforeend', folderHtml);

        const li = parentUl.lastElementChild;
        const folderDiv = li.querySelector('.dropdownFolderCard');
        const subUl = li.querySelector('.dropdownSubList');

        if (autoExpand) {
            subUl.style.display = 'block';
            const childPaths = gatherLeafPaths(nestedData[key], currentPath);
            fetchThumbnailsForPaths(childPaths).then(() => {
                applyPreviewImagesToList(subUl);
            });
        }

        folderDiv.addEventListener('click', async e => {
            e.stopPropagation();
            e.preventDefault();
            const hidden = (subUl.style.display === 'none');
            subUl.style.display = hidden ? 'block' : 'none';
            if (hidden) {
                const childPaths = gatherLeafPaths(nestedData[key], currentPath);
                await fetchThumbnailsForPaths(childPaths);
                applyPreviewImagesToList(subUl);
            }
        });

        createNestedList(nestedData[key], subUl, currentPath, handleSelection, getImageUrl, selectedValue, autoExpand);
        
        if (autoExpand && Object.keys(nestedData[key]).length > 0) {
        } else if (selectedValue && selectedValue.startsWith(currentPath)) {
            subUl.style.display = 'block';
        }
    });

    leafKeys.forEach(key => {
        const currentPath = parentPath ? `${parentPath}${path_separator}${key}` : key;
        const mk = pathToKey(currentPath);
        const liHtml = `
          <li class="dropdownItemCard" data-model-path="${currentPath}">
            <div class="dropdownCardTopRow">
              <img class="dropdownCardImage" src="${modelImagePreviews[mk] || getImageUrl(currentPath)}" />
              <span class="dropdownCardTitle">${key}</span>
            </div>
            <div class="dropdownCardSubtext">${currentPath}</div>
          </li>
        `;
        parentUl.insertAdjacentHTML('beforeend', liHtml);

        const li = parentUl.lastElementChild;
        if (selectedValue === currentPath) {
            li.style.backgroundColor = 'var(--color-background-pattern)';
        }
        li.addEventListener('click', () => handleSelection(currentPath));
        addDragAndDropHandlers(li, currentPath);
        addRightClickHandler(li, currentPath);
    });
}

function createFlatList(items, parentUl, handleSelection, getImageUrl, filterTerm = '', selectedValue = null) {
    parentUl.innerHTML = '';
    const visiblePaths = [];

    items.forEach(item => {
        if (!filterTerm || item.toLowerCase().includes(filterTerm.toLowerCase())) {
            visiblePaths.push(item);
            const mk = pathToKey(item);
            const liHtml = `
              <li class="dropdownItemCard" data-model-path="${item}">
                <div class="dropdownCardTopRow">
                  <img class="dropdownCardImage" src="${modelImagePreviews[mk] || getImageUrl(item)}" />
                  <span class="dropdownCardTitle">${item}</span>
                </div>
                <div class="dropdownCardSubtext">${item}</div>
              </li>
            `;
            parentUl.insertAdjacentHTML('beforeend', liHtml);

            const li = parentUl.lastElementChild;
            if (selectedValue === item) {
                li.style.backgroundColor = 'rgba(0,255,0,0.25)';
            }
            li.addEventListener('click', () => handleSelection(item));
            addDragAndDropHandlers(li, item);
            addRightClickHandler(li, item);
        }
    });

    fetchThumbnailsForPaths(visiblePaths).then(() => {
        applyPreviewImagesToList(parentUl);
        scrollToSelectedItem(parentUl, selectedValue);
    });
}

function createLeanList(items, parentUl, handleSelection, filterTerm = '', selectedValue = null, dialogContainer, mousePosition) {
    parentUl.innerHTML = '';
    const visiblePaths = [];

    items.forEach(item => {
        if (!filterTerm || item.toLowerCase().includes(filterTerm.toLowerCase())) {
            visiblePaths.push(item);
            const displayName = DISPLAY_MODEL_NAME_ONLY ? getDisplayName(item) : item;
            const liHtml = `
              <li class="leanListItem" data-model-path="${item}">
                <span>${displayName}</span>
              </li>
            `;
            parentUl.insertAdjacentHTML('beforeend', liHtml);

            const li = parentUl.lastElementChild;
            if (DISPLAY_MODEL_NAME_ONLY) {
                li.querySelector('span').setAttribute('title', item); 
            }

            if (selectedValue !== item) {
                li.addEventListener('mouseover', () => { li.classList.add('leanListItem-hover'); });
                li.addEventListener('mouseout', () => { li.classList.remove('leanListItem-hover'); });
            }

            if (selectedValue === item) {
                li.classList.add('leanListItem-selected');
            }
            li.addEventListener('click', () => handleSelection(item));
            addDragAndDropHandlers(li, item);
            addRightClickHandler(li, item);
        }
    });

    fetchThumbnailsForPaths(visiblePaths).then(() => {
        applyPreviewImagesToList(parentUl);
        scrollToSelectedItem(parentUl, selectedValue);
    });

    if (dialogContainer) {
        const itemCount = items.filter(it => it.toLowerCase().includes(filterTerm.toLowerCase())).length;
        const itemHeight = 40; 
        const maxHeight = 600; 
        const calculatedHeight = Math.min(itemCount * itemHeight + 100, maxHeight); 
        dialogContainer.style.height = `${calculatedHeight}px`;

        dialogContainer.style.width = 'auto';
        dialogContainer.style.maxWidth = '300px'; 

        if (mousePosition) {
            dialogContainer.style.top = `${mousePosition.y}px`;
            dialogContainer.style.left = `${mousePosition.x}px`;
            dialogContainer.style.transform = 'translate(0, 0)'; 
        }
    }
}

function addDragAndDropHandlers(element, originalPath) {
    element.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        element.classList.add('drag-over');
    });
    element.addEventListener('dragleave', () => {
        element.classList.remove('drag-over');
    });
    element.addEventListener('drop', e => {
        e.preventDefault();
        element.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                handleImageFile(file, originalPath);
            } else {
                alert('Please drop a valid image file.');
            }
        }
    });
}

function addRightClickHandler(element, originalPath) {
    element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        closeAnyExistingContextMenu();
        const menuHtml = `
          <div id="modelPreviewContextMenu"
            class="modelPreviewContextMenu"
            style="
                position:absolute;
                left:${e.pageX}px;
                top:${e.pageY}px;
                background-color:var(--color-background-secondary);
                color:var(--color-primary-text);
                padding:10px;
                border: 1px dashed var(--color-border);
                z-index:9999;
            ">
            <div id="setImageOption" class="contextMenuOption">Set Preview Image</div>
            <div id="clearImageOption" class="contextMenuOption">Clear Preview Image</div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', menuHtml);

        const menu = document.getElementById('modelPreviewContextMenu');
        const setImageOption = document.getElementById('setImageOption');
        const clearImageOption = document.getElementById('clearImageOption');

        setImageOption.addEventListener('click', () => {
            openImageSelector(originalPath);
            closeContextMenu();
        });
        clearImageOption.addEventListener('click', () => {
            clearImageSelector(originalPath);
            closeContextMenu();
        });

        menu.addEventListener('mouseleave', closeContextMenu);

        function closeContextMenu() {
            const menuEl = document.getElementById('modelPreviewContextMenu');
            if (menuEl) {
                menuEl.remove();
            }
        }
    });
}

function closeAnyExistingContextMenu() {
    const existingMenu = document.getElementById('modelPreviewContextMenu');
    if (existingMenu) {
        existingMenu.remove();
    }
}

function openImageSelector(originalPath) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file, originalPath);
        } else {
            alert('Please select a valid image file.');
        }
    });

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

async function clearImageSelector(originalPath) {
    try {
        const resp = await fetch(`/flow/api/model-preview?modelPath=${encodeURIComponent(pathToKey(originalPath))}`, {
            method: 'DELETE'
        });
        if (!resp.ok) {
            const txt = await resp.text();
            alert('Error clearing preview: ' + txt);
            return;
        }
        delete modelImagePreviews[pathToKey(originalPath)];

        document.querySelectorAll(`[data-model-path="${originalPath}"] .dropdownCardImage`)
            .forEach(img => { img.src = DEFAULT_PREVIEW_THUMBNAIL; });

        const dropdownElements = document.querySelectorAll('.drop-down-element');
        dropdownElements.forEach(element => {
            const loaderId = element.getAttribute('data-loader-id');
            if (loaderId && isPreviewWorkflowPath(loaderId)) {
                const selectedValue = element.querySelector('input').value;
                if (selectedValue === originalPath) {
                    const imgElem = element.querySelector('.dropdownElementPreviewImage');
                    if (imgElem) {
                        imgElem.src = DEFAULT_PREVIEW_THUMBNAIL;
                    }
                }
            }
        });

        updateVisibleUI();
    } catch (err) {
        console.error('Error clearing preview:', err);
        alert('Error clearing preview: ' + err.message);
    }
}

function handleImageFile(file, originalPath) {
    const reader = new FileReader();
    reader.onload = async function(event) {
        const imageUrl = event.target.result;
        try {
            const payload = {
                modelPath: pathToKey(originalPath),
                base64Data: imageUrl
            };
            const resp = await fetch('/flow/api/model-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(txt);
            }
            setModelImagePreview(originalPath, imageUrl);
            updateVisibleUI();
        } catch (err) {
            console.error('Error uploading preview:', err);
            alert('Error uploading preview: ' + err.message);
        }
    };
    reader.readAsDataURL(file);
}

function setModelImagePreview(originalPath, imageUrl) {
    modelImagePreviews[pathToKey(originalPath)] = imageUrl;
    document.querySelectorAll(`[data-model-path="${originalPath}"] .dropdownCardImage`)
        .forEach(img => { img.src = imageUrl; });

    const dropdownElements = document.querySelectorAll('.drop-down-element');
    dropdownElements.forEach(element => {
        const loaderId = element.getAttribute('data-loader-id');
        if (loaderId && isPreviewWorkflowPath(loaderId)) {
            const selectedValue = element.querySelector('input').value;
            if (selectedValue === originalPath) {
                const imgElem = element.querySelector('.dropdownElementPreviewImage');
                if (imgElem) {
                    imgElem.src = imageUrl;
                }
            }
        }
    });
}

export function populateDropdown(
    loaderId,
    items,
    customLabel,
    workflowPath,
    workflow,
    storeInLocalStorage = true,
    loadFromWorkflow = true
) {
    const container = document.getElementById(loaderId);
    if (!container) return;

    container.innerHTML = '';

    const shouldShowPreview = isPreviewWorkflowPath(workflowPath);

    const clickableHtml = `
        <div class="drop-down-element" data-loader-id="${workflowPath}">
            <label>${customLabel}</label>
            <input type="text" readonly ${DISPLAY_MODEL_NAME_ONLY ? 'title=""' : ''} />
            ${shouldShowPreview ? `<img class="dropdownElementPreviewImage" src="/core/media/ui/plus_icon_n.png" alt="Preview" />` : ''}
        </div>
    `;
    container.insertAdjacentHTML('beforeend', clickableHtml);

    const clickableArea = container.querySelector('.drop-down-element');
    const selectedValueElem = clickableArea.querySelector('input');
    const previewImageElem = clickableArea.querySelector('.dropdownElementPreviewImage');

    let selectedValue = null;
    const advanced = isAdvancedLayout(workflowPath);

    applyInitialValue();
    clickableArea.addEventListener('click', createDialog);


    function validateSelection(value) {
        clickableArea.classList.remove('invalid'); 
        if (value && !items.includes(value)) {
            clickableArea.classList.add('invalid');
            console.warn(`Selected value "${value}" is invalid.`);
        }
    }


    function applyInitialValue() {
        let initialValue = null;
        if (storeInLocalStorage) {
            const flowConfig = getFlowConfig();
            if (flowConfig[basePath]) {
                const flowConfigItem = flowConfig[basePath].find(item => item.id === loaderId);
                if (flowConfigItem) {
                    initialValue = flowConfigItem.value;
                }
            }
        }

        console.log('Initial value:', initialValue);

        if (loadFromWorkflow && !initialValue) {
            initialValue = getValueFromWorkflow(workflow, workflowPath);

            validateSelection(initialValue);

            if (initialValue && !items.includes(initialValue)) {
                console.log('Initial value not inside items:', initialValue);
            }
        }

        if (initialValue && initialValue !== '') {
            setSelection(initialValue);
            if (shouldShowPreview) {
                fetch(`/flow/api/model-preview?modelPath=${encodeURIComponent(initialValue)}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Preview not found');
                        }
                        return response.json();
                    })
                    .then(data => {
                        const previewUrl = data[initialValue];
                        if (previewUrl && previewImageElem) {
                            previewImageElem.src = previewUrl;
                            modelImagePreviews[pathToKey(initialValue)] = previewUrl;
                        }
                    })
                    .catch(err => {
                        console.warn(`No preview found for modelPath: ${initialValue}`);
                        if (previewImageElem) {
                            previewImageElem.src = DEFAULT_PREVIEW_THUMBNAIL;
                        }
                    });
            }
        } else {
            if (shouldShowPreview && previewImageElem) {
                previewImageElem.src = DEFAULT_PREVIEW_THUMBNAIL;
            }
        }
    }


    function setSelection(value) {
        selectedValue = value;
        if (DISPLAY_MODEL_NAME_ONLY) {
            const displayName = getDisplayName(value);
            selectedValueElem.value = displayName;
            selectedValueElem.setAttribute('title', value);
        } else {
            selectedValueElem.value = value;
            selectedValueElem.removeAttribute('title');
        }

        validateSelection(value);

        if (value && value !== '') {
            updateWorkflow(workflow, workflowPath, value);
            if (storeInLocalStorage) {
                const flowConfig = getFlowConfig();
                flowConfig[basePath] = flowConfig[basePath] || [];
                const existingConfig = flowConfig[basePath].find(item => item.id === loaderId);
                if (existingConfig) {
                    existingConfig.value = value;
                } else {
                    flowConfig[basePath].push({ id: loaderId, value });
                }
                setFlowConfig(flowConfig);
            }

            if (shouldShowPreview && previewImageElem) {
                const key = pathToKey(value);
                previewImageElem.src = modelImagePreviews[key] || DEFAULT_PREVIEW_THUMBNAIL;
            }
        } else {
            if (shouldShowPreview && previewImageElem) {
                previewImageElem.src = DEFAULT_PREVIEW_THUMBNAIL;
            }
        }
    }

    let dialogContainer = null;
    let lastMousePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    function createDialog(event) {
        lastMousePosition = { x: event.clientX, y: event.clientY };

        closeAnyExistingDialogs();

        const dialogHtml = `
          <div class="dropdownDialogContainer custom-scrollbar">
            <div class="dropdownDialogTitleBar">
              <div class="dropdownDialogTitleText">${customLabel}</div>
              <button class="dropdownDialogCloseButton">X</button>
            </div>
            <div class="dropdownDialogTopControls">
              <input type="text" placeholder="Search..." class="dropdownDialogSearchInput" />
              <button class="toggleExpandCollapseButton" title="Expand or Collapse All">
                <!-- Inline SVG Icons for Expand All and Collapse All -->
                <svg class="toggleIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <!-- Initial Icon (Expand All) -->
                  <path d="M19 13H5v-2h14v2z"/>
                </svg>
              </button>
              <div class="nestedControls" style="display: none;">
                ${
                    advanced
                    ? `
                    <label class="dropdownDialogCheckboxLabel">
                        <input type="checkbox" checked />Nesting:
                    </label>
                    <span class="dropdownDialogNestingTriggerLabel">Nesting Trigger:</span>
                    <input type="number" value="${DEFAULT_NESTING_TRIGGER_VALUE}" class="dropdownDialogNestingTriggerInput" />
                    `
                    : ''
                }
              </div>
            </div>
            <div class="dropdownDialogScrollableListContainer">
              <ul class="dropdownDialogListContainer"></ul>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', dialogHtml);
        dialogContainer = document.body.lastElementChild;

        const closeButton = dialogContainer.querySelector('.dropdownDialogCloseButton');
        closeButton.addEventListener('click', closeDialog);

        const searchInput = dialogContainer.querySelector('.dropdownDialogSearchInput');
        const toggleButton = dialogContainer.querySelector('.toggleExpandCollapseButton');
        setTimeout(() => searchInput.focus(), 0);
        searchInput.addEventListener('input', onSearchChange);
        toggleButton.addEventListener('click', toggleExpandCollapseAll);

        let nestingCheckbox = null;
        let nestingTriggerInput = null;

        if (advanced) {
            nestingCheckbox = dialogContainer.querySelector('.dropdownDialogCheckboxLabel input[type="checkbox"]');
            nestingCheckbox.addEventListener('change', onSearchChange);
            nestingTriggerInput = dialogContainer.querySelector('.dropdownDialogNestingTriggerInput');
            nestingTriggerInput.addEventListener('input', onSearchChange);
        }

        const listContainer = dialogContainer.querySelector('.dropdownDialogListContainer');

        let isAllExpanded = getToggleState();

        updateToggleButton(toggleButton, isAllExpanded);

        function onSearchChange() {
            const filter = searchInput.value.trim().toLowerCase();
            listContainer.innerHTML = '';

            if (!advanced) {
                createLeanList(items, listContainer, handleSelection, filter, selectedValue, dialogContainer, lastMousePosition);
                dialogContainer.classList.add('leanListMode');

                toggleButton.style.display = 'none';
            } else {
                const useNesting = nestingCheckbox && nestingCheckbox.checked;
                const userTriggerValue = nestingTriggerInput
                    ? parseInt(nestingTriggerInput.value, 10)
                    : DEFAULT_NESTING_TRIGGER_VALUE;
                const dynamicNestingTrigger = userTriggerValue > 0 ? userTriggerValue : DEFAULT_NESTING_TRIGGER_VALUE;
                const filteredItems = items.filter(it => it.toLowerCase().includes(filter));

                if (!useNesting) {
                    createFlatList(filteredItems, listContainer, handleSelection, getImageUrl, filter, selectedValue);
                    dialogContainer.classList.remove('leanListMode');

                    toggleButton.style.display = 'block';
                } else {
                    const doWeNest =
                        filteredItems.length >= dynamicNestingTrigger &&
                        filteredItems.some(i => i.includes('\\') || i.includes('/'));

                    if (!doWeNest) {
                        createFlatList(filteredItems, listContainer, handleSelection, getImageUrl, filter, selectedValue);
                        dialogContainer.classList.remove('leanListMode');

                        toggleButton.style.display = 'block';
                    } else {
                        const nested = buildNestedStructure(filteredItems);
                        createNestedList(nested, listContainer, '', handleSelection, getImageUrl, selectedValue, isAllExpanded);
                        const leaves = gatherLeafPaths(nested, '');
                        fetchThumbnailsForPaths(leaves).then(() => applyPreviewImagesToList(listContainer));
                        dialogContainer.classList.remove('leanListMode');
                        toggleButton.style.display = 'block';
                    }
                }
            }

            scrollToSelectedItem(listContainer, selectedValue);
        }

        function getImageUrl(path) {
            const key = pathToKey(path);
            return modelImagePreviews[key] || DEFAULT_PREVIEW_THUMBNAIL;
        }

        function handleSelection(pathSel) {
            setSelection(pathSel);
            closeDialog();
        }

        function toggleExpandCollapseAll() {
            isAllExpanded = !isAllExpanded;
            setToggleState(isAllExpanded);
            updateToggleButton(toggleButton, isAllExpanded);
            toggleAllFolders(isAllExpanded);
        }

        function updateToggleButton(button, isExpanded) {
            const toggleIcon = button.querySelector('.toggleIcon');
            if (isExpanded) {
                // Collapse All Icon (Minus)
                toggleIcon.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M19 13H5v-2h14v2z"/>
                    </svg>
                `;
                button.title = 'Collapse All';
            } else {
                // Expand All Icon (Plus)
                toggleIcon.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                `;
                button.title = 'Expand All';
            }
        }

        function toggleAllFolders(expand) {
            const allSubLists = dialogContainer.querySelectorAll('ul.dropdownSubList');
            allSubLists.forEach(subUl => {
                subUl.style.display = expand ? 'block' : 'none';
            });
        }

        function getToggleState() {
            const storedState = localStorage.getItem(TOGGLE_STATE_STORAGE_KEY);
            return storedState === 'true';
        }

        function setToggleState(state) {
            localStorage.setItem(TOGGLE_STATE_STORAGE_KEY, state.toString());
        }

        onSearchChange();

        if (dialogContainer.classList.contains('leanListMode')) {
        } else {
            dialogContainer.style.top = '50%';
            dialogContainer.style.left = '50%';
            dialogContainer.style.transform = 'translate(-50%, -50%)';
        }
    }

    function closeDialog() {
        if (dialogContainer && dialogContainer.parentNode) {
            dialogContainer.parentNode.removeChild(dialogContainer);
        }
        dialogContainer = null;
    }

    function closeAnyExistingDialogs() {
        const existingDialogs = document.querySelectorAll('.dropdownDialogContainer');
        existingDialogs.forEach(dialog => dialog.remove());
    }
}
