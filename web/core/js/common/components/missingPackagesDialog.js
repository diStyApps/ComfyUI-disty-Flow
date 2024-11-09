async function checkAndShowMissingPackagesDialog(missingCustomPackages, missingNodes, flowConfig) {
    const combinedMissingCustomPackages = enrichMissingCustomPackages(missingCustomPackages, flowConfig);
    const filteredMissingCustomPackages = combinedMissingCustomPackages;

    if (filteredMissingCustomPackages.length === 0 && missingNodes.length === 0) {
        return;
    }

    showMissingPackagesDialog(filteredMissingCustomPackages, missingNodes);
}

function enrichMissingCustomPackages(missingCustomPackages, flowConfig) {
    if (!flowConfig.configCustomNodes) {
        return missingCustomPackages;
    }

    const customNodesByTitle = {};
    for (const nodeConfig of flowConfig.configCustomNodes) {
        customNodesByTitle[nodeConfig.title] = nodeConfig;
    }

    const enrichedPackages = missingCustomPackages.map(pkg => {
        let title;
        if (typeof pkg === 'string') {
            title = pkg;
        } else {
            title = pkg.title;
        }

        const nodeConfig = customNodesByTitle[title];
        if (nodeConfig) {
            return {
                title: nodeConfig.title,
                packageUrl: nodeConfig.installUrl,
                downloadModal: nodeConfig.downloadModal || {},
            };
        } else {
            return pkg;
        }
    });

    for (const nodeConfig of flowConfig.configCustomNodes) {
        if (!enrichedPackages.some(pkg => pkg.title === nodeConfig.title)) {
            enrichedPackages.push({
                title: nodeConfig.title,
                packageUrl: nodeConfig.installUrl,
                downloadModal: nodeConfig.downloadModal || {},
            });
        }
    }

    const uniquePackages = [];
    const seenTitles = new Set();
    for (const pkg of enrichedPackages) {
        if (!seenTitles.has(pkg.title)) {
            seenTitles.add(pkg.title);
            uniquePackages.push(pkg);
        }
    }

    return uniquePackages;
}

async function fetchInstalledCustomNodes() {
    try {
        const response = await fetch('/api/installed-custom-nodes');
        if (response.ok) {
            const data = await response.json();
            return data.installedNodes || [];
        } else {
            console.error('Failed to fetch installed custom nodes');
            return [];
        }
    } catch (error) {
        console.error('Error fetching installed custom nodes:', error);
        return [];
    }
}

