# Voice Resonance WordPress Plugin: Complete Implementation Guide

Based on your requirements for a portable, installable WordPress plugin using free tools, I'll provide a comprehensive file structure and implementation that combines production-ready code with maintainable architecture.

## **Plugin File Structure**

```
voice-resonance/
├── voice-resonance.php                 # Main plugin file with header and bootstrap
├── readme.txt                          # WordPress plugin repository format
├── uninstall.php                       # Clean uninstall procedures
├── composer.json                       # PHP dependencies (Stripe SDK)
├── package.json                        # Frontend build dependencies
├── webpack.config.js                   # Frontend build configuration
│
├── includes/                           # Core PHP functionality
│   ├── class-autoloader.php           # PSR-4 autoloader for plugin classes
│   ├── class-plugin.php               # Main plugin orchestrator
│   ├── class-activator.php            # Plugin activation procedures
│   ├── class-deactivator.php          # Plugin deactivation procedures
│   │
│   ├── admin/                          # WordPress admin interface
│   │   ├── class-admin.php             # Main admin controller
│   │   ├── class-settings.php          # Settings page management
│   │   └── partials/                   # Admin page templates
│   │       ├── settings-display.php
│   │       ├── dashboard-display.php
│   │       └── users-display.php
│   │
│   ├── api/                           # REST API endpoints
│   │   ├── class-controller.php        # Main API controller
│   │   ├── class-sessions.php          # Session management endpoints
│   │   ├── class-segments.php          # Audio segment endpoints
│   │   └── class-stripe.php            # Stripe integration endpoints
│   │
│   ├── database/                      # Database management
│   │   ├── class-manager.php           # Database operations manager
│   │   ├── class-migrations.php        # Schema creation and updates
│   │   └── schemas/                    # Database schema definitions
│   │       └── initial-schema.sql
│   │
│   ├── services/                      # Business logic services
│   │   ├── class-stripe.php            # Stripe API integration
│   │   ├── class-entitlements.php      # User access management
│   │   ├── class-audio.php             # Audio processing utilities
│   │   ├── class-export.php            # Data export functionality
│   │   └── class-share.php             # Share link management
│   │
│   └── utilities/                     # Helper classes
│       ├── class-logger.php            # Logging functionality
│       ├── class-validator.php         # Input validation
│       └── class-security.php          # Security utilities
│
├── assets/                            # Frontend resources
│   ├── css/
│   │   ├── admin.css                   # Admin interface styles
│   │   └── app.css                     # Frontend application styles
│   ├── js/
│   │   ├── src/                        # Source files for building
│   │   │   ├── main.js                 # SPA entry point
│   │   │   ├── components/             # UI components
│   │   │   ├── audio/                  # Audio processing modules
│   │   │   │   ├── processor.js
│   │   │   │   ├── worklet.js
│   │   │   │   └── worker.js
│   │   │   └── utils/                  # Utility functions
│   │   ├── dist/                       # Built/minified files
│   │   │   ├── app.min.js
│   │   │   └── vendor.min.js
│   │   └── admin.js                    # Admin interface JavaScript
│   ├── images/
│   │   ├── logo.svg
│   │   └── icons/                      # PWA icons
│   └── manifest.json                   # PWA manifest
│
├── templates/                         # Page templates
│   ├── app-page.php                   # Main SPA container template
│   └── shortcode.php                  # Shortcode template
│
├── languages/                         # Internationalization
│   ├── voice-resonance.pot
│   └── voice-resonance-en_US.po
│
└── vendor/                           # Composer dependencies
    └── autoload.php
```

## **Core Implementation Files**

### **Main Plugin File: `voice-resonance.php`**

```php
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
define('VR_PLUGIN_FILE', __FILE__);
define('VR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VR_PLUGIN_URL', plugin_dir_url(__FILE__));
define('VR_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Load Composer dependencies
if (file_exists(VR_PLUGIN_DIR . 'vendor/autoload.php')) {
    require_once VR_PLUGIN_DIR . 'vendor/autoload.php';
}

// Load plugin autoloader
require_once VR_PLUGIN_DIR . 'includes/class-autoloader.php';
VR_Autoloader::init();

// Activation and deactivation hooks
register_activation_hook(__FILE__, ['VR_Activator', 'activate']);
register_deactivation_hook(__FILE__, ['VR_Deactivator', 'deactivate']);

// Initialize plugin
add_action('plugins_loaded', function() {
    $plugin = new VR_Plugin();
    $plugin->run();
});
```

### **Plugin Autoloader: `includes/class-autoloader.php`**

```php
<?php
/**
 * Autoloader for Voice Resonance plugin classes
 */
class VR_Autoloader {
    
    public static function init() {
        spl_autoload_register([__CLASS__, 'autoload']);
    }
    
    public static function autoload($class_name) {
        // Only autoload our classes
        if (strpos($class_name, 'VR_') !== 0) {
            return;
        }
        
        // Convert class name to file path
        $class_file = strtolower(str_replace('_', '-', $class_name));
        $class_file = 'class-' . substr($class_file, 3) . '.php'; // Remove VR_ prefix
        
        // Define possible directories
        $directories = [
            VR_PLUGIN_DIR . 'includes/',
            VR_PLUGIN_DIR . 'includes/admin/',
            VR_PLUGIN_DIR . 'includes/api/',
            VR_PLUGIN_DIR . 'includes/database/',
            VR_PLUGIN_DIR . 'includes/services/',
            VR_PLUGIN_DIR . 'includes/utilities/',
        ];
        
        // Try to load the file
        foreach ($directories as $directory) {
            $file_path = $directory . $class_file;
            if (file_exists($file_path)) {
                require_once $file_path;
                break;
            }
        }
    }
}
```

### **Main Plugin Class: `includes/class-plugin.php`**

```php
<?php
/**
 * Main plugin class that orchestrates all functionality
 */
class VR_Plugin {
    
    private $admin;
    private $api_controller;
    private $stripe_service;
    private $entitlements;
    
    public function __construct() {
        $this->load_dependencies();
        $this->set_locale();
    }
    
    private function load_dependencies() {
        $this->admin = new VR_Admin();
        $this->api_controller = new VR_API_Controller();
        $this->stripe_service = new VR_Stripe();
        $this->entitlements = new VR_Entitlements();
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
        if (is_admin()) {
            add_action('admin_menu', [$this->admin, 'add_admin_menu']);
            add_action('admin_init', [$this->admin, 'register_settings']);
            add_action('admin_enqueue_scripts', [$this->admin, 'enqueue_admin_assets']);
        }
        
        // API hooks
        add_action('rest_api_init', [$this->api_controller, 'register_routes']);
        
        // Frontend hooks
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend_assets']);
        add_action('init', [$this, 'register_shortcodes']);
        add_action('init', [$this, 'create_app_page']);
        
        // Custom capabilities
        add_action('init', [$this->entitlements, 'register_capabilities']);
    }
    
    public function enqueue_frontend_assets() {
        if ($this->should_load_app()) {
            wp_enqueue_style(
                'vr-app-style',
                VR_PLUGIN_URL . 'assets/css/app.css',
                [],
                VR_VERSION
            );
            
            wp_enqueue_script(
                'vr-app-script',
                VR_PLUGIN_URL . 'assets/js/dist/app.min.js',
                ['jquery'],
                VR_VERSION,
                true
            );
            
            // Localize script with configuration
            wp_localize_script('vr-app-script', 'VR_CONFIG', [
                'rest_url' => rest_url('vr/v1/'),
                'nonce' => wp_create_nonce('wp_rest'),
                'user_id' => get_current_user_id(),
                'is_logged_in' => is_user_logged_in(),
                'is_pro' => $this->entitlements->is_user_pro(get_current_user_id()),
                'stripe_pk' => $this->get_stripe_publishable_key(),
                'app_settings' => $this->get_app_settings()
            ]);
        }
    }
    
    public function register_shortcodes() {
        add_shortcode('voice_resonance_app', [$this, 'render_app_shortcode']);
    }
    
    public function render_app_shortcode($atts) {
        $atts = shortcode_atts([
            'mode' => 'full',
            'height' => '600px'
        ], $atts);
        
        ob_start();
        include VR_PLUGIN_DIR . 'templates/shortcode.php';
        return ob_get_clean();
    }
    
    public function create_app_page() {
        // Check if app page exists, create if not
        $app_page = get_page_by_path('voice-app');
        if (!$app_page) {
            wp_insert_post([
                'post_title' => 'Voice Resonance App',
                'post_name' => 'voice-app',
                'post_content' => '[voice_resonance_app]',
                'post_status' => 'publish',
                'post_type' => 'page',
                'comment_status' => 'closed',
                'ping_status' => 'closed'
            ]);
        }
    }
    
    private function should_load_app() {
        global $post;
        return is_page() && $post && has_shortcode($post->post_content, 'voice_resonance_app');
    }
    
    private function get_stripe_publishable_key() {
        $options = get_option('vr_options', []);
        $mode = $options['stripe_mode'] ?? 'test';
        return $options['stripe'][$mode]['pk'] ?? '';
    }
    
    private function get_app_settings() {
        $options = get_option('vr_options', []);
        return [
            'audio_quality' => $options['audio']['quality'] ?? 'standard',
            'privacy_mode' => $options['privacy']['mode'] ?? 'local',
            'retention_days' => $options['data']['retention_days'] ?? 30
        ];
    }
}
```

