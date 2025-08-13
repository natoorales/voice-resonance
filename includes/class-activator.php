<?php
/**
 * Voice Resonance - Activator
 *
 * Defines actions to be taken during plugin activation.
 *
 * @package Voice_Resonance
 * @subpackage Includes
 * @since 1.0.0
 */

// Prevent direct access.
defined( 'ABSPATH' ) || exit;

/**
 * Class VR_Activator
 *
 * Handles tasks that need to run when the plugin is activated.
 */
class VR_Activator {

    /**
     * Runs activation tasks.
     *
     * @since 1.0.0
     */
    public static function activate() {

        // --- 1. Create Custom Database Tables ---
        // Check if the Database Manager class exists before trying to use it.
        if ( class_exists( 'VR_Database_Manager' ) ) {
            $db_manager = new VR_Database_Manager();
            $db_manager->create_tables();
            // Note: dbDelta handles checking if tables exist and only creates/modifies them if necessary.
            // Consider adding error checking if $wpdb->last_error is populated after create_tables().
        } else {
            error_log( 'VR_Activator::activate - VR_Database_Manager class not found. Cannot create tables.' );
            // Depending on plugin criticality, you might want to trigger an admin notice or halt activation.
            // For now, we log the error and continue.
        }

        // --- 2. Flush Rewrite Rules (if custom endpoints/permalinks are added later) ---
        flush_rewrite_rules();

        // --- 3. Set Default Options (if any) ---
        // Example: add_option( 'vr_default_option', 'value' );

        // --- 4. Schedule Cron Jobs (if any) ---
        // Example: wp_schedule_event( time(), 'hourly', 'vr_hourly_cron_hook' );

        // --- 5. Other Activation Tasks ---
        // ... (e.g., setting up initial roles/capabilities if needed) ...
    }
}
