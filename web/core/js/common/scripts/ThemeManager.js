
class ThemeManager {
    constructor(preferencesManager, cssPath = '/core/css/themes.css') {
        this.preferencesManager = preferencesManager;
        this.themes = [];
        this.customThemes = []; 
        this.externalCustomThemes = []; 
        this.targetElementId = 'theme-selector';
        this.cssPath = cssPath;
        this.customThemeModalId = 'custom-theme-modal';
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.animationFrame = null;
        this.currentEditingThemeId = null; 
        this.themeCache = new Map();
        this.themeSets = []; 
        this.customLabels = {
            '--color-background': 'Background',
            '--color-primary-text': 'Text',
            '--color-background-pattern': 'Background Pattern',
            '--color-border': 'Border',
            '--color-header-background': 'Header Background',
            '--color-header-text': 'Header Text',
            '--color-background-secondary': 'Widget Background',
            '--color-button-primary': 'Button',
            '--color-button-primary-text': 'Button Text',
            '--color-button-primary-hover': 'Button Hover',
            '--color-button-primary-text-hover': 'Button Text Hover',
            '--color-button-primary-active': 'Button Active',
            '--color-button-primary-text-active': 'Button Text Active',
            '--color-button-secondary': 'Widget Button',
            '--color-button-secondary-text': 'Widget Button Text',
            '--color-button-secondary-hover': 'Widget Button Hover',
            '--color-button-secondary-text-hover': 'Widget Button Text Hover',
            '--color-button-secondary-active': 'Widget Button Active',
            '--color-button-secondary-text-active': 'Widget Button Text Active',
            '--color-progress-background': 'Progress Background',
            '--color-progress-value': 'Progress Value',
            '--color-scrollbar-track': 'Scrollbar Track',
            '--color-scrollbar-thumb': 'Scrollbar Thumb',
            '--color-input-range-thumb': 'Widget Range Thumb',
            '--color-input-range-background': 'Widget Range Background',
            '--color-spinner': 'Spinner',
            '--color-spinner-highlight': 'Spinner Highlight',
        };
        this.cssVariables = Object.keys(this.customLabels);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
    }

