#!/usr/bin/env python3
"""
analyze_audio.py

Analyzes an audio file and extracts key acoustic features.
Intended to be called by a PHP backend via exec().

Usage:
    python3 analyze_audio.py <temp_file_path> <original_filename>

Arguments:
    temp_file_path    : Path to the temporary audio file (e.g., /tmp/phpXXXXXX).
    original_filename : Original name of the uploaded file (for logging/metadata).

Output:
    Prints a JSON object containing extracted features to stdout.
    If an error occurs, prints an error message to stderr and exits with code 1.

Dependencies:
    Requires librosa, numpy, scipy. Install using `pip install librosa numpy scipy`.
"""

import sys
import json
import librosa
import numpy as np
import warnings

# Suppress warnings from librosa if desired (optional)
# warnings.filterwarnings("ignore", category=UserWarning)

def extract_features(file_path, original_filename):
    """
    Extracts acoustic features from an audio file.

    Args:
        file_path (str): Path to the audio file.
        original_filename (str): Original filename for metadata.

    Returns:
        dict: A dictionary of extracted features.
    """
    try:
        # Load the audio file
        # sr=None preserves the original sampling rate
        # duration=None loads the entire file
        y, sr = librosa.load(file_path, sr=None, duration=None)

        duration = librosa.get_duration(y=y, sr=sr)

        # --- 1. Fundamental Frequency (F0) ---
        # Using pYIN for more robust pitch tracking
        f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
        # Filter out unvoiced frames (where voiced_flag is False)
        f0_voiced = f0[voiced_flag]

        mean_f0 = float(np.mean(f0_voiced)) if len(f0_voiced) > 0 else 0.0
        std_f0 = float(np.std(f0_voiced)) if len(f0_voiced) > 0 else 0.0

        # --- 2. Spectral Centroid (Brightness) ---
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        mean_spectral_centroid = float(np.mean(spectral_centroids))
        std_spectral_centroid = float(np.std(spectral_centroids))

        # --- 3. RMS Energy ---
        rms = librosa.feature.rms(y=y)[0]
        mean_rms_energy = float(np.mean(rms))
        std_rms_energy = float(np.std(rms))

        # --- 4. Zero Crossing Rate ---
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        mean_zcr = float(np.mean(zcr))
        std_zcr = float(np.std(zcr))

        # --- 5. MFCCs (Mean of coefficients 1-13) ---
        # n_mfcc=13 is standard
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        # Calculate mean for each coefficient across time
        mfcc_means = [float(np.mean(mfccs[i])) for i in range(mfccs.shape[0])]

        # --- Assemble Features ---
        features = {
            "duration": duration,
            "mean_f0": mean_f0,
            "std_f0": std_f0,
            "mean_spectral_centroid": mean_spectral_centroid,
            "std_spectral_centroid": std_spectral_centroid,
            "mean_rms_energy": mean_rms_energy,
            "std_rms_energy": std_rms_energy,
            "mean_zcr": mean_zcr,
            "std_zcr": std_zcr,
            "mfcc_means": mfcc_means # This will be a list
        }

        return features

    except Exception as e:
        # Print error to stderr for the PHP backend to catch
        print(f"Error processing file '{original_filename}' ({file_path}): {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """
    Main function to handle command-line arguments and execute analysis.
    """
    if len(sys.argv) != 3:
        print("Usage: python3 analyze_audio.py <temp_file_path> <original_filename>", file=sys.stderr)
        sys.exit(1)

    temp_file_path = sys.argv[1]
    original_filename = sys.argv[2]

    # --- Perform Analysis ---
    features = extract_features(temp_file_path, original_filename)

    # --- Output JSON ---
    # Ensure the output is a single line
    print(json.dumps(features, separators=(',', ':')))

if __name__ == "__main__":
    main()