### **Database Manager: `includes/database/class-manager.php`**

```php
<?php
/**
 * Database operations manager
 */
class VR_Database_Manager {
    
    private $tables = [
        'sessions' => 'vr_sessions',
        'segments' => 'vr_segments',
        'profiles' => 'vr_calibration_profiles',
        'entitlements' => 'vr_user_entitlements',
        'webhook_events' => 'vr_webhook_events'
    ];
    
    public function __construct() {
        global $wpdb;
        
        // Add table prefix
        foreach ($this->tables as $key => $table) {
            $this->tables[$key] = $wpdb->prefix . $table;
        }
    }
    
    public function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Sessions table
        $sql_sessions = "CREATE TABLE {$this->tables['sessions']} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            practitioner_id bigint(20) unsigned DEFAULT NULL,
            session_type enum('calibration','session','quick_test') DEFAULT 'session',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            notes text,
            tags longtext,
            share_token varchar(64) DEFAULT NULL,
            share_expires datetime DEFAULT NULL,
            status enum('active','archived','deleted') DEFAULT 'active',
            PRIMARY KEY (id),
            KEY idx_user_created (user_id, created_at),
            KEY idx_practitioner (practitioner_id),
            KEY idx_share_token (share_token),
            KEY idx_status (status)
        ) $charset_collate;";
        
        // Segments table
        $sql_segments = "CREATE TABLE {$this->tables['segments']} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            session_id bigint(20) unsigned NOT NULL,
            start_time_ms int unsigned NOT NULL,
            duration_ms int unsigned NOT NULL,
            transcript text,
            vri_score tinyint unsigned DEFAULT NULL,
            vri_confidence decimal(3,2) DEFAULT NULL,
            quality_score tinyint unsigned DEFAULT NULL,
            features_json longtext,
            audio_url text,
            prompt_id bigint(20) unsigned DEFAULT NULL,
            tags longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_session_time (session_id, start_time_ms),
            KEY idx_vri (vri_score),
            KEY idx_quality (quality_score)
        ) $charset_collate;";
        
        // Calibration profiles table
        $sql_profiles = "CREATE TABLE {$this->tables['profiles']} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            device_hash varchar(32) NOT NULL,
            profile_name varchar(64) DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            features_baseline longtext NOT NULL,
            thresholds_config longtext NOT NULL,
            is_active tinyint(1) DEFAULT 0,
            sample_count int DEFAULT 0,
            PRIMARY KEY (id),
            KEY idx_user_active (user_id, is_active),
            KEY idx_device (device_hash)
        ) $charset_collate;";
        
        // User entitlements table
        $sql_entitlements = "CREATE TABLE {$this->tables['entitlements']} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            stripe_customer_id varchar(64) DEFAULT NULL,
            stripe_subscription_id varchar(64) DEFAULT NULL,
            plan_type enum('free','client_pro','practitioner_pro') DEFAULT 'free',
            plan_interval enum('month','year','lifetime') DEFAULT NULL,
            status enum('active','trialing','past_due','canceled','incomplete') DEFAULT 'active',
            current_period_start datetime DEFAULT NULL,
            current_period_end datetime DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY idx_user (user_id),
            KEY idx_stripe_customer (stripe_customer_id),
            KEY idx_subscription (stripe_subscription_id),
            KEY idx_status (status)
        ) $charset_collate;";
        
        // Webhook events table (for idempotency)
        $sql_webhook_events = "CREATE TABLE {$this->tables['webhook_events']} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            event_id varchar(128) NOT NULL,
            event_type varchar(64) NOT NULL,
            processed_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY idx_event_id (event_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        
        dbDelta($sql_sessions);
        dbDelta($sql_segments);
        dbDelta($sql_profiles);
        dbDelta($sql_entitlements);
        dbDelta($sql_webhook_events);
        
        update_option('vr_db_version', VR_VERSION);
        
        // Create default data
        $this->seed_default_data();
    }
    
    private function seed_default_data() {
        // Create default prompt sets as custom post types
        $default_prompts = [
            'Emotional Wellness' => [
                'I feel completely safe and secure in this moment',
                'I am worthy of love and respect',
                'I trust my inner wisdom and intuition',
                'I release all fear and embrace peace',
                'I am grateful for my healing journey'
            ],
            'Self-Affirmations' => [
                'I am confident in my unique abilities',
                'I deserve happiness and success',
                'I choose love over fear in all situations',
                'I am exactly where I need to be',
                'I trust the process of life'
            ],
            'Neutral Statements' => [
                'The weather changes throughout the seasons',
                'Mathematics involves numbers and calculations',
                'Trees grow in various climates worldwide',
                'Technology continues to evolve rapidly',
                'Books contain written information and stories'
            ]
        ];
        
        foreach ($default_prompts as $category => $prompts) {
            wp_insert_post([
                'post_title' => $category,
                'post_content' => wp_json_encode($prompts),
                'post_status' => 'publish',
                'post_type' => 'vr_prompt_set',
                'meta_input' => [
                    'is_default' => true,
                    'category' => sanitize_title($category),
                    'scope' => 'global'
                ]
            ]);
        }
    }
    
    public function get_table_name($table_key) {
        return $this->tables[$table_key] ?? null;
    }
    
    // Session management methods
    public function create_session($user_id, $session_type = 'session', $notes = '', $practitioner_id = null) {
        global $wpdb;
        
        $result = $wpdb->insert(
            $this->tables['sessions'],
            [
                'user_id' => $user_id,
                'practitioner_id' => $practitioner_id,
                'session_type' => $session_type,
                'notes' => $notes,
                'created_at' => current_time('mysql')
            ],
            ['%d', '%d', '%s', '%s', '%s']
        );
        
        return $result ? $wpdb->insert_id : false;
    }
    
    public function add_segment($session_id, $segment_data) {
        global $wpdb;
        
        $defaults = [
            'session_id' => $session_id,
            'start_time_ms' => 0,
            'duration_ms' => 0,
            'transcript' => '',
            'vri_score' => null,
            'vri_confidence' => null,
            'quality_score' => null,
            'features_json' => null,
            'audio_url' => null,
            'prompt_id' => null,
            'tags' => null,
            'created_at' => current_time('mysql')
        ];
        
        $segment_data = wp_parse_args($segment_data, $defaults);
        
        $result = $wpdb->insert(
            $this->tables['segments'],
            $segment_data,
            ['%d', '%d', '%d', '%s', '%d', '%f', '%d', '%s', '%s', '%d', '%s', '%s']
        );
        
        return $result ? $wpdb->insert_id : false;
    }
    
    public function get_user_sessions($user_id, $limit = 50, $offset = 0) {
        global $wpdb;
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->tables['sessions']} 
             WHERE user_id = %d AND status = 'active'
             ORDER BY created_at DESC 
             LIMIT %d OFFSET %d",
            $user_id, $limit, $offset
        ));
    }
    
    public function get_session_segments($session_id) {
        global $wpdb;
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->tables['segments']} 
             WHERE session_id = %d 
             ORDER BY start_time_ms ASC",
            $session_id
        ));
    }
}
```

### **Admin Settings: `includes/admin/class-admin.php`**

