/**
 * FitCoach AI - Gym Finder Logic (Real Data Version)
 */

let map;
let userMarker;
let gymMarkers = [];
let userCoords = null;
let routingControl = null;
let activeGyms = [];
let lastSearchQuery = '';

const GYM_IMAGES = [
    "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400",
    "https://images.unsplash.com/photo-1518611012118-2965c72c91a3?w=400",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400",
    "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400",
    "https://images.unsplash.com/photo-1593079350384-ad4b9868be41?w=400"
];

document.addEventListener('DOMContentLoaded', function () {
    initMap();
    setupEventListeners();
    detectUserLocation();
});

function detectUserLocation() {
    updateLocationStatus("📍 DETECTING LOCATION...");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;
                userCoords = [lat, lng];

                updateLocationStatus("📍 YOUR LOCATION");
                moveToLocation(lat, lng);
                fetchRealGyms(lat, lng, "Your Location");
            },
            function (error) {
                updateLocationStatus("📍 ENABLE LOCATION OR SEARCH");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        updateLocationStatus("📍 SEARCH A CITY");
    }
}

const TOMTOM_KEY = 'm9lOlbApSsjn50K7e68ZtsuZ1PQQroX3';

/**
 * FETCH REAL GYMS USING TOMTOM SEARCH API
 * Two-tier: category search first, falls back to keyword search if 0 results.
 */
function fetchRealGyms(lat, lng, locationName) {
    updateLocationStatus("🔍 FETCHING VERIFIED GYMS...");

    const radius = 15000; // 15km
    // Tier 1: Category-based search (most precise)
    const categoryUrl = `https://api.tomtom.com/search/2/nearbySearch/.json?key=${TOMTOM_KEY}&lat=${lat}&lon=${lng}&radius=${radius}&limit=50&categorySet=9361004,9379009&relatedPois=off`;

    fetch(categoryUrl)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(async data => {
            const filtered = (data.results || []).filter(item => isRealGym(item));

            if (filtered.length > 0) {
                // Category search succeeded — process and show
                await processAndShowGyms(filtered, lat, lng);
            } else {
                // Tier 2: Fall back to keyword text search
                console.log("Category search empty, trying keyword search...");
                return fetchGymsByKeyword(lat, lng, locationName);
            }
        })
        .catch(err => {
            console.error("Category search failed:", err);
            // Try keyword fallback anyway
            fetchGymsByKeyword(lat, lng, locationName);
        });
}

/**
 * FALLBACK: TomTom text search for "gym" and "fitness" around coordinates.
 * Used when category search finds nothing (common in areas with sparse TomTom data).
 */
function fetchGymsByKeyword(lat, lng, locationName) {
    updateLocationStatus("🔍 SEARCHING NEARBY GYMS...");

    // Search for both 'gym' and 'fitness' to maximize results
    const gymUrl = `https://api.tomtom.com/search/2/poiSearch/gym.json?key=${TOMTOM_KEY}&lat=${lat}&lon=${lng}&radius=15000&limit=30&relatedPois=off&countrySet=IN`;
    const fitUrl = `https://api.tomtom.com/search/2/poiSearch/fitness.json?key=${TOMTOM_KEY}&lat=${lat}&lon=${lng}&radius=15000&limit=30&relatedPois=off&countrySet=IN`;

    Promise.all([
        fetch(gymUrl).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(fitUrl).then(r => r.json()).catch(() => ({ results: [] }))
    ])
        .then(async ([gymData, fitData]) => {
            // Combine and deduplicate by id
            const allResults = [...(gymData.results || []), ...(fitData.results || [])];
            const seen = new Set();
            const unique = allResults.filter(item => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
            });

            // Apply gym filter
            const filtered = unique.filter(item => isRealGym(item));

            if (filtered.length > 0) {
                await processAndShowGyms(filtered, lat, lng);
            } else {
                showNoGymsFound(locationName);
            }
        })
        .catch(() => showNoGymsFound(locationName, true));
}

/**
 * Shared helper: fetches POI details (photo + rating) and renders results.
 * Limits details fetches to Top 10 to avoid API rate limits (429 errors).
 */
