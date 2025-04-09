// Modern Multi-Clock JavaScript

// DOM Elements
const clocksContainer = document.getElementById('clocks-container');
const addClockButton = document.getElementById('add-clock');
const themeToggle = document.getElementById('theme-toggle');
const toggleMapButton = document.getElementById('toggle-map');
const clockTemplate = document.getElementById('clock-template');
const geochronMap = document.getElementById('geochron-map');
const geochronContainer = document.querySelector('.geochron-container');

// App state
let clocks = [];
let nextClockId = 1;
let geochronInstance = null;
let isMapVisible = true;

// Clock class to manage individual clocks
class Clock {
  constructor(id, timezone) {
    this.id = id;
    this.timezone = timezone || 'UTC';
    this.element = null;
    this.animationFrame = null;
  }

  // Create the clock DOM element from template
  createElement() {
    // Clone the template
    const clone = document.importNode(clockTemplate.content, true);
    const clockElement = clone.querySelector('.clock-item');

    // Set a unique id for this clock
    clockElement.id = `clock-${this.id}`;
    clockElement.dataset.clockId = this.id;

    // Set up event listeners
    this.setupEventListeners(clockElement);

    // Set the initial timezone
    const selectElement = clockElement.querySelector('.timezone-select');
    selectElement.value = this.timezone;

    // Add animation class
    clockElement.classList.add('clock-enter');

    // Add to the DOM
    clocksContainer.appendChild(clone);

    // Store the element reference
    this.element = clockElement;

    // Add numbers to clock face
    this.addClockNumbers();

    // Start the clock
    this.startClock();

    return clockElement;
  }

  // Set up event listeners for this clock
  setupEventListeners(clockElement) {
    // Remove button
    const removeButton = clockElement.querySelector('.remove-clock');
    removeButton.addEventListener('click', () => this.remove());

    // Timezone selector
    const timezoneSelect = clockElement.querySelector('.timezone-select');
    timezoneSelect.addEventListener('change', (event) => {
      // Update the timezone
      this.timezone = event.target.value;

      // Force update the dropdown value
      timezoneSelect.value = this.timezone;

      // Stop current clock updates
      this.stopClock();

      // Restart clock with new timezone
      this.startClock();

      // Save the clock settings
      saveClocks();

      // Force the dropdown to visually update and lose focus
      setTimeout(() => {
        timezoneSelect.blur();
      }, 100);
    });
  }

  // Add numbers to clock face
  addClockNumbers() {
    const clockFace = this.element.querySelector('.clock-face');

    for (let i = 1; i <= 12; i++) {
      const number = document.createElement('div');
      number.classList.add('clock-number');
      number.style.position = 'absolute';
      number.style.fontWeight = 'bold';
      number.style.fontSize = '12px';

      // Calculate position (30 degrees per hour)
      const angle = (i * 30) - 90; // -90 to start at 12 o'clock
      const radians = angle * (Math.PI / 180);

      // Position number at 85% from center
      const x = Math.cos(radians) * 75;
      const y = Math.sin(radians) * 75;

      number.style.transform = `translate(${x}px, ${y}px)`;
      number.textContent = i;

      clockFace.appendChild(number);
    }
  }

  // Start the clock updating
  startClock() {
    const updateClock = () => {
      const now = new Date();

      // Get time elements
      const hourHand = this.element.querySelector('.hour-hand');
      const minuteHand = this.element.querySelector('.minute-hand');
      const secondHand = this.element.querySelector('.second-hand');
      const digitalTime = this.element.querySelector('.time');
      const dateElement = this.element.querySelector('.date');
      const dayElement = this.element.querySelector('.day');

      // Format the date for the selected timezone
      const timeOptions = {
        timeZone: this.timezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      };

      const dateOptions = {
        timeZone: this.timezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };

      const dayOptions = {
        timeZone: this.timezone,
        weekday: 'long'
      };

      // Get timezone-specific formatted strings
      const timeString = new Intl.DateTimeFormat('en-GB', timeOptions).format(now);
      const dateString = new Intl.DateTimeFormat('en-GB', dateOptions).format(now);
      const dayString = new Intl.DateTimeFormat('en-GB', dayOptions).format(now);

      // Update digital display
      digitalTime.textContent = timeString;
      dateElement.textContent = dateString;
      dayElement.textContent = dayString;

      // Extract hours, minutes, seconds from the timezone-adjusted time
      const [hours, minutes, seconds] = timeString.split(':').map(Number);
      const milliseconds = now.getMilliseconds();

      // Calculate hand rotations
      // Hours: 30 degrees per hour + partial rotation based on minutes
      const hourDegrees = ((hours % 12) * 30) + (minutes * 0.5);
      // Minutes: 6 degrees per minute + partial rotation based on seconds
      const minuteDegrees = (minutes * 6) + (seconds * 0.1);
      // Seconds: 6 degrees per second + smooth transition with milliseconds
      const secondDegrees = (seconds * 6) + (milliseconds * 0.006);

      // Apply rotations
      hourHand.style.transform = `rotate(${hourDegrees}deg)`;
      minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
      secondHand.style.transform = `rotate(${secondDegrees}deg)`;

      // Continue animation
      this.animationFrame = requestAnimationFrame(updateClock);
    };

    // Start the animation loop
    this.animationFrame = requestAnimationFrame(updateClock);
  }

