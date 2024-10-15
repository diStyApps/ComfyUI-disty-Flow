import StepperComponent from './Stepper.js';

class MultiStepper {
    constructor(config, workflow) {
        console.log("config:", config.id);
        this.container = document.getElementById(config.id);

        if (!this.container) {
            console.error("Container not found:", config.id);
            return;
        }
        this.config = config;
        this.workflow = workflow;
        this.steppers = [];
        this.createMultiStepper();
    }

    createMultiStepper() {
        const titleHtml = `<h4 class="multi-stepper-title">${this.config.label}</h4>`;
        this.container.innerHTML = titleHtml;

        this.config.steppers.forEach(stepperConfig => {
            const stepperId = `${this.config.id}-${stepperConfig.id}`;
            console.log("stepperId", stepperId);
            const stepperContainer = document.createElement('div');
            stepperContainer.id = stepperId;
            stepperContainer.className = 'stepper-container';
            this.container.appendChild(stepperContainer);

            const stepperConfigWithDefaults = {
                ...stepperConfig,
                id: stepperId,
                precision: stepperConfig.precision !== undefined ? stepperConfig.precision : 2,
                scaleFactor: stepperConfig.scaleFactor !== undefined ? stepperConfig.scaleFactor : 100
            };

            const stepper = new StepperComponent(stepperConfigWithDefaults, this.workflow);
            this.steppers.push(stepper);
        });
    }

    getAllValues() {
        return this.steppers.map(stepper => ({
            id: stepper.config.id,
            value: stepper.value
        }));
    }
}

export default MultiStepper;
