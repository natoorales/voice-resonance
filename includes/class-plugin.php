<?php

class VR_Plugin {

    protected $plugin_name;
    protected $version;
    private $admin;
    private $api_controller;
    private $stripe_service;
    private $entitlements;

    public function __construct() {
        $this->version = defined('VR_VERSION') ? VR_VERSION : '1.0.0';
        $this->plugin_name = 'voice-resonance';

        $this->load_dependencies();
        $this->set_locale();
    }

    private function load_dependencies() {
        // Explicitly include core dependency files to prevent "Class not found" errors
        // This bypasses potential autoloader timing issues.
        $dependencies = [
            'admin/class-admin.php',
            'api/class-controller.php',
            'services/class-stripe.php',
            'services/class-entitlements.php'
        ];

        foreach ($dependencies as $file) {
            $path = VR_PLUGIN_DIR . 'includes/' . $file;
            if (file_exists($path)) {
                require_once $path;
            }
        }

        // Now instantiate the classes
        // Use class_exists checks defensively
        $this->admin = class_exists('VR_Admin') ? new VR_Admin() : null;
        $this->api_controller = class_exists('VR_API_Controller') ? new VR_API_Controller() : null;
        $this->stripe_service = class_exists('VR_Stripe') ? new VR_Stripe() : null;
        $this->entitlements = class_exists('VR_Entitlements') ? new VR_Entitlements() : null;

        if (defined('WP_DEBUG') && WP_DEBUG) {
            if (!$this->api_controller) {
                error_log('VR_Plugin: Failed to instantiate VR_API_Controller.');
            }
        }
    }

    private function set_locale() {
        add_action('plugins_loaded', function() {
            load_plugin_textdomain(
                'voice-resonance',
                false,
                dirname(VR_PLUGIN_BASENAME) . '/languages/'
            );
        });
    }

    public function run() {
        // Admin hooks
        if (is_admin() && $this->admin instanceof VR_Admin) {
            add_action('admin_menu', [$this->admin, 'add_admin_menu']);
            add_action('admin_init', [$this->admin, 'register_settings']);
            add_action('admin_enqueue_scripts', [$this->admin, 'enqueue_admin_assets']);
        }

        // API hooks - Ensure the controller object exists before hooking
        if ($this->api_controller instanceof VR_API_Controller) {
            add_action('rest_api_init', [$this->api_controller, 'register_routes']);
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('VR_Plugin: API routes registered.');
            }
        } else {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('VR_Plugin: Skipping API route registration, controller not instantiated.');
            }
        }

        // Frontend hooks
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend_assets']);
        add_action('init', [$this, 'register_shortcodes']);
    }

    public function get_plugin_name() {
        return $this->plugin_name;
    }

    public function get_version() {
        return $this->version;
    }

    public function enqueue_frontend_assets() {
        wp_enqueue_style('vr-app-style', VR_PLUGIN_URL . 'assets/css/app.css', [], $this->version);
        wp_enqueue_script('vr-app-script', VR_PLUGIN_URL . 'assets/js/dist/app.min.js', ['jquery'], $this->version, true);

        // Determine Pro status robustly
        $is_pro = false;
        if (is_user_logged_in() && $this->entitlements) {
            if (method_exists($this->entitlements, 'has_pro_access')) {
                $is_pro = $this->entitlements->has_pro_access(get_current_user_id());
            } elseif (method_exists($this->entitlements, 'is_user_pro')) {
                $is_pro = $this->entitlements->is_user_pro(get_current_user_id());
            }
        }

        wp_localize_script('vr-app-script', 'VR_CONFIG', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'rest_url' => rest_url('vr/v1/'),
            'nonce' => wp_create_nonce('wp_rest'),
            'is_logged_in' => is_user_logged_in(),
            'is_pro' => $is_pro,
        ]);
    }

    public function register_shortcodes() {
        add_shortcode('voice_resonance_app', [$this, 'render_app_shortcode']);
    }

    public function render_app_shortcode($atts) {
        $atts = shortcode_atts([
            'mode' => 'full',
            'height' => '600px',
        ], $atts, 'voice_resonance_app');

        ob_start();
        if (file_exists(VR_PLUGIN_DIR . 'templates/shortcode.php')) {
            include VR_PLUGIN_DIR . 'templates/shortcode.php';
        } else {
            echo '<div id="vrp-app-root" class="vrp-app-container">Voice Resonance App (Template Missing)</div>';
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('VR_Plugin: templates/shortcode.php not found.');
            }
        }
        return ob_get_clean();
    }
}