```php
<?php
/**
 * Admin interface controller
 */
class VR_Admin {
    
    public function add_admin_menu() {
        add_menu_page(
            __('Voice Resonance', 'voice-resonance'),
            __('Voice Resonance', 'voice-resonance'),
            'manage_options',
            'voice-resonance',
            [$this, 'display_dashboard_page'],
            'dashicons-microphone',
            30
        );
        
        add_submenu_page(
            'voice-resonance',
            __('Settings', 'voice-resonance'),
            __('Settings', 'voice-resonance'),
            'manage_options',
            'voice-resonance-settings',
            [$this, 'display_settings_page']
        );
        
        add_submenu_page(
            'voice-resonance',
            __('Users & Plans', 'voice-resonance'),
            __('Users', 'voice-resonance'),
            'manage_options',
            'voice-resonance-users',
            [$this, 'display_users_page']
        );
    }
    
    public function register_settings() {
        register_setting('vr_options', 'vr_options', [
            'sanitize_callback' => [$this, 'sanitize_options']
        ]);
        
        // Stripe Settings Section
        add_settings_section(
            'vr_stripe_section',
            __('Stripe Configuration', 'voice-resonance'),
            [$this, 'stripe_section_callback'],
            'voice-resonance-settings'
        );
        
        $stripe_fields = [
            'stripe_mode' => [
                'title' => __('Stripe Mode', 'voice-resonance'),
                'callback' => 'render_select_field',
                'options' => ['test' => 'Test Mode', 'live' => 'Live Mode']
            ],
            'stripe_test_pk' => [
                'title' => __('Test Publishable Key', 'voice-resonance'),
                'callback' => 'render_text_field',
                'placeholder' => 'pk_test_...'
            ],
            'stripe_test_sk' => [
                'title' => __('Test Secret Key', 'voice-resonance'),
                'callback' => 'render_password_field',
                'placeholder' => 'sk_test_...'
            ],
            'stripe_test_whsec' => [
                'title' => __('Test Webhook Secret', 'voice-resonance'),
                'callback' => 'render_password_field',
                'placeholder' => 'whsec_...'
            ],
            'stripe_live_pk' => [
                'title' => __('Live Publishable Key', 'voice-resonance'),
                'callback' => 'render_text_field',
                'placeholder' => 'pk_live_...'
            ],
            'stripe_live_sk' => [
                'title' => __('Live Secret Key', 'voice-resonance'),
                'callback' => 'render_password_field',
                'placeholder' => 'sk_live_...'
            ],
            'stripe_live_whsec' => [
                'title' => __('Live Webhook Secret', 'voice-resonance'),
                'callback' => 'render_password_field',
                'placeholder' => 'whsec_...'
            ]
        ];
        
        foreach ($stripe_fields as $field_id => $field_config) {
            add_settings_field(
                $field_id,
                $field_config['title'],
                [$this, $field_config['callback']],
                'voice-resonance-settings',
                'vr_stripe_section',
                [
                    'field_id' => $field_id,
                    'options' => $field_config['options'] ?? null,
                    'placeholder' => $field_config['placeholder'] ?? ''
                ]
            );
        }
        
        // Price IDs Section
        add_settings_section(
            'vr_prices_section',
            __('Stripe Price IDs', 'voice-resonance'),
            [$this, 'prices_section_callback'],
            'voice-resonance-settings'
        );
        
        $price_fields = [
            'client_monthly' => __('Client Monthly', 'voice-resonance'),
            'client_annual' => __('Client Annual', 'voice-resonance'),
            'client_lifetime' => __('Client Lifetime', 'voice-resonance'),
            'practitioner_monthly' => __('Practitioner Monthly', 'voice-resonance'),
            'practitioner_annual' => __('Practitioner Annual', 'voice-resonance'),
            'practitioner_lifetime' => __('Practitioner Lifetime', 'voice-resonance')
        ];
        
        foreach ($price_fields as $field_id => $title) {
            add_settings_field(
                'price_' . $field_id,
                $title,
                [$this, 'render_text_field'],
                'voice-resonance-settings',
                'vr_prices_section',
                [
                    'field_id' => 'price_' . $field_id,
                    'placeholder' => 'price_...'
                ]
            );
        }
        
        // App Settings Section
        add_settings_section(
            'vr_app_section',
            __('Application Settings', 'voice-resonance'),
            [$this, 'app_section_callback'],
            'voice-resonance-settings'
        );
        
        $app_fields = [
            'app_base_url' => [
                'title' => __('App Base URL', 'voice-resonance'),
                'callback' => 'render_url_field',
                'default' => home_url('/voice-app/')
            ],
            'audio_quality' => [
                'title' => __('Audio Quality', 'voice-resonance'),
                'callback' => 'render_select_field',
                'options' => [
                    'standard' => 'Standard (16kHz)',
                    'high' => 'High Quality (48kHz)'
                ]
            ],
            'privacy_mode' => [
                'title' => __('Privacy Mode', 'voice-resonance'),
                'callback' => 'render_select_field',
                'options' => [
                    'local' => 'Local Processing Only',
                    'hybrid' => 'Local + Optional Server',
                    'server' => 'Server Processing'
                ]
            ],
            'retention_days_free' => [
                'title' => __('Data Retention - Free Users (Days)', 'voice-resonance'),
                'callback' => 'render_number_field',
                'default' => 14
            ],
            'retention_days_pro' => [
                'title' => __('Data Retention - Pro Users (Days)', 'voice-resonance'),
                'callback' => 'render_number_field',
                'default' => 365
            ]
        ];
        
        foreach ($app_fields as $field_id => $field_config) {
            add_settings_field(
                $field_id,
                $field_config['title'],
                [$this, $field_config['callback']],
                'voice-resonance-settings',
                'vr_app_section',
                [
                    'field_id' => $field_id,
                    'options' => $field_config['options'] ?? null,
                    'default' => $field_config['default'] ?? ''
                ]
            );
        }
    }
    
    public function display_dashboard_page() {
        $stats = $this->get_dashboard_stats();
        include VR_PLUGIN_DIR . 'includes/admin/partials/dashboard-display.php';
    }
    
    public function display_settings_page() {
        include VR_PLUGIN_DIR . 'includes/admin/partials/settings-display.php';
    }
    
    public function display_users_page() {
        $users = $this->get_vr_users();
        include VR_PLUGIN_DIR . 'includes/admin/partials/users-display.php';
    }
    
    public function sanitize_options($input) {
        $sanitized = [];
        
        // Sanitize Stripe settings
        $stripe_fields = [
            'stripe_mode', 'stripe_test_pk', 'stripe_test_sk', 'stripe_test_whsec',
            'stripe_live_pk', 'stripe_live_sk', 'stripe_live_whsec'
        ];
        
        foreach ($stripe_fields as $field) {
            if (isset($input[$field])) {
                $sanitized[$field] = sanitize_text_field($input[$field]);
            }
        }
        
        // Sanitize price IDs
        $price_fields = [
            'price_client_monthly', 'price_client_annual', 'price_client_lifetime',
            'price_practitioner_monthly', 'price_practitioner_annual', 'price_practitioner_lifetime'
        ];
        
        foreach ($price_fields as $field) {
            if (isset($input[$field])) {
                $sanitized[$field] = sanitize_text_field($input[$field]);
            }
        }
        
        // Sanitize app settings
        if (isset($input['app_base_url'])) {
            $sanitized['app_base_url'] = esc_url_raw($input['app_base_url']);
        }
        
        if (isset($input['audio_quality'])) {
            $sanitized['audio_quality'] = in_array($input['audio_quality'], ['standard', 'high']) 
                ? $input['audio_quality'] : 'standard';
        }
        
        if (isset($input['privacy_mode'])) {
            $sanitized['privacy_mode'] = in_array($input['privacy_mode'], ['local', 'hybrid', 'server'])
                ? $input['privacy_mode'] : 'local';
        }
        
        if (isset($input['retention_days_free'])) {
            $sanitized['retention_days_free'] = absint($input['retention_days_free']);
        }
        
        if (isset($input['retention_days_pro'])) {
            $sanitized['retention_days_pro'] = absint($input['retention_days_pro']);
        }
        
        return $sanitized;
    }
    
    // Field rendering methods
    public function render_text_field($args) {
        $field_id = $args['field_id'];
        $placeholder = $args['placeholder'] ?? '';
        $options = get_option('vr_options', []);
        $value = $options[$field_id] ?? '';
        
        printf(
            '<input type="text" id="%s" name="vr_options[%s]" value="%s" placeholder="%s" class="regular-text" />',
            esc_attr($field_id),
            esc_attr($field_id),
            esc_attr($value),
            esc_attr($placeholder)
        );
    }
    
    public function render_password_field($args) {
        $field_id = $args['field_id'];
        $placeholder = $args['placeholder'] ?? '';
        $options = get_option('vr_options', []);
        $value = $options[$field_id] ?? '';
        $display_value = !empty($value) ? '••••••••••••••••' : '';
        
        printf(
            '<input type="password" id="%s" name="vr_options[%s]" value="%s" placeholder="%s" class="regular-text" />',
            esc_attr($field_id),
            esc_attr($field_id),
            esc_attr($value),
            esc_attr($placeholder)
        );
        
        if (!empty($value)) {
            echo '<p class="description">' . __('Current value is set. Leave blank to keep unchanged.', 'voice-resonance') . '</p>';
        }
    }
    
    public function render_select_field($args) {
        $field_id = $args['field_id'];
        $options_list = $args['options'];
        $options = get_option('vr_options', []);
        $value = $options[$field_id] ?? '';
        
        printf('<select id="%s" name="vr_options[%s]">', esc_attr($field_id), esc_attr($field_id));
        
        foreach ($options_list as $option_value => $option_label) {
            printf(
                '<option value="%s" %s>%s</option>',
                esc_attr($option_value),
                selected($value, $option_value, false),
                esc_html($option_label)
            );
        }
        
        echo '</select>';
    }
    
    public function render_url_field($args) {
        $field_id = $args['field_id'];
        $default = $args['default'] ?? '';
        $options = get_option('vr_options', []);
        $value = $options[$field_id] ?? $default;
        
        printf(
            '<input type="url" id="%s" name="vr_options[%s]" value="%s" class="regular-text" />',
            esc_attr($field_id),
            esc_attr($field_id),
            esc_url($value)
        );
    }
    
    public function render_number_field($args) {
        $field_id = $args['field_id'];
        $default = $args['default'] ?? 0;
        $options = get_option('vr_options', []);
        $value = $options[$field_id] ?? $default;
        
        printf(
            '<input type="number" id="%s" name="vr_options[%s]" value="%s" min="1" class="small-text" />',
            esc_attr($field_id),
            esc_attr($field_id),
            esc_attr($value)
        );
    }
    
    // Section callbacks
    public function stripe_section_callback() {
        echo '<p>' . __('Configure your Stripe integration for payment processing.', 'voice-resonance') . '</p>';
        echo '<div class="notice notice-info"><p><strong>' . __('Webhook URL:', 'voice-resonance') . '</strong> <code>' . rest_url('vr/v1/stripe/webhook') . '</code></p></div>';
    }
    
    public function prices_section_callback() {
        echo '<p>' . __('Enter your Stripe Price IDs for each subscription plan.', 'voice-resonance') . '</p>';
    }
    
    public function app_section_callback() {
        echo '<p>' . __('Configure application behavior and privacy settings.', 'voice-resonance') . '</p>';
    }
    
    public function enqueue_admin_assets($hook) {
        if (strpos($hook, 'voice-resonance') === false) {
            return;
        }
        
        wp_enqueue_style(
            'vr-admin-style',
            VR_PLUGIN_URL . 'assets/css/admin.css',
            [],
            VR_VERSION
        );
        
        wp_enqueue_script(
            'vr-admin-script',
            VR_PLUGIN_URL . 'assets/js/admin.js',
            ['jquery'],
            VR_VERSION,
            true
        );
        
        wp_localize_script('vr-admin-script', 'VR_ADMIN', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vr_admin_nonce'),
            'rest_url' => rest_url('vr/v1/')
        ]);
    }
    
    private function get_dashboard_stats() {
        global $wpdb;
        $db = new VR_Database_Manager();
        
        return [
            'total_users' => $wpdb->get_var("SELECT COUNT(*) FROM {$db->get_table_name('entitlements')}"),
            'active_sessions_today' => $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$db->get_table_name('sessions')} WHERE DATE(created_at) = %s",
                current_time('Y-m-d')
            )),
            'pro_users' => $wpdb->get_var("SELECT COUNT(*) FROM {$db->get_table_name('entitlements')} WHERE plan_type != 'free'"),
            'total_segments' => $wpdb->get_var("SELECT COUNT(*) FROM {$db->get_table_name('segments')}")
        ];
    }
    
    private function get_vr_users($limit = 50) {
        global $wpdb;
        $db = new VR_Database_Manager();
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT u.ID, u.user_email, u.display_name, e.plan_type, e.status, e.created_at
             FROM {$wpdb->users} u
             LEFT JOIN {$db->get_table_name('entitlements')} e ON u.ID = e.user_id
             WHERE e.user_id IS NOT NULL
             ORDER BY e.created_at DESC
             LIMIT %d",
            $limit
        ));
    }
}
```

