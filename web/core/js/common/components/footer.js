(function() {
  async function getVersion() {
      try {
          const response = await fetch('/api/flow-version');
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          const versionData = await response.json();
          return versionData.version;
      } catch (error) {
          console.error('Error fetching version:', error);
          return 'Error fetching version';
        }

  }

  async function insertFooter() {
      const version = await getVersion();
      const footerHTML = `
          <div id="footer-content">
              <p id="copyright"> ${version}</p>
          </div>
      `;
      let footer = document.querySelector('footer');
      if (!footer) {
          footer = document.createElement('footer');
          document.body.insertAdjacentElement('beforeend', footer);
      }
      footer.innerHTML = footerHTML;
  }

  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', insertFooter);
  } else {
      insertFooter();
  }

  window.insertFooter = insertFooter;
})();
