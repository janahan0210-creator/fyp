class UIModule {
    constructor() {
        this.sidebarVisible = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupLoadingStates();
    }

    setupEventListeners() {
        const sidebarToggle = document.getElementById('toggleLayers');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        const analysisBtn = document.getElementById('analysisTools');
        if (analysisBtn) {
            analysisBtn.addEventListener('click', () => {
                this.openAnalysisTools();
            });
        }

        const offlineBtn = document.getElementById('offlineMode');
        if (offlineBtn) {
            offlineBtn.addEventListener('click', () => {
                this.toggleOfflineMode();
            });
        }
    }

    setupLoadingStates() {
        this.loadingElement = document.getElementById('loading');
        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');
        }
    }

    showLoading(message = 'Loading...') {
        if (this.loadingElement) {
            this.loadingElement.textContent = message;
            this.loadingElement.classList.remove('hidden');
        }
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (this.sidebarVisible) {
                sidebar.classList.add('hidden');
                this.sidebarVisible = false;
            } else {
                sidebar.classList.remove('hidden');
                this.sidebarVisible = true;
            }
        }
    }

    updateFeatureList(features) {
        const featureList = document.getElementById('featureList');
        if (featureList && features) {
            featureList.innerHTML = '';

            features.forEach(feature => {
                const featureItem = document.createElement('div');
                featureItem.className = 'feature-item';
                featureItem.innerHTML = `
                    <h4>${feature.properties.name || 'Unnamed Feature'}</h4>
                    <p>${feature.properties.type || 'Unknown'}</p>
                `;
                featureItem.addEventListener('click', () => {
                    this.showFeatureInfo(feature);
                });
                featureList.appendChild(featureItem);
            });
        }
    }

    showFeatureInfo(feature) {
        const featureInfo = document.getElementById('featureInfo');
        const featureAttributes = document.getElementById('featureAttributes');
        const sidebar = document.getElementById('sidebar');

        if (featureInfo && featureAttributes && sidebar) {
            let content = '<table class="feature-attributes">';

            for (const [key, value] of Object.entries(feature.properties)) {
                content += `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`;
            }

            content += '</table>';
            featureAttributes.innerHTML = content;
            featureInfo.classList.remove('hidden');
            sidebar.classList.remove('hidden');
            this.sidebarVisible = true;
        }
    }

    hideFeatureInfo() {
        const featureInfo = document.getElementById('featureInfo');
        if (featureInfo) {
            featureInfo.classList.add('hidden');
        }
    }

    openAnalysisTools() {
        this.showModal('Analysis Tools', `
            <div class="analysis-tools">
                <h3>Spatial Analysis</h3>
                <div class="tool-option">
                    <label>Buffer Analysis</label>
                    <input type="number" id="bufferDistance" placeholder="Distance (km)">
                    <button onclick="app.bufferAnalysis()">Run Buffer</button>
                </div>
                <div class="tool-option">
                    <label>Distance Measurement</label>
                    <button onclick="app.measureDistance()">Measure Distance</button>
                </div>
                <div class="tool-option">
                    <label>Area Calculation</label>
                    <button onclick="app.calculateArea()">Calculate Area</button>
                </div>
            </div>
        `);
    }

    toggleOfflineMode() {
        const offlineBtn = document.getElementById('offlineMode');
        if (offlineBtn) {
            offlineBtn.textContent = this.isOffline ? 'Online Mode' : 'Offline Mode';
            offlineBtn.style.background = this.isOffline ? '#28a745' : '#dc3545';
        }
    }

    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-btn" onclick="app.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    closeModal() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    createContextMenu(options, position) {
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.left = `${position.x}px`;
        contextMenu.style.top = `${position.y}px`;

        options.forEach(option => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = option.label;
            menuItem.onclick = option.action;
            contextMenu.appendChild(menuItem);
        });

        document.body.appendChild(contextMenu);

        setTimeout(() => {
            contextMenu.remove();
        }, 5000);
    }

    updateMapControls(controls) {
        const mapControls = document.querySelector('.map-controls');
        if (mapControls) {
            mapControls.innerHTML = '';
            controls.forEach(control => {
                const button = document.createElement('button');
                button.textContent = control.label;
                button.onclick = control.action;
                mapControls.appendChild(button);
            });
        }
    }

    createFeaturePopup(feature) {
        const popup = document.createElement('div');
        popup.className = 'feature-popup';
        popup.innerHTML = `
            <h4>${feature.properties.name || 'Unnamed Feature'}</h4>
            <table class="feature-attributes">
                ${Object.entries(feature.properties).map(([key, value]) => {
                    if (key !== 'name') {
                        return `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`;
                    }
                    return '';
                }).join('')}
            </table>
            <div class="popup-actions">
                <button onclick="app.editFeature('${feature.id}')">Edit</button>
                <button onclick="app.deleteFeature('${feature.id}')">Delete</button>
            </div>
        `;
        return popup;
    }

    addLayerControl(layerName, action) {
        const mapControls = document.querySelector('.map-controls');
        if (mapControls) {
            const button = document.createElement('button');
            button.textContent = layerName;
            button.onclick = action;
            mapControls.appendChild(button);
        }
    }

    createLegend(layers) {
        const legend = document.createElement('div');
        legend.className = 'legend';
        legend.innerHTML = '<h4>Legend</h4>';

        layers.forEach(layer => {
            const layerItem = document.createElement('div');
            layerItem.className = 'legend-item';
            layerItem.innerHTML = `
                <span class="legend-color" style="background-color: ${layer.color}"></span>
                <span class="legend-label">${layer.name}</span>
            `;
            legend.appendChild(layerItem);
        });

        document.body.appendChild(legend);
        return legend;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIModule;
} else {
    window.UIModule = UIModule;
}