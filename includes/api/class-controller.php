<?php

class VR_API_Controller {

    private $db_manager;
    private $stripe_service;
    private $entitlements;

    public function __construct() {
        // Instantiate dependencies directly, assuming they are loaded by the plugin's load_dependencies
        // Add class_exists checks for safety
        $this->db_manager = class_exists('VR_Database_Manager') ? new VR_Database_Manager() : null;
        $this->stripe_service = class_exists('VR_Stripe') ? new VR_Stripe() : null;
        $this->entitlements = class_exists('VR_Entitlements') ? new VR_Entitlements() : null;

        if (defined('WP_DEBUG') && WP_DEBUG) {
            if (!$this->db_manager) {
                error_log('VR_API_Controller: VR_Database_Manager not instantiated.');
            }
            if (!$this->stripe_service) {
                error_log('VR_API_Controller: VR_Stripe not instantiated.');
            }
            if (!$this->entitlements) {
                error_log('VR_API_Controller: VR_Entitlements not instantiated.');
            }
        }
    }

    public function register_routes() {
        // Test route
        register_rest_route('vr/v1', '/test', [
            'methods'  => 'GET',
            'callback' => function() {
                return new WP_REST_Response(['message' => 'Voice Resonance API Placeholder'], 200);
            },
            'permission_callback' => '__return_true'
        ]);

        // Check Pro Status
        register_rest_route('vr/v1', '/check-pro', [
            'methods'  => 'GET',
            'callback' => [$this, 'check_pro_status'],
            'permission_callback' => [$this, 'permission_check_logged_in'],
        ]);

        // Sessions
        register_rest_route('vr/v1', '/sessions', [
            'methods'  => 'POST',
            'callback' => [$this, 'create_session'],
            'permission_callback' => [$this, 'permission_check_logged_in'],
        ]);

        // Segments
        register_rest_route('vr/v1', '/segments', [
            'methods'  => 'POST',
            'callback' => [$this, 'save_segment'],
            'permission_callback' => [$this, 'permission_check_logged_in'],
        ]);

        // Process Calibration
        register_rest_route('vr/v1', '/process-calibration', [
            'methods'  => 'POST',
            'callback' => [$this, 'process_calibration'],
            'permission_callback' => [$this, 'permission_check_logged_in'],
        ]);
    }

    public function permission_check_logged_in() {
        return is_user_logged_in();
    }

    public function permission_check_pro_user() {
        if (!$this->entitlements) {
            return false;
        }
        $user_id = get_current_user_id();
        if (!$user_id) {
            return false;
        }

        if (method_exists($this->entitlements, 'has_pro_access')) {
            return $this->entitlements->has_pro_access($user_id);
        } elseif (method_exists($this->entitlements, 'is_user_pro')) {
            return $this->entitlements->is_user_pro($user_id);
        }
        return false;
    }

    public function check_pro_status($request) {
        $user_id = get_current_user_id();
        $is_pro = false;
        $plan_type = 'free';

        if ($this->entitlements && $user_id) {
            if (method_exists($this->entitlements, 'has_pro_access')) {
                $is_pro = $this->entitlements->has_pro_access($user_id);
            } elseif (method_exists($this->entitlements, 'is_user_pro')) {
                $is_pro = $this->entitlements->is_user_pro($user_id);
            }
            $plan_type = $is_pro ? 'pro' : 'free';
        }

        return new WP_REST_Response([
            'is_pro' => $is_pro,
            'plan_type' => $plan_type,
            'user_id' => $user_id
        ], 200);
    }