async function processAndShowGyms(items, lat, lng) {
    // Add initial distance so we can sort BEFORE calling the API
    const itemsWithDistance = items.map(item => {
        const gymLat = item.position.lat;
        const gymLng = item.position.lon;
        return {
            ...item,
            distance: calculateDistance(lat, lng, gymLat, gymLng)
        };
    });

    // Sort by distance to find the closest ones
    itemsWithDistance.sort((a, b) => a.distance - b.distance);

    const gymPromises = itemsWithDistance.map(async (item, index) => {
        const gymLat = item.position.lat;
        const gymLng = item.position.lon;
        const poiId = item.id;

        let gym = {
            id: poiId,
            name: item.poi.name,
            coords: [gymLat, gymLng],
            distance: item.distance,
            address: item.address.freeformAddress || 'Address not listed',
            open_hours: "Contact for hours",
            rating: "N/A",
            reviews: 0,
            image: GYM_IMAGES[Math.floor(Math.random() * GYM_IMAGES.length)],
            isPremium: false
        };

        // ONLY fetch expensive details (ratings/photos) for the top 10 results
        // This prevents hitting the 5 QPS TomTom free tier limit instantly.
        if (index < 10) {
            try {
                const detailsUrl = `https://api.tomtom.com/search/2/poiDetails.json?key=${TOMTOM_KEY}&id=${poiId}&sources=all`;
                const detailsRes = await fetch(detailsUrl);
                
                // Fetch does not throw on 429, but json() might or it returns an error obj
                if (!detailsRes.ok) throw new Error("API hit limit");
                
                const detailsData = await detailsRes.json();

                if (detailsData.result) {
                    const res = detailsData.result;
                    if (res.rating && res.rating.totalRating) {
                        gym.rating = res.rating.totalRating.toFixed(1);
                        gym.reviews = res.rating.ratingCount || 0;
                    }
                    if (res.photos && res.photos.length > 0) {
                        gym.image = `https://api.tomtom.com/search/2/poiPhoto.json?key=${TOMTOM_KEY}&id=${res.photos[0].id}`;
                    }
                }
            } catch (e) {
                // Silently fall back to default image/rating on API error (like 429 Too Many Requests)
            }
        }

        return gym;
    });

    const gyms = await Promise.all(gymPromises);
    activeGyms = gyms;
    renderResults(activeGyms);
    updateLocationStatus(`📍 ${activeGyms.length} GYMS FOUND`);
}


/**
 * STRICT GYM FILTER
 * Returns true only for places that are genuine gyms / fitness centres.
 * Rejects mechanics, yoga-only studios, auto shops, salons, etc.
 */
function isRealGym(item) {
    const name = (item.poi && item.poi.name ? item.poi.name : '').toLowerCase();

    // --- BLACKLIST: definitely NOT a gym ---
    const blacklistWords = [
        'mechanic', 'auto', 'motor', 'car wash', 'garage', 'tyre', 'tire',
        'salon', 'spa', 'beauty', 'hospital', 'clinic', 'pharmacy', 'medical',
        'school', 'college', 'temple', 'church', 'mosque', 'restaurant',
        'hotel', 'bakery', 'cafe', 'market', 'grocery', 'bank', 'atm',
        'yoga', 'dance', 'zumba', 'pilates', 'martial arts', 'karate',
        'swimming', 'pool', 'stadium', 'court', 'ground'
    ];

    for (const word of blacklistWords) {
        if (name.includes(word)) return false;
    }

    // --- WHITELIST: name clearly indicates a gym ---
    const gymKeywords = [
        'gym', 'fitness', 'wellness', 'workout', 'bodybuilding',
        'strength', 'crossfit', 'muscle', 'physique', 'powerhouse',
        'iron', 'lift', 'athletic', 'sport', 'health club', 'training center',
        'training centre', 'exercise'
    ];

    for (const word of gymKeywords) {
        if (name.includes(word)) return true;
    }

    // --- CHECK TOMTOM CATEGORY ---
    if (item.poi && item.poi.classifications) {
        const cats = item.poi.classifications
            .flatMap(c => c.names || [])
            .map(n => (n.nameLocale || '').toLowerCase());

        const gymCats = ['gym', 'fitness', 'sport', 'health', 'athletic'];
        for (const cat of cats) {
            for (const keyword of gymCats) {
                if (cat.includes(keyword)) return true;
            }
        }
    }

    // Unknown — exclude to keep list clean
    return false;
}