  // Stop the clock updating
  stopClock() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // Remove this clock
  remove() {
    // Add exit animation
    this.element.classList.add('clock-exit');

    // Stop clock updates
    this.stopClock();

    // Remove from DOM after animation
    setTimeout(() => {
      // First, cancel any animation frame
      this.stopClock();

      // Then remove from the DOM
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }

      // Remove from the clocks array
      const index = clocks.findIndex(clock => clock.id === this.id);
      if (index !== -1) {
        clocks.splice(index, 1);
        saveClocks();
      }
    }, 300); // Match the animation-duration in CSS
  }
}

// Add a new clock
function addClock(timezone) {
  const clock = new Clock(nextClockId++, timezone);
  clocks.push(clock);
  clock.createElement();
  saveClocks();
  return clock;
}

// Save clocks configuration to localStorage
function saveClocks() {
  const clocksData = clocks.map(clock => ({
    id: clock.id,
    timezone: clock.timezone
  }));

  localStorage.setItem('clocks', JSON.stringify(clocksData));
  localStorage.setItem('nextClockId', nextClockId.toString());
}

// Load clocks from localStorage
function loadClocks() {
  const savedClocks = localStorage.getItem('clocks');
  const savedNextId = localStorage.getItem('nextClockId');

  if (savedNextId) {
    nextClockId = parseInt(savedNextId, 10);
  }

  if (savedClocks) {
    try {
      const clocksData = JSON.parse(savedClocks);

      // Clear existing clocks first
      clocksContainer.innerHTML = '';
      clocks = [];

      // Create each clock from saved data
      clocksData.forEach(clockData => {
        const clock = new Clock(clockData.id, clockData.timezone);
        clocks.push(clock);
        clock.createElement();
      });
    } catch (error) {
      console.error('Error loading saved clocks:', error);
      // If there's an error, start with a default clock
      addDefaultClock();
    }
  } else {
    // If no saved clocks, start with a default clock
    addDefaultClock();
  }
}

// Add a default clock with local timezone
function addDefaultClock() {
  // Clear existing clocks first
  clocksContainer.innerHTML = '';
  clocks = [];

  // Get user's local timezone
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  addClock(localTimezone);
}

// Theme Toggle Functionality
function setupThemeToggle() {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');

    // Save theme preference
    const isLightTheme = document.body.classList.contains('light-theme');
    localStorage.setItem('lightTheme', isLightTheme);
  });

  // Load saved theme preference
  const isLightTheme = localStorage.getItem('lightTheme') === 'true';
  if (isLightTheme) {
    document.body.classList.add('light-theme');
  }
}

// Toggle Map Functionality
function setupToggleMap() {
  toggleMapButton.addEventListener('click', () => {
    isMapVisible = !isMapVisible;

    // Toggle visibility
    if (isMapVisible) {
      geochronContainer.classList.remove('hidden');
      geochronContainer.classList.add('block');
      // Restart the map animation if it was stopped
      if (geochronInstance) {
        geochronInstance.startUpdating();
        // Invalidate size to ensure proper rendering after becoming visible
        setTimeout(() => {
          if (geochronInstance && geochronInstance.map) {
            // Force a complete redraw of the map
            geochronInstance.map.invalidateSize({animate: false, pan: false});

            // Force redraw of tiles
            if (geochronInstance.baseTileLayer) {
              geochronInstance.baseTileLayer.redraw();
            }
            if (geochronInstance.labelTileLayer) {
              geochronInstance.labelTileLayer.redraw();
            }

            // Reset view to ensure proper display
            geochronInstance.map.setView([20, 0], 2, {animate: false});

            // Update day/night visualization
            geochronInstance.updateDayNight();
          }
        }, 200);
      }
    } else {
      geochronContainer.classList.add('hidden');
      geochronContainer.classList.remove('block');
      // Stop the map animation to save resources
      if (geochronInstance) {
        geochronInstance.stopUpdating();
      }
    }

    // Save preference
    localStorage.setItem('mapVisible', isMapVisible);
  });

  // Load saved map preference
  const savedMapVisible = localStorage.getItem('mapVisible');
  if (savedMapVisible !== null) {
    isMapVisible = savedMapVisible === 'true';

    // Apply saved preference
    if (!isMapVisible) {
      geochronContainer.classList.add('hidden');
      geochronContainer.classList.remove('block');
    }
  }
}

