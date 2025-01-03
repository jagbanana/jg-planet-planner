// Planetary Calculator Class
class PlanetaryCalculator {
    constructor() {
        if (typeof window.Astronomy === 'undefined') {
            console.error('Astronomy library not loaded. Waiting for load...');
        }

        // These are the planets we want to show altitude charts for
        this.planets = [
            { name: 'Mercury', color: '#E5E5E5' },
            { name: 'Venus', color: '#FFD700' },
            { name: 'Mars', color: '#FF4500' },
            { name: 'Jupiter', color: '#FFA500' },
            { name: 'Saturn', color: '#DAA520' }
        ];

        // These are all planets for the solar system visualization
        this.allPlanets = [
            ...this.planets,
            { name: 'Earth', color: '#4169E1' }
        ];
    }

    calculatePlanetaryData(latitude, longitude, year, hour) {
        // Input validation
        if (!latitude || !longitude || !year || hour === undefined) {
            throw new Error('Missing required parameters');
        }

        console.log('Calculating planetary data:', { latitude, longitude, year, hour });

        const data = {};
        
        for (const planet of this.planets) {
            try {
                data[planet.name] = this.calculateYearlyAltitudes(
                    planet.name,
                    latitude,
                    longitude,
                    year,
                    hour
                );
            } catch (error) {
                console.error(`Error calculating data for ${planet.name}:`, error);
                throw new Error(`Failed to calculate data for ${planet.name}: ${error.message}`);
            }
        }
        
        return data;
    }

    calculateYearlyAltitudes(planetName, latitude, longitude, year, hour) {
        const data = [];
        const daysInYear = this.isLeapYear(year) ? 366 : 365;
        
        for (let dayOfYear = 0; dayOfYear < daysInYear; dayOfYear++) {
            const date = new Date(year, 0, dayOfYear + 1, hour, 0, 0);
            try {
                const altitude = this.calculatePlanetAltitude(
                    planetName,
                    latitude,
                    longitude,
                    date
                );
                
                // Only add point if we got a valid altitude
                if (altitude !== null) {
                    data.push({
                        date: date,
                        altitude: altitude
                    });
                }
            } catch (error) {
                console.error(`Error on day ${dayOfYear} for ${planetName}:`, error);
                // Add null point to maintain data continuity
                data.push({
                    date: date,
                    altitude: null
                });
            }
        }
        
        return data;
    }

    calculatePlanetAltitude(planetName, latitude, longitude, date) {
        if (typeof window.Astronomy === 'undefined') {
            throw new Error('Astronomy library not loaded');
        }
    
        const Astronomy = window.Astronomy;
    
        try {
            // Convert string coordinates to numbers
            const lat = Number(latitude);
            const lng = Number(longitude);
            
            // Create observer using the Observer constructor directly
            const observer = new Astronomy.Observer(lat, lng, 0);  // elevation 0 meters
    
            // Calculate time
            const time = Astronomy.MakeTime(date);
    
            // Get planet body
            const body = Astronomy.Body[planetName];
            if (!body) {
                throw new Error(`Unknown planet: ${planetName}`);
            }
    
            // Calculate equatorial coordinates
            const equ = Astronomy.Equator(body, time, observer, true, true);
            
            // Convert to horizontal coordinates
            const hor = Astronomy.Horizon(time, observer, equ.ra, equ.dec);
            
            return hor.altitude;
        } catch (error) {
            console.error(`Error calculating altitude for ${planetName}:`, error);
            // Return null instead of throwing to prevent cascade of errors
            return null;
        }
    }

    isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }
}

// Solar System Visualizer Class
class SolarSystemVisualizer {
    constructor(canvasId, planetCalculator) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.planets = planetCalculator.allPlanets;
        
        // Add resize observer
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(this.canvas.parentElement);
        
