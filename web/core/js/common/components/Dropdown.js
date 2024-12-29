import { populateDropdown } from './dropdownHandler.js';

export default class Dropdown {
  constructor(config, workflow) {
    this.config = config;
    this.workflow = workflow;
    this.loaderContainer = document.getElementById(config.id);
    if (this.loaderContainer) {
      this.loadDropdownData();
    }
  }

  loadDropdownData() {
    const BASE_URL = `${window.location.origin}/object_info`;
    const url = `${BASE_URL}/${this.config.url}`;

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
      })
      .then(data => {
        this.populate(data);
      })
      .catch(error => {
        console.error(`Error loading data for ${this.config.id}:`, error);
        this.displayMissingComponentMessage();
      });
  }

  populate(data) {
    const firstKey = Object.keys(data)[0];
    const loaderData = data[firstKey];

    let inputData = loaderData.input.required[this.config.key];
    if (!inputData) {
      console.warn(
        `Required input for key "${this.config.key}" is missing. Checking optional input.`
      );
      inputData = loaderData.input.optional
        ? loaderData.input.optional[this.config.key]
        : undefined;
    }

    if (!inputData) {
      this.displayMissingComponentMessage();
      return;
    }

    populateDropdown(
      this.config.id,
      inputData[0],
      this.config.label,
      this.config.nodePath,
      this.workflow
    );
  }

  displayMissingComponentMessage() {
    if (this.loaderContainer) {
      this.loaderContainer.innerHTML = '';
      const messageElement = document.createElement('div');
      messageElement.style.fontWeight = 'bold';
      messageElement.style.textAlign = 'left';
      messageElement.style.display = 'block';
      this.loaderContainer.style.display = 'block';
      this.loaderContainer.style.textAlign = 'left';
      messageElement.textContent = `Missing custom node: ${this.config.id}`;
      this.loaderContainer.appendChild(messageElement);
    }
  }
}
