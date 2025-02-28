import StateManager from './js/common/scripts/stateManager.js';
import MultiComponent from './js/common/components/MultiComponent.js';
import InputComponent from "./js/common/components/InputComponent.js";
import ToggleComponent from "./js/common/components/ToggleComponent.js";
import DataComponent from "./js/common/components/DataComponent.js";
import Seeder from "./js/common/components/Seeder.js";
import Stepper from "./js/common/components/Stepper.js";
import MultiStepper from "./js/common/components/MultiStepper.js";
import DropdownStepper from "./js/common/components/DropdownStepper.js";
import DimensionSelector from './js/common/components/DimSelector.js';
import Dropdown from './js/common/components/Dropdown.js';
import imageLoaderComp from './js/common/components/imageLoaderComp.js';
import { uuidv4, showSpinner, hideSpinner } from './js/common/components/utils.js';
import { initializeWebSocket } from './js/common/components/messageHandler.js';
import { updateWorkflowValue } from './js/common/components/workflowManager.js';
import { processWorkflowNodes } from './js/common/scripts/nodesscanner.js';
import { fetchWorkflow } from './js/common/scripts/fetchWorkflow.js'; 
import { fetchflowConfig } from './js/common/scripts/fetchflowConfig.js'; 
import { setFaviconStatus } from './js/common/scripts/favicon.js'; 
import { PreferencesManager } from './js/common/scripts/preferences.js';
import { initialize } from './js/common/scripts/interactiveUI.js';
import ThemeManager from './js/common/scripts/ThemeManager.js';
import injectStylesheet from './js/common/scripts/injectStylesheet.js';
import LoraWorkflowManager from './js/common/components/LoraWorkflowManager.js';
import { CanvasLoader } from './js/common/components/canvas/CanvasLoader.js';
import { checkAndShowMissingPackagesDialog } from './js/common/components/missingPackagesDialog.js';
import CanvasComponent from './js/common/components/CanvasComponent.js';
import { store } from  './js/common/scripts/stateManagerMain.js';

