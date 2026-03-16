class OfflineModule {
    constructor() {
        this.isOffline = false;
        this.syncQueue = [];
        this.init();
    }

    init() {
        this.checkOnlineStatus();
        this.setupEventListeners();
        this.setupBackgroundSync();
    }

    checkOnlineStatus() {
        this.isOffline = !navigator.onLine;
        this.updateUI();
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOffline = false;
            this.updateUI();
            this.processSyncQueue();
        });

        window.addEventListener('offline', () => {
            this.isOffline = true;
            this.updateUI();
        });
    }

    setupBackgroundSync() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('sync-data');
            });
        }
    }

    updateUI() {
        const statusBtn = document.getElementById('offlineStatus');
        if (statusBtn) {
            statusBtn.textContent = this.isOffline ? 'Offline' : 'Online';
            statusBtn.style.background = this.isOffline ? '#dc3545' : '#28a745';
        }
    }

    async addToSyncQueue(data) {
        this.syncQueue.push(data);
        await this.storeSyncData(data);
        console.log('Data added to sync queue:', data);
    }

    async storeSyncData(data) {
        try {
            const db = await this.openSyncDB();
            const transaction = db.transaction(['syncQueue'], 'readwrite');
            const objectStore = transaction.objectStore('syncQueue');
            objectStore.add(data);
            await transaction.complete;
        } catch (error) {
            console.error('Error storing sync data:', error);
        }
    }

    async processSyncQueue() {
        try {
            const db = await this.openSyncDB();
            const transaction = db.transaction(['syncQueue'], 'readwrite');
            const objectStore = transaction.objectStore('syncQueue');
            const allData = await objectStore.getAll();

            if (allData.length > 0) {
                console.log('Processing sync queue:', allData);
                await this.syncDataWithServer(allData);
                await this.clearSyncQueue();
            }
        } catch (error) {
            console.error('Error processing sync queue:', error);
        }
    }

    async syncDataWithServer(data) {
        try {
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                console.log('Data synced successfully');
                return true;
            } else {
                console.error('Sync failed with status:', response.status);
                return false;
            }
        } catch (error) {
            console.error('Sync error:', error);
            return false;
        }
    }

    async clearSyncQueue() {
        try {
            const db = await this.openSyncDB();
            const transaction = db.transaction(['syncQueue'], 'readwrite');
            const objectStore = transaction.objectStore('syncQueue');
            const request = objectStore.clear();
            await transaction.complete;
        } catch (error) {
            console.error('Error clearing sync queue:', error);
        }
    }

    async openSyncDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MarineWebGIS_Sync', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    async cacheMapTiles(bounds, zoom) {
        try {
            const db = await this.openTileCacheDB();
            const transaction = db.transaction(['mapTiles'], 'readwrite');
            const objectStore = transaction.objectStore('mapTiles');

            const promises = [];
            for (let x = bounds.min.x; x <= bounds.max.x; x++) {
                for (let y = bounds.min.y; y <= bounds.max.y; y++) {
                    const url = this.getTileUrl(zoom, x, y);
                    promises.push(this.cacheTile(objectStore, url));
                }
            }

            await Promise.all(promises);
            console.log('Map tiles cached for bounds:', bounds, 'zoom:', zoom);
        } catch (error) {
            console.error('Error caching map tiles:', error);
        }
    }

    async cacheTile(objectStore, url) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                objectStore.add(blob, url);
            }
        } catch (error) {
            console.error('Error caching tile:', url, error);
        }
    }

    async getCachedTile(url) {
        try {
            const db = await this.openTileCacheDB();
            const transaction = db.transaction(['mapTiles'], 'readonly');
            const objectStore = transaction.objectStore('mapTiles');

            return new Promise((resolve, reject) => {
                const request = objectStore.get(url);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error getting cached tile:', error);
            return null;
        }
    }

    async openTileCacheDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MarineWebGIS_Tiles', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('mapTiles')) {
                    db.createObjectStore('mapTiles', { keyPath: 'url' });
                }
            };
        });
    }

    async getOfflineFeatures() {
        try {
            const dataModule = new DataModule();
            return await dataModule.getLocalData();
        } catch (error) {
            console.error('Error getting offline features:', error);
            return [];
        }
    }

    async saveOfflineFeature(feature) {
        try {
            const dataModule = new DataModule();
            await dataModule.addData([feature]);
            await this.addToSyncQueue(feature);
            console.log('Feature saved offline:', feature);
        } catch (error) {
            console.error('Error saving offline feature:', error);
        }
    }

    async deleteOfflineFeature(featureId) {
        try {
            const dataModule = new DataModule();
            await dataModule.deleteData(featureId);
            console.log('Feature deleted offline:', featureId);
        } catch (error) {
            console.error('Error deleting offline feature:', error);
        }
    }

    async searchOfflineFeatures(query) {
        try {
            const dataModule = new DataModule();
            return await dataModule.searchData(query);
        } catch (error) {
            console.error('Error searching offline features:', error);
            return [];
        }
    }

    async clearOfflineData() {
        try {
            const dataModule = new DataModule();
            await dataModule.clearAllData();
            console.log('All offline data cleared');
        } catch (error) {
            console.error('Error clearing offline data:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineModule;
} else {
    window.OfflineModule = OfflineModule;
}