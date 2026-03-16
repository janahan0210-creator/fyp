class DataModule {
    constructor() {
        this.db = null;
        this.sampleData = [];
        this.dataStoreName = 'marineData';
        this.init();
    }

    async init() {
        await this.openDatabase();
        await this.loadSampleData();
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
                if (!db.objectStoreNames.contains(this.dataStoreName)) {
                    db.createObjectStore(this.dataStoreName, { keyPath: 'id' });
                }
            };
        });
    }

    async loadSampleData() {
        if (this.sampleData.length > 0) {
            return this.sampleData;
        }

        try {
            const response = await fetch('/src/data/sample-data.geojson');
            if (response.ok) {
                const data = await response.json();
                this.sampleData = data.features || [];
                await this.storeDataLocally(this.sampleData);
                return this.sampleData;
            } else {
                console.warn('Could not fetch sample data, using fallback');
                return this.getFallbackData();
            }
        } catch (error) {
            console.warn('Error fetching sample data:', error);
            return this.getFallbackData();
        }
    }

    async storeDataLocally(features) {
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

    async getLocalData() {
        if (!this.db) return [];

        const transaction = this.db.transaction([this.dataStoreName], 'readonly');
        const objectStore = transaction.objectStore(this.dataStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.getAll();
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
                objectStore.put(feature);
            }
        });

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async deleteData(featureId) {
        if (!this.db) return;

        const transaction = this.db.transaction([this.dataStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.dataStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.delete(featureId);
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
                return true;
            }
            const value = feature.properties[key];
            const queryValue = query[key];
            return value && value.toString().toLowerCase().includes(queryValue.toString().toLowerCase());
        });
    }

    getFallbackData() {
        return [
            {
                "type": "Feature",
                "id": "survey_point_1",
                "properties": {
                    "name": "Survey Point A",
                    "type": "survey",
                    "depth": "15m",
                    "date": "2024-01-15",
                    "status": "active"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [103.8198, 1.3521]
                }
            },
            {
                "type": "Feature",
                "id": "survey_point_2",
                "properties": {
                    "name": "Survey Point B",
                    "type": "survey",
                    "depth": "22m",
                    "date": "2024-01-20",
                    "status": "active"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [103.8521, 1.3867]
                }
            },
            {
                "type": "Feature",
                "id": "marine_route_1",
                "properties": {
                    "name": "Shipping Route 1",
                    "type": "route",
                    "vessel_type": "cargo",
                    "traffic_density": "high",
                    "status": "active"
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [103.8198, 1.3521],
                        [103.8521, 1.3867],
                        [103.8765, 1.4012]
                    ]
                }
            },
            {
                "type": "Feature",
                "id": "coastal_area_1",
                "properties": {
                    "name": "Coastal Protection Zone",
                    "type": "protected_area",
                    "category": "marine_park",
                    "status": "protected",
                    "established": "2020"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [103.8000, 1.3400],
                            [103.8500, 1.3400],
                            [103.8500, 1.4000],
                            [103.8000, 1.4000],
                            [103.8000, 1.3400]
                        ]
                    ]
                }
            }
        ];
    }

    clearAllData() {
        if (!this.db) return;

        const transaction = this.db.transaction([this.dataStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.dataStoreName);

        return new Promise((resolve, reject) => {
            const request = objectStore.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataModule;
} else {
    window.DataModule = DataModule;
}