    static applyInitialTheme(preferencesManager) {
        let themeToApply = preferencesManager.get('selectedTheme');
        if (!themeToApply) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeToApply = prefersDark ? 'flow-dark' : 'flow-light'; 
        }
        document.documentElement.setAttribute('data-theme', themeToApply);
    }

    async init() {
        try {
            document.documentElement.classList.add('css-loading');
            this.loadCustomThemesFromStorage(); 
            this.applySavedTheme(); 
            await this.loadThemesFromCSS();
            await this.loadExternalCustomThemes(); 
            this.loadThemeSetsFromStorage();
            this.addMenu();
            this.setupCustomThemeModal();
        } catch (error) {
            console.error('Failed to initialize ThemeManager:', error);
        } finally {
            document.documentElement.classList.remove('css-loading');
        
            const overlay = document.getElementById('css-loading-overlay');
            if (overlay) {
                overlay.addEventListener('transitionend', () => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                });
                        setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                }, 50);
            }
    }}

    getTheme(themeValue) {
        if (!this.themeCache.has(themeValue)) {
            const theme = this.themes.find(t => t.value === themeValue) ||
                            this.customThemes.find(t => t.value === themeValue) ||
                            this.externalCustomThemes.flatMap(s => s.themes).find(t => t.value === themeValue);
            if (theme) {
                this.themeCache.set(themeValue, theme);
            }
        }
        return this.themeCache.get(themeValue);
    }

    async loadThemesFromCSS() {
        try {
            const response = await fetch(this.cssPath);
            const cssText = await response.text();
            this.parseThemesFromCSS(cssText);
        } catch (error) {
            console.error('Failed to load themes:', error);
        }
    }

    parseThemesFromCSS(cssText) {
        const themeRegex = /\[data-theme="([^"]+)"\]\s*\{([^}]+)\}/g;
        let match;

        while ((match = themeRegex.exec(cssText)) !== null) {
            const themeValue = match[1];
            const themeName = this.formatThemeName(themeValue);
            const variablesBlock = match[2];
            const variables = this.parseCSSVariables(variablesBlock);

            if (!this.themes.some(theme => theme.value === themeValue)) {
                this.themes.push({ name: themeName, value: themeValue, variables: variables });
            }
        }

        if (this.themes.length === 0) {
            console.warn('No themes found in the CSS file.');
        } else {
            console.info(`Loaded ${this.themes.length} themes from CSS.`);
        }

        if (!this.themes.some(t => t.value === 'create-custom')) {
            this.themes.push({ name: 'Create Custom Theme', value: 'create-custom', variables: {} });
        }
    }

    parseCSSVariables(cssBlock) {
        const variableRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
        let match;
        const variables = {};

        while ((match = variableRegex.exec(cssBlock)) !== null) {
            const variable = match[1];
            const value = match[2].trim();
            variables[variable] = value;
        }

        return variables;
    }

    async loadExternalCustomThemes() {
        try {
            const response = await fetch('/core/css/themes/list');
            if (!response.ok) {
                throw new Error('Failed to fetch the list of custom theme CSS files.');
            }
            const cssFiles = await response.json();

            for (const fileName of cssFiles) {
                if (!fileName.endsWith('.css')) continue;
                const styleName = this.formatStyleName(fileName);

                try {
                    const cssResponse = await fetch(`/core/css/themes/${fileName}`);
                    if (!cssResponse.ok) {
                        console.warn(`Failed to load CSS file: ${fileName}`);
                        continue;
                    }
                    const cssText = await cssResponse.text();

                    const themes = this.extractThemesFromCSS(cssText).map(theme => ({
                        ...theme,
                        themesSetName: styleName, 
                    }));
                    if (themes.length === 0) {
                        console.warn(`No valid themes found in CSS file: ${fileName}`);
                        continue;
                    }

                    this.externalCustomThemes.push({
                        styleName: styleName,
                        themes: themes
                    });

                    this.appendExternalCSS(fileName, cssText);
                } catch (error) {
                    console.error(`Error loading custom theme from file ${fileName}:`, error);
                }
            }

            if (this.externalCustomThemes.length === 0) {
                console.info('No external custom themes loaded.');
            } else {
                console.info(`Loaded ${this.externalCustomThemes.length} external custom theme styles.`);
            }
        } catch (error) {
            console.error('Error loading external custom themes:', error);
        }
    }

    extractThemesFromCSS(cssText) {
        const themeRegex = /\[data-theme="([^"]+)"\]\s*\{([^}]+)\}/g;
        let match;
        const themes = [];

        while ((match = themeRegex.exec(cssText)) !== null) {
            const themeValue = match[1];
            const themeName = this.formatThemeName(themeValue);
            const variablesBlock = match[2];
            const variables = this.parseCSSVariables(variablesBlock);

            if (!themes.some(theme => theme.value === themeValue)) {
                themes.push({ name: themeName, value: themeValue, variables: variables });
            }
        }

        return themes;
    }

    formatStyleName(fileName) {
        const nameWithoutExt = fileName.replace('.css', '');
        const nameWithSpaces = nameWithoutExt.replace(/[_-]+/g, ' ');
        return nameWithSpaces
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    formatThemeName(themeValue) {
        if (this.customLabels[themeValue]) {
            return this.customLabels[themeValue];
        }
        return themeValue
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    applySavedTheme() {
        const savedTheme = this.preferencesManager.get('selectedTheme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.preferencesManager.set('selectedTheme', theme);
    }
    
    addMenu() {
        const targetElement = document.getElementById(this.targetElementId);
        console.debug(`Attempting to add/populate theme selector in element: ${this.targetElementId}`);

        if (!targetElement) {
            console.error(`Element with ID "${this.targetElementId}" not found. Theme selector will not be injected.`);
            return;
        }

        let selector = targetElement.querySelector('#theme-selector-dropdown');

        if (!selector) {
            selector = document.createElement('select');
            selector.id = 'theme-selector-dropdown';
            selector.style.cursor = 'pointer';
            selector.setAttribute('aria-label', 'Select Theme');

            targetElement.appendChild(selector);
            console.info('Theme selector dropdown created and injected.');
        } else {
            console.info('Theme selector dropdown already exists. Populating with themes.');
            selector.innerHTML = '';
        }

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Set Theme';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        selector.appendChild(defaultOption);

        this.themes.forEach(theme => {
            if (theme.value !== 'create-custom') { 
                const option = document.createElement('option');
                option.value = theme.value;
                option.textContent = theme.name;
                selector.appendChild(option);
            }
        });

        const createCustomOption = document.createElement('option');
        createCustomOption.value = 'create-custom';
        createCustomOption.textContent = 'Create Custom Theme';
        createCustomOption.id = `theme-option-create-custom`;

        selector.appendChild(createCustomOption);

        if (this.externalCustomThemes.length + this.customThemes.length > 0) {
            const customThemesHeader = document.createElement('option');
            customThemesHeader.textContent = 'Custom Themes';
            customThemesHeader.disabled = true;
            selector.appendChild(customThemesHeader);

            const allCustomThemes = [
                ...this.externalCustomThemes.flatMap(style => style.themes),
                ...this.customThemes
            ];

            const groupedThemes = this.groupThemesBySet(allCustomThemes);

            for (const [setName, themes] of groupedThemes) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = setName;

                themes.forEach(theme => {
                    const option = document.createElement('option');
                    option.value = theme.value;
                    option.textContent = theme.name;
                    optgroup.appendChild(option);
                });

                selector.appendChild(optgroup);
            }
        }

        const currentTheme = this.preferencesManager.get('selectedTheme') || this.getDefaultTheme();
        selector.value = currentTheme;

        selector.removeEventListener('change', this.handleThemeChange);
        selector.addEventListener('change', this.handleThemeChange.bind(this));

        console.info('Theme selector dropdown populated with themes.');
    }

    groupThemesBySet(themes) {
        const map = new Map();
        themes.forEach(theme => {
            const setName = theme.themesSetName || 'Default Set';
            if (!map.has(setName)) {
                map.set(setName, []);
            }
            map.get(setName).push(theme);
        });
        return map;
    }

    getDefaultTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const preferredTheme = this.themes.find(theme =>
            theme.value.toLowerCase().includes(prefersDark ? 'dark' : 'light')
        );
        return preferredTheme ? preferredTheme.value : this.themes[0]?.value || 'flow-dark';
    }

    handleThemeChange(e) {
        const selectedTheme = e.target.value;
        if (selectedTheme === 'create-custom') {
            this.openCustomThemeModal();
        } else {
            this.applyTheme(selectedTheme);
        }
    }

    setupCustomThemeModal() {
        if (document.getElementById(this.customThemeModalId)) {
            console.warn('Custom Theme Modal already exists.');
            return;
        }

        const modalHTML = `
        <div id="${this.customThemeModalId}" class="custom-theme-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-content">
            <header class="modal-header">
              <h2 id="modal-title">Create Custom Theme</h2>
              <div id="theme-notification" class="notification" aria-live="polite" hidden></div>

              <button type="button" class="close-button" aria-label="Close">&times;</button>
            </header>
            
            <div class="modal-body">
              
              <form id="custom-theme-form" class="theme-form">
                <div id="custom-themes-listing">
        
                  <div id="custom-themes-input">

                    <!-- Theme Set Section -->
                    <section class="form-section">
                      <fieldset>
                        
                        <div class="form-group">
                          <label for="theme-set-select">Select Theme Set</label>
                          <select id="theme-set-select" name="themeSet" required>
                            ${this.themeSets.length > 0 ? 
                              this.themeSets.map(set => `<option value="${this.escapeHTML(set)}">${this.escapeHTML(set)}</option>`).join('') :
                              `<option value="" disabled selected>No Theme Sets Available</option>`
                            }
                          </select>
                        </div>
                        
                        <div class="form-group new-theme-set">
                          <input type="text" id="new-theme-set-name" name="newThemeSetName" placeholder="New Set Name">
                          <button type="button" id="save-theme-set-button" class="btn secondary">Add Theme Set</button>
                        </div>
                        
                      </fieldset>
                    </section>
                    
                <!-- Theme Name Section -->
                <section class="form-section">
                  <div class="form-group">
                    <input type="text" id="theme-name" name="themeName" required placeholder="Enter theme name">
                  </div>
                </section>
                <data value=""></data>
                </div>
                <!-- Custom Themes List -->
                <aside class="custom-themes-section">
                  <h3>Custom Themes</h3>
                  <div id="custom-themes-list-container">
                    <ul id="custom-themes-list" class="custom-themes-list">
                      <li>No custom themes created yet.</li>
                    </ul>
                  </div>
                </aside>
              </div>

                <!-- CSS Variables Section -->
                <section class="form-section css-variables">
                  <fieldset>
                    <legend>Customize</legend>
                    <div class="variables-grid">
                      ${this.cssVariables.map(variable => `
                        <div class="form-group color-field">
                          <label for="${this.escapeHTML(variable)}">${this.escapeHTML(this.formatLabel(variable))}</label>
                          <input type="color" id="${this.escapeHTML(variable)}" name="${this.escapeHTML(variable)}" value="${this.getCurrentCSSVariable(variable) || '#000000'}">
                        </div>
                      `).join('')}
                    </div>
                  </fieldset>
                </section>
                
                <!-- Actions -->
                <div class="form-actions">
                  <button type="submit" id="save-theme-button" class="btn primary">Save Theme & Close</button>
                  <button type="button" id="save-and-continue-theme-button" class="btn secondary">Save Theme</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;
  
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const style = document.createElement('style');
        style.textContent = `
        CSS
        `;

        // document.head.appendChild(style);
        this.attachModalEventListeners();
    }

    attachModalEventListeners() {
        const modal = document.getElementById(this.customThemeModalId);
        if (!modal) return;

        const closeButton = modal.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', this.closeCustomThemeModal.bind(this));
        }

        const modalHeader = modal.querySelector('.modal-header');
        if (modalHeader) {
            modalHeader.addEventListener('mousedown', this.onMouseDown.bind(this));
        }

        const saveThemeSetButton = modal.querySelector('#save-theme-set-button');
        if (saveThemeSetButton) {
            saveThemeSetButton.addEventListener('click', () => this.addThemeSet());
        }

        const form = modal.querySelector('#custom-theme-form');
        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.saveCustomTheme(true);
            });
            
            const saveAndContinueButton = modal.querySelector('#save-and-continue-theme-button');
            if (saveAndContinueButton) {
                saveAndContinueButton.addEventListener('click', () => this.saveCustomTheme(false));
            }
        }

        this.cssVariables.forEach(variable => {
            const colorInput = modal.querySelector(`#${this.escapeHTML(variable)}`);
            if (colorInput) {
                colorInput.addEventListener('input', (e) => {
                    const colorValue = e.target.value;
                    this.applyInlineCustomCSS(variable, colorValue);
                });
            }
        });

        this.populateCustomThemesList();
    }

    escapeHTML(str) {
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }

    addThemeSet() {
        const input = document.getElementById('new-theme-set-name');
        if (!input) {
            this.displayNotification('Theme Set input field not found.', 'error');
            return;
        }

        const setName = input.value.trim();
        if (!setName) {
            this.displayNotification('Theme Set name cannot be empty.', 'error');
            return;
        }

        if (this.themeSets.includes(setName)) {
            this.displayNotification('A Theme Set with this name already exists.', 'error');
            return;
        }

        this.themeSets.push(setName);
        this.saveThemeSetsToStorage();
        this.updateThemeSetDropdown();
        this.updateCustomThemesListUI();
        input.value = '';
        this.displayNotification(`Theme Set "${setName}" has been added.`, 'success');
    }

    deleteThemeSet(setName) {
        const confirmDelete = confirm(`Are you sure you want to delete the Theme Set "${setName}" and all its themes?`);
        if (!confirmDelete) return;

        this.themeSets = this.themeSets.filter(set => set !== setName);
        this.saveThemeSetsToStorage();

        const themesToRemove = this.customThemes.filter(theme => theme.themesSetName === setName);
        themesToRemove.forEach(theme => this.deleteCustomTheme(theme.id, false)); // false to prevent confirmation

        const externalThemesToRemove = this.externalCustomThemes.filter(style => style.styleName === setName);
        externalThemesToRemove.forEach(style => {
            const styleElement = document.getElementById(`external-${style.styleName}.css`);
            if (styleElement) {
                styleElement.parentNode.removeChild(styleElement);
            }
            this.externalCustomThemes = this.externalCustomThemes.filter(s => s.styleName !== setName);
        });

        this.addMenu();
        this.populateCustomThemesList();

        this.displayNotification(`Theme Set "${setName}" and all its themes have been deleted.`, 'success');
    }

    updateThemeSetDropdown() {
        const select = document.getElementById('theme-set-select');
        if (!select) return;

        select.innerHTML = ''; 

        if (this.themeSets.length === 0) {
            const noSetOption = document.createElement('option');
            noSetOption.value = '';
            noSetOption.textContent = 'No Theme Sets Available';
            noSetOption.disabled = true;
            noSetOption.selected = true;
            select.appendChild(noSetOption);
            select.disabled = true;
            return;
        }

        this.themeSets.forEach(setName => {
            const option = document.createElement('option');
            option.value = setName;
            option.textContent = setName;
            select.appendChild(option);
        });

        select.disabled = false;
    }

    formatLabel(variable) {
        return this.customLabels[variable] || this.formatVariableName(variable);
    }

    formatVariableName(variable) {
        return variable
            .replace('--', '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    getCurrentCSSVariable(variable) {
        return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#000000';
    }

    applyInlineCustomCSS(variable, value) {
        document.documentElement.style.setProperty(variable, value);
    }

    openCustomThemeModal() {
        const modal = document.getElementById(this.customThemeModalId);
        if (modal) {
            const currentTheme = this.preferencesManager.get('selectedTheme');
            const activeThemeSet = this.findThemeSetByThemeValue(currentTheme);
            const themeSetSelect = modal.querySelector('#theme-set-select');
            if (themeSetSelect && activeThemeSet) {
                themeSetSelect.value = activeThemeSet;
            } else if (themeSetSelect && this.themeSets.length > 0) {
                themeSetSelect.selectedIndex = 0;
            }

            modal.style.display = 'block';
            this.resetCustomThemeForm();
            this.populateCustomThemesList();
        } else {
            console.error('Custom Theme Modal not found.');
        }
    }

    findThemeSetByThemeValue(themeValue) {
        for (const theme of this.themes) {
            if (theme.value === themeValue) {
                return theme.themesSetName || 'Default Set';
            }
        }

        for (const style of this.externalCustomThemes) {
            if (style.themes.some(t => t.value === themeValue)) {
                return style.styleName;
            }
        }

        const customTheme = this.customThemes.find(t => t.value === themeValue);
        if (customTheme) {
            return customTheme.themesSetName;
        }

        return null;
    }

    closeCustomThemeModal() {
        const modal = document.getElementById(this.customThemeModalId);
        if (modal) {
            modal.style.display = 'none';
            const currentTheme = this.preferencesManager.get('selectedTheme') || this.getDefaultTheme();
            document.documentElement.removeAttribute('style');
            this.applyTheme(currentTheme);
            const selector = document.getElementById('theme-selector-dropdown');
            if (selector) {
                selector.value = currentTheme;
            }
            this.clearNotification();
        }
    }

    resetCustomThemeForm() {
        const form = document.getElementById('custom-theme-form');
        if (form) {
            form.reset();
            const modal = document.getElementById(this.customThemeModalId);
            const themeSetSelect = modal.querySelector('#theme-set-select');
            if (themeSetSelect && this.themeSets.length > 0) {

                const activeTheme = this.preferencesManager.get('selectedTheme');
                const activeSet = this.findThemeSetByThemeValue(activeTheme);
                if (activeSet) {
                    themeSetSelect.value = activeSet;
                }
            }
            this.cssVariables.forEach(variable => {
                const input = document.getElementById(variable);
                if (input) {
                    input.value = this.getCurrentCSSVariable(variable) || '#000000';
                    this.applyInlineCustomCSS(variable, input.value);
                }
            });
            this.currentEditingThemeId = null;
            const modalTitle = modal.querySelector('h2');
            if (modalTitle) {
                modalTitle.textContent = 'Create Custom Theme';
            }
            const saveThemeButton = modal.querySelector('#save-theme-button');
            if (saveThemeButton) {
                saveThemeButton.textContent = 'Save Theme & Close';
            }
            const saveAndContinueButton = modal.querySelector('#save-and-continue-theme-button');
            if (saveAndContinueButton) {
                saveAndContinueButton.textContent = 'Save Theme';
            }
            this.clearNotification();
        }
    }

    populateCustomThemesList() {
        const customThemesList = document.getElementById('custom-themes-list');
        if (!customThemesList) return;

        customThemesList.innerHTML = '';

        const allCustomThemes = [
            ...this.externalCustomThemes.flatMap(style => style.themes),
            ...this.customThemes
        ];

        if (allCustomThemes.length === 0) {
            const noThemesItem = document.createElement('li');
            noThemesItem.textContent = 'No custom themes created yet.';
            customThemesList.appendChild(noThemesItem);
            return;
        }

        const groupedThemes = this.groupThemesBySet(allCustomThemes);

        for (const [setName, themes] of groupedThemes) {
            const themesSetItem = document.createElement('li');
            themesSetItem.style.display = 'flex';
            themesSetItem.style.justifyContent = 'space-between';
            themesSetItem.style.alignItems = 'center';
            themesSetItem.style.padding = '5px 0';
            themesSetItem.style.marginTop = '10px';
            themesSetItem.style.fontWeight = 'bold';

            const setNameSpan = document.createElement('span');
            setNameSpan.textContent = setName;

            const buttonsContainer = document.createElement('div');

            const deleteSetButton = document.createElement('button');
            deleteSetButton.type = 'button';
            deleteSetButton.textContent = 'Delete Set';
            deleteSetButton.style.padding = '4px 8px';
            deleteSetButton.style.cursor = 'pointer';
            deleteSetButton.style.marginRight = '5px';
            deleteSetButton.addEventListener('click', () => this.deleteThemeSet(setName));

            const downloadSetButton = document.createElement('button');
            downloadSetButton.type = 'button';
            downloadSetButton.textContent = 'Download Set';
            downloadSetButton.style.padding = '4px 8px';
            downloadSetButton.style.cursor = 'pointer';
            downloadSetButton.addEventListener('click', () => this.downloadThemeSet(setName));

            buttonsContainer.appendChild(downloadSetButton);
            buttonsContainer.appendChild(deleteSetButton);

            themesSetItem.appendChild(setNameSpan);
            themesSetItem.appendChild(buttonsContainer);
            customThemesList.appendChild(themesSetItem);

            themes.forEach(theme => {
                const listItem = document.createElement('li');
                listItem.style.display = 'flex';
                listItem.style.justifyContent = 'space-between';
                listItem.style.alignItems = 'center';
                listItem.style.padding = '5px 0';
                listItem.style.marginLeft = '20px';

                const themeNameSpan = document.createElement('span');
                themeNameSpan.textContent = `- ${theme.name}`;

                const themeButtonsContainer = document.createElement('div');

                if (this.customThemes.some(t => t.id === theme.id)) {
                    const editButton = document.createElement('button');
                    editButton.type = 'button';
                    editButton.textContent = 'Edit';
                    editButton.style.marginRight = '10px';
                    editButton.style.padding = '4px 8px';
                    editButton.style.cursor = 'pointer';
                    editButton.addEventListener('click', () => this.editCustomTheme(theme.id));
                    themeButtonsContainer.appendChild(editButton);
                }

                if (this.customThemes.some(t => t.id === theme.id)) {
                    const deleteButton = document.createElement('button');
                    deleteButton.type = 'button';
                    deleteButton.textContent = 'Delete';
                    deleteButton.style.padding = '4px 8px';
                    deleteButton.style.cursor = 'pointer';
                    deleteButton.addEventListener('click', () => this.deleteCustomTheme(theme.id));
                    themeButtonsContainer.appendChild(deleteButton);
                }

                listItem.appendChild(themeNameSpan);
                listItem.appendChild(themeButtonsContainer);

                customThemesList.appendChild(listItem);
            });
        }
    }

    downloadThemeSet(setName) {
        const externalThemes = this.externalCustomThemes
            .filter(style => style.styleName === setName)
            .flatMap(style => style.themes);

        const customThemes = this.customThemes
            .filter(theme => theme.themesSetName === setName);

        const allThemes = [...externalThemes, ...customThemes];

        if (allThemes.length === 0) {
            this.displayNotification(`No themes found in the set "${setName}".`, 'error');
            return;
        }

        let cssContent = '';
        allThemes.forEach(theme => {
            cssContent += `[data-theme="${theme.value}"] {\n`;
            if (this.customThemes.some(t => t.id === theme.id)) {
                for (const [key, value] of Object.entries(theme.variables)) {
                    cssContent += `    ${key}: ${value};\n`;
                }
            } else {
                for (const [key, value] of Object.entries(theme.variables)) {
                    cssContent += `    ${key}: ${value};\n`;
                }
            }
            cssContent += '}\n\n';
        });

        const blob = new Blob([cssContent], { type: 'text/css' });
        const fileName = this.generateFileName(setName);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        this.displayNotification(`Theme Set "${setName}" has been downloaded as "${fileName}".`, 'success');
    }

    generateFileName(setName) {
        const fileName = setName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'custom-theme';
        return `${fileName}.css`;
    }

    editCustomTheme(themeId) {
        const theme = this.customThemes.find(t => t.id === themeId);
        if (!theme) {
            this.displayNotification(`Theme with ID "${themeId}" not found or cannot be edited (external themes).`, 'error');
            return;
        }

        const form = document.getElementById('custom-theme-form');
        if (form) {
            const modal = document.getElementById(this.customThemeModalId);
            const nameInput = modal.querySelector('#theme-name');
            const themeSetSelect = modal.querySelector('#theme-set-select');

            if (nameInput) {
                nameInput.value = theme.name;
            }
            if (themeSetSelect) {
                themeSetSelect.value = theme.themesSetName;
            }
            this.cssVariables.forEach(variable => {
                const input = document.getElementById(variable);
                if (input) {
                    input.value = theme.variables[variable] || '#000000';
                    this.applyInlineCustomCSS(variable, input.value);
                }
            });
            this.currentEditingThemeId = themeId;
            const modalTitle = modal.querySelector('h2');
            if (modalTitle) {
                modalTitle.textContent = 'Edit Custom Theme';
            }
            const saveThemeButton = modal.querySelector('#save-theme-button');
            if (saveThemeButton) {
                saveThemeButton.textContent = 'Update Theme & Close';
            }
            const saveAndContinueButton = modal.querySelector('#save-and-continue-theme-button');
            if (saveAndContinueButton) {
                saveAndContinueButton.textContent = 'Update Theme';
            }
            this.displayNotification(`Editing theme "${theme.name}". Make your changes and click "Update Theme".`, 'info');
        }
    }

    deleteCustomTheme(themeId, confirmDelete = true) {
        const theme = this.customThemes.find(t => t.id === themeId);
        if (!theme) {
            this.displayNotification(`Theme with ID "${themeId}" not found or cannot be deleted (external themes).`, 'error');
            return;
        }

        if (confirmDelete) {
            const userConfirmed = confirm(`Are you sure you want to delete the theme "${theme.name}"?`);
            if (!userConfirmed) return;
        }

        const styleId = `custom-theme-${theme.value}`;
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
            styleElement.parentNode.removeChild(styleElement);
        }

        this.customThemes = this.customThemes.filter(t => t.id !== themeId);

        this.saveCustomThemesToStorage();

        this.addMenu();
        this.populateCustomThemesList();

        if (confirmDelete) {
            this.displayNotification('Theme deleted successfully.', 'success');
        }
    }

    saveCustomTheme(closeAfterSave = true) {
        const form = document.getElementById('custom-theme-form');
        if (!form) return;
    
        const formData = new FormData(form);
        const themeName = formData.get('themeName')?.trim() || `Theme ${Date.now()}`;
        const themesSetName = formData.get('themeSet') || 'Default Set';
        const themeValue = this.generateThemeValue(themeName);
    
        const themeVariables = {};
        this.cssVariables.forEach(variable => {
            themeVariables[variable] = formData.get(variable) || '#000000';
        });
    
        if (this.currentEditingThemeId) {
            const index = this.customThemes.findIndex(t => t.id === this.currentEditingThemeId);
            if (index !== -1) {
                this.customThemes[index] = {
                    ...this.customThemes[index],
                    name: themeName,
                    value: themeValue,
                    themesSetName,
                    variables: themeVariables
                };
            }
        } else {
            this.customThemes.push({
                id: `custom-${Date.now()}`,
                name: themeName,
                value: themeValue,
                themesSetName,
                variables: themeVariables
            });
        }
    
        this.appendCustomCSSToDocument(themeValue, themeVariables);
        localStorage.setItem('customThemes', JSON.stringify(this.customThemes));
        this.addMenu();
        this.applyTheme(themeValue);
    
        if (closeAfterSave) {
            this.closeCustomThemeModal();
        }
    }

    generateThemeValue(themeName) {
        return themeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `custom-theme-${Date.now()}`;
    }

    loadCustomThemesFromStorage() {
        const storedThemes = localStorage.getItem('customThemes');
        if (storedThemes) {
            this.customThemes = JSON.parse(storedThemes);
            this.customThemes.forEach(theme => {
                this.appendCustomCSSToDocument(theme.value, theme.variables);
            });
        }
    }

    saveCustomThemesToStorage() {
        localStorage.setItem('customThemes', JSON.stringify(this.customThemes));
    }

    loadThemeSetsFromStorage() {
        const storedSets = localStorage.getItem('themeSets');
        if (storedSets) {
            this.themeSets = JSON.parse(storedSets);
        } else {
            this.themeSets = [];
            this.saveThemeSetsToStorage();
        }
    }

    saveThemeSetsToStorage() {
        localStorage.setItem('themeSets', JSON.stringify(this.themeSets));
    }

    generateCustomCSS(themeValue, variables) {
        let css = `[data-theme="${themeValue}"] {\n`;
        for (const [key, value] of Object.entries(variables)) {
            css += `    ${key}: ${value};\n`;
        }
        css += '}';
        return css;
    }

    appendCustomCSSToDocument(themeValue, variables) {
        const styleId = `custom-theme-${themeValue}`;
        let styleElement = document.getElementById(styleId);

        if (styleElement) {
            styleElement.parentNode.removeChild(styleElement);
        }

        styleElement = document.createElement('style');
        styleElement.type = 'text/css';
        styleElement.id = styleId;
        let css = `[data-theme="${themeValue}"] {\n`;
        for (const [key, value] of Object.entries(variables)) {
            css += `    ${key}: ${value};\n`;
        }
        css += '}';
        styleElement.appendChild(document.createTextNode(css));
        document.head.appendChild(styleElement);
    }

    updateCustomCSSInDocument(themeValue, variables) {
        this.appendCustomCSSToDocument(themeValue, variables);
    }

    appendExternalCSS(fileName, cssText) {
        const style = document.createElement('style');
        style.id = `external-${fileName}`;
        style.appendChild(document.createTextNode(cssText));
        document.head.appendChild(style);
    }

    static applyTheme(theme, preferencesManager) {
        if (!theme || !preferencesManager) return; 
        document.documentElement.setAttribute('data-theme', theme);
        preferencesManager.set('selectedTheme', theme);
    }

    onMouseDown(e) {
        e.preventDefault();

        const modal = document.getElementById(this.customThemeModalId);
        if (!modal) return;

        this.isDragging = true;

        const rect = modal.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const newLeft = e.clientX - this.dragOffset.x;
        const newTop = e.clientY - this.dragOffset.y;

        const modal = document.getElementById(this.customThemeModalId);
        if (!modal) return;

        const modalWidth = modal.offsetWidth;
        const modalHeight = modal.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const clampedLeft = Math.max(0, Math.min(newLeft, windowWidth - modalWidth));
        const clampedTop = Math.max(0, Math.min(newTop, windowHeight - modalHeight));

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.animationFrame = requestAnimationFrame(() => {
            modal.style.left = `${clampedLeft}px`;
            modal.style.top = `${clampedTop}px`;
            modal.style.transform = `translate(0, 0)`;
        });
    }

    onMouseUp() {
        if (!this.isDragging) return;
        this.isDragging = false;

        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    displayNotification(message, type) {
        const notification = document.getElementById('theme-notification');
        if (!notification) return;

        notification.textContent = message;
        notification.style.display = 'block';
        notification.hidden = false;

        switch (type) {
            case 'success':
                // notification.style.backgroundColor = '#d4edda';
                notification.style.color = '#50B452';
                // notification.style.border = '1px solid #c3e6cb';
                break;
            case 'error':
                // notification.style.backgroundColor = '#f8d7da';
                notification.style.color = '#D24141';
                // notification.style.border = '1px solid #f5c6cb';
                break;
            case 'info':
                // notification.style.backgroundColor = '#1e1e1f';
                notification.style.color = '#628BC0';
                // notification.style.border = '1px solid #bee5eb';
                break;
            default:
                notification.style.backgroundColor = '#1e1e1f';
                notification.style.color = '#bababa';
        }

        setTimeout(() => {
            this.clearNotification();
        }, 5000);
    }


    clearNotification() {
        const notification = document.getElementById('theme-notification');
        if (!notification) return;

        notification.textContent = '';
        notification.style.display = 'none';
        notification.hidden = true;
    }

    updateCustomThemesListUI() {
        this.populateCustomThemesList();
    }
}

export default ThemeManager;