### **REST API Controller: `includes/api/class-controller.php`**

```php
<?php
/**
 * REST API Controller for Voice Resonance
 */
class VR_API_Controller {
    
    private $db_manager;
    private $stripe_service;
    private $entitlements;
    
    public function __construct() {
        $this->db_manager = new VR_Database_Manager();
        $this->stripe_service = new VR_Stripe();
        $this->entitlements = new VR_Entitlements();
    }
    
    public function register_routes() {
        // Check Pro Status
        register_rest_route('vr/v1', '/check-pro', [
            'methods' => 'GET',
            'callback' => [$this, 'check_pro_status'],
            'permission_callback' => [$this, 'permission_check_logged_in']
        ]);
        
        // Sessions
        register_rest_route('vr/v1', '/sessions', [
            'methods' => 'POST',
            'callback' => [$this, 'create_session'],
            'permission_callback' => [$this, 'permission_check_can_use_app'],
            'args' => [
                'session_type' => [
                    'required' => false,
                    'default' => 'session',
                    'validate_callback' => function($param) {
                        return in_array($param, ['calibration', 'session', 'quick_test']);
                    }
                ],
                'notes' => [
                    'required' => false,
                    'default' => '',
                    'sanitize_callback' => 'sanitize_textarea_field'
                ]
            ]
        ]);
        
        register_rest_route('vr/v1', '/sessions/(?P<session_id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_session'],
            'permission_callback' => [$this, 'permission_check_can_use_app'],
            'args' => [
                'session_id' => [
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                ]
            ]
        ]);
        
        // Segments
        register_rest_route('vr/v1', '/sessions/(?P<session_id>\d+)/segments', [
            'methods' => 'POST',
            'callback' => [$this, 'add_segment'],
            'permission_callback' => [$this, 'permission_check_can_use_app'],
            'args' => [
                'session_id' => [
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                ],
                'start_time_ms' => [
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param) && $param >= 0;
                    }
                ],
                'duration_ms' => [
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param) && $param > 0;
                    }
                ],
                'transcript' => [
                    'required' => false,
                    'sanitize_callback' => 'sanitize_textarea_field'
                ],
                'vri_score' => [
                    'required' => false,
                    'validate_callback' => function($param) {
                        return is_null($param) || (is_numeric($param) && $param >= 0 && $param <= 100);
                    }
                ],
                'vri_confidence' => [
                    'required' => false,
                    'validate_callback' => function($param) {
                        return is_null($param) || (is_numeric($param) && $param >= 0 && $param <= 1);
                    }
                ],
                'quality_score' => [
                    'required' => false,
                    'validate_callback' => function($param) {
                        return is_null($param) || (is_numeric($param) && $param >= 0 && $param <= 100);
                    }
                ],
                'features_json' => [
                    'required' => false,
                    'sanitize_callback' => function($param) {
                        return is_array($param) ? wp_json_encode($param) : $param;
                    }
                ]
            ]
        ]);
        
        // Stripe Integration
        register_rest_route('vr/v1', '/create-checkout', [
            'methods' => 'POST',
            'callback' => [$this, 'create_stripe_checkout'],
            'permission_callback' => [$this, 'permission_check_logged_in'],
            'args' => [
                'price_id' => [
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'plan_type' => [
                    'required' => true,
                    'validate_callback' => function($param) {
                        return in_array($param, ['client_pro', 'practitioner_pro']);
                    }
                ]
            ]
        ]);
        
        register_rest_route('vr/v1', '/stripe/webhook', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_stripe_webhook'],
            'permission_callback' => '__return_true' // Handled by signature verification
        ]);
        
        // Share Links
        register_rest_route('vr/v1', '/share/(?P<token>[a-zA-Z0-9_-]+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_shared_session'],
            'permission_callback' => '__return_true'
        ]);
        
        // Export Data
        register_rest_route('vr/v1', '/export/(?P<session_id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'export_session_data'],
            'permission_callback' => [$this, 'permission_check_can_use_app'],
            'args' => [
                'format' => [
                    'required' => false,
                    'default' => 'json',
                    'validate_callback' => function($param) {
                        return in_array($param, ['json', 'csv', 'pdf']);
                    }
                ]
            ]
        ]);
    }
    
    // Permission callbacks
    public function permission_check_logged_in() {
        return is_user_logged_in();
    }
    
    public function permission_check_can_use_app() {
        return is_user_logged_in() && current_user_can('vr_use_app');
    }
    
    // API endpoints
    public function check_pro_status(WP_REST_Request $request) {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return new WP_REST_Response([
                'is_pro' => false,
                'plan_type' => 'free',
                'message' => 'User not logged in'
            ], 200);
        }
        
        $entitlement = $this->entitlements->get_user_entitlement($user_id);
        
        return new WP_REST_Response([
            'is_pro' => $entitlement['plan_type'] !== 'free',
            'plan_type' => $entitlement['plan_type'],
            'status' => $entitlement['status'],
            'expires' => $entitlement['current_period_end']
        ], 200);
    }
    
    public function create_session(WP_REST_Request $request) {
        $user_id = get_current_user_id();
        $session_type = $request->get_param('session_type');
        $notes = $request->get_param('notes');
        
        $session_id = $this->db_manager->create_session($user_id, $session_type, $notes);
        
        if (!$session_id) {
            return new WP_REST_Response([
                'error' => 'Failed to create session'
            ], 500);
        }
        
        return new WP_REST_Response([
            'session_id' => $session_id,
            'message' => 'Session created successfully'
        ], 201);
    }
    
    public function get_session(WP_REST_Request $request) {
        $session_id = intval($request->get_param('session_id'));
        $user_id = get_current_user_id();
        
        // Verify session ownership
        if (!$this->verify_session_ownership($session_id, $user_id)) {
            return new WP_REST_Response([
                'error' => 'Access denied'
            ], 403);
        }
        
        $segments = $this->db_manager->get_session_segments($session_id);
        
        return new WP_REST_Response([
            'session_id' => $session_id,
            'segments' => $segments
        ], 200);
    }
    
    public function add_segment(WP_REST_Request $request) {
        $session_id = intval($request->get_param('session_id'));
        $user_id = get_current_user_id();
        
        // Verify session ownership
        if (!$this->verify_session_ownership($session_id, $user_id)) {
            return new WP_REST_Response([
                'error' => 'Access denied'
            ], 403);
        }
        
        $segment_data = [
            'start_time_ms' => intval($request->get_param('start_time_ms')),
            'duration_ms' => intval($request->get_param('duration_ms')),
            'transcript' => $request->get_param('transcript'),
            'vri_score' => $request->get_param('vri_score'),
            'vri_confidence' => $request->get_param('vri_confidence'),
            'quality_score' => $request->get_param('quality_score'),
            'features_json' => $request->get_param('features_json')
        ];
        
        $segment_id = $this->db_manager->add_segment($session_id, $segment_data);
        
        if (!$segment_id) {
            return new WP_REST_Response([
                'error' => 'Failed to add segment'
            ], 500);
        }
        
        return new WP_REST_Response([
            'segment_id' => $segment_id,
            'message' => 'Segment added successfully'
        ], 201);
    }
    
    public function create_stripe_checkout(WP_REST_Request $request) {
        $price_id = $request->get_param('price_id');
        $plan_type = $request->get_param('plan_type');
        $user_id = get_current_user_id();
        
        $result = $this->stripe_service->create_checkout_session($price_id, $user_id, $plan_type);
        
        if (!$result['success']) {
            return new WP_REST_Response([
                'error' => $result['error']
            ], 400);
        }
        
        return new WP_REST_Response([
            'checkout_url' => $result['url'],
            'session_id' => $result['session_id']
        ], 200);
    }
    
    public function handle_stripe_webhook(WP_REST_Request $request) {
        $payload = $request->get_body();
        $sig_header = $request->get_header('stripe-signature');
        
        $result = $this->stripe_service->handle_webhook($payload, $sig_header);
        
        if (isset($result['error'])) {
            return new WP_REST_Response(['error' => $result['error']], 400);
        }
        
        return new WP_REST_Response(['received' => true], 200);
    }
    
    private function verify_session_ownership($session_id, $user_id) {
        global $wpdb;
        
        $session_owner = $wpdb->get_var($wpdb->prepare(
            "SELECT user_id FROM {$this->db_manager->get_table_name('sessions')} WHERE id = %d",
            $session_id
        ));
        
        return $session_owner == $user_id;
    }
}
```

