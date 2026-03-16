class MarineWebGIS {
    constructor() {
        this.map = null;
        this.features = [];
        this.offline = false;
        this.installed = false;
        this.indexedDB = null;
        this.spatialAnalysis = null;
        this.init();
    }

    async init() {
        await this.checkInstallation();
        await this.checkOnlineStatus();
        this.setupEventListeners();
        await this.initializeData();
        this.initializeMap();
        this.initializeAnalysis();
        // Register service worker
        this.registerServiceWorker();
    }

    async initializeData() {
        try {
            this.indexedDB = new IndexedDBManager();
            await this.indexedDB.init();
            this.features = await this.loadData();
            console.log('Data initialized:', this.features);
        } catch (error) {
            console.error('Error initializing data:', error);
        }
    }

    async loadData() {
        try {
            const dataModule = new DataModule();
            const features = await dataModule.loadSampleData();
            await this.indexedDB.storeData(features);
            return features;
        } catch (error) {
            console.error('Error loading data:', error);
            return [];
        }
    }

    initializeMap() {
        const mapModule = new MapModule();
        this.map = mapModule.createMap();
        if (this.features && this.features.length > 0) {
            mapModule.addFeatures(this.map, this.features);
        }
    }

    initializeAnalysis() {
        if (this.map && this.features) {
            this.spatialAnalysis = new SpatialAnalysis(this.map, new DataModule());
        }
    }

    async addFeature(feature) {
        try {
            await this.indexedDB.addData([feature]);
            const mapModule = new MapModule();
            mapModule.addFeatures(this.map, [feature]);
            this.features.push(feature);
            this.showMessage('Feature added successfully');
        } catch (error) {
            console.error('Error adding feature:', error);
            this.showMessage('Error adding feature');
        }
    }

    async deleteFeature(featureId) {
        try {
            await this.indexedDB.deleteData(featureId);
            // TODO: Remove from map
            this.features = this.features.filter(f => f.id !== featureId);
            this.showMessage('Feature deleted successfully');
        } catch (error) {
            console.error('Error deleting feature:', error);
            this.showMessage('Error deleting feature');
        }
    }

    async searchFeatures(query) {
        try {
            const results = await this.indexedDB.searchData(query);
            const mapModule = new MapModule();
            mapModule.clearOverlays();
            mapModule.addFeatures(this.map, results);
            this.showMessage(`Found ${results.length} features`);
        } catch (error) {
            console.error('Error searching features:', error);
            this.showMessage('Error searching features');
        }
    }

    bufferAnalysis(distance) {
        if (this.spatialAnalysis) {
            this.spatialAnalysis.bufferAnalysis(distance);
        }
    }

    measureDistance() {
        if (this.spatialAnalysis) {
            this.spatialAnalysis.measureDistance();
        }
    }

    calculateArea() {
        if (this.spatialAnalysis) {
            this.spatialAnalysis.calculateArea();
        }
    }

    clearAnalysis() {
        if (this.spatialAnalysis) {
            this.spatialAnalysis.clearAnalysis();
        }
    }

    showMessage(message, type = 'info') {
        const uiModule = new UIModule();
        uiModule.showNotification(message, type);
    }

    closeModal() {
        const uiModule = new UIModule();
        uiModule.closeModal();
    }

    editFeature(featureId) {
        this.showMessage('Edit feature functionality not yet implemented');
    }

    deleteFeature(featureId) {
        this.deleteFeature(featureId);
    }

    async checkInstallation() {
        if ('getInstalledRelatedApps' in window.navigator) {
            const app = {
                platform: 'webapp',
                url: window.location.href,
                id: ''
            };
            const relatedApps = await window.navigator.getInstalledRelatedApps();
            this.installed = relatedApps.filter(app => app.platform === 'webapp').length > 0;
        }

        if (!this.installed && 'onappinstalled' in window.navigator) {
            window.addEventListener('appinstalled', (event) => {
                this.installed = true;
                this.updateInstallButton();
            });

            this.updateInstallButton();
        }
    }

    updateInstallButton() {
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            if (this.installed) {
                installBtn.classList.add('hidden');
            } else {
                installBtn.classList.remove('hidden');
            }
        }
    }

    async checkOnlineStatus() {
        this.offline = !navigator.onLine;
        this.updateOfflineStatus();
        window.addEventListener('online', () => {
            this.offline = false;
            this.updateOfflineStatus();
        });
        window.addEventListener('offline', () => {
            this.offline = true;
            this.updateOfflineStatus();
        });
    }

    updateOfflineStatus() {
        const statusBtn = document.getElementById('offlineStatus');
        if (statusBtn) {
            statusBtn.textContent = this.offline ? 'Offline' : 'Online';
            statusBtn.style.background = this.offline ? '#dc3545' : '#28a745';
        }
    }

    setupEventListeners() {
        const installBtn = document.getElementById('installBtn');
        if (installBtn && !this.installed) {
            installBtn.addEventListener('click', () => {
                this.installApp();
            });
        }

        const toggleLayersBtn = document.getElementById('toggleLayers');
        if (toggleLayersBtn) {
            toggleLayersBtn.addEventListener('click', () => {
                this.toggleLayers();
            });
        }

        const analysisToolsBtn = document.getElementById('analysisTools');
        if (analysisToolsBtn) {
            analysisToolsBtn.addEventListener('click', () => {
                this.openAnalysisTools();
            });
        }

        const offlineModeBtn = document.getElementById('offlineMode');
        if (offlineModeBtn) {
            offlineModeBtn.addEventListener('click', () => {
                this.toggleOfflineMode();
            });
        }
    }

    installApp() {
        if ('installManager' in window.navigator) {
            window.navigator.installManager.prompt({
                title: 'Install Marine WebGIS',
                message: 'Add this app to your home screen for offline access',
                icon: '/assets/icons/icon-192x192.png'
            }).then((result) => {
                if (result.outcome === 'accepted') {
                    console.log('App installation accepted');
                } else {
                    console.log('App installation rejected');
                }
            }).catch((error) => {
                console.error('Install error:', error);
            });
        }
    }

    toggleLayers() {
        console.log('Toggle layers functionality');
    }

    openAnalysisTools() {
        console.log('Open analysis tools');
    }

    toggleOfflineMode() {
        this.offline = !this.offline;
        this.updateOfflineStatus();
        console.log('Offline mode toggled:', this.offline);
    }

    async loadData() {
        try {
            const dataModule = new DataModule();
            this.features = await dataModule.loadSampleData();
            console.log('Data loaded:', this.features);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    initializeMap() {
        const mapModule = new MapModule();
        this.map = mapModule.createMap();
        if (this.features && this.features.length > 0) {
            mapModule.addFeatures(this.map, this.features);
        }
    }

    // Service Worker Registration
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service worker registered:', registration);
                return registration;
            } catch (error) {
                console.error('Service worker registration failed:', error);
            }
        }
        return null;
    }

    async unregisterServiceWorker() {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
            console.log('Service worker unregistered');
        }
    }
}

const app = new MarineWebGIS();