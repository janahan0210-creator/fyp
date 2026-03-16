class MapModule {
    constructor() {
        this.map = null;
        this.baseLayers = {};
        this.overlayLayers = {};
        this.tileLayer = null;
    }

    createMap(containerId = 'map', center = [0, 0], zoom = 2) {
        this.map = L.map(containerId, {
            center: center,
            zoom: zoom,
            zoomControl: true,
            attributionControl: true
        });

        this.setupBaseLayers();
        this.setupEventHandlers();

        return this.map;
    }

    setupBaseLayers() {
        // OpenStreetMap base layer
        this.baseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        // Marine-focused base layer (example)
        this.baseLayers.marine = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
        });

        // Add a default base layer
        this.baseLayers.osm.addTo(this.map);

        // Store layers for later use
        this.baseLayers = {
            'Street Map': this.baseLayers.osm,
            'Marine Map': this.baseLayers.marine
        };
    }

    setupEventHandlers() {
        this.map.on('click', (e) => {
            console.log('Map clicked at:', e.latlng);
        });

        this.map.on('moveend', () => {
            console.log('Map moved to:', this.map.getCenter(), 'zoom:', this.map.getZoom());
        });
    }

    addFeatures(map, features) {
        if (!features || features.length === 0) return;

        const featureGroup = L.featureGroup();

        features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
                let layer;
                switch (feature.geometry.type) {
                    case 'Point':
                        layer = L.circleMarker([
                            feature.geometry.coordinates[1],
                            feature.geometry.coordinates[0]
                        ], {
                            radius: 8,
                            fillColor: '#0066cc',
                            color: '#fff',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                        break;
                    case 'LineString':
                        layer = L.polyline(feature.geometry.coordinates.map(coord => [
                            coord[1],
                            coord[0]
                        ]), {
                            color: '#ff6600',
                            weight: 3,
                            opacity: 0.7
                        });
                        break;
                    case 'Polygon':
                        layer = L.polygon(feature.geometry.coordinates.map(ring => 
                            ring.map(coord => [coord[1], coord[0]])
                        ), {
                            color: '#00cc66',
                            fillColor: '#00cc66',
                            fillOpacity: 0.3
                        });
                        break;
                    default:
                        return; // Skip unsupported geometry types
                }

                if (layer) {
                    layer.bindPopup(this.createPopupContent(feature));
                    featureGroup.addLayer(layer);
                }
            }
        });

        featureGroup.addTo(map);
        return featureGroup;
    }

    createPopupContent(feature) {
        let content = '<div class="feature-popup">';
        content += `<h4>${feature.properties.name || 'Unnamed Feature'}</h4>`;
        content += '<table class="feature-attributes">';

        for (const [key, value] of Object.entries(feature.properties)) {
            if (key !== 'name') {
                content += `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`;
            }
        }

        content += '</table></div>';
        return content;
    }

    addTileLayer(urlTemplate, options = {}) {
        if (this.tileLayer) {
            this.map.removeLayer(this.tileLayer);
        }

        this.tileLayer = L.tileLayer(urlTemplate, options);
        this.tileLayer.addTo(this.map);
        return this.tileLayer;
    }

    switchBaseLayer(layerName) {
        if (this.baseLayers[layerName]) {
            this.map.eachLayer((layer) => {
                if (layer instanceof L.TileLayer) {
                    this.map.removeLayer(layer);
                }
            });
            this.baseLayers[layerName].addTo(this.map);
        }
    }

    getBounds() {
        return this.map.getBounds();
    }

    getZoom() {
        return this.map.getZoom();
    }

    setView(center, zoom) {
        this.map.setView(center, zoom);
    }

    fitBounds(bounds) {
        this.map.fitBounds(bounds);
    }

    clearOverlays() {
        this.map.eachLayer((layer) => {
            if (layer instanceof L.FeatureGroup || layer instanceof L.Marker) {
                this.map.removeLayer(layer);
            }
        });
    }
}

// Leaflet CSS is loaded in index.html
if (typeof L !== 'undefined') {
    console.log('Leaflet loaded successfully');
} else {
    console.warn('Leaflet not loaded');
}