        // Initial resize
        this.handleResize();
    }

    handleResize() {
        // Get parent container width
        const parentWidth = this.canvas.parentElement.clientWidth;
        const parentHeight = Math.min(parentWidth * 0.6, 600); // 60% of width, max 600px
        
        // Update canvas dimensions
        this.canvas.width = parentWidth;
        this.canvas.height = parentHeight;
        
        // Update center points
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        
        // Calculate scale based on canvas size
        this.scale = Math.min(this.canvas.width, this.canvas.height) / 800;
        
        // Trigger redraw if we have active date
        if (this.currentDate) {
            this.update(this.currentDate.getFullYear(), this.currentDate.getMonth());
        }
    }

    calculatePlanetPosition(planetName, date) {
        const vector = Astronomy.HelioVector(planetName, date);
        return {
            x: vector.x,
            y: vector.y
        };
    }

    drawOrbits() {
        this.ctx.lineWidth = 1;
        this.planets.forEach(planet => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = planet.color;
            // Draw orbit path as ellipse
            const orbitRadius = this.getOrbitRadius(planet.name);
            this.ctx.ellipse(
                this.centerX, 
                this.centerY, 
                orbitRadius, 
                orbitRadius, 
                0, 0, 2 * Math.PI
            );
            this.ctx.stroke();
        });
    }

    getOrbitRadius(planetName) {
        const radii = {
            'Mercury': 1.5,  // was 0.4
            'Venus': 2.5,    // was 0.7
            'Earth': 3.5,    // was 1.0
            'Mars': 4.5,     // was 1.5
            'Jupiter': 6.5,  // was 5.2
            'Saturn': 8.5    // was 9.5
        };
        const baseRadius = radii[planetName] || 1;
        
        // Calculate maximum radius that would fit in canvas
        const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.425;
        
        // Scale based on Saturn's new radius (8.5) to ensure all orbits fit
        return (baseRadius / 8.5) * maxRadius;
    }
    
    drawPlanets(date) {
        // Store current date
        this.currentDate = date;
        
        // Calculate sun size based on canvas
        const sunRadius = Math.max(5, Math.min(this.canvas.width, this.canvas.height) * 0.02);
        
        // Draw Sun
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, sunRadius, 0, 2 * Math.PI);
        this.ctx.fill();
    
        // Calculate planet size based on canvas
        const planetRadius = Math.max(3, Math.min(this.canvas.width, this.canvas.height) * 0.01);
    
        // Define the same radii as in getOrbitRadius
        const radii = {
            'Mercury': 1.5,
            'Venus': 2.5,
            'Earth': 3.5,
            'Mars': 4.5,
            'Jupiter': 6.5,
            'Saturn': 8.5
        };
    
        this.planets.forEach(planet => {
            const pos = this.calculatePlanetPosition(planet.name, date);
            const angle = Math.atan2(pos.y, pos.x);
            
            // Use the same scaling logic as getOrbitRadius
            const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.425;
            const scaledDistance = (radii[planet.name] / 8.5) * maxRadius;
            
            const scaledX = this.centerX + scaledDistance * Math.cos(angle);
            const scaledY = this.centerY + scaledDistance * Math.sin(angle);
    
            // Draw planet
            this.ctx.fillStyle = planet.color;
            this.ctx.beginPath();
            this.ctx.arc(scaledX, scaledY, planetRadius, 0, 2 * Math.PI);
            this.ctx.fill();
    
            // Scale font size based on canvas
            const fontSize = Math.max(10, Math.min(this.canvas.width, this.canvas.height) * 0.02);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `${fontSize}px Arial`;
            this.ctx.fillText(planet.name, scaledX + planetRadius + 2, scaledY + planetRadius + 2);
        });
    }

    update(year, month) {
        const date = new Date(year, month);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawOrbits();
        this.drawPlanets(date);
    }
}

// Attach both classes to window object
window.PlanetaryCalculator = PlanetaryCalculator;
window.SolarSystemVisualizer = SolarSystemVisualizer;