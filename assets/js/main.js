// Planetary Altitude Calculator Main JavaScript
jQuery(document).ready(function($) {
    let calculator;
    let visualizer;
    const charts = {};
    
    // Initialize calculator after ensuring Astronomy is loaded
    function initCalculator() {
        try {
            if (typeof window.Astronomy === 'undefined') {
                console.error('Astronomy library not loaded yet. Retrying in 1 second...');
                setTimeout(initCalculator, 1000);
                return;
            }
            calculator = new window.PlanetaryCalculator();
            console.log('Calculator initialized successfully');
            initVisualizer(); // Initialize visualizer after calculator
        } catch (error) {
            console.error('Error initializing calculator:', error);
            setTimeout(initCalculator, 1000);
        }
    }

    // Initialize visualizer
    function initVisualizer() {
        if (calculator) {
            visualizer = new window.SolarSystemVisualizer('solar-system', calculator);
            
            // Add month slider event listener
            $('#month-slider').on('input', function() {
                const month = parseInt($(this).val());
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                  'July', 'August', 'September', 'October', 'November', 'December'];
                $('#selected-month').text(monthNames[month]);
                
                const year = parseInt($('#year-select').val());
                visualizer.update(year, month);
                
                // Update Mars-Earth distance
                const date = new Date(year, month);
                const marsVector = Astronomy.HelioVector('Mars', date);
                const earthVector = Astronomy.HelioVector('Earth', date);
                const distance = Math.sqrt(
                    Math.pow(marsVector.x - earthVector.x, 2) +
                    Math.pow(marsVector.y - earthVector.y, 2) +
                    Math.pow(marsVector.z - earthVector.z, 2)
                );
                $('#mars-distance').text(distance.toFixed(2));
            });
            
            // Initial update
            $('#month-slider').trigger('input');
        }
    }

    // Start initialization
    initCalculator();
    
    // State management
    let currentLocation = {
        lat: null,
        lng: null,
        address: ''
    };

    // DOM Elements
    const locationInput = $('#location-search');
    const searchButton = $('#search-location');
    const detectButton = $('#detect-location');
    const coordinatesDisplay = $('.coordinates');
    const yearSelect = $('#year-select');
    const timeSlider = $('#time-slider');
    const timeDisplay = $('#selected-time');

    // Initialize time display
    updateTimeDisplay(timeSlider.val());

    // Event Listeners
    detectButton.on('click', detectLocation);
    searchButton.on('click', searchLocation);
    timeSlider.on('input', function() {
        updateTimeDisplay(this.value);
        if (currentLocation.lat !== null && currentLocation.lng !== null) {
            updateCharts();
        }
    });
    yearSelect.on('change', function() {
        if (currentLocation.lat !== null && currentLocation.lng !== null) {
            updateCharts();
            // Update solar system visualization when year changes
            const month = parseInt($('#month-slider').val());
            if (visualizer) {
                visualizer.update(parseInt(this.value), month);
            }
        }
    });

    // Error handling utility
    function handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        const errorMessage = error.message || 'An unexpected error occurred';
        alert(`${context}: ${errorMessage}. Please try again.`);
    }

    // Detect location using browser geolocation
    function detectLocation() {
        if (!navigator.geolocation) {
            handleError(new Error('Geolocation not supported'), 'Location Detection');
            return;
        }

        detectButton.prop('disabled', true).text('Detecting...');

        navigator.geolocation.getCurrentPosition(
            position => {
                try {
                    const { latitude, longitude } = position.coords;
                    updateLocation(latitude, longitude);
                    reverseGeocode(latitude, longitude);
                } catch (error) {
                    handleError(error, 'Processing Location');
                } finally {
                    detectButton.prop('disabled', false).html('<i class="dashicons dashicons-location"></i>Detect My Location');
                }
            },
            error => {
                handleError(error, 'Geolocation');
                detectButton.prop('disabled', false).html('<i class="dashicons dashicons-location"></i>Detect My Location');
            }
        );
    }

    // Search location using OpenStreetMap Nominatim API
    async function searchLocation() {
        const query = locationInput.val().trim();
        if (!query) {
            handleError(new Error('Please enter a location'), 'Location Search');
            return;
        }

        searchButton.prop('disabled', true).text('Searching...');

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
            );
            if (!response.ok) {
                throw new Error('Location search failed');
            }
            
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                updateLocation(parseFloat(lat), parseFloat(lon), display_name);
            } else {
                throw new Error('Location not found');
            }
        } catch (error) {
            handleError(error, 'Location Search');
        } finally {
            searchButton.prop('disabled', false).text('Search');
        }
    }

    // Reverse geocode coordinates to get address
    async function reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            if (!response.ok) {
                throw new Error('Reverse geocoding failed');
            }
            
            const data = await response.json();
            if (data && data.display_name) {
                updateLocation(lat, lng, data.display_name);
            }
        } catch (error) {
            handleError(error, 'Reverse Geocoding');
        }
    }

    // Update location display and trigger chart updates
    function updateLocation(lat, lng, address = '') {
        console.log('Updating location:', { lat, lng, address });
        currentLocation = { lat, lng, address };
        coordinatesDisplay.html(
            `${address}<br>${lat.toFixed(4)}°, ${lng.toFixed(4)}°`
        );
        
        if (!charts || Object.keys(charts).length === 0) {
            initializeCharts();
        }
        updateCharts();
    }

    // Update time display
    function updateTimeDisplay(hour) {
        const hourNum = parseInt(hour);
        const period = hourNum >= 12 ? 'PM' : 'AM';
        const hour12 = hourNum % 12 || 12;
        timeDisplay.text(`${hour12}:00 ${period}`);
    }

    // Initialize charts
    function initializeCharts() {
        console.log('Initializing charts');
        const chartsContainer = $('.charts-container');
        chartsContainer.empty();

        calculator.planets.forEach(planet => {
            const chartContainer = $('<div>')
                .addClass('planet-chart')
                .attr('id', `chart-${planet.name.toLowerCase()}`)
                .appendTo(chartsContainer);

            const canvas = $('<canvas>')
                .appendTo(chartContainer);

            const ctx = canvas[0].getContext('2d');
            charts[planet.name] = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{
                        label: `${planet.name} Altitude`,
                        borderColor: planet.color,
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        data: []
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                color: '#ffffff'
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: function(tooltipItems) {
                                    const date = new Date(tooltipItems[0].parsed.x);
                                    return date.toLocaleDateString();
                                },
                                label: function(context) {
                                    return `Altitude: ${context.parsed.y.toFixed(1)}°`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'month',
                                displayFormats: {
                                    month: 'MMM'
                                }
                            },
                            grid: {
                                color: '#444444'
                            },
                            ticks: {
                                color: '#ffffff'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Altitude (degrees)',
                                color: '#ffffff'
                            },
                            grid: {
                                color: '#444444'
                            },
                            ticks: {
                                color: '#ffffff'
                            }
                        }
                    }
                }
            });
        });
    }

    // Update charts
    function updateCharts() {
        try {
            if (!calculator) {
                console.log('Calculator not ready yet, waiting...');
                setTimeout(updateCharts, 1000);
                return;
            }

            if (!currentLocation.lat || !currentLocation.lng) {
                console.log('Location not set');
                return;
            }

            const year = parseInt(yearSelect.val());
            const hour = parseInt(timeSlider.val());

            if (isNaN(year) || isNaN(hour)) {
                console.error('Invalid year or hour');
                return;
            }

            console.log('Calculating with:', {
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                year,
                hour
            });

            const planetaryData = calculator.calculatePlanetaryData(
                currentLocation.lat,
                currentLocation.lng,
                year,
                hour
            );

            if (planetaryData) {
                Object.entries(planetaryData).forEach(([planetName, data]) => {
                    const chart = charts[planetName];
                    if (!chart) {
                        console.error(`Chart not found for planet: ${planetName}`);
                        return;
                    }
                
                    const validData = data.filter(point => 
                        point && point.date && point.altitude !== null
                    ).map(point => ({
                        x: point.date,
                        y: point.altitude
                    }));
                
                    chart.data.datasets[0].data = validData;
                    chart.update();
                });
            }
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }

    // Initialize charts on page load
    initializeCharts();
});