    // Placeholder methods
    public function create_session($request) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('VR_API_Controller::create_session called (placeholder)');
        }
        return new WP_REST_Response([
            'session_id' => uniqid('sess_'),
            'message' => 'Session created (placeholder)'
        ], 200);
    }

    public function save_segment($request) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('VR_API_Controller::save_segment called (placeholder)');
        }
        return new WP_REST_Response([
            'segment_id' => uniqid('seg_'),
            'message' => 'Segment saved (placeholder)'
        ], 200);
    }

    /**
     * Processes uploaded calibration audio samples.
     *
     * Receives audio files for 'true' and 'false' statements,
     * analyzes them to create a user profile, and saves the profile.
     *
     * @param WP_REST_Request $request The REST API request object.
     * @return WP_REST_Response        The REST API response.
     * @since 1.0.0
     */
    public function process_calibration( $request ) {
        $user_id = get_current_user_id();

        if ( ! $user_id ) {
            return new WP_REST_Response(
                array( 'success' => false, 'message' => 'User not logged in.' ),
                401
            );
        }

        // --- 1. Retrieve Uploaded Files ---
        // The frontend sends files as 'true_statements[]' and 'false_statements[]'
        $true_statement_files = $request->get_file_params()['true_statements'] ?? [];
        $false_statement_files = $request->get_file_params()['false_statements'] ?? [];

        // Handle cases where single files are uploaded (not arrays)
        // WP_REST_Request handles file params, but structure can vary slightly.
        // Ensure we have arrays of files for consistent processing.
        if ( ! empty( $true_statement_files ) && ! is_array( $true_statement_files['name'] ) ) {
             // Single file uploaded, convert to array format
             $true_statement_files = array(
                 'name'     => array( $true_statement_files['name'] ),
                 'type'     => array( $true_statement_files['type'] ),
                 'tmp_name' => array( $true_statement_files['tmp_name'] ),
                 'error'    => array( $true_statement_files['error'] ),
                 'size'     => array( $true_statement_files['size'] ),
             );
        } elseif ( empty( $true_statement_files ) || ! isset( $true_statement_files['name'] ) ) {
             // No files or invalid structure
             $true_statement_files = array( 'name' => [], 'type' => [], 'tmp_name' => [], 'error' => [], 'size' => [] );
        }

        if ( ! empty( $false_statement_files ) && ! is_array( $false_statement_files['name'] ) ) {
             $false_statement_files = array(
                 'name'     => array( $false_statement_files['name'] ),
                 'type'     => array( $false_statement_files['type'] ),
                 'tmp_name' => array( $false_statement_files['tmp_name'] ),
                 'error'    => array( $false_statement_files['error'] ),
                 'size'     => array( $false_statement_files['size'] ),
             );
        } elseif ( empty( $false_statement_files ) || ! isset( $false_statement_files['name'] ) ) {
             $false_statement_files = array( 'name' => [], 'type' => [], 'tmp_name' => [], 'error' => [], 'size' => [] );
        }


        // --- 2. Basic Validation ---
        if ( empty( $true_statement_files['name'] ) || empty( $false_statement_files['name'] ) ) {
            return new WP_REST_Response(
                array( 'success' => false, 'message' => 'Both true and false statement files are required.' ),
                400 // Bad Request
            );
        }

        $allowed_mime_types = array( 'audio/wav', 'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/ogg' ); // Add more as needed

        // Validate True Statements
        $num_true_files = count( $true_statement_files['name'] );
        for ( $i = 0; $i < $num_true_files; $i++ ) {
            if ( $true_statement_files['error'][ $i ] !== UPLOAD_ERR_OK ) {
                error_log( "VR_API_Controller::process_calibration - Error uploading true statement file {$true_statement_files['name'][$i]}: " . $true_statement_files['error'][ $i ] );
                return new WP_REST_Response(
                    array( 'success' => false, 'message' => 'Error uploading true statement file(s).' ),
                    500
                );
            }
            if ( ! in_array( $true_statement_files['type'][ $i ], $allowed_mime_types, true ) ) {
                 return new WP_REST_Response(
                     array( 'success' => false, 'message' => 'Invalid file type for true statement file(s). Only WAV, WebM, MP3, MP4, OGG allowed.' ),
                     400
                 );
            }
        }

        // Validate False Statements
        $num_false_files = count( $false_statement_files['name'] );
        for ( $i = 0; $i < $num_false_files; $i++ ) {
            if ( $false_statement_files['error'][ $i ] !== UPLOAD_ERR_OK ) {
                error_log( "VR_API_Controller::process_calibration - Error uploading false statement file {$false_statement_files['name'][$i]}: " . $false_statement_files['error'][ $i ] );
                return new WP_REST_Response(
                    array( 'success' => false, 'message' => 'Error uploading false statement file(s).' ),
                    500
                );
            }
            if ( ! in_array( $false_statement_files['type'][ $i ], $allowed_mime_types, true ) ) {
                 return new WP_REST_Response(
                     array( 'success' => false, 'message' => 'Invalid file type for false statement file(s). Only WAV, WebM, MP3, MP4, OGG allowed.' ),
                     400
                 );
            }
        }

        // --- 3. Real Audio Processing using External Script ---
        // This section replaces the placeholder mt_rand logic.
        // It calls an external Python script to analyze each audio file.

        $true_features = array();
        $false_features = array();

        // --- Helper Function for Analysis ---
        // Define a local function to handle the analysis of a single file.
        // This keeps the code cleaner.
        $analyze_single_file = function($file_info, $label) {
            $file_path = $file_info['tmp_name'];
            $original_name = $file_info['name'];

            // --- Call Python Analysis Script ---
            // 1. Define the path to our analysis script
            // Place this script in a logical location within your plugin, e.g., `bin/`
            // Adjust path relative to api-controller.php
            $script_path = plugin_dir_path(dirname(__FILE__)) . 'bin/analyze_audio.py';

            // 2. Validate script exists
            if (!file_exists($script_path)) {
                error_log("VR_API_Controller::process_calibration - Analysis script not found at $script_path");
                return new WP_Error('vr_analysis_script_missing', "Analysis script ($label) is missing.", array('status' => 500));
            }

            // 3. Escape paths for shell command (security)
            $escaped_script_path = escapeshellarg($script_path);
            $escaped_file_path = escapeshellarg($file_path);

            // 4. Build the command
            // Assuming Python 3 is installed and accessible as `python3`
            // Pass the original filename for potential logging in the script
            $escaped_original_name = escapeshellarg($original_name);
            $command = "python3 $escaped_script_path $escaped_file_path $escaped_original_name 2>&1"; // 2>&1 captures stderr

            // 5. Execute the command
            $output = array();
            $return_code = 0;
            exec($command, $output, $return_code);

            // 6. Check execution result
            if ($return_code !== 0) {
                $error_output = implode("\n", $output);
                error_log("VR_API_Controller::process_calibration - Python analysis script ($label) failed (Code: $return_code). Command: $command. Output: $error_output");
                return new WP_Error('vr_analysis_script_failed', "Audio analysis script ($label) execution failed.", array('status' => 500));
            }

            // 7. Parse the JSON output (assuming the script prints JSON to stdout)
            $json_output = implode("\n", $output); // Combine lines if output was multi-line
            $features = json_decode($json_output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("VR_API_Controller::process_calibration - Failed to decode JSON from analysis script ($label). Error: " . json_last_error_msg() . ". Output: $json_output");
                return new WP_Error('vr_analysis_json_error', "Failed to parse analysis results ($label).", array('status' => 500));
            }

            if (!is_array($features) || empty($features)) {
                error_log("VR_API_Controller::process_calibration - Analysis script ($label) returned invalid or empty feature data. Output: $json_output");
                return new WP_Error('vr_analysis_invalid_data', "Analysis script ($label) returned invalid data.", array('status' => 500));
            }

            // Add an identifier for the file
            $features['file_identifier'] = md5_file($file_path); // Or use $original_name if preferred
            $features['original_filename'] = $original_name;

            return $features;
        };
        // --- End Helper Function ---


        // --- Analyze True Statements ---
        for ($i = 0; $i < $num_true_files; $i++) {
            // Create a single file info array for the helper function
            $single_file_info = array(
                'name' => $true_statement_files['name'][$i],
                'tmp_name' => $true_statement_files['tmp_name'][$i],
                'type' => $true_statement_files['type'][$i],
                'error' => $true_statement_files['error'][$i],
                'size' => $true_statement_files['size'][$i],
            );

            $features_result = $analyze_single_file($single_file_info, "true_statement_$i");

            if (is_wp_error($features_result)) {
                // Propagate the error up
                return $features_result;
            }

            $true_features[] = $features_result;
        }

        // --- Analyze False Statements ---
        for ($i = 0; $i < $num_false_files; $i++) {
            $single_file_info = array(
                'name' => $false_statement_files['name'][$i],
                'tmp_name' => $false_statement_files['tmp_name'][$i],
                'type' => $false_statement_files['type'][$i],
                'error' => $false_statement_files['error'][$i],
                'size' => $false_statement_files['size'][$i],
            );

            $features_result = $analyze_single_file($single_file_info, "false_statement_$i");

            if (is_wp_error($features_result)) {
                return $features_result;
            }

            $false_features[] = $features_result;
        }

        // --- 4. Calculate Profile ---
        // Create a basic profile structure.
        // This will be expanded significantly with real audio analysis.
        $calculated_profile = array(
            'version' => '1.0.0_real_features', // Profile version
            'user_id' => $user_id,
            'calibration_date' => current_time( 'mysql' ),
            'num_true_samples' => $num_true_files,
            'num_false_samples' => $num_false_files,
            // Store raw features for now, or calculate simple averages/thresholds
            'true_samples_features' => $true_features,
            'false_samples_features' => $false_features,
            // Example: Simple average calculation for thresholds (placeholder logic)
            // This part needs to be updated once we know the exact feature names from Python
            // Assuming Python outputs keys like 'mean_f0', 'std_f0', 'mean_spectral_centroid', etc.
            'thresholds' => array(),
            // Add other relevant profile data
        );

        // --- Calculate Thresholds based on Real Features ---
        // Example: Calculate average for mean_f0 from true and false samples
        $true_mean_f0s = array_column(array_filter($true_features, function($f) { return isset($f['mean_f0']); }), 'mean_f0');
        $false_mean_f0s = array_column(array_filter($false_features, function($f) { return isset($f['mean_f0']); }), 'mean_f0');

        if (!empty($true_mean_f0s) && !empty($false_mean_f0s)) {
            $avg_true_mean_f0 = array_sum($true_mean_f0s) / count($true_mean_f0s);
            $avg_false_mean_f0 = array_sum($false_mean_f0s) / count($false_mean_f0s);
            $calculated_profile['thresholds']['mean_f0_threshold'] = ($avg_true_mean_f0 + $avg_false_mean_f0) / 2;
            $calculated_profile['thresholds']['mean_f0_true_avg'] = $avg_true_mean_f0;
            $calculated_profile['thresholds']['mean_f0_false_avg'] = $avg_false_mean_f0;
        }

        // Add similar calculations for other key features output by the Python script
        // You will add more logic here as the Python script's output becomes final.

        // --- 5. Save Profile using Database Manager ---
        if ( ! $this->db_manager ) {
            error_log( 'VR_API_Controller::process_calibration - Database Manager is not available.' );
            return new WP_REST_Response(
                array( 'success' => false, 'message' => 'Internal server error: Database unavailable.' ),
                500
            );
        }

        $save_result = $this->db_manager->save_user_profile( $user_id, $calculated_profile );

        if ( $save_result === false ) {
            // Error logged by save_user_profile
            return new WP_REST_Response(
                array( 'success' => false, 'message' => 'Failed to save calibration profile.' ),
                500
            );
        }

        // --- 6. Return Success ---
        return new WP_REST_Response(
            array(
                'success' => true,
                'message' => 'Calibration processed and profile saved successfully.',
                'profile_preview' => array( // Optional: send back a small part of the profile for debugging/frontend confirmation
                    'version' => $calculated_profile['version'],
                    'num_true_samples' => $calculated_profile['num_true_samples'],
                    'num_false_samples' => $calculated_profile['num_false_samples'],
                    // 'thresholds' => $calculated_profile['thresholds'], // Might be too much data
                )
            ),
            200
        );
    }

}