class SpatialAnalysis {
    constructor(map, dataModule) {
        this.map = map;
        this.dataModule = dataModule;
        this.analysisLayer = null;
        this.drawControl = null;
        this.currentAnalysis = null;
        this.init();
    }

    init() {
        this.analysisLayer = L.featureGroup().addTo(this.map);
        this.setupDrawControls();
    }

    setupDrawControls() {
        const drawOptions = {
            position: 'topright',
            draw: {
                polyline: false,
                polygon: false,
                circle: false,
                marker: false,
                rectangle: {
                    showArea: true,
                    metric: ['km', 'm'],
                    feet: false,
                    nautic: false
                }
            },
            edit: {
                featureGroup: this.analysisLayer,
                remove: true
            }
        };

        this.drawControl = new L.Control.Draw(drawOptions);
        this.map.addControl(this.drawControl);

        this.map.on(L.Draw.Event.CREATED, (e) => {
            this.onDrawCreated(e);
        });

        this.map.on(L.Draw.Event.EDITED, (e) => {
            this.onDrawEdited(e);
        });

        this.map.on(L.Draw.Event.DELETED, (e) => {
            this.onDrawDeleted(e);
        });
    }

    onDrawCreated(e) {
        const layer = e.layer;
        this.analysisLayer.addLayer(layer);

        switch (this.currentAnalysis) {
            case 'buffer':
                this.performBufferAnalysis(layer);
                break;
            case 'distance':
                this.performDistanceMeasurement(layer);
                break;
            case 'area':
                this.performAreaCalculation(layer);
                break;
            default:
                this.showAnalysisResults(layer);
        }
    }

    onDrawEdited(e) {
        const layers = e.layers;
        layers.eachLayer((layer) => {
            if (this.currentAnalysis === 'buffer') {
                this.performBufferAnalysis(layer);
            } else if (this.currentAnalysis === 'area') {
                this.performAreaCalculation(layer);
            }
        });
    }

    onDrawDeleted(e) {
        // No action needed for deleted layers
    }

    async performBufferAnalysis(layer) {
        if (!layer || layer.getRadius === undefined) {
            this.showMessage('Please draw a circle for buffer analysis');
            return;
        }

        const radius = layer.getRadius();
        const center = layer.getLatLng();

        const features = await this.dataModule.getLocalData();
        const bufferedFeatures = features.filter(feature => {
            if (!feature.geometry || !feature.geometry.coordinates) return false;

            let distance;
            if (feature.geometry.type === 'Point') {
                distance = this.calculateDistance(center, {
                    lat: feature.geometry.coordinates[1],
                    lng: feature.geometry.coordinates[0]
                });
            } else if (feature.geometry.type === 'LineString') {
                const linePoints = feature.geometry.coordinates.map(coord => ({
                    lat: coord[1],
                    lng: coord[0]
                }));
                distance = linePoints.reduce((minDist, point) => {
                    const dist = this.calculateDistance(center, point);
                    return Math.min(minDist, dist);
                }, Infinity);
            } else if (feature.geometry.type === 'Polygon') {
                const polygonPoints = feature.geometry.coordinates[0].map(coord => ({
                    lat: coord[1],
                    lng: coord[0]
                }));
                distance = this.calculateDistanceToPolygon(center, polygonPoints);
            }

            return distance <= radius;
        });

        this.showAnalysisResults(bufferedFeatures, `Buffer Analysis (Radius: ${radius}m)`);
    }

    async performDistanceMeasurement(layer) {
        if (!layer || layer.getLatLngs === undefined) {
            this.showMessage('Please draw a line for distance measurement');
            return;
        }

        const latlngs = layer.getLatLngs();
        let totalDistance = 0;

        for (let i = 0; i < latlngs.length - 1; i++) {
            totalDistance += this.calculateDistance(latlngs[i], latlngs[i + 1]);
        }

        const distanceKm = totalDistance / 1000;
        this.showAnalysisResults(layer, `Distance Measurement: ${distanceKm.toFixed(2)} km`);
    }

    async performAreaCalculation(layer) {
        if (!layer || layer.getArea === undefined) {
            this.showMessage('Please draw a polygon for area calculation');
            return;
        }

        const area = layer.getArea();
        const areaKm2 = area / 1000000;
        this.showAnalysisResults(layer, `Area Calculation: ${areaKm2.toFixed(2)} km²`);
    }

