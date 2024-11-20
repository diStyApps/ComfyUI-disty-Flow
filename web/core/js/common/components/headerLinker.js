const appName = "Flow";
const headerHTML = `
    <div id="logo">
      <div id="img-logo">
        <img src="/core/media/ui/flow_logo.png" alt="N/A">
      </div>
      <div class="logo-text">
        <span class="left">{</span>
        <span class="right">}</span>
        <span class="text"><strong>${appName}</strong></span>
      </div>
    </div>
  <div class="appName"><h2>Linker</h2></div>
  <div id="mid"></div>
  <div id="right-header">
    <div id="theme-selector"></div>

    <a href="https://www.patreon.com/distyx" target="_blank" rel="noopener noreferrer">
      <div id="Support">Support in keeping the flow.</div>
    </a>
    <div id="patreon">
      <a href="https://www.patreon.com/distyx" target="_blank" rel="noopener noreferrer" style="margin-right: 10px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill=var(--color-header-text)>
          <path d="M14.82 2.41c3.96 0 7.18 3.22 7.18 7.18 0 3.96-3.22 7.18-7.18 7.18-3.96 0-7.18-3.22-7.18-7.18 0-3.96 3.22-7.18 7.18-7.18M2 21.6h3.5V2.41H2V21.6z"/>
        </svg>
      </a>
    </div>
    <div id="github">
      <a href="https://github.com/diStyApps/ComfyUI-disty-Flow" target="_blank" rel="noopener noreferrer">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill=var(--color-header-text) />
        </svg>
      </a>
    </div>
    <div id="x">
      <a href="https://x.com/diStylands" target="_blank" rel="noopener noreferrer" style="margin-left: 10px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill=var(--color-header-text)>
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
        </svg>
      </a>
    </div>
  <div id="discord">
    <a href="https://discord.com/invite/KJrgdD8D" target="_blank" rel="noopener noreferrer" style="margin-left: 10px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill=var(--color-header-text)>
        <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.211.37-.444.855-.608 1.234a19.736 19.736 0 00-5.433 0 12.505 12.505 0 00-.617-1.234.077.077 0 00-.079-.037 19.741 19.741 0 00-4.885 1.515.069.069 0 00-.032.027C1.99 9.034 1.157 13.51 1.5 17.926a.081.081 0 00.031.056 19.912 19.912 0 005.994 3.03.079.079 0 00.084-.027c.461-.63.874-1.296 1.226-1.991a.078.078 0 00-.041-.106 12.548 12.548 0 01-1.835-.89.078.078 0 01-.007-.128c.123-.093.246-.187.365-.284a.074.074 0 01.077-.01c3.867 1.778 8.036 1.778 11.874 0a.073.073 0 01.078.009c.12.097.243.191.366.285a.078.078 0 01-.006.127c-.585.343-1.2.644-1.836.89a.078.078 0 00-.04.106c.36.695.772 1.361 1.225 1.991a.078.078 0 00.084.028 19.889 19.889 0 005.995-3.03.077.077 0 00.03-.055c.417-4.36-.676-8.79-3.549-13.53a.062.062 0 00-.031-.028zM8.02 15.418c-1.182 0-2.156-1.086-2.156-2.419 0-1.333.95-2.419 2.156-2.419 1.211 0 2.185 1.092 2.156 2.419 0 1.333-.95 2.419-2.156 2.419zm7.963 0c-1.182 0-2.156-1.086-2.156-2.419 0-1.333.95-2.419 2.156-2.419 1.211 0 2.185 1.092 2.156 2.419 0 1.333-.945 2.419-2.156 2.419z"/>
      </svg>
    </a>
  </div>    
  </div>
`;

export function insertElement() {
  const header = document.querySelector('header');
  if (header) {
    header.innerHTML = headerHTML;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', insertElement);
} else {
  insertElement();
}
