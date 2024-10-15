const openInNewTab = false;
function createAppCard(app) {
    const card = document.createElement('a');
    card.className = 'app-card';
    card.href = `flow/${app.url}`;
    
    if (openInNewTab) {
        card.target = "_blank";
        card.rel = "noopener noreferrer";
    }

    let thumbnailUrl = `flow/${app.url}/media/thumbnail.jpg`;
    let defaultThumbnail = '../core/media/ui/flow_logo.png';

    card.innerHTML = `
        <img src="${thumbnailUrl}" alt="${app.name} Thumbnail" onerror="this.onerror=null; this.src='${defaultThumbnail}';">
        <div class="app-card-content">
            <h3>${app.name}</h3>
            <p>${app.description}</p>
        </div>
    `;

    return card;
}

export async function loadApps() {
    try {
        const response = await fetch('/api/apps');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const apps = await response.json();
        const appGrid = document.getElementById('appGrid');
        apps.forEach(app => {
            if (app.id !== 'menu') {
                const appCard = createAppCard(app);
                appGrid.appendChild(appCard);
            }
        });
    } catch (error) {
        console.error('Error fetching apps:', error);
    }
}

export async function showVersion() {
    try {
        const response = await fetch('/api/flow-version');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const versionData = await response.json();
        document.getElementById('copyright').innerText = versionData.version;
    } catch (error) {
        console.error('Error fetching version:', error);
        document.getElementById('copyright').innerText = 'Error fetching version';


    }
}

export async function initializeMenu() {
    const categories = document.querySelectorAll('.menu-category > span');
    categories.forEach(category => {
        category.addEventListener('click', () => {
            const submenu = category.nextElementSibling;
            submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
        });
    });
}
showVersion();
