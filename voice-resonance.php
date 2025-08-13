<?php
/**
 * Plugin Name: Voice Resonance
 * Description: Wellness voice analysis app with Stripe Pro upgrades for practitioners and clients
 * Version: 1.0.0
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Author: Your Name
 * Text Domain: voice-resonance
 * Domain Path: /languages
 * License: GPL v2 or later
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('VR_VERSION', '1.0.0');
define('VR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VR_PLUGIN_URL', plugin_dir_url(__FILE__));
define('VR_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Load Composer dependencies FIRST (if they exist)
if (file_exists(VR_PLUGIN_DIR . 'vendor/autoload.php')) {
    require_once VR_PLUGIN_DIR . 'vendor/autoload.php';
}

// Load plugin autoloader SECOND
require_once VR_PLUGIN_DIR . 'includes/class-autoloader.php';
VR_Autoloader::init();

// Explicitly include Activator/Deactivator for activation hooks
require_once VR_PLUGIN_DIR . 'includes/class-activator.php';
require_once VR_PLUGIN_DIR . 'includes/class-deactivator.php';

// Register activation and deactivation hooks
register_activation_hook(__FILE__, ['VR_Activator', 'activate']);
register_deactivation_hook(__FILE__, ['VR_Deactivator', 'deactivate']);

// Initialize plugin on plugins_loaded action
// This is the standard and recommended way for WordPress plugins
add_action('plugins_loaded', 'vr_initialize_plugin');

if (!function_exists('vr_initialize_plugin')) {
    function vr_initialize_plugin() {
        $plugin = new VR_Plugin();
        $plugin->run();
    }
}