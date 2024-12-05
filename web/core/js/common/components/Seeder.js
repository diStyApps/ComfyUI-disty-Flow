class Seeder {
    constructor(config, workflow) {
        this.container = document.getElementById(config.id);
        if (!this.container) {
            console.error("Container not found:", config.id);
            return;
        }

        this.config = {
            increment: 1,
            ...config
        };
        this.config.initialSeed = this.config.initialSeed || Math.floor(Math.random() * 1000000000000000);
        this.workflow = workflow;
        this.seedGenerator = this.createSeedGenerator(this.config.initialSeed, this.config.increment);
        this.autoRandomSeed = true;
        this.isPotentialLongPress = false;

        this.buildUI();
        this.initializeUI();
    }

    createSeedGenerator(initialSeed, increment) {
        let currentSeed = initialSeed;
        return {
            next: () => this.modifySeed(currentSeed += increment),
            prev: () => this.modifySeed(currentSeed -= increment),
            setSeed: (newSeed) => this.modifySeed(currentSeed = newSeed),
            reset: () => this.modifySeed(currentSeed = initialSeed)
        };
    }

    modifySeed(newSeed) {
        this.updateExternalConfig(newSeed);
        return newSeed;
    }

    buildUI() {
        const html = `
            <span for="${this.config.id}Input">${this.config.label}</span>
            <input type="text" id="${this.config.id}Input" value="${this.config.initialSeed}">
            <div class="seeder-buttons">
                <button id="${this.config.id}RandomSeedButton" title="Long press will set/disable fixed seed">R</button>
                <button id="${this.config.id}DecrementButton">-</button>
                <button id="${this.config.id}IncrementButton">+</button>
            </div>
        `;
        this.container.innerHTML = html;

        this.inputElement = document.getElementById(`${this.config.id}Input`);
        this.randomSeedButton = document.getElementById(`${this.config.id}RandomSeedButton`);
        this.incrementButton = document.getElementById(`${this.config.id}IncrementButton`);
        this.decrementButton = document.getElementById(`${this.config.id}DecrementButton`);

        if (this.autoRandomSeed) {
            this.randomSeedButton.classList.add('active');
        }

        this.addEventListeners();
    }

    initializeUI() {
        this.inputElement.value = this.seedGenerator.reset();
    }

    addEventListeners() {
        let pressTimer;
        let isLongPress = false;
        const longPressDuration = 150;

        const startPressHandler = (e) => {
            e.preventDefault();
            this.isPotentialLongPress = true;
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                this.toggleAutoRandomSeed();
            }, longPressDuration);
        };

        const endPressHandler = (e) => {
            clearTimeout(pressTimer);
            if (this.isPotentialLongPress && !isLongPress) {
                this.generateRandomSeed();
            }
            this.isPotentialLongPress = false;
        };

        this.randomSeedButton.addEventListener('mousedown', startPressHandler);
        this.randomSeedButton.addEventListener('touchstart', startPressHandler);

        this.randomSeedButton.addEventListener('mouseup', endPressHandler);
        this.randomSeedButton.addEventListener('touchend', endPressHandler);

        this.randomSeedButton.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer);
            this.isPotentialLongPress = false;
        });

        this.incrementButton.addEventListener('click', () => {
            this.inputElement.value = this.seedGenerator.next();
            this.generateSeed();
        });

        this.decrementButton.addEventListener('click', () => {
            this.inputElement.value = this.seedGenerator.prev();
            this.generateSeed();
        });

        this.inputElement.addEventListener('input', () => {
            const value = parseInt(this.inputElement.value.replace(/[^0-9]/g, ''), 10) || 0;
            this.seedGenerator.setSeed(value);
            this.inputElement.value = value;
        });
    }

    toggleAutoRandomSeed() {
        this.autoRandomSeed = !this.autoRandomSeed;
        if (this.autoRandomSeed) {
            this.randomSeedButton.classList.add('active');
        } else {
            this.randomSeedButton.classList.remove('active');
        }
        // console.log(`Auto Random Seed is now ${this.autoRandomSeed ? 'ON' : 'OFF'}`);
    }

    generateRandomSeed() {
        const newSeed = Math.floor(Math.random() * 1000000000000000);
        this.seedGenerator.setSeed(newSeed);
        this.inputElement.value = newSeed;
        // console.log(`Generated new random seed: ${newSeed}`);
    }

    generateSeed() {
        if (this.autoRandomSeed) {
            this.generateRandomSeed();
        }
    }

    updateExternalConfig(newSeed) {
        const path = this.config.nodePath;
        const pathParts = path.split(".");
        let target = this.workflow;
        for (let i = 0; i < pathParts.length - 1; i++) {
            target = target[pathParts[i]] = target[pathParts[i]] || {};
        }
        target[pathParts[pathParts.length - 1]] = newSeed;
    }

    triggerSeedIfAutoRandom() {
        if (this.autoRandomSeed) {
            this.generateRandomSeed();
            this.inputElement.value = this.seedGenerator.setSeed(this.seedGenerator.currentSeed);
        }
    }
}

export default Seeder;