function fetchRealGymsBroadly(locationName) {
    // TomTom handles location within query string well
    updateLocationStatus(`🔍 SEARCHING ${locationName.toUpperCase()}...`);

    const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(locationName)}.json?key=${TOMTOM_KEY}&limit=1`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                const pos = data.results[0].position;
                map.flyTo([pos.lat, pos.lon], 13);
                userCoords = [pos.lat, pos.lon];
                moveToLocation(pos.lat, pos.lon);
                fetchRealGyms(pos.lat, pos.lon, locationName);
            } else {
                showNoGymsFound(locationName);
            }
        })
        .catch(() => showNoGymsFound(locationName, true));
}

function showNoGymsFound(location, isError = false) {
    var container = document.getElementById('gym-list');
    var statusText = isError ? "Connection error while searching" : "No registered gyms found near this location";

    container.innerHTML = `
        <div style="padding: 100px 40px; text-align: center; color: var(--text-muted); width: 100%;">
            <div style="font-size: 4rem; margin-bottom: 25px; filter: grayscale(1); opacity: 0.3;">📍</div>
            <h3 style="color: #fff; margin-bottom: 12px; font-weight: 800; font-size: 1.3rem;">${statusText}</h3>
            <p style="font-size: 0.95rem; line-height: 1.6; max-width: 300px; margin: 0 auto; opacity: 0.7; margin-bottom: 25px;">We couldn't find any real-world gym data for "${location}" on our maps.</p>
            ${isError ? `<button onclick="handleSearch()" style="background: var(--primary-color); color: #fff; border: none; padding: 12px 25px; border-radius: 30px; cursor: pointer; font-weight: 800; font-size: 0.9rem; box-shadow: 0 4px 15px rgba(112,0,255,0.4);">RETRY SEARCH</button>` : ''}
        </div>
    `;

    gymMarkers.forEach(function (m) { map.removeLayer(m); });
    gymMarkers = [];
    activeGyms = [];
    updateLocationStatus("📍 NO RESULTS FOUND");
}

function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: true })
        .setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    setupAddressAutocomplete();
}

function setupAddressAutocomplete() {
    var searchInput = document.getElementById('gym-search');
    var timeout = null;

    searchInput.addEventListener('input', function () {
        var query = this.value.trim();
        if (query.length < 3) return;

        clearTimeout(timeout);
        timeout = setTimeout(function () {
            searchAddress(query);
        }, 300);
    });
}

// Stores results from TomTom address search
var addressResults = [];

function searchAddress(query, shouldAutoSelect = false) {
    var container = document.getElementById('address-results');
    if (!container) {
        container = document.createElement('div');
        container.id = 'address-results';
        container.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; margin-top: 5px; max-height: 200px; overflow-y: auto; z-index: 1001;';
        document.querySelector('.search-inner').appendChild(container);
    }

    if (!shouldAutoSelect) {
        container.innerHTML = '<div style="padding: 10px; color: #888; font-size: 0.8rem;">Searching...</div>';
        container.style.display = 'block';
    }

    // Use TomTom Fuzzy Search — handles door numbers, streets, areas, cities for India
    const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_KEY}&limit=5&countrySet=IN&language=en-GB`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            addressResults = data.results || [];

            if (addressResults.length === 0) {
                if (!shouldAutoSelect) {
                    container.innerHTML = '<div style="padding: 10px; color: #888; font-size: 0.8rem;">No results found</div>';
                } else {
                    showLocationNotFound(query);
                }
                return;
            }

            if (shouldAutoSelect) {
                selectAddress(0);
                return;
            }

            container.innerHTML = '';
            addressResults.forEach(function (item, index) {
                var div = document.createElement('div');
                div.style.cssText = 'padding: 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; color: #fff;';
                // Show the full free-form address from TomTom
                const addr = item.address;
                const label = [addr.streetNumber, addr.streetName, addr.localName || addr.municipality, addr.countrySubdivision]
                    .filter(Boolean).join(', ');
                div.innerHTML = label || item.address.freeformAddress || 'Unknown location';
                div.onclick = function () { selectAddress(index); };
                container.appendChild(div);
            });
        })
        .catch(function () {
            if (!shouldAutoSelect) {
                container.innerHTML = '<div style="padding: 10px; color: #888; font-size: 0.8rem;">Search error</div>';
            } else {
                showLocationNotFound(query);
            }
        });
}