function showMissingPackagesDialog(missingCustomPackages, missingNodes) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1e1e1e;
        color: #ffffff;
        padding: 24px;
        border: 2px dashed #ff4444;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        border-radius: 5px;
        z-index: 1000;
        min-width: 700px;
        width: 45%;
        max-height: 95vh;
        overflow-y: auto;
        font-family: Arial, sans-serif;
    `;

    const scrollbarStyles = `
        <style>
            .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: #121212 #2a2a2a;
                padding-right: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar {
                width: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #2a2a2a;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color:#121212;
                border: 2px solid #1e1e1f;  
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #8621b7;
            }
            .disabled-button {
                opacity: 0.5;
                cursor: not-allowed;
            }
        </style>
    `;

    let content = `
    ${scrollbarStyles}
    <h2 style="margin-top: 0; color: #ff4444; font-size: 24px; border-bottom: 1px dashed #ff4444; padding-bottom: 12px; text-align: center;">
        Nodes Unavailable
    </h2>
   <h4 style="margin-top: 0; color: #ff8c44; border-bottom: 1px dashed #ff4444; padding-top: 12px; padding-bottom: 12px; text-align: center;">
        Some custom nodes require manual installation. Follow the instructions on the custom node page.
    </h4>    
    `;

    if (missingCustomPackages.length > 0) {
        content += `
            <div style="margin-top: 20px;">
                <h3 style="color: #ffa500; font-size: 18px; padding-bottom: 12px;">${missingCustomPackages.length} Missing Custom Nodes:</h3>
                <div class="custom-scrollbar" style="max-height: 500px; overflow-y: auto;">
                    <ul style="list-style-type: none; padding-left: 0;">
                        ${missingCustomPackages.map(pkg => `
                            <li style="background: #2a2a2a;color: #ff4444; margin-bottom: 8px; padding: 8px 12px; ">
                                <div style="display: flex; align-items: center; justify-content: space-between;">
                                    <strong style="font-size: 22px;">${pkg.title}</strong>
                                    <div>
                                        <button class="install-btn" data-url="${pkg.packageUrl || ''}" data-download-modal='${JSON.stringify(pkg.downloadModal || {})}' style="
                                            margin-left: 10px; padding: 8px 12px; color: #28a745; background: #121212; border: none;  cursor: pointer; transition: 0.3s;">
                                            Install
                                        </button>
                                        <button class="update-btn" data-url="${pkg.packageUrl || ''}" style="
                                            margin-left: 10px; padding: 8px 12px; color: #ffc107; background: #121212; border: none;  cursor: pointer; transition: 0.3s;">
                                            Update
                                        </button>
                                        <button class="uninstall-btn" data-url="${pkg.packageUrl || ''}" style="
                                            margin-left: 10px; padding: 8px 12px; color: #dc3545; background: #121212; border: none; cursor: pointer; transition: 0.3s;">
                                            Uninstall
                                        </button>
                                    </div>
                                </div>
                                ${pkg.packageUrl ? `
                                <div style="margin-top: 8px; color: #1e90ff;">
                                    <a href="${pkg.packageUrl}" target="_blank" style="color: #1e90ff; text-decoration: none;">
                                        ${pkg.packageUrl}
                                    </a>
                                </div>
                                ` : pkg.downloadModal && pkg.downloadModal.downloadUrl ? `
                                <div style="margin-top: 8px; color: #1e90ff;">
                                    <a href="${pkg.downloadModal.downloadUrl}" target="_blank" style="color: #1e90ff; text-decoration: none;">
                                        ${pkg.downloadModal.downloadUrl}
                                    </a>
                                </div>
                                ` : ''}
                                <div class="status-message" style="margin-top: 8px; color: #28a745;"></div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    if (missingNodes.length > 0) {
        content += `
            <div style="margin-top: 20px;">
                <h3 style="color: #ffa500; font-size: 18px; cursor: pointer;" id="toggle-missing-nodes">
                    ${missingNodes.length} Missing Nodes: (Click to toggle)
                </h3>
                <div id="missing-nodes-list" class="custom-scrollbar" style="max-height: 100px; overflow-y: auto; display: none;">
                    <ul style="list-style-type: none; padding-left: 0;">
                        ${missingNodes.map(node => `
                            <li style="background: #2a2a2a; margin-bottom: 8px; padding: 4px 12px;">
                                ${node}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    content += `
        <div style="text-align: center; margin-top: 20px;">
            <a href="/flow" style="
                display: inline-block;
                padding: 10px 20px;
                background-color: #121212;
                color: #8621b7;
                text-decoration: none;
                font-weight: bold;
                transition: background-color 0.3s;
            ">Return to Menu</a>
        </div>
    `;

    dialog.innerHTML = content;
    dialog.classList.add('custom-scrollbar');

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    const allActionButtons = document.querySelectorAll('.install-btn, .update-btn, .uninstall-btn');

    allActionButtons.forEach(button => {
        button.addEventListener('mouseover', function() {
            if (!this.disabled) {
                const currentBg = getComputedStyle(this).backgroundColor;
                const currentTextColor = getComputedStyle(this).color;
                this.style.backgroundColor = currentTextColor;
                this.style.color = currentBg;
            }
        });

        button.addEventListener('mouseout', function() {
            if (!this.disabled) {
                let originalColor;
                if (this.classList.contains('install-btn')) {
                    originalColor = '#28a745'; // Green
                } else if (this.classList.contains('update-btn')) {
                    originalColor = '#ffc107'; // Yellow
                } else if (this.classList.contains('uninstall-btn')) {
                    originalColor = '#dc3545'; // Red
                }
                this.style.backgroundColor = '#121212';
                this.style.color = originalColor;
            }
        });
    });

    document.querySelectorAll('.install-btn').forEach(button => {
        button.addEventListener('click', function() {
            handleButtonClick(this, sendInstallRequest);
        });
    });

    document.querySelectorAll('.update-btn').forEach(button => {
        button.addEventListener('click', function() {
            handleButtonClick(this, sendUpdateRequest);
        });
    });

    document.querySelectorAll('.uninstall-btn').forEach(button => {
        button.addEventListener('click', function() {
            handleButtonClick(this, sendUninstallRequest);
        });
    });

    const toggleMissingNodes = document.getElementById('toggle-missing-nodes');
    const missingNodesList = document.getElementById('missing-nodes-list');
    if (toggleMissingNodes && missingNodesList) {
        toggleMissingNodes.addEventListener('click', function() {
            missingNodesList.style.display = missingNodesList.style.display === 'none' ? 'block' : 'none';
        });
    }
}

function handleButtonClick(button, requestFunction) {
    if (button.disabled) return;

    const packageUrl = button.getAttribute('data-url');
    const downloadModalData = button.getAttribute('data-download-modal');
    const downloadModal = downloadModalData ? JSON.parse(downloadModalData) : {};
    const statusMessage = button.closest('li').querySelector('.status-message');

    const allButtons = document.querySelectorAll('.install-btn, .update-btn, .uninstall-btn');
    allButtons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled-button');
    });

    requestFunction(packageUrl, downloadModal, statusMessage)
        .finally(() => {
            allButtons.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('disabled-button');
            });
        });
}

function sendInstallRequest(packageUrl, downloadModal, statusMessageElement) {
    statusMessageElement.textContent = 'Installing...';
    return fetch('/api/install-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageUrl, downloadModal })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            statusMessageElement.textContent = `${data.message} Reset ComfyUI to apply changes.`;
        } else if (data.status === 'already_installed') {
            statusMessageElement.textContent = `${data.message} Reset ComfyUI to apply changes.`;
        } else {
            statusMessageElement.textContent = data.message || 'Installation failed.';
        }
    })
    .catch(error => {
        console.error('Installation error:', error);
        statusMessageElement.textContent = 'Installation failed.';
    });
}

function sendUpdateRequest(packageUrl, downloadModal, statusMessageElement) {
    statusMessageElement.textContent = 'Updating...';
    return fetch('/api/update-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageUrl })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            statusMessageElement.textContent = `${data.message} \n Reset ComfyUI to apply changes.`;
        } else if (data.status === 'not_installed') {
            statusMessageElement.textContent = data.message;
        } else {
            statusMessageElement.textContent = data.message || 'Update failed.';
        }
    })
    .catch(error => {
        console.error('Update error:', error);
        statusMessageElement.textContent = 'Update failed.';
    });
}

function sendUninstallRequest(packageUrl, downloadModal, statusMessageElement) {
    statusMessageElement.textContent = 'Uninstalling...';
    return fetch('/api/uninstall-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageUrl })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            statusMessageElement.textContent = `${data.message} Reset ComfyUI to apply changes.`;
        } else if (data.status === 'not_installed') {
            statusMessageElement.textContent = data.message;
        } else {
            statusMessageElement.textContent = data.message || 'Uninstallation failed.';
        }
    })
    .catch(error => {
        console.error('Uninstallation error:', error);
        statusMessageElement.textContent = 'Uninstallation failed.';
    });
}

export { checkAndShowMissingPackagesDialog };
