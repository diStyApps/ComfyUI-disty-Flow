
import Seeder from "./js/common/components/Seeder.js"
import Stepper from "./js/common/components/Stepper.js"
import MultiStepper from "./js/common/components/MultiStepper.js"
import DropdownStepper  from "./js/common/components/DropdownStepper.js"
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
import ThemeManager from './js/common/scripts/ThemeManager.js';
import injectStylesheet from './js/common/scripts/injectStylesheet.js';

import { checkAndShowMissingPackagesDialog } from './js/common/components/missingPackagesDialog.js';

(async (window, document, undefined) => {

    const client_id = uuidv4();
    const flowConfig  = await fetchflowConfig();
    const workflow = await fetchWorkflow();
    const seeders = [];
    let jobQueue = [];
    let currentJobId = 0;
    let isProcessing = false;
    initializeWebSocket(client_id);
    setFaviconStatus.Default();
    injectStylesheet('/core/css/main.css', 'main');
    injectStylesheet('/core/css/themes.css', 'themes-stylesheet');

    console.log("flowConfig",flowConfig)
    console.log("workflow",workflow)
    

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

    function generateWorkflowControls(config) {
        const container = document.getElementById('side-workflow-controls');

        config.dropdowns.forEach(dropdown => {
            const div = document.createElement('div');
            div.id = dropdown.id;
            div.classList.add('loader');
            container.appendChild(div);
        });
    
        config.steppers.forEach(stepper => {
            const div = document.createElement('div');
            div.id = stepper.id;
            div.classList.add('stepper-container');
            container.appendChild(div);
        });

        config.dimensionSelectors.forEach(selector => {
            const div = document.createElement('div');
            div.id = selector.id;
            div.classList.add('dimension-selector-container');
            container.appendChild(div);
        });

        config.seeders.forEach(seeder => {
            const div = document.createElement('div');
            div.id = seeder.id;
            div.classList.add('stepper-container');
            container.appendChild(div);
        });

        config.multiSteppers.forEach(multiStepper => {
            const div = document.createElement('div');
            div.id = multiStepper.id;
            div.classList.add('multi-stepper-container');
            container.appendChild(div);
        });

        config.dropdownSteppers.forEach(dropdownStepper => {
            const div = document.createElement('div');
            div.id = dropdownStepper.id;
            div.classList.add('dropdown-stepper-container');
            container.appendChild(div);
        });
    }

    function generateWorkflowInputs(config, options = { clearInputs: false }) {
        const promptsContainer = document.getElementById('prompts');
        config.workflowInputs.forEach((input, index) => {
            const titleDiv = document.createElement('div');
            titleDiv.id = 'title';
    
            const labelDiv = document.createElement('div');
            labelDiv.id = 'title-text';
            labelDiv.textContent = input.label;
    
            const textArea = document.createElement('textarea');
            textArea.id = input.id;
    
            if (options.clearInputs) {
                textArea.value = '';
            } else {
                textArea.value = input.default || generateDynamicScriptDefault(index);
            }
            titleDiv.appendChild(labelDiv);
            titleDiv.appendChild(textArea);
            promptsContainer.appendChild(titleDiv);
        });
    }
    
    function generateDynamicScriptDefault(index) {
        const defaultsPrompts = [
            'A cartoon happy goat with purple eyes and a black horn in the jungle',
            'ugly, blur, jpeg artifacts, low quality, lowres, child',
        ];
        return defaultsPrompts[index] || ''; 
    }
    
    generateWorkflowControls(flowConfig); 
    generateWorkflowInputs(flowConfig);

    processWorkflowNodes(workflow).then(({ nodeToCustomNodeMap, uniqueCustomNodesArray, missingNodes, missingCustomPackages }) => {
        console.log("Node to Custom Node Mapping:", nodeToCustomNodeMap);
        console.log("Unique Custom Nodes:", uniqueCustomNodesArray);
        console.log("Missing Nodes:", missingNodes);
        console.log("Missing Custom Packages:", missingCustomPackages);
        checkAndShowMissingPackagesDialog(missingCustomPackages, missingNodes,flowConfig);
    });

    
    flowConfig.dimensionSelectors.forEach(config => {
        new DimensionSelector(config, workflow);
    });

    flowConfig.seeders.forEach(config => {
        const seeder = new Seeder(config, workflow);
        seeders.push(seeder);
    });

    flowConfig.steppers.forEach(config => {
        new Stepper(config, workflow);
    });

    flowConfig.dropdowns.forEach(config => {
        new Dropdown(config, workflow);
    });

    flowConfig.multiSteppers.forEach(config => {
        new MultiStepper(config, workflow);
    });

    flowConfig.dropdownSteppers.forEach(config => {
        new DropdownStepper(config, workflow);
    });
    
    imageLoaderComp(flowConfig,workflow);

    async function queue() {
        flowConfig.workflowInputs.forEach(pathConfig => {
            const { id } = pathConfig;
            const element = document.getElementById(id.toLowerCase());
            if (element) {
                const value = element.value.replace(/(\r\n|\n|\r)/gm, " ");
                updateWorkflowValue(workflow, id, value, flowConfig);
                console.log("queued workflow",workflow)

            } else {
                console.warn(`Element not found for ID: ${id}`);
            }
        });
        
        const jobId = ++currentJobId;
        const job = { id: jobId, workflow: {...workflow} };
        jobQueue.push(job);
        console.log(`Added job to queue. Job ID: ${jobId}`);
        console.log("Current queue:", jobQueue);
        // const queueCountElement = document.getElementById('queue-display');
        // queueCountElement.textContent = jobId
        if (!isProcessing) {
            processQueue();
        }
    }
    
    async function processQueue() {
        if (isProcessing) return;
        
        isProcessing = true;
        while (jobQueue.length > 0) {
            const job = jobQueue[0];
            console.log(`Processing job ${job.id}`);
            try {
                await queue_prompt(job.workflow);
            } catch (error) {
                console.error(`Error processing job ${job.id}:`, error);
            }
            jobQueue.shift();
        }
        isProcessing = false;
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

        } catch (error) {
            console.error('Error processing prompt:', error);
            throw error;
        }
    }
    
    async function interrupt() {
        if (jobQueue.length > 0) {
            const removedJob = jobQueue.pop();
            console.log(`Removed job from queue. Job ID: ${removedJob.id}`);
            console.log("Remaining queue:", jobQueue);
        } else {
            console.log("No jobs in queue to interrupt.");
        }
        await queue_interrupt();
    }
    
    async function queue_interrupt() {
        showSpinner('Interrupting...');
        const data = { 'client_id': client_id };
        try {
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
        } finally {
            // hideSpinner();
        }
    }
    
    document.getElementById('generateButton').addEventListener('click', function () {
        console.log("Queueing new job");
        queue();
    });
    
    document.getElementById('interruptButton').addEventListener('click', function () {
        console.log("Interrupting last job");
        interrupt();
    });

    document.addEventListener('DOMContentLoaded', () => {
        const overlay = document.getElementById('css-loading-overlay');
        overlay.classList.add('fade-out');
    
        overlay.addEventListener('transitionend', () => {
            overlay.style.display = 'none';
        });
    });
    
})(window, document, undefined);