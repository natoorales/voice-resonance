<?php
/**
 * Fired during plugin deactivation
 */

class VR_Deactivator {

    /**
     * Short Description. (use period)
     *
     * Long Description.
     *
     * @since    1.0.0
     */
    public static function deactivate() {
        // Placeholder for deactivation logic
        // This might include:
        // 1. Clearing scheduled cron jobs
        // 2. Removing temporary data or cache
        // Note: Typically, you DO NOT delete options or database tables on deactivation.
        // Uninstall logic (like dropping tables) goes in uninstall.php

         if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('Voice Resonance Plugin Deactivated');
        }

        // Flush rewrite rules if custom post types or endpoints were registered
        flush_rewrite_rules();
    }

}