<?php
/**
 * Template for the Voice Resonance App Shortcode
 * This file is included by class-plugin.php
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// At this point, $atts array is available from the shortcode_atts call in render_app_shortcode
// Default mode is 'full', default height is '600px' as defined in render_app_shortcode

// Determine container classes and styles based on attributes
$container_classes = 'vrp-app-container';
$container_styles = '';
if (isset($atts['mode']) && $atts['mode'] === 'compact') {
    $container_classes .= ' vrp-app-compact';
}
if (isset($atts['height'])) {
    $container_styles = 'style="height: ' . esc_attr($atts['height']) . ';"';
}

// Output the main app container
// The ID 'vrp-app-root' is crucial as the JS app looks for this element
echo '<div id="vrp-app-root" class="' . esc_attr($container_classes) . '" ' . $container_styles . '>Loading Voice Resonance App...</div>';
