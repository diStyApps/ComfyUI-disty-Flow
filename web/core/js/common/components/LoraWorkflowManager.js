
import WorkflowNodeAdder from './WorkflowNodeAdder.js';
import DropdownStepper from './DropdownStepper.js';

class LoraWorkflowManager {

    constructor(workflow, flowConfig) {
        this.workflowManager = new WorkflowNodeAdder(workflow);
        this.flowConfig = flowConfig;
        this.container = document.getElementById('side-workflow-controls');
        this.addButton = null;
        this.initializeUI();
    }

    initializeUI() {
        this.addButton = document.createElement('button');
        this.addButton.textContent = '+LoRA';
        this.addButton.classList.add('add-lora-button');
        this.addButton.style.marginBottom = '5px';
        this.container.appendChild(this.addButton);
        this.addButton.addEventListener('click', () => this.handleAddLora());
    }

    handleAddLora() {
        try {
            const modelLoaders = this.workflowManager._findModelLoaders();
            if (modelLoaders.length === 0) {
                throw new Error('No model loader found in the workflow to attach LoRA.');
            }
            const targetModelLoader = modelLoaders[0];
            const newNodeId = this.workflowManager.addLora(targetModelLoader.id);
            const updatedWorkflow = this.workflowManager.getWorkflow();

            const dynamicConfig = this.createDynamicConfig(newNodeId);
            const loraContainer = document.createElement('div');
            loraContainer.id = dynamicConfig.id;
            loraContainer.classList.add('dropdown-stepper-container');
            this.container.appendChild(loraContainer);
            new DropdownStepper(dynamicConfig, updatedWorkflow);

            // console.log(`LoRA node ${newNodeId} added successfully to model loader ${targetModelLoader.id}.`);
        } catch (error) {
            console.error('Error adding LoRA:', error);
            alert(`Failed to add LoRA: ${error.message}`);
        }
    }

    createDynamicConfig(nodeId) {
        return {
            id: `LoraLoader_${nodeId}`,
            label: "LoRA",
            dropdown: {
                url: "LoraLoaderModelOnly",
                key: "lora_name",
                nodePath: `${nodeId}.inputs.lora_name`
            },
            steppers: [
                {
                    id: `lorastrength_${nodeId}`,
                    label: "Strength",
                    minValue: 0,
                    maxValue: 5,
                    step: 0.01,
                    defValue: 1,
                    precision: 2,
                    scaleFactor: 1,
                    container: `lorastrength_container_${nodeId}`,
                    nodePath: `${nodeId}.inputs.strength_model`
                }
            ]
        };
    }
    getWorkflow() {
        return this.workflowManager.getWorkflow();
    }
}

export default LoraWorkflowManager;