function selectAddress(index) {
    var item = addressResults[index];
    var container = document.getElementById('address-results');
    if (container) container.style.display = 'none';

    const addr = item.address;
    const lat = item.position.lat;
    const lng = item.position.lon;

    // Show a clean label in the search box
    const label = [addr.streetNumber, addr.streetName, addr.localName || addr.municipality]
        .filter(Boolean).join(', ');
    document.getElementById('gym-search').value = label || addr.freeformAddress || '';

    userCoords = [lat, lng];
    map.flyTo([lat, lng], 14, { duration: 1.5 });

    // Use the most meaningful name for the status bar
    const locationName = addr.localName || addr.municipality || addr.countrySubdivision || 'Location';
    updateLocationStatus('📍 ' + locationName.toUpperCase());

    moveToLocation(lat, lng);
    fetchRealGyms(lat, lng, locationName);
}

function handleSearch() {
    var query = document.getElementById('gym-search').value.trim();
    if (!query) {
        updateLocationStatus("⚠️ ENTER AN ADDRESS");
        return;
    }

    var container = document.getElementById('address-results');
    if (container) container.style.display = 'none';

    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    lastSearchQuery = query.toLowerCase();
    updateLocationStatus("🔍 SEARCHING...");
    searchAddress(query, true);
}

function setupEventListeners() {
    document.getElementById('gym-search').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            var container = document.getElementById('address-results');
            if (container && container.style.display === 'block' && addressResults.length > 0) {
                selectAddress(0);
            } else {
                handleSearch();
            }
        }
    });

    document.addEventListener('click', function (e) {
        var container = document.getElementById('address-results');
        if (container && !e.target.closest('.search-inner')) {
            container.style.display = 'none';
        }
    });

    setupFilters();
}

function showLocationNotFound(query) {
    document.getElementById('gym-list').innerHTML =
        '<div style="padding: 40px; text-align: center; color: #888; width: 100%;">' +
        '<div style="font-size: 2.5rem; margin-bottom: 15px;">🔍</div>' +
        '<p style="font-size: 1.1rem; font-weight: 600;">Location not found</p>' +
        '<p style="font-size: 0.85rem; opacity: 0.7;">Try a different name</p>' +
        '</div>';

    gymMarkers.forEach(function (m) { map.removeLayer(m); });
    gymMarkers = [];
    activeGyms = [];
    updateLocationStatus("❌ NOT FOUND: " + query.toUpperCase());
}

function quickSearch(city) {
    document.getElementById('gym-search').value = city;
    handleSearch();
}

