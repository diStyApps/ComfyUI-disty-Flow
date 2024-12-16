(function () {
  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : '00',
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0'),
    ].join(':');
  }

  const progressBarHTML = `
    <div id="loading-area">
      <div id="spinner"></div>
      <div class="progress-container">
        <progress id="main-progress" class="progress" value="0" max="100"></progress>
        <div id="progress-text" class="hidden">
          <span class="progress-percentage">0%</span>
          <span id="progress-text-divider-1">|</span>
          <span class="progress-steps">0/0</span>
          <span id="progress-text-divider-2">|</span>
          <span class="progress-times">00:00:00 / 00:00:00 &lt; 00:00:00</span> 
        </div>
      </div>
      <div id="queue-display"></div>
      <div id="buttonsgen">
        <button id="generateButton" class="menuButtons">GENERATE</button>
        <button id="interruptButton" class="menuButtons">INTERRUPT</button>
      </div>
    </div>
  `;

  function insertProgressBar() {
    let progressBar = document.querySelector('#progressbar');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.id = 'progressbar';
      document.body.appendChild(progressBar);
    }
    progressBar.innerHTML = progressBarHTML;
    injectStyles();
    // console.log('Progress bar content inserted');
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `

    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertProgressBar);
  } else {
    insertProgressBar();
  }

  window.insertProgressBar = insertProgressBar;

  class TimeTracker {
    constructor() {
      this.startTime = null;
      this.stepCount = 0;
      this.totalSteps = 0;
      this.totalTime = 0;
      this.timePerStep = 0;
    }

    start(totalSteps) {
      this.startTime = Date.now();
      this.stepCount = 0;
      this.totalSteps = totalSteps;
      this.totalTime = 0;
      this.timePerStep = 0;
    }

    update() {
      const now = Date.now();
      const elapsed = (now - this.startTime) / 1000; 
      this.stepCount += 1;
      this.timePerStep = elapsed / this.stepCount;
      this.totalTime = this.timePerStep * this.totalSteps;
    }

    getElapsedTime() {
      if (!this.startTime) return 0;
      return (Date.now() - this.startTime) / 1000;
    }

    getRemainingTime() {
      if (this.totalSteps === 0) return 0;
      const estimatedTotal = this.timePerStep * this.totalSteps;
      const remaining = estimatedTotal - this.getElapsedTime();
      return Math.max(0, remaining); 
    }

    getTotalTime() {
      return this.totalTime;
    }

    getTimePerStep() {
      return this.timePerStep;
    }
  }

  class ProgressUpdater {

    constructor(progressBarId, progressTextId) {
      this.progressBar = document.getElementById(progressBarId);
      this.progressText = document.getElementById(progressTextId);
      this.timeTracker = new TimeTracker();
      this.initialized = false;

      if (!this.progressBar || !this.progressText) {
        console.warn(
          `Progress bar or text element not found. Setting up observer...`
        );
        this.observeProgressElements(progressBarId, progressTextId);
      } else {
        this.initialize();
      }
    }

    observeProgressElements(progressBarId, progressTextId) {
      const observer = new MutationObserver((mutations, obs) => {
        const progressBar = document.getElementById(progressBarId);
        const progressText = document.getElementById(progressTextId);
        if (progressBar && progressText) {
          this.progressBar = progressBar;
          this.progressText = progressText;
          this.initialize();
          obs.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }


    initialize() {
      this.initialized = true;
    }

    update(data = {}) {
      if (!this.initialized) {
        console.warn('ProgressUpdater is not initialized yet.');
        return;
      }

      const { max = 0, value = 0 } = data;

      if (value === 1) {
        this.timeTracker.start(max);
        this.showProgressText();
      }

      if (value > 0) {
        this.timeTracker.update();
      }

      this.progressBar.max = max;
      this.progressBar.value = value;

      const percentage = Math.round(max > 0 ? ((value / max) * 100).toFixed(2) : 0);
      const elapsedTime = formatTime(this.timeTracker.getElapsedTime());
      const totalTime = formatTime(this.timeTracker.getTotalTime());
      const remainingTime = formatTime(this.timeTracker.getRemainingTime());
      const timePerStep = this.timeTracker.getTimePerStep().toFixed(2);

      const percentageSpan = this.progressText.querySelector('.progress-percentage');
      const stepsSpan = this.progressText.querySelector('.progress-steps');
      const timesSpan = this.progressText.querySelector('.progress-times');

      if (percentageSpan) percentageSpan.textContent = `${percentage}%`;
      if (stepsSpan) stepsSpan.textContent = `${value}/${max}/${timePerStep}s`;
      if (timesSpan) timesSpan.textContent = ` ${totalTime} / ${elapsedTime} < ${remainingTime}`;

      // Ensure the progress text remains visible upon completion
      if (value >= max) {
        // Optionally, perform actions upon completion (e.g., notify the user)
      }
    }

    showProgressText() {
      this.progressText.classList.remove('hidden');
      this.progressText.classList.add('active');
    }

    hideProgressText() {
      this.progressText.classList.remove('active');
      this.progressText.classList.add('hidden');
    }

    reset() {
      if (!this.initialized) return;
      this.progressBar.value = 0;
      this.progressBar.max = 100;

      const percentageSpan = this.progressText.querySelector('.progress-percentage');
      const stepsSpan = this.progressText.querySelector('.progress-steps');
      const timesSpan = this.progressText.querySelector('.progress-times');

      if (percentageSpan) percentageSpan.textContent = `0%`;
      if (stepsSpan) stepsSpan.textContent = `0/0/0.00s`;
      if (timesSpan) timesSpan.textContent = `00:00:00 / 00:00:00 < 00:00:00`;

      this.hideProgressText();
      this.timeTracker = new TimeTracker();
    }
  }

  window.ProgressUpdater = ProgressUpdater;
})();
