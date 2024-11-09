import Dropdown from './Dropdown.js';
import StepperComponent from './Stepper.js';
import InputComponent from './InputComponent.js';
import ToggleComponent from './ToggleComponent.js';
import Seeder from './Seeder.js';

class MultiComponent {
    constructor(config, workflow) {
        this.config = config;
        this.workflow = workflow;
        this.parentContainer = document.getElementById('side-workflow-controls'); 
        if (!this.parentContainer) {
            console.error("Parent container 'side-workflow-controls' not found.");
            return;
        }
        this.container = null;
        this.childComponents = [];
        this.initializeComponent();
    }

    initializeComponent() {
        
        const htmlString = `
            <div id="${this.config.id}" class="multi-component-container">
                <div class="multi-component-wrapper">
                    ${this.config.label ? `<h4>${this.config.label}</h4>` : ''}
                    <!-- Child components will be inserted here -->
                </div>
            </div>
        `;
        this.parentContainer.insertAdjacentHTML('beforeend', htmlString);
        const wrapper = this.parentContainer.querySelector(`#${this.config.id} .multi-component-wrapper`);
        this.instantiateChildComponents(wrapper);
    }
    
    instantiateChildComponents(wrapper) {
    const componentTypes = ['dropdowns', 'steppers', 'inputs', 'toggles', 'seeders'];

    componentTypes.forEach(type => {
            if (this.config[type] && Array.isArray(this.config[type])) {
                this.config[type].forEach(componentConfig => {
                    const componentContainer = document.createElement('div');
                    componentContainer.id = componentConfig.id;
                    componentContainer.classList.add(`${type.slice(0, -1)}-container`); 
                    wrapper.appendChild(componentContainer);
                    let componentInstance;
                    switch (type) {
                        case 'dropdowns':
                            componentInstance = new Dropdown(componentConfig, this.workflow);
                            break;
                        case 'steppers':
                            componentInstance = new StepperComponent(componentConfig, this.workflow);
                            break;
                        case 'inputs':
                            componentInstance = new InputComponent(componentConfig, this.workflow);
                            break;
                        case 'toggles':
                            componentInstance = new ToggleComponent(componentConfig, this.workflow);
                            break;
                        case 'seeders':
                            componentInstance = new Seeder(componentConfig, this.workflow);
                            break;
                        
                        default:
                            console.error(`Unknown component type: ${type}`);
                    }

                    if (componentInstance) {
                        this.childComponents.push(componentInstance);
                    }
                });
            }
        });
    }
}

export default MultiComponent;