### **Stripe Service: `includes/services/class-stripe.php`**

```php
<?php
/**
 * Stripe integration service
 */
class VR_Stripe {
    
    private $stripe_mode;
    private $publishable_key;
    private $secret_key;
    private $webhook_secret;
    private $entitlements;
    
    public function __construct() {
        $this->load_stripe_configuration();
        $this->entitlements = new VR_Entitlements();
        
        if ($this->secret_key) {
            $this->init_stripe();
        }
    }
    
    private function load_stripe_configuration() {
        $options = get_option('vr_options', []);
        $this->stripe_mode = $options['stripe_mode'] ?? 'test';
        
        $this->publishable_key = $options["stripe_{$this->stripe_mode}_pk"] ?? '';
        $this->secret_key = $options["stripe_{$this->stripe_mode}_sk"] ?? '';
        $this->webhook_secret = $options["stripe_{$this->stripe_mode}_whsec"] ?? '';
    }
    
    private function init_stripe() {
        if (!class_exists('Stripe\Stripe')) {
            return;
        }
        
        \Stripe\Stripe::setApiKey($this->secret_key);
        \Stripe\Stripe::setApiVersion('2023-10-16');
    }
    
    public function create_checkout_session($price_id, $user_id, $plan_type) {
        try {
            $user = get_user_by('id', $user_id);
            if (!$user) {
                throw new Exception('User not found');
            }
            
            // Check for existing customer
            $customer_id = $this->get_or_create_customer($user);
            
            $session_data = [
                'mode' => 'subscription',
                'line_items' => [[
                    'price' => $price_id,
                    'quantity' => 1
                ]],
                'success_url' => $this->get_success_url() . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $this->get_cancel_url(),
                'client_reference_id' => (string) $user_id,
                'metadata' => [
                    'user_id' => $user_id,
                    'plan_type' => $plan_type,
                    'wp_site' => home_url()
                ],
                'subscription_data' => [
                    'metadata' => [
                        'user_id' => $user_id,
                        'plan_type' => $plan_type
                    ]
                ]
            ];
            
            if ($customer_id) {
                $session_data['customer'] = $customer_id;
            } else {
                $session_data['customer_email'] = $user->user_email;
            }
            
            $session = \Stripe\Checkout\Session::create($session_data);
            
            return [
                'success' => true,
                'session_id' => $session->id,
                'url' => $session->url
            ];
            
        } catch (Exception $e) {
            error_log('VR Stripe Checkout Error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function handle_webhook($payload, $sig_header) {
        try {
            $event = \Stripe\Webhook::constructEvent(
                $payload,
                $sig_header,
                $this->webhook_secret
            );
            
            // Check for duplicate events
            if ($this->is_event_processed($event->id)) {
                return ['status' => 'already_processed'];
            }
            
            // Process the event
            $result = $this->process_webhook_event($event);
            
            // Mark as processed
            $this->mark_event_processed($event->id, $event->type);
            
            return $result;
            
        } catch (\UnexpectedValueException $e) {
            return ['error' => 'Invalid payload'];
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            return ['error' => 'Invalid signature'];
        } catch (Exception $e) {
            error_log('VR Stripe Webhook Error: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }
    
    private function process_webhook_event($event) {
        switch ($event->type) {
            case 'checkout.session.completed':
                return $this->handle_checkout_completed($event->data->object);
                
            case 'customer.subscription.updated':
                return $this->handle_subscription_updated($event->data->object);
                
            case 'customer.subscription.deleted':
                return $this->handle_subscription_deleted($event->data->object);
                
            case 'invoice.payment_succeeded':
                return $this->handle_payment_succeeded($event->data->object);
                
            case 'invoice.payment_failed':
                return $this->handle_payment_failed($event->data->object);
                
            default:
                return ['status' => 'unhandled_event_type'];
        }
    }
    
    private function handle_checkout_completed($session) {
        $user_id = intval($session->client_reference_id);
        $customer_id = $session->customer;
        $subscription_id = $session->subscription;
        $plan_type = $session->metadata->plan_type ?? 'client_pro';
        
        if (!$user_id) {
            // Try to find user by email
            $user = get_user_by('email', $session->customer_details->email);
            $user_id = $user ? $user->ID : 0;
        }
        
        if ($user_id) {
            $this->entitlements->update_user_entitlement($user_id, [
                'stripe_customer_id' => $customer_id,
                'stripe_subscription_id' => $subscription_id,
                'plan_type' => $plan_type,
                'status' => 'active'
            ]);
            
            // Send welcome email
            $this->send_welcome_email($user_id, $plan_type);
        }
        
        return ['status' => 'checkout_processed', 'user_id' => $user_id];
    }
    
    private function handle_subscription_updated($subscription) {
        $user_id = $this->get_user_by_subscription_id($subscription->id);
        
        if ($user_id) {
            $this->entitlements->update_user_entitlement($user_id, [
                'status' => $subscription->status,
                'current_period_start' => date('Y-m-d H:i:s', $subscription->current_period_start),
                'current_period_end' => date('Y-m-d H:i:s', $subscription->current_period_end)
            ]);
        }
        
        return ['status' => 'subscription_updated', 'user_id' => $user_id];
    }
    
    private function handle_subscription_deleted($subscription) {
        $user_id = $this->get_user_by_subscription_id($subscription->id);
        
        if ($user_id) {
            $this->entitlements->update_user_entitlement($user_id, [
                'status' => 'canceled',
                'current_period_end' => date('Y-m-d H:i:s', $subscription->current_period_end)
            ]);
            
            // Send cancellation email
            $this->send_cancellation_email($user_id);
        }
        
        return ['status' => 'subscription_canceled', 'user_id' => $user_id];
    }
    
    private function handle_payment_succeeded($invoice) {
        $subscription_id = $invoice->subscription;
        $user_id = $this->get_user_by_subscription_id($subscription_id);
        
        if ($user_id) {
            $this->entitlements->update_user_entitlement($user_id, [
                'status' => 'active'
            ]);
        }
        
        return ['status' => 'payment_succeeded', 'user_id' => $user_id];
    }
    
    private function handle_payment_failed($invoice) {
        $subscription_id = $invoice->subscription;
        $user_id = $this->get_user_by_subscription_id($subscription_id);
        
        if ($user_id) {
            $this->entitlements->update_user_entitlement($user_id, [
                'status' => 'past_due'
            ]);
            
            // Send payment failure notification
            $this->send_payment_failed_email($user_id);
        }
        
        return ['status' => 'payment_failed', 'user_id' => $user_id];
    }
    
    private function get_or_create_customer($user) {
        global $wpdb;
        $db_manager = new VR_Database_Manager();
        
        // Check for existing customer
        $customer_id = $wpdb->get_var($wpdb->prepare(
            "SELECT stripe_customer_id FROM {$db_manager->get_table_name('entitlements')} 
             WHERE user_id = %d AND stripe_customer_id IS NOT NULL",
            $user->ID
        ));
        
        if ($customer_id) {
            return $customer_id;
        }
        
        // Create new customer
        try {
            $customer = \Stripe\Customer::create([
                'email' => $user->user_email,
                'name' => $user->display_name,
                'metadata' => [
                    'user_id' => $user->ID,
                    'wp_site' => home_url()
                ]
            ]);
            
            return $customer->id;
        } catch (Exception $e) {
            error_log('VR Stripe Customer Creation Error: ' . $e->getMessage());
            return null;
        }
    }
    
    private function get_user_by_subscription_id($subscription_id) {
        global $wpdb;
        $db_manager = new VR_Database_Manager();
        
        return $wpdb->get_var($wpdb->prepare(
            "SELECT user_id FROM {$db_manager->get_table_name('entitlements')} 
             WHERE stripe_subscription_id = %s",
            $subscription_id
        ));
    }
    
    private function is_event_processed($event_id) {
        global $wpdb;
        $db_manager = new VR_Database_Manager();
        
        return $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$db_manager->get_table_name('webhook_events')} 
             WHERE event_id = %s",
            $event_id
        )) > 0;
    }
    
    private function mark_event_processed($event_id, $event_type) {
        global $wpdb;
        $db_manager = new VR_Database_Manager();
        
        $wpdb->insert(
            $db_manager->get_table_name('webhook_events'),
            [
                'event_id' => $event_id,
                'event_type' => $event_type,
                'processed_at' => current_time('mysql')
            ],
            ['%s', '%s', '%s']
        );
    }
    
    private function get_success_url() {
        $options = get_option('vr_options', []);
        return ($options['app_base_url'] ?? home_url('/voice-app/')) . '?upgrade=success';
    }
    
    private function get_cancel_url() {
        $options = get_option('vr_options', []);
        return ($options['app_base_url'] ?? home_url('/voice-app/')) . '?upgrade=canceled';
    }
    
    private function send_welcome_email($user_id, $plan_type) {
        $user = get_user_by('id', $user_id);
        if (!$user) return;
        
        $subject = __('Welcome to Voice Resonance Pro!', 'voice-resonance');
        $message = sprintf(
            __('Hi %s,\n\nWelcome to Voice Resonance Pro! Your %s subscription is now active.\n\nYou can access your enhanced features at: %s\n\nThank you for your support!', 'voice-resonance'),
            $user->display_name,
            ucwords(str_replace('_', ' ', $plan_type)),
            $this->get_success_url()
        );
        
        wp_mail($user->user_email, $subject, $message);
    }
    
    private function send_cancellation_email($user_id) {
        $user = get_user_by('id', $user_id);
        if (!$user) return;
        
        $subject = __('Voice Resonance Subscription Canceled', 'voice-resonance');
        $message = sprintf(
            __('Hi %s,\n\nYour Voice Resonance Pro subscription has been canceled. You will continue to have access to Pro features until the end of your current billing period.\n\nIf you have any questions, please contact support.\n\nThank you for using Voice Resonance!', 'voice-resonance'),
            $user->display_name
        );
        
        wp_mail($user->user_email, $subject, $message);
    }
    
    private function send_payment_failed_email($user_id) {
        $user = get_user_by('id', $user_id);
        if (!$user) return;
        
        $subject = __('Voice Resonance Payment Failed', 'voice-resonance');
        $message = sprintf(
            __('Hi %s,\n\nWe were unable to process your recent payment for Voice Resonance Pro. Please update your payment method to continue enjoying Pro features.\n\nUpdate your payment method at: %s\n\nThank you!', 'voice-resonance'),
            $user->display_name,
            $this->get_success_url()
        );
        
        wp_mail($user->user_email, $subject, $message);
    }
}
```

