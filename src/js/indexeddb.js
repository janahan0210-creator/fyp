class IndexedDBManager {
    constructor() {
        this.db = null;
        this.dataStoreName = 'marineData';
        this.tileStoreName = 'mapTiles';
        this.syncStoreName = 'syncQueue';
        this.init();
    }

    async init() {
        await this.openDatabase();
    }

    async openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MarineWebGIS', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create data store for marine spatial data
                if (!db.objectStoreNames.contains(this.dataStoreName)) {
                    db.createObjectStore(this.dataStoreName, { keyPath: 'id' });
                }

                // Create tile store for cached map tiles
                if (!db.objectStoreNames.contains(this.tileStoreName)) {
                    db.createObjectStore(this.tileStoreName, { keyPath: 'url' });
                }

                // Create sync store for offline data synchronization
                if (!db.objectStoreNames.contains(this.syncStoreName)) {
                    db.createObjectStore(this.syncStoreName, { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    async storeData(features) {
        if (!this.db || !features || features.length === 0) return;

        const transaction = this.db.transaction([this.dataStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.dataStoreName);

        features.forEach(feature => {
            if (feature.id) {
                objectStore.put(feature);
            }
        });

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getData() {
        if (!this.db) return [];

        const transaction = this.db.transaction([this.dataStoreName], 'readonly');
        const objectStore = transaction.objectStore(this.dataStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getDataById(id) {
        if (!this.db) return null;

        const transaction = this.db.transaction([this.dataStoreName], 'readonly');
        const objectStore = transaction.objectStore(this.dataStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addData(features) {
        if (!this.db || !features || features.length === 0) return;

        const transaction = this.db.transaction([this.dataStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.dataStoreName);

        features.forEach(feature => {
            if (feature.id) {
                objectStore.add(feature);
            }
        });

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async updateData(features) {
        if (!this.db || !features || features.length === 0) return;

        const transaction = this.db.transaction([this.dataStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.dataStoreName);

        features.forEach(feature => {
            if (feature.id) {
                objectStore.put(feature);
            }
        });

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async deleteData(id) {
        if (!this.db) return;

        const transaction = this.db.transaction([this.dataStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.dataStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async searchData(query) {
        if (!this.db) return [];

        const transaction = this.db.transaction([this.dataStoreName], 'readonly');
        const objectStore = transaction.objectStore(this.dataStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.openCursor();
            const results = [];

            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    const feature = cursor.value;
                    if (this.matchesQuery(feature, query)) {
                        results.push(feature);
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    matchesQuery(feature, query) {
        if (!query) return true;

        return Object.keys(query).every(key => {
            if (key === 'geometry') {
                return true; // Geometry queries need special handling
            }
            const value = feature.properties[key];
            const queryValue = query[key];
            return value && value.toString().toLowerCase().includes(queryValue.toString().toLowerCase());
        });
    }

    async clearData() {
        if (!this.db) return;

        const transaction = this.db.transaction([this.dataStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.dataStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async cacheTile(url, blob) {
        if (!this.db) return;

        const transaction = this.db.transaction([this.tileStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.tileStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.add(blob, url);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getCachedTile(url) {
        if (!this.db) return null;

        const transaction = this.db.transaction([this.tileStoreName], 'readonly');
        const objectStore = transaction.objectStore(this.tileStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.get(url);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearTileCache() {
        if (!this.db) return;

        const transaction = this.db.transaction([this.tileStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.tileStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async addToSyncQueue(data) {
        if (!this.db) return;

        const transaction = this.db.transaction([this.syncStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.syncStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getSyncQueue() {
        if (!this.db) return [];

        const transaction = this.db.transaction([this.syncStoreName], 'readonly');
        const objectStore = transaction.objectStore(this.syncStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearSyncQueue() {
        if (!this.db) return;

        const transaction = this.db.transaction([this.syncStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.syncStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async deleteFromSyncQueue(id) {
        if (!this.db) return;

        const transaction = this.db.transaction([this.syncStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.syncStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexedDBManager;
} else {
    window.IndexedDBManager = IndexedDBManager;
}