(async (window, document, undefined) => {

    const defaultPreferences = {
        selectedCategories: [],
        favoritesFilterActive: false,
        hideDescriptions: false,
        hideTitles: false,
        sortValue: 'nameAsc',
        selectedTheme: null 
    };
    
    const preferencesManager = new PreferencesManager(defaultPreferences);
    ThemeManager.applyInitialTheme(preferencesManager);
    const themeManager = new ThemeManager(preferencesManager);
    themeManager.init();


    function getFlowName() {
        const scripts = document.getElementsByTagName('script');
        for (let script of scripts) {
            if (script.src && script.src.includes('main.js')) {
                try {
                    const url = new URL(script.src, window.location.origin);
                    const flowParam = url.searchParams.get('flow');
                    if (flowParam) {
                        console.log('Flow name from script src:', flowParam);
                        return flowParam;
                    }
                } catch (e) {
                    console.error('Error parsing script src URL:', e);
                }
            }
        }
        const paths = window.location.pathname.split('/').filter(Boolean);
        if (paths[0] === 'flow' && paths[1]) {
            console.log('Flow name:', paths[1]);
            return paths[1];
        }
        console.log('Default flow name: linker');
        return 'linker';
    }

    const flowName = getFlowName();
    const client_id = uuidv4();
    const flowConfig = await fetchflowConfig(flowName);
    let workflow = await fetchWorkflow(flowName);
    let canvasLoader;

    const seeders = [];
    initializeWebSocket(client_id);
    setFaviconStatus.Default();
    injectStylesheet('/core/css/main.css', 'main');
    injectStylesheet('/core/css/themes.css', 'themes-stylesheet');

    console.log("flowConfig", flowConfig);
    console.log("workflow", workflow);


    function generateWorkflowControls(config) {
        const container = document.getElementById('side-workflow-controls');
        if (config.dropdowns && Array.isArray(config.dropdowns)) {
            config.dropdowns.forEach(dropdown => {
                const div = document.createElement('div');
                div.id = dropdown.id;
                div.classList.add('loader');
                container.appendChild(div);
            });
        }
        if (config.steppers && Array.isArray(config.steppers)) {
            config.steppers.forEach(stepper => {
                const div = document.createElement('div');
                div.id = stepper.id;
                div.classList.add('stepper-container');
                container.appendChild(div);
            });
        }

        if (config.dimensionSelectors) {
            config.dimensionSelectors.forEach(selector => {
                const div = document.createElement('div');
                div.id = selector.id;
                div.classList.add('dimension-selector-container');
                container.appendChild(div);
            });
        }
        if (config.inputs && Array.isArray(config.inputs)) {
            config.inputs.forEach(input => {
                const div = document.createElement('div');
                div.id = input.id;
                div.classList.add('input-container');
                container.appendChild(div);
            });
        }

        if (config.toggles && Array.isArray(config.toggles)) {
            config.toggles.forEach(toggle => {
                const div = document.createElement('div');
                div.id = toggle.id;
                div.classList.add('toggle-container');
                container.appendChild(div);
            });
        }

        if (config.seeders && Array.isArray(config.seeders)) {
            config.seeders.forEach(seeder => {
                const div = document.createElement('div');
                div.id = seeder.id;
                div.classList.add('seeder-container');
                container.appendChild(div);
            });
        }
    }

    function setPromptComponents(config, options = { clearInputs: false }) {
        if (!config.prompts || !Array.isArray(config.prompts)) {
            return;
        }
        const promptsContainer = document.getElementById('prompts');
        promptsContainer.innerHTML = ''; // Clear existing content

        config.prompts.forEach((input, index) => {
            const promptWrapper = document.createElement('div');
            promptWrapper.className = 'prompt-wrapper';
    
            const labelDiv = document.createElement('div');
            labelDiv.className = 'title-text';
            labelDiv.textContent = input.label;
    
            const textArea = document.createElement('textarea');
            textArea.id = input.id;
            textArea.rows = 5; // Multiline textarea
            textArea.placeholder = 'Enter multiple prompts, one per line';
            if (options.clearInputs) {
                textArea.value = '';
            } else {
                textArea.value = input.default || generateDynamicScriptDefault(index);
            }

            // Add batch processing toggle
            const batchToggleWrapper = document.createElement('div');
            batchToggleWrapper.className = 'batch-toggle-wrapper';
            const batchToggleLabel = document.createElement('label');
            batchToggleLabel.textContent = 'Batch Process (one image per line)';
            const batchToggle = document.createElement('input');
            batchToggle.type = 'checkbox';
            batchToggle.id = `${input.id}-batch-toggle`;
            batchToggle.checked = false; // Default to single prompt mode
            batchToggleLabel.appendChild(batchToggle);
            batchToggleWrapper.appendChild(batchToggleLabel);

            promptWrapper.appendChild(labelDiv);
            promptWrapper.appendChild(textArea);
            promptWrapper.appendChild(batchToggleWrapper);
            promptsContainer.appendChild(promptWrapper);
        });
    }

    function generateDynamicScriptDefault(index) {
        const defaultsPrompts = [
            'A cartoon cute happy white female goat with purple eyes and a black horn in the jungle',
            'ugly, blur, jpeg artifacts, low quality, lowres, child',
        ];
        return defaultsPrompts[index] || ''; 
    }

    generateWorkflowControls(flowConfig); 
    setPromptComponents(flowConfig, true);

    const loraWorkflowManager = new LoraWorkflowManager(workflow, flowConfig);

    workflow = loraWorkflowManager.getWorkflow();
    
    processWorkflowNodes(workflow).then(({ nodeToCustomNodeMap, uniqueCustomNodesArray, missingNodes, missingCustomPackages }) => {
        console.log("Node to Custom Node Mapping:", nodeToCustomNodeMap);
        console.log("Unique Custom Nodes:", uniqueCustomNodesArray);
        console.log("Missing Nodes:", missingNodes);
        console.log("Missing Custom Packages:", missingCustomPackages);
        checkAndShowMissingPackagesDialog(missingCustomPackages, missingNodes, flowConfig);
    });

    if (flowConfig.dropdowns) {
        flowConfig.dropdowns.forEach(config => {
            new Dropdown(config, workflow);
        });
    }

    if (flowConfig.steppers) {
        flowConfig.steppers.forEach(config => {
            new Stepper(config, workflow);
        });
    }

    if (flowConfig.dimensionSelectors) {
        flowConfig.dimensionSelectors.forEach(config => {
            new DimensionSelector(config, workflow);
        });
    }

    if (flowConfig.inputs) {
        flowConfig.inputs.forEach(config => {
            new InputComponent(config, workflow);
        });
    }

    if (flowConfig.toggles) {
        flowConfig.toggles.forEach(config => {
            new ToggleComponent(config, workflow);
        });
    }

    if (flowConfig.seeders) {
        flowConfig.seeders.forEach(config => {
            const seeder = new Seeder(config, workflow);
            seeders.push(seeder);
        });
    }

    if (flowConfig.multiComponents && Array.isArray(flowConfig.multiComponents)) {
        flowConfig.multiComponents.forEach(config => {
            new MultiComponent(config, workflow);
        });
    }

    if (flowConfig.dataComponents && Array.isArray(flowConfig.dataComponents)) {
        flowConfig.dataComponents.forEach(config => {
            new DataComponent(config, workflow);
        });
    }


    imageLoaderComp(flowConfig, workflow);
    
    const initCanvas = async () => {
        canvasLoader = new CanvasLoader('imageCanvas', flowConfig);
        await canvasLoader.initPromise;
    
        if (canvasLoader.isInitialized) {
            console.log("Canvas initialized successfully.");

            const container = document.getElementById('pluginUIContainer');
            const quickControls = document.getElementById('quick-controls');
            container.append(quickControls);

        } else {
            console.log("Canvas was not initialized due to missing flowConfig fields.");
        }
    };
    
    initCanvas();


    async function queue() {   
        console.log("Queueing new jobs");

        if (canvasLoader && canvasLoader.isInitialized) {
            await CanvasComponent(flowConfig, workflow, canvasLoader);
        } else {
            console.log("Canvas is not initialized. Skipping CanvasComponent.");
        }

        console.log("Queueing workflow:", workflow);        

        if (flowConfig.prompts) {
            flowConfig.prompts.forEach(pathConfig => {
                const { id } = pathConfig;
                const textArea = document.getElementById(id);
                const batchToggle = document.getElementById(`${id}-batch-toggle`);
                if (!textArea) {
                    console.warn(`Textarea not found for ID: ${id}`);
                    return;
                }

                const rawValue = textArea.value.trim();
                if (batchToggle && batchToggle.checked) {
                    // Batch mode: split by lines and queue each as a separate job
                    const prompts = rawValue.split(/\r\n|\n|\r/)
                        .map(line => line.trim())
                        .filter(line => line.length > 0); // Remove empty lines

                    if (prompts.length === 0) {
                        console.warn(`No valid prompts found for ID: ${id}`);
                        return;
        }

                    prompts.forEach((prompt, index) => {
                        const jobWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone
                        updateWorkflowValue(jobWorkflow, id, prompt, flowConfig);
                        const jobId = StateManager.incrementJobId();
                        const job = { id: jobId, workflow: jobWorkflow };
                        StateManager.addJob(job);
                        console.log(`Added batch job ${index + 1}/${prompts.length}. Job ID: ${jobId}, Prompt: "${prompt}"`);
                    });
                } else {
                    // Single mode: treat as one job
                    const singlePrompt = rawValue.replace(/(\r\n|\n|\r)/gm, " ");
                    updateWorkflowValue(workflow, id, singlePrompt, flowConfig);
        const jobId = StateManager.incrementJobId();
        const job = { id: jobId, workflow: { ...workflow } };
        StateManager.addJob(job);
                    console.log(`Added single job. Job ID: ${jobId}, Prompt: "${singlePrompt}"`);
                }
            });
        }

        console.log("Current queue:", StateManager.getJobQueue());
        console.log("queued workflow:", workflow);        
        store.dispatch({
            type: 'SET_QUEUE_RUNNING',
            payload: true
        });
        updateQueueDisplay(StateManager.getJobQueue());
        
        if (!StateManager.isProcessing()) {
            setTimeout(processQueue, 0);
        }
    }

    async function processQueue() {
        store.dispatch({
            type: 'TOGGLE_MASK',
            payload: true
        });



        
        if (StateManager.isProcessing()) return;
        
        if (StateManager.getJobQueue().length === 0) {
            return;
        }

        StateManager.setProcessing(true);

        const job = StateManager.getNextJob();
        console.log(`Processing job ${job.id}`);
        try {
            await queue_prompt(job.workflow);
        } catch (error) {
            console.error(`Error processing job ${job.id}:`, error);
            StateManager.removeJob();
            updateQueueDisplay(StateManager.getJobQueue());
            StateManager.setProcessing(false);
            processQueue();
        }
    }

    async function queue_prompt(prompt = {}) {
        showSpinner();
        seeders.forEach(seeder => seeder.generateSeed());
        const data = { 'prompt': prompt, 'client_id': client_id };
        try {
            const response = await fetch('/prompt', {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to process prompt.');
            }
            // const result = await response.json();
        } catch (error) {
            console.error('Error processing prompt:', error);
            throw error;
        } finally {
            // hideSpinner();
        }
    }

    function updateQueueDisplay(jobQueue) {
        const queueDisplay = document.getElementById('queue-display');
        if (!queueDisplay) {
            console.warn('queue-display element not found in the DOM.');
            return;
        }
        if (jobQueue.length > 0) {
           queueDisplay.textContent = `${jobQueue.length}`;

         } else {
            queueDisplay.textContent = '';
        }

        // if (jobQueue.length > 0) {
        //     const jobIds = jobQueue.map(job => job.id).join(', ');
        //     queueDisplay.textContent += ` (Job IDs: ${jobIds})`;
        // }
    }

    async function interrupt() {
        await queue_interrupt();
        if (StateManager.isProcessing()) {
            console.log("Interrupting current job");
        } else if (StateManager.getJobQueue().length > 0) {
            const removedJob = StateManager.getJobQueue().pop();
            console.log(`Removed job from queue. Job ID: ${removedJob.id}`);
            console.log("Remaining queue:", StateManager.getJobQueue());
            updateQueueDisplay(StateManager.getJobQueue());
        } else {
            console.log("No jobs in queue to interrupt.");
        }
    }

    async function queue_interrupt() {
        console.log("Interrupting last job");
        const data = { 'client_id': client_id };
        try {
            showSpinner();
            const response = await fetch('/interrupt', {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to interrupt the process.');
            }
            const result = await response.json();
            console.log('Interrupted:', result);
        } catch (error) {
            console.error('Error during interrupt:', error);
            hideSpinner();
        } finally {
            hideSpinner();
        }
    }

    document.getElementById('generateButton').addEventListener('click', function () {
        queue();
    });
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            if (event.ctrlKey && event.altKey) {
                interrupt();
                event.preventDefault();
                event.stopPropagation();
            }
            else if (event.ctrlKey) {
                queue();
                event.preventDefault();
                event.stopPropagation();
            }
        }
    });
    document.getElementById('interruptButton').addEventListener('click', function () {
        interrupt();
    });

    window.addEventListener('jobCompleted', () => {
        StateManager.removeJob();
        updateQueueDisplay(StateManager.getJobQueue());
        StateManager.setProcessing(false);
        processQueue();
    });

    window.addEventListener('jobInterrupted', () => {
        StateManager.removeJob();
        updateQueueDisplay(StateManager.getJobQueue());
        StateManager.setProcessing(false);
        processQueue();
    });

    document.addEventListener('DOMContentLoaded', () => {
        initialize(false, false, false, false);

        const overlay = document.getElementById('css-loading-overlay');
        overlay.classList.add('fade-out');
    
        overlay.addEventListener('transitionend', () => {
            overlay.style.display = 'none';
        });
    });
   
})(window, document, undefined);

