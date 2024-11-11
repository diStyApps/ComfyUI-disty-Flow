(function() {
  const progressBarHTML = `
    <div id="loading-area">
      <div id="spinner"></div>
      <progress id="main-progress" class="progress" value="0" max="10000"></progress>
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
    // console.log('Progress bar content inserted');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertProgressBar);
  } else {
    insertProgressBar();
  }
  window.insertProgressBar = insertProgressBar;
})();
