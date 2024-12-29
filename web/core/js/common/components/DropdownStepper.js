import Dropdown from './Dropdown.js';
import StepperComponent from './Stepper.js';
function fixUrlPathsParam(originalUrl) {
    if (!originalUrl) return originalUrl;

    const idx = originalUrl.indexOf('?paths=');
    if (idx === -1) {
        return originalUrl;
    }

    const baseUrl = originalUrl.slice(0, idx + 7);
    const pathsPart = originalUrl.slice(idx + 7); 
    let decoded = decodeURIComponent(pathsPart);
    const items = decoded.split(',');
    const cleanedItems = items.map(item => {
        return encodeURIComponent(item)
            .replace(/%2F/g, '/');
    });

    const final = cleanedItems.join(',');
    const fixedUrl = baseUrl + final;
    return fixedUrl;
}

class DropdownStepper {
    constructor(config, workflow) {
        this.config = config;
        this.workflow = workflow;
        this.container = document.getElementById(config.id);

        if (!this.container) {
            console.error("Container not found:", config.id);
            return;
        }

        this.createDropdown();
        this.createSteppers();
    }

    createDropdown() {
        const dropdownContainer = document.createElement('div');
        dropdownContainer.id = `${this.config.id}-dropdown`;
        dropdownContainer.className = 'dropdown-container'; 
        this.container.appendChild(dropdownContainer);

        const dropdownConfig = {
            ...this.config.dropdown,
            id: dropdownContainer.id,
            label: this.config.label
        };

        if (dropdownConfig.url) {
            dropdownConfig.url = fixUrlPathsParam(dropdownConfig.url);
        }
        new Dropdown(dropdownConfig, this.workflow);
    }

    createSteppers() {
        this.steppers = [];
        const steppersContainer = document.createElement('div');
        steppersContainer.className = 'steppers-container';
        this.container.appendChild(steppersContainer);

        this.config.steppers.forEach(stepperConfig => {
            const stepperId = `${this.config.id}-${stepperConfig.id}`;
            const stepperContainer = document.createElement('div');
            stepperContainer.id = stepperId;
            stepperContainer.className = 'stepper-container';
            steppersContainer.appendChild(stepperContainer);
            const stepperConfigWithDefaults = {
                ...stepperConfig,
                id: stepperContainer.id,
                precision:
                    stepperConfig.precision !== undefined
                        ? stepperConfig.precision
                        : 2,
                scaleFactor:
                    stepperConfig.scaleFactor !== undefined
                        ? stepperConfig.scaleFactor
                        : Math.pow(
                              10,
                              stepperConfig.precision !== undefined
                                  ? stepperConfig.precision
                                  : 2
                          )
            };

            const stepper = new StepperComponent(stepperConfigWithDefaults, this.workflow);
            this.steppers.push(stepper);
        });
    }
}

export default DropdownStepper;
