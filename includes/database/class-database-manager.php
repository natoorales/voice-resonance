<?php
/**
 * Voice Resonance - Database Manager
 *
 * Handles database interactions for the Voice Resonance plugin.
 * Manages tables for user profiles, calibration data, analysis sessions, and results.
 *
 * @package Voice_Resonance
 * @subpackage Database
 * @since 1.0.0
 */

// Prevent direct access.
defined( 'ABSPATH' ) || exit;

/**
 * Class VR_Database_Manager
 *
 * Manages database operations for the Voice Resonance plugin.
 */
class VR_Database_Manager {

    /**
     * WordPress database access abstraction object.
     *
     * @var wpdb
     */
    private $wpdb;

    /**
     * The charset collate string for table creation.
     *
     * @var string
     */
    private $charset_collate;

    /**
     * VR_Database_Manager constructor.
     *
     * Initializes database access and charset collation.
     */
    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->charset_collate = $this->wpdb->get_charset_collate();
    }

    /**
     * Creates the necessary database tables for the plugin.
     *
     * This method should be called during plugin activation.
     * Tables created:
     * - vr_user_profiles: Stores user calibration profiles.
     * - vr_analysis_sessions: Tracks individual analysis sessions (placeholder for future).
     * - vr_analysis_segments: Stores data for individual audio segments analyzed.
     *
     * @since 1.0.0
     */
    public function create_tables() {
        // Ensure dbDelta function is available
        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

        // --- Table: vr_user_profiles ---
        $table_name_profiles = $this->wpdb->prefix . 'vr_user_profiles';

        $sql_profiles = "CREATE TABLE $table_name_profiles (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            profile_data LONGTEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY user_id (user_id),
            KEY idx_created_at (created_at)
        ) $this->charset_collate;";

        dbDelta( $sql_profiles );


        // --- Table: vr_analysis_sessions ---
        // (Optional/Placeholder for now, might be needed later for session tracking)
        $table_name_sessions = $this->wpdb->prefix . 'vr_analysis_sessions';

        $sql_sessions = "CREATE TABLE $table_name_sessions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_end DATETIME NULL DEFAULT NULL,
            metadata TEXT,
            PRIMARY KEY  (id),
            KEY idx_user_id (user_id),
            KEY idx_session_start (session_start)
        ) $this->charset_collate;";

        dbDelta( $sql_sessions );


        // --- Table: vr_analysis_segments ---
        $table_name_segments = $this->wpdb->prefix . 'vr_analysis_segments';

        $sql_segments = "CREATE TABLE $table_name_segments (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            session_id BIGINT UNSIGNED NULL DEFAULT NULL,
            audio_filename VARCHAR(255),
            segment_start_time DECIMAL(10, 3),
            segment_end_time DECIMAL(10, 3),
            audio_features LONGTEXT,
            vri_score DECIMAL(5, 4),
            analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY idx_user_id (user_id),
            KEY idx_session_id (session_id),
            KEY idx_analyzed_at (analyzed_at)
        ) $this->charset_collate;";

        dbDelta( $sql_segments );

        // Log or handle potential errors from dbDelta if needed
        // Check $this->wpdb->last_error after dbDelta calls
        // For production, consider more robust error checking/logging.
    }

    /**
     * Saves or updates a user's calibration profile.
     *
     * @param int   $user_id             The WordPress user ID.
     * @param array $calculated_profile  An associative array containing the calculated user profile data.
     *                                   This should be serializable (e.g., JSON encodeable).
     * @return int|false                 The number of rows affected, or false on error.
     * @since 1.0.0
     */
    public function save_user_profile( $user_id, $calculated_profile ) {
        $table_name = $this->wpdb->prefix . 'vr_user_profiles';

        $profile_json = wp_json_encode( $calculated_profile );

        if ( $profile_json === false ) {
            error_log( 'VR_Database_Manager::save_user_profile - Failed to encode profile data to JSON.' );
            return false;
        }

        // Check if profile already exists for the user
        $existing_profile = $this->get_user_profile( $user_id );

        if ( $existing_profile ) {
            // Update existing profile
            $result = $this->wpdb->update(
                $table_name,
                array( 'profile_data' => $profile_json ),
                array( 'user_id' => $user_id ),
                array( '%s' ), // Data format
                array( '%d' )  // Where format
            );
        } else {
            // Insert new profile
            $result = $this->wpdb->insert(
                $table_name,
                array(
                    'user_id'      => $user_id,
                    'profile_data' => $profile_json,
                ),
                array( '%d', '%s' ) // Format
            );
        }

        if ( $result === false ) {
             error_log( 'VR_Database_Manager::save_user_profile - Database error: ' . $this->wpdb->last_error );
        }

        return $result;
    }


    /**
     * Retrieves a user's calibration profile.
     *
     * @param int $user_id The WordPress user ID.
     * @return array|null  The profile data array, or null if not found/error.
     * @since 1.0.0
     */
    public function get_user_profile( $user_id ) {
        $table_name = $this->wpdb->prefix . 'vr_user_profiles';

        $profile_json = $this->wpdb->get_var( $this->wpdb->prepare(
            "SELECT profile_data FROM $table_name WHERE user_id = %d",
            $user_id
        ) );

        if ( $profile_json === null ) {
            // No profile found for this user
            return null;
        }

        $profile_data = json_decode( $profile_json, true );

        if ( json_last_error() !== JSON_ERROR_NONE ) {
             error_log( 'VR_Database_Manager::get_user_profile - Error decoding JSON profile: ' . json_last_error_msg() );
            return null;
        }

        return $profile_data;
    }

     /**
     * Saves the result of an audio analysis segment.
     * This will be used after the main analysis logic calculates the VRI score.
     *
     * @param int    $user_id           The WordPress user ID.
     * @param string $audio_filename    Identifier for the audio segment.
     * @param float  $segment_start     Start time of the segment in seconds.
     * @param float  $segment_end       End time of the segment in seconds.
     * @param array  $audio_features    Associative array of extracted audio features.
     * @param float  $vri_score         The calculated VRI score.
     * @param int|null $session_id      Optional ID linking to an analysis session.
     * @return int|false                The ID of the inserted row, or false on error.
     * @since 1.0.0
     */
    public function save_analysis_segment( $user_id, $audio_filename, $segment_start, $segment_end, $audio_features, $vri_score, $session_id = null ) {
        $table_name = $this->wpdb->prefix . 'vr_analysis_segments';

        $features_json = wp_json_encode( $audio_features );

        if ( $features_json === false ) {
            error_log( 'VR_Database_Manager::save_analysis_segment - Failed to encode audio features to JSON.' );
            return false;
        }

        $data = array(
            'user_id'            => $user_id,
            'session_id'         => $session_id,
            'audio_filename'     => $audio_filename,
            'segment_start_time' => $segment_start,
            'segment_end_time'   => $segment_end,
            'audio_features'     => $features_json,
            'vri_score'          => $vri_score,
        );

        $format = array( '%d', '%d', '%s', '%f', '%f', '%s', '%f' );


        $result = $this->wpdb->insert( $table_name, $data, $format );

        if ( $result === false ) {
             error_log( 'VR_Database_Manager::save_analysis_segment - Database error: ' . $this->wpdb->last_error );
             return false;
        }

        return $this->wpdb->insert_id; // Return the ID of the inserted row
    }

    /**
     * Retrieves analysis segments for a user, optionally filtered by session.
     *
     * @param int $user_id    The WordPress user ID.
     * @param int|null $session_id Optional session ID to filter by.
     * @return array|null     Array of segment data arrays, or null on error.
     * @since 1.0.0
     */
    public function get_analysis_segments( $user_id, $session_id = null ) {
        $table_name = $this->wpdb->prefix . 'vr_analysis_segments';

        // Safer method: Build query string and use prepare correctly.
        if ( $session_id !== null ) {
             $query = $this->wpdb->prepare(
                 "SELECT * FROM $table_name WHERE user_id = %d AND session_id = %d ORDER BY analyzed_at DESC",
                 $user_id,
                 $session_id
             );
        } else {
             $query = $this->wpdb->prepare(
                 "SELECT * FROM $table_name WHERE user_id = %d ORDER BY analyzed_at DESC",
                 $user_id
             );
        }


        $results = $this->wpdb->get_results( $query, ARRAY_A );

        if ( $results === false ) {
             error_log( 'VR_Database_Manager::get_analysis_segments - Database error: ' . $this->wpdb->last_error );
             return null;
        }

        // Decode the JSON features for each result
        foreach ( $results as &$row ) {
            if ( ! empty( $row['audio_features'] ) ) {
                $decoded_features = json_decode( $row['audio_features'], true );
                if ( json_last_error() === JSON_ERROR_NONE ) {
                    $row['audio_features'] = $decoded_features;
                } else {
                     error_log( 'VR_Database_Manager::get_analysis_segments - Error decoding features for segment ID ' . ( $row['id'] ?? 'unknown' ) . ': ' . json_last_error_msg() );
                     $row['audio_features'] = null; // Or handle error differently
                }
            }
        }
        unset( $row ); // Break the reference with the last element

        return $results;
    }

    // --- Additional Methods Placeholder ---
    // Future methods might include:
    // - get_user_sessions( $user_id )
    // - start_analysis_session( $user_id, $metadata )
    // - end_analysis_session( $session_id )
    // - get_recent_vri_scores( $user_id, $limit = 10 )
    // - delete_user_data( $user_id ) // For privacy/account deletion

} // End of class VR_Database_Manager