function moveToLocation(lat, lng) {
    if (userMarker) map.removeLayer(userMarker);

    var userIcon = L.divIcon({
        className: 'user-marker',
        html: '<div style="width: 20px; height: 20px; background: #00f0ff; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px #00f0ff;"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map).bindPopup("📍 Your Location");
}

function updateLocationStatus(text) {
    var el = document.getElementById('location-status');
    if (el) el.innerText = text;
}

function renderResults(gyms) {
    renderGymMarkers(gyms);
    renderGymList(gyms);
}

function renderGymMarkers(gyms) {
    gymMarkers.forEach(function (m) { map.removeLayer(m); });
    gymMarkers = [];

    gyms.forEach(function (gym) {
        var gymIcon = L.divIcon({
            className: 'gym-marker',
            html: '<div style="width: 35px; height: 35px; background: linear-gradient(135deg, #7000ff, #00f0ff); border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 15px rgba(112,0,255,0.5);">💪</div>',
            iconSize: [35, 35],
            iconAnchor: [17, 35]
        });

        var marker = L.marker(gym.coords, { icon: gymIcon }).addTo(map);

        marker.bindPopup(`
            <div style="font-family: 'Outfit', sans-serif; min-width: 220px; color: #fff; background: #1a1a2e; padding: 5px; border-radius: 12px;">
                <b style="font-size: 1.1rem; display: block; margin-bottom: 4px; color: var(--primary-color);">${gym.name}</b>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span style="color: #fbbf24; font-weight: 700;">★ ${gym.rating}</span>
                    <span style="color: #888; font-size: 0.8rem;">(${gym.reviews} reviews)</span>
                </div>
                <p style="font-size: 0.8rem; margin: 5px 0; color: #ccc;">${gym.address}</p>
                <p style="font-size: 0.75rem; margin: 3px 0; color: #22c55e; font-weight: 600;">🕐 ${gym.open_hours}</p>
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button onclick="calculateRoute(${gym.coords[0]}, ${gym.coords[1]})" style="background: var(--primary-color); color: #fff; border: none; padding: 7px 12px; border-radius: 8px; cursor: pointer; font-weight: 700; flex: 1; font-size: 0.75rem;">ROUTE</button>
                    <button onclick="openGoogleMaps(${gym.coords[0]}, ${gym.coords[1]})" style="background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); padding: 7px 12px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.75rem;">MAPS</button>
                </div>
            </div>
        `, { className: 'custom-popup' });

        gymMarkers.push(marker);
    });
}

function renderGymList(gyms) {
    var container = document.getElementById('gym-list');
    container.innerHTML = '';

    if (gyms.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No gyms found for this filter.</div>';
        return;
    }

    gyms.forEach(function (gym) {
        var card = document.createElement('div');
        card.className = 'gym-card';

        card.innerHTML = `
            <img src="${gym.image}" alt="${gym.name}">
            <div class="gym-info">
                <h3>${gym.name}</h3>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 6px 0; line-height: 1.3;">${gym.address}</p>
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <span style="color: #fbbf24; font-weight: 700; font-size: 0.85rem;">★ ${gym.rating}</span>
                    <span style="color: var(--accent-color); font-weight: 700; font-size: 0.85rem;">${gym.distance.toFixed(1)} km</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="route-btn-small" style="background: var(--primary-color); color: white; border: none; padding: 5px 12px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; cursor: pointer; transition: all 0.2s;">ROUTE</button>
                    <button class="maps-btn-small" style="background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2); padding: 5px 12px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; cursor: pointer; transition: all 0.2s;">MAPS</button>
                </div>
            </div>
        `;

        card.addEventListener('click', function (e) {
            if (e.target.tagName === 'BUTTON') return;

            map.flyTo(gym.coords, 16, { duration: 1.2 });
            var m = gymMarkers.find(function (marker) {
                return marker.getLatLng().lat === gym.coords[0] && marker.getLatLng().lng === gym.coords[1];
            });
            if (m) m.openPopup();

            if (window.innerWidth <= 1024) {
                const sidebar = document.getElementById('results-sidebar');
                if (sidebar) sidebar.classList.add('collapsed');
            }
        });

        card.querySelector('.route-btn-small').onclick = function (e) {
            e.stopPropagation();
            calculateRoute(gym.coords[0], gym.coords[1]);
        };

        card.querySelector('.maps-btn-small').onclick = function (e) {
            e.stopPropagation();
            openGoogleMaps(gym.coords[0], gym.coords[1]);
        };

        container.appendChild(card);
    });
}

function calculateRoute(targetLat, targetLng) {
    if (!userCoords) {
        alert("Please search for a location first");
        return;
    }

    if (routingControl) map.removeControl(routingControl);

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(userCoords[0], userCoords[1]),
            L.latLng(targetLat, targetLng)
        ],
        lineOptions: {
            styles: [{ color: '#7000ff', weight: 5, opacity: 0.8 }]
        },
        createMarker: function () { return null; },
        addWaypoints: false,
        routeWhileDragging: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false
    }).addTo(map);

    var container = routingControl.getContainer();
    if (container) container.style.display = 'none';

    updateLocationStatus("🏁 ROUTE ACTIVE");
}

function openGoogleMaps(lat, lng) {
    var url = "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng;
    window.open(url, '_blank');
}

function setupFilters() {
    // Filter logic removed for a cleaner experience
}

function applyFilter(type) {
    // Filter logic removed 
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) { return deg * (Math.PI / 180); }