    async searchFeatures(query) {
        try {
            const features = await this.dataModule.searchData(query);
            this.showAnalysisResults(features, 'Search Results');
        } catch (error) {
            console.error('Search error:', error);
            this.showMessage('Error searching features');
        }
    }

    calculateDistance(point1, point2) {
        const R = 6371e3;
        const φ1 = point1.lat * Math.PI / 180;
        const φ2 = point2.lat * Math.PI / 180;
        const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
        const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    calculateDistanceToPolygon(point, polygonPoints) {
        let minDistance = Infinity;

        for (let i = 0; i < polygonPoints.length; i++) {
            const p1 = polygonPoints[i];
            const p2 = polygonPoints[(i + 1) % polygonPoints.length];
            const distance = this.calculateDistanceToLine(point, p1, p2);
            minDistance = Math.min(minDistance, distance);
        }

        return minDistance;
    }

    calculateDistanceToLine(point, linePoint1, linePoint2) {
        const x0 = point.lng, y0 = point.lat;
        const x1 = linePoint1.lng, y1 = linePoint1.lat;
        const x2 = linePoint2.lng, y2 = linePoint2.lat;

        const A = x2 - x1;
        const B = y2 - y1;
        const C = x1 * y2 - x2 * y1;

        return Math.abs(A * y0 - B * x0 + C) / Math.sqrt(A * A + B * B);
    }

    showAnalysisResults(results, title = 'Analysis Results') {
        const popupContent = this.createResultsPopup(results, title);
        const bounds = this.getResultsBounds(results);

        if (bounds) {
            this.map.fitBounds(bounds, { padding: [20, 20] });
        }

        this.showMessage(popupContent, 'analysis');
    }

    createResultsPopup(results, title) {
        let content = `<div class="analysis-results"><h3>${title}</h3>`;

        if (Array.isArray(results)) {
            content += `<p>Found ${results.length} features</p>`;
            content += '<ul>';
            results.forEach(feature => {
                content += `<li>${feature.properties.name || 'Unnamed Feature'} (${feature.properties.type})</li>`;
            });
            content += '</ul>';
        } else if (results.getRadius) {
            content += `<p>Buffer radius: ${results.getRadius()} meters</p>`;
        } else if (results.getArea) {
            const area = results.getArea() / 1000000;
            content += `<p>Area: ${area.toFixed(2)} km²</p>`;
        } else {
            content += `<p>Analysis complete</p>`;
        }

        content += '</div>';
        return content;
    }

    getResultsBounds(results) {
        if (Array.isArray(results)) {
            if (results.length === 0) return null;
            const bounds = results[0].geometry.type === 'Point'
                ? L.latLngBounds([[results[0].geometry.coordinates[1], results[0].geometry.coordinates[0]]])
                : L.latLngBounds();

            results.forEach(feature => {
                if (feature.geometry.type === 'Point') {
                    bounds.extend([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]);
                } else if (feature.geometry.type === 'LineString') {
                    feature.geometry.coordinates.forEach(coord => {
                        bounds.extend([coord[1], coord[0]]);
                    });
                } else if (feature.geometry.type === 'Polygon') {
                    feature.geometry.coordinates[0].forEach(coord => {
                        bounds.extend([coord[1], coord[0]]);
                    });
                }
            });

            return bounds;
        } else if (results.getBounds) {
            return results.getBounds();
        }

        return null;
    }

    showMessage(message, type = 'info') {
        const uiModule = new UIModule();
        uiModule.showNotification(message, type);
    }

    clearAnalysis() {
        if (this.analysisLayer) {
            this.analysisLayer.clearLayers();
        }
        if (this.drawControl) {
            this.map.removeControl(this.drawControl);
        }
        this.currentAnalysis = null;
    }

    setAnalysisType(type) {
        this.currentAnalysis = type;
        this.clearAnalysis();
        this.init();
    }

    bufferAnalysis(distance) {
        this.setAnalysisType('buffer');
        this.showMessage(`Draw a circle with radius ${distance}m for buffer analysis`);
    }

    measureDistance() {
        this.setAnalysisType('distance');
        this.showMessage('Draw a line to measure distance');
    }

    calculateArea() {
        this.setAnalysisType('area');
        this.showMessage('Draw a polygon to calculate area');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpatialAnalysis;
} else {
    window.SpatialAnalysis = SpatialAnalysis;
}