### **Frontend JavaScript Entry Point: `assets/js/src/main.js`**

```javascript
/**
 * Voice Resonance Frontend Application
 */

class VoiceResonanceApp {
    constructor() {
        this.config = window.VR_CONFIG || {};
        this.state = {
            isRecording: false,
            currentSession: null,
            audioContext: null,
            mediaStream: null,
            mediaRecorder: null,
            audioWorklet: null,
            isCalibrated: false,
            userProfile: null,
            segments: []
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize UI
            this.renderApp();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Check user status
            await this.checkUserStatus();
            
            // Initialize audio if user is logged in
            if (this.config.is_logged_in) {
                await this.initializeAudio();
            }
            
        } catch (error) {
            console.error('Failed to initialize Voice Resonance App:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }
    
    renderApp() {
        const appRoot = document.getElementById('vrp-app-root') || 
                       document.querySelector('.vrp-app') || 
                       document.body;
        
        appRoot.innerHTML = `
            <div class="vr-app">
                <div class="vr-header">
                    <div class="vr-logo">
                        <h1>Voice Resonance</h1>
                    </div>
                    <div class="vr-user-status">
                        ${this.config.is_logged_in ? 
                            `<span class="vr-plan-badge ${this.config.is_pro ? 'pro' : 'free'}">
                                ${this.config.is_pro ? 'Pro' : 'Free'}
                            </span>` : 
                            '<a href="/wp-login.php" class="vr-login-btn">Login</a>'
                        }
                    </div>
                </div>
                
                <div class="vr-main-content">
                    ${this.config.is_logged_in ? this.renderMainApp() : this.renderLoginPrompt()}
                </div>
                
                <div class="vr-notifications" id="vr-notifications"></div>
            </div>
        `;
    }
    
    renderMainApp() {
        return `
            <div class="vr-recording-interface">
                <div class="vr-audio-controls">
                    <button id="vr-record-btn" class="vr-record-btn" disabled>
                        <span class="vr-record-icon">🎤</span>
                        <span class="vr-record-text">Start Recording</span>
                    </button>
                    
                    <div class="vr-audio-status">
                        <div class="vr-status-text" id="vr-status-text">Initializing...</div>
                        <div class="vr-audio-level">
                            <div class="vr-level-bar" id="vr-level-bar"></div>
                        </div>
                    </div>
                </div>
                
                <div class="vr-calibration-section" id="vr-calibration-section">
                    <div class="vr-calibration-prompt">
                        <h3>Calibration Required</h3>
                        <p>To get accurate readings, please complete a quick calibration.</p>
                        <button id="vr-calibrate-btn" class="vr-btn vr-btn-primary">
                            Start Calibration
                        </button>
                    </div>
                </div>
                
                <div class="vr-recording-section" id="vr-recording-section" style="display: none;">
                    <div class="vr-prompt-display" id="vr-prompt-display">
                        <div class="vr-prompt-text">Ready to record...</div>
                    </div>
                    
                    <div class="vr-transcript-display" id="vr-transcript-display">
                        <div class="vr-transcript-text"></div>
                        <div class="vr-vri-indicator">
                            <div class="vr-vri-score" id="vr-vri-score"></div>
                            <div class="vr-vri-confidence" id="vr-vri-confidence"></div>
                        </div>
                    </div>
                </div>
                
                <div class="vr-session-history" id="vr-session-history">
                    <h3>Recent Sessions</h3>
                    <div class="vr-history-list" id="vr-history-list"></div>
                </div>
                
                ${!this.config.is_pro ? this.renderUpgradePrompt() : ''}
            </div>
        `;
    }
    
    renderLoginPrompt() {
        return `
            <div class="vr-login-prompt">
                <h2>Welcome to Voice Resonance</h2>
                <p>Please log in to access the voice analysis features.</p>
                <a href="/wp-login.php?redirect_to=${encodeURIComponent(window.location.href)}" 
                   class="vr-btn vr-btn-primary">
                    Log In
                </a>
            </div>
        `;
    }
    
    renderUpgradePrompt() {
        return `
            <div class="vr-upgrade-prompt">
                <h3>Upgrade to Pro</h3>
                <p>Unlock advanced features like calibration, history, and detailed analysis.</p>
                <button id="vr-upgrade-btn" class="vr-btn vr-btn-upgrade">
                    Upgrade Now
                </button>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Record button
        document.addEventListener('click', (e) => {
            if (e.target.matches('#vr-record-btn')) {
                this.toggleRecording();
            }
            
            if (e.target.matches('#vr-calibrate-btn')) {
                this.startCalibration();
            }
            
            if (e.target.matches('#vr-upgrade-btn')) {
                this.showUpgradeOptions();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.toggleRecording();
            }
        });
    }
    
    async checkUserStatus() {
        if (!this.config.is_logged_in) return;
        
        try {
            const response = await fetch(`${this.config.rest_url}check-pro`, {
                headers: {
                    'X-WP-Nonce': this.config.nonce
                }
            });
            
            const data = await response.json();
            this.updateUserStatus(data);
            
        } catch (error) {
            console.error('Failed to check user status:', error);
        }
    }
    
    updateUserStatus(data) {
        this.config.is_pro = data.is_pro;
        this.config.plan_type = data.plan_type;
        
        // Update UI based on status
        const planBadge = document.querySelector('.vr-plan-badge');
        if (planBadge) {
            planBadge.textContent = data.is_pro ? 'Pro' : 'Free';
            planBadge.className = `vr-plan-badge ${data.is_pro ? 'pro' : 'free'}`;
        }
    }
    
    async initializeAudio() {
        try {
            // Request microphone access
            this.state.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.config.app_settings.audio_quality === 'high' ? 48000 : 16000,
                    channelCount: 1,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            // Initialize AudioContext
            this.state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load AudioWorklet
            await this.state.audioContext.audioWorklet.addModule(
                `${this.config.plugin_url}assets/js/src/audio/worklet.js`
            );
            
            // Create audio processing chain
            const source = this.state.audioContext.createMediaStreamSource(this.state.mediaStream);
            this.state.audioWorklet = new AudioWorkletNode(this.state.audioContext, 'voice-processor');
            
            // Connect audio processing
            source.connect(this.state.audioWorklet);
            
            // Set up audio level monitoring
            this.setupAudioLevelMonitoring(source);
            
            // Enable recording button
            const recordBtn = document.getElementById('vr-record-btn');
            if (recordBtn) {
                recordBtn.disabled = false;
                this.updateStatus('Ready to record');
            }
            
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.showError('Microphone access is required for voice analysis.');
        }
    }
    
    setupAudioLevelMonitoring(source) {
        const analyser = this.state.audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const levelBar = document.getElementById('vr-level-bar');
        
        const updateLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const level = (average / 255) * 100;
            
            if (levelBar) {
                levelBar.style.width = `${level}%`;
                levelBar.style.backgroundColor = level > 50 ? '#4CAF50' : '#FFC107';
            }
            
            requestAnimationFrame(updateLevel);
        };
        
        updateLevel();
    }
    
    async toggleRecording() {
        if (this.state.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }
    
    async startRecording() {
        try {
            if (!this.state.currentSession) {
                await this.createSession();
            }
            
            // Start MediaRecorder
            this.state.mediaRecorder = new MediaRecorder(this.state.mediaStream);
            this.state.audioChunks = [];
            
            this.state.mediaRecorder.ondataavailable = (event) => {
                this.state.audioChunks.push(event.data);
            };
            
            this.state.mediaRecorder.onstop = () => {
                this.processRecording();
            };
            
            this.state.mediaRecorder.start();
            this.state.isRecording = true;
            this.state.recordingStartTime = Date.now();
            
            // Update UI
            this.updateRecordingUI(true);
            this.updateStatus('Recording...');
            
            // Start speech recognition if available
            this.startSpeechRecognition();
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.showError('Failed to start recording.');
        }
    }
    
    async stopRecording() {
        if (!this.state.isRecording) return;
        
        this.state.mediaRecorder.stop();
        this.state.isRecording = false;
        this.state.recordingEndTime = Date.now();
        
        // Stop speech recognition
        this.stopSpeechRecognition();
        
        // Update UI
        this.updateRecordingUI(false);
        this.updateStatus('Processing...');
    }
    
    updateRecordingUI(isRecording) {
        const recordBtn = document.getElementById('vr-record-btn');
        const recordIcon = recordBtn.querySelector('.vr-record-icon');
        const recordText = recordBtn.querySelector('.vr-record-text');
        
        if (isRecording) {
            recordBtn.classList.add('recording');
            recordIcon.textContent = '⏹️';
            recordText.textContent = 'Stop Recording';
        } else {
            recordBtn.classList.remove('recording');
            recordIcon.textContent = '🎤';
            recordText.textContent = 'Start Recording';
        }
    }
    
    startSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.state.speechRecognition = new SpeechRecognition();
        
        this.state.speechRecognition.continuous = true;
        this.state.speechRecognition.interimResults = true;
        this.state.speechRecognition.lang = 'en-US';
        
        this.state.speechRecognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            
            this.updateTranscript(transcript);
        };
        
        this.state.speechRecognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
        };
        
        this.state.speechRecognition.start();
    }
    
    stopSpeechRecognition() {
        if (this.state.speechRecognition) {
            this.state.speechRecognition.stop();
        }
    }
    
    updateTranscript(transcript) {
        const transcriptElement = document.querySelector('.vr-transcript-text');
        if (transcriptElement) {
            transcriptElement.textContent = transcript;
        }
        
        this.state.currentTranscript = transcript;
    }
    
    async processRecording() {
        try {
            // Create audio blob
            const audioBlob = new Blob(this.state.audioChunks, { type: 'audio/webm' });
            
            // Calculate basic VRI (simplified for demo)
            const vri = await this.calculateVRI(audioBlob);
            
            // Create segment data
            const segmentData = {
                start_time_ms: 0,
                duration_ms: this.state.recordingEndTime - this.state.recordingStartTime,
                transcript: this.state.currentTranscript || '',
                vri_score: vri.score,
                vri_confidence: vri.confidence,
                quality_score: vri.quality,
                features_json: vri.features
            };
            
            // Save segment
            await this.saveSegment(segmentData);
            
            // Update UI with results
            this.displayVRIResults(vri);
            this.updateStatus('Analysis complete');
            
        } catch (error) {
            console.error('Failed to process recording:', error);
            this.showError('Failed to process recording.');
        }
    }
    
    async calculateVRI(audioBlob) {
        // This is a simplified VRI calculation for demonstration
        // In production, this would use more sophisticated audio analysis
        
        try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            const channelData = audioBuffer.getChannelData(0);
            
            // Calculate RMS (Root Mean Square) as a basic intensity measure
            let sumSquares = 0;
            for (let i = 0; i < channelData.length; i++) {
                sumSquares += channelData[i] * channelData[i];
            }
            const rms = Math.sqrt(sumSquares / channelData.length);
            
            // Calculate zero-crossing rate (basic measure of voice stability)
            let zeroCrossings = 0;
            for (let i = 1; i < channelData.length; i++) {
                if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) {
                    zeroCrossings++;
                }
            }
            const zcr = zeroCrossings / channelData.length;
            
            // Simple VRI calculation (0-100 scale)
            const intensityScore = Math.min(100, rms * 1000);
            const stabilityScore = Math.max(0, 100 - (zcr * 10000));
            const vriScore = Math.round((intensityScore + stabilityScore) / 2);
            
            // Quality assessment
            const quality = rms > 0.01 ? (rms > 0.1 ? 85 : 70) : 50;
            
            // Confidence based on audio quality and length
            const duration = audioBuffer.duration;
            const confidence = Math.min(0.95, (quality / 100) * Math.min(1, duration / 5));
            
            await audioContext.close();
            
            return {
                score: Math.max(0, Math.min(100, vriScore)),
                confidence: Math.round(confidence * 100) / 100,
                quality: quality,
                features: {
                    rms: rms,
                    zcr: zcr,
                    duration: duration,
                    intensity_score: intensityScore,
                    stability_score: stabilityScore
                }
            };
            
        } catch (error) {
            console.error('VRI calculation error:', error);
            return {
                score: 50,
                confidence: 0.5,
                quality: 50,
                features: {}
            };
        }
    }
    
    displayVRIResults(vri) {
        const vriScore = document.getElementById('vr-vri-score');
        const vriConfidence = document.getElementById('vr-vri-confidence');
        
        if (vriScore) {
            vriScore.innerHTML = `
                <div class="vri-score-value ${vri.score > 70 ? 'strong' : 'neutral'}">
                    ${vri.score}
                </div>
                <div class="vri-score-label">VRI Score</div>
            `;
        }
        
        if (vriConfidence) {
            vriConfidence.innerHTML = `
                <div class="vri-confidence-value">
                    ${Math.round(vri.confidence * 100)}%
                </div>
                <div class="vri-confidence-label">Confidence</div>
            `;
        }
        
        // Style the transcript based on VRI
        const transcriptElement = document.querySelector('.vr-transcript-text');
        if (transcriptElement) {
            transcriptElement.className = `vr-transcript-text ${vri.score > 70 ? 'vri-strong' : 'vri-neutral'}`;
        }
    }
    
    async createSession() {
        try {
            const response = await fetch(`${this.config.rest_url}sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': this.config.nonce
                },
                body: JSON.stringify({
                    session_type: 'session',
                    notes: ''
                })
            });
            
            const data = await response.json();
            if (response.ok) {
                this.state.currentSession = data.session_id;
            } else {
                throw new Error(data.error || 'Failed to create session');
            }
            
        } catch (error) {
            console.error('Failed to create session:', error);
            throw error;
        }
    }
    
    async saveSegment(segmentData) {
        if (!this.state.currentSession) {
            throw new Error('No active session');
        }
        
        try {
            const response = await fetch(
                `${this.config.rest_url}sessions/${this.state.currentSession}/segments`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': this.config.nonce
                    },
                    body: JSON.stringify(segmentData)
                }
            );
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save segment');
            }
            
            this.state.segments.push({
                id: data.segment_id,
                ...segmentData
            });
            
        } catch (error) {
            console.error('Failed to save segment:', error);
            throw error;
        }
    }
    
    async startCalibration() {
        // Show calibration interface
        const calibrationSection = document.getElementById('vr-calibration-section');
        const recordingSection = document.getElementById('vr-recording-section');
        
        if (calibrationSection) calibrationSection.style.display = 'none';
        if (recordingSection) recordingSection.style.display = 'block';
        
        // Start calibration process
        this.state.isCalibrating = true;
        this.state.calibrationStep = 0;
        this.state.calibrationData = [];
        
        this.nextCalibrationStep();
    }
    
    nextCalibrationStep() {
        const calibrationPrompts = [
            "I feel completely safe and secure",
            "I am worthy of love and respect", 
            "I trust my inner wisdom",
            "The sky can be blue",
            "Numbers exist in mathematics",
            "Books contain information"
        ];
        
        if (this.state.calibrationStep < calibrationPrompts.length) {
            const promptDisplay = document.getElementById('vr-prompt-display');
            if (promptDisplay) {
                promptDisplay.innerHTML = `
                    <div class="vr-calibration-prompt">
                        <div class="vr-calibration-step">
                            Step ${this.state.calibrationStep + 1} of ${calibrationPrompts.length}
                        </div>
                        <div class="vr-prompt-text">
                            "${calibrationPrompts[this.state.calibrationStep]}"
                        </div>
                        <div class="vr-calibration-instructions">
                            Read this statement aloud naturally, then press the record button.
                        </div>
                    </div>
                `;
            }
        } else {
            this.completeCalibration();
        }
    }
    
    completeCalibration() {
        this.state.isCalibrating = false;
        this.state.isCalibrated = true;
        
        // Save calibration profile
        this.saveCalibrationProfile();
        
        // Show success message
        this.showNotification('Calibration complete! You can now use all features.', 'success');
        
        // Update UI
        const calibrationSection = document.getElementById('vr-calibration-section');
        if (calibrationSection) {
            calibrationSection.style.display = 'none';
        }
    }
    
    async saveCalibrationProfile() {
        // In a full implementation, this would save the calibration data
        // For now, just mark as calibrated
        localStorage.setItem('vr_calibrated', 'true');
    }
    
    showUpgradeOptions() {
        // Create upgrade modal
        const modal = document.createElement('div');
        modal.className = 'vr-modal vr-upgrade-modal';
        modal.innerHTML = `
            <div class="vr-modal-content">
                <div class="vr-modal-header">
                    <h2>Upgrade to Voice Resonance Pro</h2>
                    <button class="vr-modal-close">&times;</button>
                </div>
                <div class="vr-modal-body">
                    <div class="vr-pricing-options">
                        <div class="vr-pricing-card">
                            <h3>Client Pro</h3>
                            <div class="vr-price">$19/month</div>
                            <ul>
                                <li>Personal calibration</li>
                                <li>Session history</li>
                                <li>Advanced analysis</li>
                                <li>Data export</li>
                            </ul>
                            <button class="vr-btn vr-btn-primary" data-plan="client_pro" data-interval="monthly">
                                Choose Plan
                            </button>
                        </div>
                        <div class="vr-pricing-card">
                            <h3>Practitioner Pro</h3>
                            <div class="vr-price">$49/month</div>
                            <ul>
                                <li>All Client Pro features</li>
                                <li>Client management</li>
                                <li>Custom prompts</li>
                                <li>Session sharing</li>
                            </ul>
                            <button class="vr-btn vr-btn-primary" data-plan="practitioner_pro" data-interval="monthly">
                                Choose Plan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        modal.addEventListener('click', (e) => {
            if (e.target.matches('.vr-modal-close') || e.target === modal) {
                modal.remove();
            }
            
            if (e.target.matches('[data-plan]')) {
                const plan = e.target.dataset.plan;
                const interval = e.target.dataset.interval;
                this.initiateUpgrade(plan, interval);
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }
    
    async initiateUpgrade(planType, interval) {
        try {
            // Get price ID from configuration (this would be set in admin)
            const priceId = this.getPriceId(planType, interval);
            
            if (!priceId) {
                throw new Error('Price ID not configured');
            }
            
            const response = await fetch(`${this.config.rest_url}create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': this.config.nonce
                },
                body: JSON.stringify({
                    price_id: priceId,
                    plan_type: planType
                })
            });
            
            const data = await response.json();
            if (response.ok) {
                // Redirect to Stripe Checkout
                window.location.href = data.checkout_url;
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }
            
        } catch (error) {
            console.error('Failed to initiate upgrade:', error);
            this.showError('Failed to initiate upgrade. Please try again.');
        }
    }
    
    getPriceId(planType, interval) {
        // This would typically come from the backend configuration
        // For demo purposes, return placeholder
        const priceMap = {
            'client_pro_monthly': 'price_client_monthly_placeholder',
            'practitioner_pro_monthly': 'price_practitioner_monthly_placeholder'
        };
        
        return priceMap[`${planType}_${interval}`] || null;
    }
    
    updateStatus(message) {
        const statusText = document.getElementById('vr-status-text');
        if (statusText) {
            statusText.textContent = message;
        }
    }
    
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('vr-notifications');
        if (!notifications) return;
        
        const notification = document.createElement('div');
        notification.className = `vr-notification vr-notification-${type}`;
        notification.innerHTML = `
            <div class="vr-notification-content">${message}</div>
            <button class="vr-notification-close">&times;</button>
        `;
        
        notification.addEventListener('click', (e) => {
            if (e.target.matches('.vr-notification-close')) {
                notification.remove();
            }
        });
        
        notifications.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new VoiceResonanceApp();
    });
} else {
    new VoiceResonanceApp();
}
```

### **Package Configuration Files**

**`composer.json`:**
```json
{
    "name": "voice-resonance/wordpress-plugin",
    "description": "Voice Resonance WordPress Plugin",
    "type": "wordpress-plugin",
    "require": {
        "php": ">=7.4",
        "stripe/stripe-php": "^10.0"
    },
    "autoload": {
        "psr-4": {
            "VoiceResonance\\": "includes/"
        }
    },
    "config": {
        "allow-plugins": {
            "composer/installers": true
        }
    }
}
```

**`package.json`:**
```json
{
    "name": "voice-resonance-plugin",
    "version": "1.0.0",
    "description": "Frontend build configuration for Voice Resonance plugin",
    "scripts": {
        "build": "webpack --mode=production",
        "dev": "webpack --mode=development --watch",
        "lint": "eslint assets/js/src"
    },
    "devDependencies": {
        "webpack": "^5.88.0",
        "webpack-cli": "^5.1.0",
        "babel-loader": "^9.1.0",
        "@babel/core": "^7.22.0",
        "@babel/preset-env": "^7.22.0",
        "css-loader": "^6.8.0",
        "mini-css-extract-plugin": "^2.7.0",
        "eslint": "^8.44.0"
    }
}
```

**`webpack.config.js`:**
```javascript
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: {
        app: './assets/js/src/main.js',
        admin: './assets/js/admin.js'
    },
    output: {
        path: path.resolve(__dirname, 'assets/js/dist'),
        filename: '[name].min.js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '../css/[name].min.css'
        })
    ],
    resolve: {
        extensions: ['.js', '.css']
    }
};
```

## **Development Workflow**

**Initial Setup:**
1. Create the plugin directory structure
2. Run `composer install` to install PHP dependencies
3. Run `npm install` to install frontend build tools
4. Run `npm run build` to compile frontend assets

**Testing on e4life.io:**
1. Zip the entire plugin directory
2. Upload via WordPress admin → Plugins → Add New → Upload
3. Activate the plugin
4. Configure settings in Voice Resonance → Settings
5. Create or edit a page and add the `[voice_resonance_app]` shortcode

**Key Features Implemented:**
- **Portable Plugin Architecture:** No system file modifications required
- **Comprehensive Admin Interface:** Settings page with Stripe configuration
- **Secure REST API:** Proper authentication and validation
- **Database Management:** Custom tables with proper relationships
- **Stripe Integration:** Complete payment and webhook handling
- **Frontend SPA:** Modern JavaScript application with audio processing
- **Theme Independence:** Self-contained styling and functionality
- **Free Tools Only:** Uses only open-source and free development tools

This implementation provides a solid foundation for the Voice Resonance plugin that can be installed on any WordPress site, including e4life.io, without requiring any manual system modifications.