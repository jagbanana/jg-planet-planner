<?php
/**
 * Plugin Name: JG Planet Planner
 * Description: Helps astronomers determine optimal planetary viewing times
 * Version: 1
 * Author: jaglab
 */

// Prevent direct access to this file
if (!defined('ABSPATH')) {
    exit;
}

// Plugin class
class PlanetaryAltitude {
    private $plugin_path;
    private $plugin_url;
    private $version = '.7'; // Add version variable here

    public function __construct() {
        $this->plugin_path = plugin_dir_path(__FILE__);
        $this->plugin_url = plugin_dir_url(__FILE__);
        
        // Initialize hooks
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_shortcode('jg_planet_planner', array($this, 'render_calculator'));
    }

    public function enqueue_scripts() {
        // Enqueue Bootstrap if not already included by the theme
        if (!wp_style_is('bootstrap', 'enqueued')) {
            wp_enqueue_style(
                'bootstrap',
                'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css',
                array(),
                '5.2.3'
            );
        }

        // Plugin styles
        wp_enqueue_style(
            'planetary-altitude-style',
            $this->plugin_url . 'assets/css/style.css',
            array(),
            $this->version
        );

        wp_enqueue_style('dashicons');

        // External libraries
        wp_enqueue_script('jquery');
        
        wp_enqueue_script(
            'chartjs',
            'https://cdn.jsdelivr.net/npm/chart.js@3.7.0/dist/chart.min.js',
            array(),
            '3.7.0',
            true
        );

        wp_enqueue_script(
            'chartjs-adapter-date-fns',
            'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@2.0.0/dist/chartjs-adapter-date-fns.bundle.min.js',
            array('chartjs'),
            '2.0.0',
            true
        );

        wp_enqueue_script(
            'astronomy-js',
            'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.17/astronomy.browser.js',
            array(),
            '2.1.17',
            true
        );

        // Plugin scripts - now using version variable
        wp_enqueue_script(
            'planetary-calculator',
            $this->plugin_url . 'assets/js/calculator.js',
            array('jquery', 'astronomy-js'),
            $this->version,
            true
        );

        wp_enqueue_script(
            'planetary-altitude-script',
            $this->plugin_url . 'assets/js/main.js',
            array('jquery', 'astronomy-js', 'chartjs', 'planetary-calculator'),
            $this->version,
            true
        );

        // Pass PHP variables to JavaScript
        wp_localize_script('planetary-altitude-script', 'planetaryAltitudeData', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('planetary_altitude_nonce'),
            'pluginUrl' => $this->plugin_url
        ));
    }

    public function render_calculator() {
        ob_start();
        ?>
        <div class="planetary-altitude-calculator">
            <h2><i class="dashicons dashicons-admin-site-alt3"></i>Planetary Planner: Altitude and Position Calculator</h2>
            
            <!-- Location Section -->
                <div class="location-section">
                    <div class="current-location">
                        <span class="location-placeholder">Please set your location to start</span>
                        <span class="coordinates"></span>
                    </div>
                    <button id="detect-location" class="btn btn-primary w-100" style="margin-top: 10px; margin-bottom: 10px;">
                        <i class="dashicons dashicons-location"></i>
                        Detect My Location
                    </button>
                <p>or</p>
                <div class="location-input">
                    <input type="text" id="location-search" 
                           placeholder="Enter city, address, or place name" 
                           class="form-control-planet">
                    <button id="search-location" class="btn btn-primary">Search</button>
                </div>
            </div>

            <!-- Time and Year Selection -->
            <div class="controls-section">
                <select id="year-select" class="form-control-planet">
                    <?php
                    $current_year = date('Y');
                    for ($i = 0; $i <= 3; $i++) {
                        $year = $current_year + $i;
                        echo "<option value='$year'>$year</option>";
                    }
                    ?>
                </select>
                <input type="range" id="time-slider" 
                       min="0" max="23" value="20" class="form-control-planet">
                <span id="selected-time">8:00 PM</span>
            </div>
            <!-- Planetary Charts Container -->
            <div class="charts-container">
                <!-- Charts will be dynamically inserted here -->
            </div>
            <div class="solar-system-section">
                <div class="month-slider-container">
                    <input type="range" id="month-slider" min="0" max="11" value="0">
                    <span id="selected-month">January</span>
                </div>
                <canvas id="solar-system" width="1000" height="600"></canvas>
                <div class="distance-indicator">
                    Mars-Earth Distance: <span id="mars-distance"></span> AU
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}

// Initialize plugin
$planetary_altitude = new PlanetaryAltitude();