// Add Clock Button Functionality
function setupAddClockButton() {
  addClockButton.addEventListener('click', () => {
    // Get user's local timezone as default
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    addClock(localTimezone);
  });
}

// Geochron Map Class using Leaflet.js
class GeochronMap {
  constructor(element) {
    this.element = element;
    this.map = null;
    this.dayNightLayer = null;
    this.sunMarker = null;
    this.terminatorPolyline = null;
    this.animationFrame = null;
    this.dayOverlay = null;
    this.nightOverlay = null;
    this.timezoneLayer = null;
    this.timezoneUpdateInterval = null;

    // Time bubbles visibility state
    this.timeBubblesVisible = localStorage.getItem('timeBubblesVisible') !== 'false';

    // Map controls
    this.zoomInButton = document.getElementById('zoom-in');
    this.zoomOutButton = document.getElementById('zoom-out');
    this.resetViewButton = document.getElementById('reset-view');
    this.toggleStyleButton = document.getElementById('toggle-style');
    this.toggleTimeBubblesButton = document.getElementById('toggle-time-bubbles');

    // Map style state
    this.currentStyle = 'standard';
    this.mapStyles = {
      standard: {
        base: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
        labels: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      },
      satellite: {
        base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        labels: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }
    };

    // Initialize the map
    this.initMap();

    // Setup map controls
    this.setupMapControls();
  }

  // Initialize the Leaflet map
  initMap() {
    try {
      console.log('Initializing map...');

      // Remove loading indicator
      const loadingIndicator = this.element.querySelector('.map-loading');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }

      // Check if Leaflet is available
      if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded!');
        this.showMapError('Map library failed to load. Please check your internet connection and try again.');
        return;
      }

