<?php
/**
 * Autoloader for Voice Resonance plugin classes
 * Handles PSR-4 style loading based on class names with underscores.
 * E.g., VR_Database_Manager -> includes/database/class-manager.php
 *      VR_API_Controller   -> includes/api/class-controller.php
 * Includes an override map for specific legacy filename mappings.
 */

class VR_Autoloader {

    /**
     * Register the autoloader.
     */
    public static function init() {
        spl_autoload_register([__CLASS__, 'autoload']);
    }

    /**
     * Autoloads plugin classes based on naming convention.
     * Treats underscores as directory separators.
     * Includes an override map for specific legacy filename mappings.
     *
     * @param string $class_name The fully-qualified class name.
     */
    public static function autoload($class_name) {
        // Only autoload our classes
        if (strpos($class_name, 'VR_') !== 0) {
            return;
        }

        // --- OVERRIDE MAP for specific legacy filename mappings ---
        // This handles cases where the filename doesn't strictly follow the
        // calculated pattern. Key: Class Name, Value: Full file path.
        $overrides = [
            'VR_Database_Manager' => VR_PLUGIN_DIR . 'includes/database/class-database-manager.php',
            // Add more overrides here if needed in the future
        ];

        // Check override map first
        if (isset($overrides[$class_name])) {
            $override_file_path = $overrides[$class_name];
            if (file_exists($override_file_path)) {
                require_once $override_file_path;
                return; // Stop processing if override is found and loaded
            } else {
                 // Optional: Log if override file is specified but missing
                 // error_log("VR_Autoloader: Override file not found for $class_name at $override_file_path");
            }
        }
        // --- END OVERRIDE MAP ---

        // Remove the 'VR_' prefix
        $relative_class = substr($class_name, 3); // Gets 'Database_Manager'

        // Treat underscores as namespace separators (for compatibility with your convention)
        // Convert VR_Database_Manager -> Database\Manager
        $relative_class = str_replace('_', '\\', $relative_class);

        // Convert namespace separators to directory separators
        // This PSR-4 autoloader assumes namespaces map directly to directories under 'includes/'
        // e.g., VR_Plugin -> includes/class-plugin.php
        // e.g., VR_Database_Manager -> Database\Manager -> includes/database/class-manager.php
        $file_parts = explode('\\', $relative_class); // ['Database', 'Manager']
        $file_name = 'class-' . strtolower(array_pop($file_parts)) . '.php'; // 'class-manager.php'

        // Build the potential file path using the standard logic
        $file_path = VR_PLUGIN_DIR . 'includes';
        if (!empty($file_parts)) {
            // Add subdirectories if any (e.g., Database, API, etc.)
            // Convert ['Database'] to 'database' and append
            $file_path .= DIRECTORY_SEPARATOR . strtolower(implode(DIRECTORY_SEPARATOR, $file_parts));
        }
        $file_path .= DIRECTORY_SEPARATOR . $file_name; // e.g., includes/database/class-manager.php

        // Check if the file exists using the standard calculated path and load it
        if (file_exists($file_path)) {
            require_once $file_path;
        }
        // If file doesn't exist via override or standard path,
        // let other autoloaders handle it or PHP throw "Class not found"
    }
}