      // Create the map with a world-centered view
      this.map = L.map(this.element, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,  // Increase minimum zoom to prevent showing multiple worlds
        maxZoom: 6,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
        worldCopyJump: false,  // Disable world copy jump to prevent duplication
        maxBounds: [[-85, -180], [85, 180]],  // Limit to standard Web Mercator bounds
        maxBoundsViscosity: 1.0,
        fadeAnimation: true,
        markerZoomAnimation: true
      });

      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
      this.showMapError('Failed to initialize map. Error: ' + error.message);
    }

    // Add base and label layers based on current style
    this.baseTileLayer = null;
    this.labelTileLayer = null;
    this.setMapStyle(this.currentStyle);

    // Create a layer group for day/night visualization
    this.dayNightLayer = L.layerGroup().addTo(this.map);

    // Create a layer group for timezone markers
    this.timezoneLayer = L.layerGroup().addTo(this.map);

    // Create the terminator polyline
    this.terminatorPolyline = L.polyline([], {
      color: 'rgba(255, 255, 255, 0.8)',
      weight: 2,
      dashArray: '5, 3',
      className: 'day-night-terminator'
    }).addTo(this.dayNightLayer);

    // Create sun marker
    const sunIcon = L.divIcon({
      className: 'sun-marker',
      iconSize: [12, 12]
    });

    this.sunMarker = L.marker([0, 0], {
      icon: sunIcon,
      interactive: false
    }).addTo(this.dayNightLayer);

    // Create day and night overlays
    this.dayOverlay = L.rectangle([[-90, -180], [90, 180]], {
      fillColor: 'blue',
      fillOpacity: 0.1,
      stroke: false,
      className: 'day-overlay',
      interactive: false
    });

    this.nightOverlay = L.rectangle([[-90, -180], [90, 180]], {
      fillColor: 'black',
      fillOpacity: 0.4,
      stroke: false,
      className: 'night-overlay',
      interactive: false
    });

    // Add timezone markers
    this.addTimezoneMarkers();

    // Start updating the map
    this.startUpdating();
  }

  // Show error message on the map
  showMapError(message) {
    // Create or update error message element
    let errorElement = this.element.querySelector('.map-error');

    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'map-error absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 text-white p-4 text-center';
      this.element.appendChild(errorElement);
    }

    errorElement.innerHTML = `
      <div class="error-content">
        <p class="text-red-500 text-lg mb-2">⚠️ Map Error</p>
        <p>${message}</p>
        <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 retry-map-button">Retry</button>
      </div>
    `;

    // Add retry button functionality
    const retryButton = errorElement.querySelector('.retry-map-button');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        errorElement.remove();
        this.initMap();
      });
    }
  }

  // Apply time bubbles visibility state
  applyTimeBubblesVisibility() {
    // Add or remove the hidden class to the time bubbles container
    if (this.timezoneLayer) {
      if (this.timeBubblesVisible) {
        document.documentElement.classList.remove('hide-time-bubbles');
      } else {
        document.documentElement.classList.add('hide-time-bubbles');
      }

      // Update button appearance
      if (this.toggleTimeBubblesButton) {
        if (this.timeBubblesVisible) {
          this.toggleTimeBubblesButton.classList.add('active');
          this.toggleTimeBubblesButton.classList.remove('bg-gray-700');
          this.toggleTimeBubblesButton.classList.add('bg-blue-600');
        } else {
          this.toggleTimeBubblesButton.classList.remove('active');
          this.toggleTimeBubblesButton.classList.remove('bg-blue-600');
          this.toggleTimeBubblesButton.classList.add('bg-gray-700');
        }
      }
    }
  }

  // Add timezone markers to the map
  addTimezoneMarkers() {
    // Define major cities with their timezones
    const cities = [
      { name: 'London', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London' },
      { name: 'New York', lat: 40.7128, lon: -74.0060, timezone: 'America/New_York' },
      { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, timezone: 'America/Los_Angeles' },
      { name: 'Tokyo', lat: 35.6762, lon: 139.6503, timezone: 'Asia/Tokyo' },
      { name: 'Sydney', lat: -33.8688, lon: 151.2093, timezone: 'Australia/Sydney' },
      { name: 'Dubai', lat: 25.2048, lon: 55.2708, timezone: 'Asia/Dubai' },
      { name: 'Paris', lat: 48.8566, lon: 2.3522, timezone: 'Europe/Paris' },
      { name: 'Moscow', lat: 55.7558, lon: 37.6173, timezone: 'Europe/Moscow' },
      { name: 'Beijing', lat: 39.9042, lon: 116.4074, timezone: 'Asia/Shanghai' },
      { name: 'Rio', lat: -22.9068, lon: -43.1729, timezone: 'America/Sao_Paulo' },
      { name: 'Delhi', lat: 28.6139, lon: 77.2090, timezone: 'Asia/Kolkata' },
      { name: 'Cairo', lat: 30.0444, lon: 31.2357, timezone: 'Africa/Cairo' }
    ];

    // Clear existing markers
    this.timezoneLayer.clearLayers();

    // Add markers for each city
    cities.forEach(city => {
      // Get current time in this timezone
      const time = new Date().toLocaleTimeString('en-US', {
        timeZone: city.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // Create a custom icon with time bubble
      const timeBubbleIcon = L.divIcon({
        className: 'time-bubble-marker',
        html: `
          <div class="time-bubble">
            <div class="time-text">${time}</div>
            <div class="city-name">${city.name}</div>
          </div>
          <div class="marker-dot"></div>
        `,
        iconSize: [60, 40],
        iconAnchor: [30, 40]
      });

      // Create marker with time bubble
      const marker = L.marker([city.lat, city.lon], {
        icon: timeBubbleIcon,
        title: `${city.name}: ${time}`,
        interactive: true
      }).addTo(this.timezoneLayer);

      // Also add a tooltip for additional information on hover
      marker.bindTooltip(`${city.name}: ${time}`, {
        permanent: false,
        direction: 'top',
        className: 'timezone-tooltip',
        offset: [0, -40] // Offset to appear above the time bubble
      });
    });

    // Update timezone markers every 30 seconds
    if (this.timezoneUpdateInterval) {
      clearInterval(this.timezoneUpdateInterval);
    }

    this.timezoneUpdateInterval = setInterval(() => {
      this.addTimezoneMarkers();
    }, 30000); // Update every 30 seconds for more frequent updates
  }

  // Set the map style
  setMapStyle(styleName) {
    try {
      if (!this.map) {
        console.error('Map not initialized');
        return;
      }

      if (!this.mapStyles[styleName]) {
        console.error(`Map style '${styleName}' not found`);
        return;
      }

      const style = this.mapStyles[styleName];
      console.log(`Setting map style to ${styleName}`);

      // Remove existing layers if they exist
      if (this.baseTileLayer) {
        this.map.removeLayer(this.baseTileLayer);
      }

      if (this.labelTileLayer) {
        this.map.removeLayer(this.labelTileLayer);
      }

      // Add new base layer
      this.baseTileLayer = L.tileLayer(style.base, {
        attribution: style.attribution,
        subdomains: 'abcd',
        maxZoom: 6,
        minZoom: 2,
        noWrap: true,  // Prevent tile wrapping around the world
        bounds: [[-85, -180], [85, 180]],
        tileSize: 256
      }).addTo(this.map);

      // Add error handling for tile loading
      this.baseTileLayer.on('tileerror', (error) => {
        console.error('Tile loading error:', error);
        // Only show error if we haven't already shown one
        if (!this.element.querySelector('.map-error')) {
          this.showMapError('Failed to load map tiles. Please check your internet connection and try again.');
        }
      });

      // Add new labels layer if available
      if (style.labels) {
        this.labelTileLayer = L.tileLayer(style.labels, {
          attribution: '',
          subdomains: 'abcd',
          maxZoom: 6,
          minZoom: 2,
          noWrap: true,  // Prevent tile wrapping around the world
          bounds: [[-85, -180], [85, 180]],
          tileSize: 256,
          pane: 'shadowPane' // Place labels on top
        }).addTo(this.map);

        // Add error handling for label tiles
        this.labelTileLayer.on('tileerror', (error) => {
          console.error('Label tile loading error:', error);
        });
      }

      // Update current style
      this.currentStyle = styleName;

      // Save preference
      localStorage.setItem('mapStyle', styleName);
    } catch (error) {
      console.error('Error setting map style:', error);
    }
  }

  // Setup map control buttons
  setupMapControls() {
    if (this.zoomInButton) {
      this.zoomInButton.addEventListener('click', () => {
        this.map.zoomIn();
      });
    }

    if (this.zoomOutButton) {
      this.zoomOutButton.addEventListener('click', () => {
        this.map.zoomOut();
      });
    }

    if (this.resetViewButton) {
      this.resetViewButton.addEventListener('click', () => {
        // Reset to default view with animation
        this.map.flyTo([20, 0], 2, {
          duration: 0.5,
          easeLinearity: 0.5
        });

        // Force a redraw of the map to fix any rendering issues
        setTimeout(() => {
          // Invalidate size to ensure proper rendering
          this.map.invalidateSize({animate: true, pan: false});

          // Force redraw of tiles
          if (this.baseTileLayer) {
            this.baseTileLayer.redraw();
          }
          if (this.labelTileLayer) {
            this.labelTileLayer.redraw();
          }

          // Update day/night visualization
          this.updateDayNight();
        }, 100);
      });
    }

    if (this.toggleStyleButton) {
      this.toggleStyleButton.addEventListener('click', () => {
        // Toggle between standard and satellite views
        const newStyle = this.currentStyle === 'standard' ? 'satellite' : 'standard';
        this.setMapStyle(newStyle);
      });
    }

    if (this.toggleTimeBubblesButton) {
      // Apply initial state
      this.applyTimeBubblesVisibility();

      this.toggleTimeBubblesButton.addEventListener('click', () => {
        // Toggle time bubbles visibility
        this.timeBubblesVisible = !this.timeBubblesVisible;

        // Save preference
        localStorage.setItem('timeBubblesVisible', this.timeBubblesVisible);

        // Apply the new visibility state
        this.applyTimeBubblesVisibility();

        // Update the markers
        this.addTimezoneMarkers();
      });
    }

    // Load saved map style preference
    const savedMapStyle = localStorage.getItem('mapStyle');
    if (savedMapStyle && this.mapStyles[savedMapStyle]) {
      this.setMapStyle(savedMapStyle);
    }
  }

  // Calculate the subsolar point (where the sun is directly overhead)
  calculateSubsolarPoint(date) {
    // Get the day of the year (0-365)
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const dayOfYear = Math.floor(diff / 86400000);

    // Calculate the declination of the sun
    // This is a simplified formula for the sun's declination
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));

    // Calculate the equation of time (in minutes)
    // This is a simplified formula for the equation of time
    const b = (2 * Math.PI / 365) * (dayOfYear - 81);
    const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

    // Calculate the longitude where the sun is directly overhead
    const longitude = 15 * (12 - (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600)) - eot / 4;

    // The latitude where the sun is directly overhead is the declination
    const latitude = declination;

    return { latitude, longitude };
  }

  // Calculate the day/night terminator points
  calculateTerminatorPoints(subsolarPoint, offsetDegrees = 0) {
    const points = [];
    const sunLatRad = subsolarPoint.latitude * Math.PI / 180;
    const sunLonRad = subsolarPoint.longitude * Math.PI / 180;

    // Convert offset to radians (90° is the standard terminator, add offset for twilight zones)
    const offsetRad = (90 + offsetDegrees) * Math.PI / 180;

    // Generate points for the terminator line
    for (let i = 0; i <= 360; i += 5) {
      const angle = i * Math.PI / 180;

      // Calculate the latitude and longitude of the terminator point
      // This uses spherical trigonometry to find points at the specified angle from the subsolar point
      let lat = Math.asin(Math.sin(sunLatRad) * Math.cos(offsetRad) +
                         Math.cos(sunLatRad) * Math.sin(offsetRad) * Math.cos(angle));

      let lon = sunLonRad + Math.atan2(Math.sin(angle) * Math.sin(offsetRad) * Math.cos(sunLatRad),
                                      Math.cos(offsetRad) - Math.sin(sunLatRad) * Math.sin(lat));

      // Convert back to degrees
      lat = lat * 180 / Math.PI;
      lon = lon * 180 / Math.PI;

      // Ensure longitude is within -180 to 180 range
      if (lon > 180) lon -= 360;
      if (lon < -180) lon += 360;

      points.push([lat, lon]);
    }

    return points;
  }

  // Calculate twilight zones (dawn/dusk)
  calculateTwilightZones(subsolarPoint) {
    // Civil twilight: sun is 6° below the horizon
    const civilTwilightPoints = this.calculateTerminatorPoints(subsolarPoint, 6);

    // Nautical twilight: sun is 12° below the horizon
    const nauticalTwilightPoints = this.calculateTerminatorPoints(subsolarPoint, 12);

    // Astronomical twilight: sun is 18° below the horizon
    const astronomicalTwilightPoints = this.calculateTerminatorPoints(subsolarPoint, 18);

    // Standard terminator: sun is at the horizon (0°)
    const terminatorPoints = this.calculateTerminatorPoints(subsolarPoint, 0);

    return {
      terminator: terminatorPoints,
      civilTwilight: civilTwilightPoints,
      nauticalTwilight: nauticalTwilightPoints,
      astronomicalTwilight: astronomicalTwilightPoints
    };
  }

  // Create a transition polygon between two boundaries for smoother blending
  createTransitionPolygon(outerPoints, innerPoints, fraction) {
    // Create a polygon that represents a transition between two boundaries
    // by interpolating between the points
    const transitionPoints = [];

    // Ensure we have the same number of points to interpolate between
    const numPoints = Math.min(outerPoints.length, innerPoints.length);

    for (let i = 0; i < numPoints; i++) {
      // Linear interpolation between the two points
      const outerLat = outerPoints[i][0];
      const outerLon = outerPoints[i][1];
      const innerLat = innerPoints[i][0];
      const innerLon = innerPoints[i][1];

      // Calculate the interpolated point
      const lat = outerLat + (innerLat - outerLat) * fraction;
      const lon = outerLon + (innerLon - outerLon) * fraction;

      transitionPoints.push([lat, lon]);
    }

    return transitionPoints;
  }

  // Update the day/night visualization
  updateDayNight() {
    try {
      const now = new Date();
      const subsolarPoint = this.calculateSubsolarPoint(now);

    // Update sun marker position
    if (this.sunMarker) {
      this.sunMarker.setLatLng([subsolarPoint.latitude, subsolarPoint.longitude]);
    }

    // Calculate twilight zones
    const twilightZones = this.calculateTwilightZones(subsolarPoint);
    const terminatorPoints = twilightZones.terminator;

    // Update terminator polyline
    if (this.terminatorPolyline) {
      this.terminatorPolyline.setLatLngs(terminatorPoints);
    }

    // Clear previous layers
    this.dayNightLayer.clearLayers();

    // Add sun marker
    this.sunMarker.addTo(this.dayNightLayer);

    // Determine which side is day by checking the subsolar point directly
    // The subsolar point is always in daylight
    // We'll create a polygon for each half of the world and check which one contains the subsolar point

    // Map bounds
    const eastLongitude = 180;
    const westLongitude = -180;
    const northLatitude = 90;
    const southLatitude = -90;

    // Create east and west hemispheres divided by the terminator
    const eastHemisphere = [
      ...terminatorPoints,
      [northLatitude, eastLongitude],
      [southLatitude, eastLongitude],
      [southLatitude, westLongitude],
      [northLatitude, westLongitude],
      terminatorPoints[0]
    ];

    const westHemisphere = terminatorPoints;

    // Let's use a more reliable approach to determine day/night sides
    // We'll check which side of the terminator contains the subsolar point
    // The subsolar point is always in daylight

    // First, let's create a test point at the subsolar location
    const testPoint = [subsolarPoint.latitude, subsolarPoint.longitude];

    // Now, let's check if this point is inside the eastern hemisphere polygon
    // We'll use a simple point-in-polygon algorithm
    // If the point is in the eastern hemisphere, then east is day
    // Otherwise, west is day

    // For our specific map construction, we need to check if the subsolar point
    // is on the same side as the eastern hemisphere polygon
    const isEastDay = isPointInEasternHemisphere(testPoint, terminatorPoints);

    // Helper function to determine if a point is in the eastern hemisphere
    function isPointInEasternHemisphere(point, terminator) {
      // For our specific map construction:
      // If the subsolar point longitude is between -90 and 90, east is day
      // Otherwise, west is day
      const lon = point[1];
      return lon > -90 && lon < 90;
    }

    console.log('Subsolar point:', subsolarPoint, 'Longitude:', subsolarPoint.longitude, 'Is East Day:', isEastDay);

    // Create polygons for each twilight zone
    let dayPolygon, civilTwilightPolygon, nauticalTwilightPolygon, astronomicalTwilightPolygon, nightPolygon;

    if (isEastDay) {
      // Eastern side is day
      // Day polygon (full daylight)
      dayPolygon = eastHemisphere;

      // Civil twilight polygon (sun is 0-6° below horizon)
      civilTwilightPolygon = [
        ...twilightZones.civilTwilight,
        ...terminatorPoints.slice().reverse()
      ];

      // Nautical twilight polygon (sun is 6-12° below horizon)
      nauticalTwilightPolygon = [
        ...twilightZones.nauticalTwilight,
        ...twilightZones.civilTwilight.slice().reverse()
      ];

      // Astronomical twilight polygon (sun is 12-18° below horizon)
      astronomicalTwilightPolygon = [
        ...twilightZones.astronomicalTwilight,
        ...twilightZones.nauticalTwilight.slice().reverse()
      ];

      // Night polygon (full darkness, sun is >18° below horizon)
      nightPolygon = twilightZones.astronomicalTwilight;
    } else {
      // Western side is day
      // Day polygon (full daylight)
      dayPolygon = westHemisphere;

      // Civil twilight polygon (sun is 0-6° below horizon)
      civilTwilightPolygon = [
        ...terminatorPoints,
        ...twilightZones.civilTwilight.slice().reverse()
      ];

      // Nautical twilight polygon (sun is 6-12° below horizon)
      nauticalTwilightPolygon = [
        ...twilightZones.civilTwilight,
        ...twilightZones.nauticalTwilight.slice().reverse()
      ];

      // Astronomical twilight polygon (sun is 12-18° below horizon)
      astronomicalTwilightPolygon = [
        ...twilightZones.nauticalTwilight,
        ...twilightZones.astronomicalTwilight.slice().reverse()
      ];

      // Night polygon (full darkness, sun is >18° below horizon)
      nightPolygon = [
        ...twilightZones.astronomicalTwilight,
        [northLatitude, eastLongitude],
        [southLatitude, eastLongitude],
        [southLatitude, westLongitude],
        [northLatitude, westLongitude],
        twilightZones.astronomicalTwilight[0]
      ];
    }

    // Create smoother transitions by adding more intermediate polygons

    // Add night overlay (full darkness)
    L.polygon(nightPolygon, {
      fillColor: 'black',
      fillOpacity: 0.6,
      stroke: false,
      className: 'night-overlay',
      interactive: false,
      smoothFactor: 1.5 // Smooths the polygon edges
    }).addTo(this.dayNightLayer);

    // Add astronomical twilight overlay (dark blue)
    L.polygon(astronomicalTwilightPolygon, {
      fillColor: '#0f172a', // Very dark blue
      fillOpacity: 0.5,
      stroke: false,
      className: 'astronomical-twilight-overlay',
      interactive: false,
      smoothFactor: 1.5
    }).addTo(this.dayNightLayer);

    // Add a transition layer between astronomical and nautical twilight
    const astroNauticalTransition = this.createTransitionPolygon(
      twilightZones.astronomicalTwilight,
      twilightZones.nauticalTwilight,
      0.3
    );

    L.polygon(astroNauticalTransition, {
      fillColor: '#1e3a8a', // Dark blue
      fillOpacity: 0.4,
      stroke: false,
      className: 'twilight-transition',
      interactive: false,
      smoothFactor: 1.5
    }).addTo(this.dayNightLayer);

    // Add nautical twilight overlay (medium blue)
    L.polygon(nauticalTwilightPolygon, {
      fillColor: '#1e40af', // Medium dark blue
      fillOpacity: 0.4,
      stroke: false,
      className: 'nautical-twilight-overlay',
      interactive: false,
      smoothFactor: 1.5
    }).addTo(this.dayNightLayer);

    // Add a transition layer between nautical and civil twilight
    const nauticalCivilTransition = this.createTransitionPolygon(
      twilightZones.nauticalTwilight,
      twilightZones.civilTwilight,
      0.3
    );

    L.polygon(nauticalCivilTransition, {
      fillColor: '#3b82f6', // Medium blue
      fillOpacity: 0.3,
      stroke: false,
      className: 'twilight-transition',
      interactive: false,
      smoothFactor: 1.5
    }).addTo(this.dayNightLayer);

    // Add civil twilight overlay (light blue/orange gradient)
    L.polygon(civilTwilightPolygon, {
      fillColor: '#3b82f6', // Light blue
      fillOpacity: 0.3,
      stroke: false,
      className: 'civil-twilight-overlay',
      interactive: false,
      smoothFactor: 1.5
    }).addTo(this.dayNightLayer);

    // Add a transition layer between civil twilight and day
    const civilDayTransition = this.createTransitionPolygon(
      twilightZones.civilTwilight,
      twilightZones.terminator,
      0.3
    );

    L.polygon(civilDayTransition, {
      fillColor: '#93c5fd', // Very light blue
      fillOpacity: 0.2,
      stroke: false,
      className: 'twilight-transition',
      interactive: false,
      smoothFactor: 1.5
    }).addTo(this.dayNightLayer);

    // Add day overlay
    L.polygon(dayPolygon, {
      fillColor: 'white',
      fillOpacity: 0.03,
      stroke: false,
      className: 'day-overlay',
      interactive: false,
      smoothFactor: 1.5
    }).addTo(this.dayNightLayer);

    // Add terminator line
    this.terminatorPolyline.addTo(this.dayNightLayer);
    } catch (error) {
      console.error('Error updating day/night visualization:', error);
    }
  }

  // Start updating the map
  startUpdating() {
    const update = () => {
      this.updateDayNight();
      this.animationFrame = requestAnimationFrame(update);
    };

    this.animationFrame = requestAnimationFrame(update);
  }

  // Stop updating
  stopUpdating() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Also clear the timezone update interval
    if (this.timezoneUpdateInterval) {
      clearInterval(this.timezoneUpdateInterval);
      this.timezoneUpdateInterval = null;
    }
  }

  // Handle window resize
  resize() {
    if (this.map) {
      // Invalidate size to force redraw with animation disabled
      this.map.invalidateSize({animate: false, pan: false});

      // Force redraw of tiles
      if (this.baseTileLayer) {
        this.baseTileLayer.redraw();
      }
      if (this.labelTileLayer) {
        this.labelTileLayer.redraw();
      }

      // Update day/night visualization
      this.updateDayNight();

      // If map is zoomed out too far, reset to a safe zoom level
      if (this.map.getZoom() < 2) {
        this.map.setZoom(2);
      }

      // Ensure map is within bounds
      const bounds = this.map.getBounds();
      if (bounds && bounds._northEast && bounds._southWest) {
        if (bounds._northEast.lat > 85 || bounds._southWest.lat < -85 ||
            bounds._northEast.lng > 180 || bounds._southWest.lng < -180) {
          this.map.setView([20, 0], 2, {animate: false});
        }
      }
    }
  }
}

// Initialize the geochron map
function initGeochronMap() {
  if (geochronMap) {
    geochronInstance = new GeochronMap(geochronMap);

    // Handle window resize
    window.addEventListener('resize', () => {
      if (geochronInstance) {
        geochronInstance.resize();
      }
    });
  }
}

// Initialize the app
function initApp() {
  setupThemeToggle();
  setupToggleMap();
  setupAddClockButton();
  loadClocks();
  initGeochronMap();
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
