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
            isCalibrated: localStorage.getItem('vr_calibrated') === 'true', // Check local storage initially
            userProfile: null,
            segments: [],
            // --- Calibration State ---
            isCalibrating: false,         // Overall calibration mode flag
            calibrationPhase: null,       // 'true_statements' or 'false_statements'
            trueSamples: [],              // Array to hold audio blobs for true statements
            falseSamples: [],             // Array to hold audio blobs for false statements
            currentCalibrationPromptIndex: 0,
            totalPromptsPerPhase: 5,      // Number of prompts per phase
            // -------------------------
            // --- Recording State for Calibration Samples ---
            calibrationMediaRecorder: null,
            calibrationAudioChunks: [],
            isCalibrationRecording: false,
            currentCalibrationRecordingPhase: null, // 'true_statements' or 'false_statements'
            // ------------------------------------------------
            // --- Reference to Calibration Window ---
            calibrationWindowRef: null
            // --------------------------------------
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
        const appRoot = document.getElementById('vrp-app-root') || document.querySelector('.vrp-app') || document.body;
        appRoot.innerHTML = `
        <div class="vr-app">
            <div class="vr-header">
                <div class="vr-logo">
                    <h1>Voice Resonance</h1>
                </div>
                <div class="vr-user-status">
                    ${this.config.is_logged_in ?
                        `<span class="vr-plan-badge ${this.config.is_pro ? 'pro' : 'free'}">${this.config.is_pro ? 'Pro' : 'Free'}</span>` :
                        '<a href="/wp-login.php" class="vr-login-btn">Login</a>'}
                </div>
            </div>
            <div class="vr-main-content">
                ${this.config.is_logged_in ? this.renderMainApp() : this.renderLoginPrompt()}
            </div>
            <!-- Calibration Modal Container -->
            <div id="vr-calibration-modal-container"></div>
            <div class="vr-notifications" id="vr-notifications"></div>
        </div>`;
    }

    renderMainApp() {
        // Determine if calibration section should be shown
        const showCalibrationSection = !this.state.isCalibrated;

        return `
        <div class="vr-recording-interface">
            <div class="vr-audio-controls">
                <button id="vr-record-btn" class="vr-record-btn" disabled>
                    <span class="vr-record-icon">&#127908;</span> <!-- Microphone: &#127908; -->
                </button>
                <div class="vr-status" id="vr-status-text">Initializing...</div>
            </div>
            <div class="vr-session-info">
                <div class="vr-vri-display">
                    <div class="vr-vri-score" id="vr-vri-score">
                        <div class="vri-score-placeholder">--</div>
                    </div>
                    <div class="vr-vri-confidence" id="vr-vri-confidence">
                        <div class="vri-confidence-placeholder">--%</div>
                    </div>
                </div>
            </div>
            <div class="vr-transcript-section">
                <h3>Transcript</h3>
                <div class="vr-transcript-text" id="vr-transcript-text">Speak to begin analysis...</div>
            </div>
            ${showCalibrationSection ? this.renderCalibrationPrompt() : ''}
            ${!this.config.is_pro ? this.renderUpgradePrompt() : ''}
        </div>`;
    }

    renderCalibrationPrompt() {
        // Updated instructions as requested
        return `
        <div class="vr-calibration-section" id="vr-calibration-section">
            <h3>Calibration Required</h3>
            <div class="vr-calibration-instructions">
                <p><strong>Phase 1: Intentionally True Statements</strong></p>
                <p>Make 5 to 8 positive statements you know and feel are true.</p>
                <p>Examples: "My name is...", "My age is...", "I am currently breathing."</p>
                <p>Speak naturally. Make a short 2s pause between statements.</p>
                <br>
                <p><strong>Phase 2: Intentionally False Statements</strong></p>
                <p>Make 5 to 8 positive statements you know are false.</p>
                <p>Examples: "I live on planet Mars now.", "I am sitting on the beach now.", "I have four arms."</p>
                <p>Speak naturally. Make a short 2s pause between statements.</p>
            </div>
            <button id="vr-calibrate-btn" class="vr-btn vr-btn-primary">Start Calibration</button>
        </div>`;
    }

    renderLoginPrompt() {
        return `
        <div class="vr-login-prompt">
            <h2>Welcome to Voice Resonance</h2>
            <p>Please log in to access the voice analysis features.</p>
            <a href="/wp-login.php?redirect_to=${encodeURIComponent(window.location.href)}" class="vr-btn vr-btn-primary">Log In</a>
        </div>`;
    }

    renderUpgradePrompt() {
        return `
        <div class="vr-upgrade-prompt">
            <h3>Upgrade to Pro</h3>
            <p>Unlock advanced features like calibration, history, and detailed analysis.</p>
            <button id="vr-upgrade-btn" class="vr-btn vr-btn-upgrade">Upgrade Now</button>
        </div>`;
    }

    setupEventListeners() {
        // Record button (main app)
        document.addEventListener('click', (e) => {
            if (e.target.matches('#vr-record-btn')) {
                this.toggleRecording();
            }
            if (e.target.matches('#vr-calibrate-btn')) {
                this.startEnhancedCalibration();
            }
            if (e.target.matches('#vr-upgrade-btn')) {
                this.showUpgradeOptions();
            }
            // --- Calibration Modal Event Listeners ---
            // Keeping modal listeners in case we use it as fallback
            if (e.target.closest('#vr-calibration-modal')) {
                const modal = document.getElementById('vr-calibration-modal');
                if (e.target.matches('#vr-calibration-close-btn') || e.target === modal) {
                    this.cancelCalibration();
                }
                if (e.target.matches('#vr-calibration-record-btn')) {
                    this.toggleCalibrationRecording();
                }
                if (e.target.matches('#vr-calibration-next-btn')) {
                    this.nextCalibrationPrompt();
                }
                if (e.target.matches('#vr-calibration-finish-btn')) {
                    this.finishCalibration();
                }
            }
            // --- End Calibration Modal Event Listeners ---
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                // Prevent spacebar from triggering recording if calibration modal is open
                if (!document.getElementById('vr-calibration-modal')) {
                     this.toggleRecording();
                }
            }
        });

        // Listen for messages from the potential calibration window
        window.addEventListener('message', (event) => {
            // Security check (optional but good practice)
            // if (event.origin !== window.location.origin) return;

            if (event.data && event.data.action) {
                switch (event.data.action) {
                    case 'startRecordingTrue':
                        this.startCalibrationRecording('true_statements');
                        break;
                    case 'startRecordingFalse':
                        this.startCalibrationRecording('false_statements');
                        break;
                    case 'stopRecording':
                         this.stopCalibrationRecording();
                         break;
                    case 'finishCalibration':
                         this.finishCalibrationFromWindow();
                         break;
                    case 'cancelCalibration':
                         this.cancelCalibrationFromWindow();
                         break;
                    case 'windowClosed':
                         // Handle if user closes the window manually
                         this.handleCalibrationWindowClosed();
                         break;
                     case 'windowReady':
                         // Calibration window is ready, enable buttons if audio is ready
                         if (this.state.mediaStream) {
                             this.sendMessageToCalibrationWindow({ action: 'enableButtons' });
                         }
                         break;
                     default:
                         console.warn('Unknown action from calibration window:', event.data.action);
                }
            }
        });
    }

    async checkUserStatus() {
        if (!this.config.is_logged_in) return;

        try {
            const response = await fetch(`${this.config.rest_url}check-pro`, {
                method: 'GET',
                headers: {
                    'X-WP-Nonce': this.config.nonce
                }
            });
            const data = await response.json();
            this.updateUserStatus(data);
        } catch (error) {
            console.error('Failed to check user status:', error);
            // Don't show error for this, as it might be the 404/500 we are fixing/debugging
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
            this.state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.state.mediaRecorder = new MediaRecorder(this.state.mediaStream);

            // --- Setup Calibration MediaRecorder ---
            // Note: A new one is created for each calibration recording segment
            // this.state.calibrationMediaRecorder is set dynamically
            // ---------------------------------------

            // Enable record button
            const recordBtn = document.getElementById('vr-record-btn');
            if (recordBtn) {
                recordBtn.disabled = false;
                this.updateStatus('Ready');
            }

            // --- NEW: Notify calibration window if it exists ---
            // Check if we are in the main app context and a calibration window might be open
            if (this.state.calibrationWindowRef && !this.state.calibrationWindowRef.closed) {
                // Send a message to the calibration window to enable its buttons
                this.sendMessageToCalibrationWindow({ action: 'enableButtons' });
            }
            // ---

        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.updateStatus('Microphone access denied');
            this.showError('Microphone access is required for this app.');
        }
    }

    // --- Enhanced Calibration Methods ---

    startEnhancedCalibration() {
        // Reset main app calibration state
        this.state.isCalibrating = true; // Indicates calibration process is active
        this.state.calibrationPhase = null; // Not in a specific phase yet in main app
        this.state.trueSamples = [];
        this.state.falseSamples = [];
        this.state.currentCalibrationPromptIndex = 0; // Might not be used in new flow
        this.state.calibrationAudioChunks = []; // Reset chunks
        this.state.isCalibrationRecording = false;
        this.state.currentCalibrationRecordingPhase = null;

        // Open the dedicated window
        this.openDedicatedCalibrationWindow();
    }

    openDedicatedCalibrationWindow() {
        // Optional: Close any existing calibration modal if it was opened first
        this.closeCalibrationModal();

        // Calculate window features (size, position)
        const width = 600;
        const height = 700;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        // Open a new window
        // Note: Popup blockers might interfere. Using a modal/dialog is often more reliable.
        const calibrationWindow = window.open(
            'about:blank',
            'vr_calibration_window',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
        );

        if (!calibrationWindow) {
            this.showError('Failed to open calibration window. Please disable popup blockers for this site.');
            this.state.isCalibrating = false; // Reset state on failure
            return;
        }

        // --- CRITICAL FIX: Refactored HTML string to avoid nested backticks and use HTML entities ---
        // Write the basic HTML structure to the new window using standard string concatenation
        calibrationWindow.document.write(
            '<!DOCTYPE html>' +
            '<html>' +
            '<head>' +
                '<title>Voice Resonance Calibration</title>' +
                '<style>' +
                    'body { font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5; margin: 0; }' +
                    '.vr-calibration-window { max-width: 560px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }' +
                    '.vr-calibration-header { text-align: center; margin-bottom: 20px; }' +
                    '.vr-calibration-controls { display: flex; justify-content: space-around; margin-bottom: 20px; }' +
                    '.vr-calibration-btn { padding: 12px 20px; font-size: 16px; border: none; border-radius: 5px; cursor: pointer; }' +
                    '.vr-calibration-btn.true { background-color: #4CAF50; color: white; }' +
                    '.vr-calibration-btn.false { background-color: #f44336; color: white; }' +
                    '.vr-calibration-btn:disabled { background-color: #cccccc; cursor: not-allowed; }' +
                    '.vr-transcript-area { margin-top: 20px; }' +
                    '.vr-transcript-text { min-height: 100px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #fafafa; white-space: pre-wrap; }' +
                    '.vr-status { margin-top: 15px; font-weight: bold; text-align: center; }' +
                    '.vr-instructions { margin-bottom: 15px; text-align: center; color: #555; }' +
                    '.vr-record-icon { margin-right: 5px; }' +
                    '@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); } 100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); } }' +
                    '.recording { animation: pulse 1s infinite; background-color: #45a049 !important; }' + // Slightly darker green
                    '.vr-actions { margin-top: 20px; text-align: center; }' +
                    '.vr-actions button { margin: 0 5px; }' +
                '</style>' +
            '</head>' +
            '<body>' +
                '<div class="vr-calibration-window">' +
                    '<div class="vr-calibration-header">' +
                        '<h2>Calibration: Intentionally True/False Statements</h2>' +
                    '</div>' +
                    '<div class="vr-instructions">' +
                        '<p><strong>Phase 1:</strong> Click "True Statements" and speak 5-8 statements you know are personally true.</p>' +
                        '<p><strong>Phase 2:</strong> Click "False Statements" and speak 5-8 statements you know are personally false.</p>' +
                        '<p>Speak naturally and pause briefly between statements.</p>' +
                    '</div>' +
                    '<div class="vr-calibration-controls">' +
                        '<button id="vr-calib-true-btn" class="vr-calibration-btn true" disabled>' +
                            '<span class="vr-record-icon">&#127908;</span> True Statements' + // Microphone: &#127908;
                        '</button>' +
                        '<button id="vr-calib-false-btn" class="vr-calibration-btn false" disabled>' +
                            '<span class="vr-record-icon">&#127908;</span> False Statements' + // Microphone: &#127908;
                        '</button>' +
                    '</div>' +
                    '<div class="vr-transcript-area">' +
                        '<h3>Transcript:</h3>' +
                        '<div id="vr-calib-transcript" class="vr-transcript-text">Press a button to start recording...</div>' +
                    '</div>' +
                    '<div class="vr-status" id="vr-calib-status">Initializing microphone...</div>' +
                    '<div class="vr-actions">' +
                         '<button id="vr-calib-finish-btn" class="vr-calibration-btn" style="background-color: #2196F3; color: white; display:none;">Finish & Upload Calibration</button>' +
                         '<button id="vr-calib-cancel-btn" class="vr-calibration-btn" style="background-color: #9E9E9E; color: white;">Cancel Calibration</button>' +
                    '</div>' +
                '</div>' +
                // --- CRITICAL FIX: Refactored inline script to avoid template literals ---
                '<script>' +
                    '(function() {' +
                        'let isRecording = false;' +
                        'let currentPhase = null;' +
                        'const trueBtn = document.getElementById("vr-calib-true-btn");' +
                        'const falseBtn = document.getElementById("vr-calib-false-btn");' +
                        'const transcriptDiv = document.getElementById("vr-calib-transcript");' +
                        'const statusDiv = document.getElementById("vr-calib-status");' +
                        'const finishBtn = document.getElementById("vr-calib-finish-btn");' +
                        'const cancelBtn = document.getElementById("vr-calib-cancel-btn");' +

                        'function updateStatus(message) {' +
                            'if (statusDiv) statusDiv.textContent = message;' +
                        '}' +

                        // --- CRITICAL FIX: Used \\n for newline and string concatenation ---
                        'function updateTranscript(text) {' +
                            'if (transcriptDiv) transcriptDiv.textContent += "\\n" + text;' + // Correctly escaped newline
                        '}' +

                        'function sendMessage(action, data) {' +
                            'if (window.opener && !window.opener.closed) {' +
                                'window.opener.postMessage({ action: action, ...data }, "*");' +
                            '}' +
                        '}' +

                        'window.addEventListener("DOMContentLoaded", () => {' +
                             'sendMessage("windowReady");' +
                        '});' +

                        'window.addEventListener("message", (event) => {' +
                            'if (event.data && event.data.action) {' +
                                'switch (event.data.action) {' +
                                    'case "enableButtons":' +
                                        'if (trueBtn) trueBtn.disabled = false;' +
                                        'if (falseBtn) falseBtn.disabled = false;' +
                                        'updateStatus("Ready. Select True or False statements to record.");' +
                                        'break;' +
                                    'case "updateStatus":' +
                                        'updateStatus(event.data.status);' +
                                        'break;' +
                                    // --- CRITICAL FIX: Used string concatenation for dynamic message ---
                                    'case "sampleCaptured":' +
                                        'const sampleType = event.data.phase === "true_statements" ? "True" : "False";' +
                                        // String concatenation instead of template literal
                                        'updateTranscript("[" + sampleType + "] Sample " + (event.data.sampleIndex + 1) + " captured.");' +
                                        'updateStatus("Ready for next " + sampleType.toLowerCase() + " sample.");' +
                                        'break;' +
                                    'case "recordingStopped":' +
                                         'isRecording = false;' +
                                         'if (currentPhase === "true_statements" && trueBtn) {' +
                                             'trueBtn.innerHTML = \'<span class="vr-record-icon">&#127908;</span> True Statements\';' + // Microphone: &#127908;
                                             'trueBtn.classList.remove("recording");' +
                                         '} else if (currentPhase === "false_statements" && falseBtn) {' +
                                             'falseBtn.innerHTML = \'<span class="vr-record-icon">&#127908;</span> False Statements\';' + // Microphone: &#127908;
                                             'falseBtn.classList.remove("recording");' +
                                         '}' +
                                         'currentPhase = null;' +
                                         'break;' +
                                '}' +
                            '}' +
                        '});' +

                        'if (trueBtn) {' +
                            'trueBtn.addEventListener("click", () => {' +
                                'if (isRecording && currentPhase === "true_statements") {' +
                                    'sendMessage("stopRecording");' +
                                '} else if (!isRecording) {' +
                                    'sendMessage("startRecordingTrue");' +
                                    'currentPhase = "true_statements";' +
                                    // Stop button icon: Black Square for Termination: &#9724;
                                    'trueBtn.innerHTML = \'<span class="vr-record-icon">&#9724;</span> Stop Recording True\';' +
                                    'trueBtn.classList.add("recording");' +
                                    'isRecording = true;' +
                                '}' +
                            '});' +
                        '}' +

                        'if (falseBtn) {' +
                            'falseBtn.addEventListener("click", () => {' +
                                'if (isRecording && currentPhase === "false_statements") {' +
                                    'sendMessage("stopRecording");' +
                                '} else if (!isRecording) {' +
                                    'sendMessage("startRecordingFalse");' +
                                    'currentPhase = "false_statements";' +
                                    // Stop button icon: Black Square for Termination: &#9724;
                                    'falseBtn.innerHTML = \'<span class="vr-record-icon">&#9724;</span> Stop Recording False\';' +
                                    'falseBtn.classList.add("recording");' +
                                    'isRecording = true;' +
                                '}' +
                            '});' +
                        '}' +

                        'if (finishBtn) {' +
                            'finishBtn.addEventListener("click", () => {' +
                                'sendMessage("finishCalibration");' +
                            '});' +
                        '}' +

                        'if (cancelBtn) {' +
                            'cancelBtn.addEventListener("click", () => {' +
                                'sendMessage("cancelCalibration");' +
                            '});' +
                        '}' +

                        'window.addEventListener("beforeunload", () => {' +
                             'sendMessage("windowClosed");' +
                        '});' +
                    '})();' +
                '</script>' +
                // --- END CRITICAL FIXES ---
            '</body>' +
            '</html>'
        );
        calibrationWindow.document.close(); // Close the document stream

        // --- Important: Setup communication ---
        // Store reference to the window object in the main app
        this.state.calibrationWindowRef = calibrationWindow;

        // Listen for messages (already set up in main setupEventListeners)
        // The window's script handles its own button logic and communicates back
    }

    sendMessageToCalibrationWindow(message) {
         if (this.state.calibrationWindowRef && !this.state.calibrationWindowRef.closed) {
             this.state.calibrationWindowRef.postMessage(message, '*'); // Use specific origin in production
         }
     }

    // --- New methods to handle recording logic initiated from the window ---
    async startCalibrationRecording(phase) { // 'true_statements' or 'false_statements'
         if (this.state.isCalibrationRecording) {
             console.warn('Already recording for calibration.');
             // Inform window
             this.sendMessageToCalibrationWindow({ action: 'updateStatus', status: 'Already recording. Please stop first.' });
             return;
         }

         try {
             // Send message to window to update UI (e.g., disable buttons, show recording status)
             this.sendMessageToCalibrationWindow({ action: 'updateStatus', status: `Starting ${phase} recording...` });

             // Ensure audio context and media stream are available (they should be from initializeAudio)
             if (!this.state.mediaStream) {
                 // This shouldn't happen if initializeAudio was called, but try again
                 await this.initializeAudio();
                 if (!this.state.mediaStream) {
                     throw new Error('Microphone access failed.');
                 }
             }

             // Reset chunks for this recording segment
             this.state.calibrationAudioChunks = [];

             // Setup MediaRecorder for this segment
             this.state.calibrationMediaRecorder = new MediaRecorder(this.state.mediaStream);
             this.state.calibrationMediaRecorder.ondataavailable = (event) => {
                 if (event.data.size > 0) {
                     this.state.calibrationAudioChunks.push(event.data);
                 }
             };
             this.state.calibrationMediaRecorder.onstop = () => {
                 // Blob is created in stopCalibrationRecording logic
                 // Send message to window to update UI (e.g., enable buttons)
                 // This message is sent inside stopCalibrationRecording after blob is created
             };

             this.state.calibrationMediaRecorder.start();
             this.state.isCalibrationRecording = true;
             this.state.currentCalibrationRecordingPhase = phase; // Track which phase this recording is for

             this.sendMessageToCalibrationWindow({ action: 'updateStatus', status: `Recording ${phase}...` });
             console.log(`Started recording for ${phase}`);

         } catch (error) {
             console.error('Error starting calibration recording:', error);
             this.sendMessageToCalibrationWindow({ action: 'updateStatus', status: `Error: ${error.message}` });
             // Re-enable UI on error by simulating a stop
             this.sendMessageToCalibrationWindow({ action: 'recordingStopped' });
             this.state.isCalibrationRecording = false;
             this.state.calibrationMediaRecorder = null;
             this.state.currentCalibrationRecordingPhase = null;
         }
    }

    async stopCalibrationRecording() {
         if (!this.state.isCalibrationRecording || !this.state.calibrationMediaRecorder) {
             console.warn('No calibration recording to stop.');
             return;
         }

         try {
             this.state.calibrationMediaRecorder.stop();
             this.state.isCalibrationRecording = false;

             // Wait a bit for the 'onstop' event to fire and data to be available
             // A more robust way is to use a Promise within onstop
             await new Promise(resolve => setTimeout(resolve, 100));

             // Create blob
             const audioBlob = new Blob(this.state.calibrationAudioChunks, { type: 'audio/webm' });
             console.log(`Recording stopped for ${this.state.currentCalibrationRecordingPhase}. Blob size: ${audioBlob.size} bytes`);

             // Store the blob based on the phase
             if (this.state.currentCalibrationRecordingPhase === 'true_statements') {
                 this.state.trueSamples.push(audioBlob);
             } else if (this.state.currentCalibrationRecordingPhase === 'false_statements') {
                 this.state.falseSamples.push(audioBlob);
             }

             // Send message to window to update UI/transcript (if speech recognition was used)
             // For now, just indicate the sample was captured
             this.sendMessageToCalibrationWindow({
                 action: 'sampleCaptured',
                 phase: this.state.currentCalibrationRecordingPhase,
                 sampleIndex: this.state.currentCalibrationRecordingPhase === 'true_statements' ?
                              this.state.trueSamples.length - 1 :
                              this.state.falseSamples.length - 1
             });

             // Signal that recording has stopped (updates button UI)
             this.sendMessageToCalibrationWindow({ action: 'recordingStopped' });

             // Reset recorder reference
             this.state.calibrationMediaRecorder = null;
             this.state.currentCalibrationRecordingPhase = null;

             // Show finish button after first sample?
             if (this.state.trueSamples.length > 0 || this.state.falseSamples.length > 0) {
                 const finishBtn = this.state.calibrationWindowRef.document.getElementById('vr-calib-finish-btn');
                 if (finishBtn) {
                     finishBtn.style.display = 'inline-block';
                 }
             }

         } catch (error) {
             console.error('Error stopping calibration recording:', error);
             this.sendMessageToCalibrationWindow({ action: 'updateStatus', status: `Error stopping: ${error.message}` });
             // Signal stop anyway to prevent UI lock
             this.sendMessageToCalibrationWindow({ action: 'recordingStopped' });
         }
    }

    // --- Implement finish/cancel logic called from the window ---
    async finishCalibrationFromWindow() {
         // Basic validation
         if (this.state.trueSamples.length === 0 && this.state.falseSamples.length === 0) {
             this.sendMessageToCalibrationWindow({ action: 'updateStatus', status: 'Please record at least one sample.' });
             return;
         }

         // This can largely reuse the existing finishCalibration logic
         // But called from the window context
         console.log('Finishing calibration from window...');
         this.sendMessageToCalibrationWindow({ action: 'updateStatus', status: 'Uploading calibration data...' });
         try {
             // Prepare form data (same as before)
             const formData = new FormData();
             this.state.trueSamples.forEach((blob, index) => {
                 formData.append(`true_sample_${index}`, blob, `true_sample_${index}.webm`);
             });
             this.state.falseSamples.forEach((blob, index) => {
                 formData.append(`false_sample_${index}`, blob, `false_sample_${index}.webm`);
             });

             // Send to backend API endpoint (same as before)
             const response = await fetch(`${this.config.rest_url}process-calibration`, {
                 method: 'POST',
                 headers: {
                     'X-WP-Nonce': this.config.nonce
                 },
                 body: formData
             });

             if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
             }

             const data = await response.json();
             console.log('Calibration response:', data);

             if (data.success) {
                 this.state.isCalibrated = true;
                 this.state.isCalibrating = false;
                 localStorage.setItem('vr_calibrated', 'true');

                 // Close the calibration window
                 if (this.state.calibrationWindowRef && !this.state.calibrationWindowRef.closed) {
                     this.state.calibrationWindowRef.close();
                 }
                 this.state.calibrationWindowRef = null;

                 // Update main app UI
                 this.renderApp();
                 this.showNotification('Calibration complete! You can now use all features.', 'success');

                 if (data.user_data) {
                     this.config.is_pro = data.user_data.is_pro;
                     const planBadge = document.querySelector('.vr-plan-badge');
                     if (planBadge) {
                         planBadge.textContent = data.user_data.is_pro ? 'Pro' : 'Free';
                         planBadge.className = `vr-plan-badge ${data.user_data.is_pro ? 'pro' : 'free'}`;
                     }
                 }
             } else {
                 throw new Error(data.message || 'Calibration failed on server.');
             }
         } catch (error) {
             console.error('Calibration failed:', error);
             // Show error in main app notification
             this.showError(`Calibration failed: ${error.message}`);
             // Update status in calibration window
             this.sendMessageToCalibrationWindow({ action: 'updateStatus', status: `Error: ${error.message}` });
             // Keep window open on error?
         }
     }

     cancelCalibrationFromWindow() {
         console.log('Cancelling calibration from window...');
         this.state.isCalibrating = false;
         this.state.isCalibrationRecording = false;
         if (this.state.calibrationMediaRecorder && this.state.calibrationMediaRecorder.state !== 'inactive') {
             this.state.calibrationMediaRecorder.stop();
         }
         if (this.state.calibrationWindowRef && !this.state.calibrationWindowRef.closed) {
             this.state.calibrationWindowRef.close();
         }
         this.state.calibrationWindowRef = null;
         this.showNotification('Calibration cancelled.', 'info');
         // Optionally re-render main app if needed
     }

     handleCalibrationWindowClosed() {
         console.log('Calibration window was closed.');
         this.state.isCalibrating = false;
         this.state.isCalibrationRecording = false;
         if (this.state.calibrationMediaRecorder && this.state.calibrationMediaRecorder.state !== 'inactive') {
             this.state.calibrationMediaRecorder.stop();
         }
         this.state.calibrationWindowRef = null;
         // Optionally show a notification or update UI
         // Check if user is calibrated, if not, maybe prompt again?
         if (!this.state.isCalibrated) {
             this.showNotification('Calibration window closed. Calibration not completed.', 'info');
         }
     }

    // --- Modal-based calibration (keeping for potential fallback) ---
    // ... (existing modal methods like showCalibrationModal, loadCalibrationPrompt, etc.)
    // You can remove these if you are only using the window-based approach
    showCalibrationModal() { /* ... */ }
    loadCalibrationPrompt() { /* ... */ }
    switchCalibrationPhase() { /* ... */ }
    showFinishButton() { /* ... */ }
    async toggleCalibrationRecording() { /* ... */ } // For modal
    nextCalibrationPrompt() { /* ... */ } // For modal
    async finishCalibration() {
        // This is the modal-based finish. You can keep it or remove it.
        // For now, let's keep it but make it clear it's for the modal.
         if (this.state.trueSamples.length !== this.state.totalPromptsPerPhase ||
             this.state.falseSamples.length !== this.state.totalPromptsPerPhase) {
             this.showError('Calibration incomplete. Please record all statements.');
             return;
         }

         this.showNotification('Uploading calibration data...', 'info');
         try {
             // Prepare form data to send to backend
             const formData = new FormData();
             this.state.trueSamples.forEach((blob, index) => {
                 formData.append(`true_sample_${index}`, blob, `true_sample_${index}.webm`);
             });
             this.state.falseSamples.forEach((blob, index) => {
                 formData.append(`false_sample_${index}`, blob, `false_sample_${index}.webm`);
             });

             // Send to backend API endpoint
             const response = await fetch(`${this.config.rest_url}process-calibration`, {
                 method: 'POST',
                 headers: {
                     'X-WP-Nonce': this.config.nonce // Use the nonce for authentication
                 },
                 body: formData
             });

             if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status}`);
             }

             const data = await response.json();
             console.log('Calibration response (Modal):', data); // For debugging

             if (data.success) {
                 // Mark as calibrated
                 this.state.isCalibrated = true;
                 this.state.isCalibrating = false;
                 localStorage.setItem('vr_calibrated', 'true');

                 // Close modal
                 this.closeCalibrationModal();

                 // Update main app UI
                 this.renderApp(); // Re-render to remove calibration prompt section
                 this.showNotification('Calibration complete! You can now use all features.', 'success');

                 // Update config if backend sends back updated user status
                 if (data.user_data) {
                      this.config.is_pro = data.user_data.is_pro;
                      // Re-render header if needed
                      const planBadge = document.querySelector('.vr-plan-badge');
                      if (planBadge) {
                          planBadge.textContent = data.user_data.is_pro ? 'Pro' : 'Free';
                          planBadge.className = `vr-plan-badge ${data.user_data.is_pro ? 'pro' : 'free'}`;
                      }
                 }

             } else {
                 throw new Error(data.message || 'Calibration failed on server.');
             }
         } catch (error) {
             console.error('Calibration failed (Modal):', error);
             this.showError(`Calibration failed: ${error.message}`);
         }
    }
    cancelCalibration() {
         // Modal-based cancel
         this.state.isCalibrating = false;
         this.state.isCalibrationRecording = false;
         if (this.state.calibrationMediaRecorder && this.state.calibrationMediaRecorder.state !== 'inactive') {
             this.state.calibrationMediaRecorder.stop();
         }
         this.closeCalibrationModal();
         this.showNotification('Calibration cancelled.', 'info');
     }
     closeCalibrationModal() {
         const modalContainer = document.getElementById('vr-calibration-modal-container');
         if (modalContainer) {
             modalContainer.innerHTML = ''; // Clear the modal
         }
     }
    // --- End Modal-based calibration ---


    // --- Standard App Recording Methods ---
    async toggleRecording() {
        if (this.state.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    async startRecording() {
        if (!this.state.mediaRecorder || this.state.isRecording) return;

        try {
            this.state.audioChunks = [];
            this.state.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.state.audioChunks.push(event.data);
                }
            };
            this.state.mediaRecorder.onstop = async () => {
                this.state.recordingEndTime = Date.now();
                await this.processRecording();
            };

            this.state.mediaRecorder.start();
            this.state.isRecording = true;
            this.state.recordingStartTime = Date.now();
            this.updateRecordingUI(true);
            this.updateStatus('Recording...');
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.showError('Failed to start recording.');
        }
    }

    async stopRecording() {
        if (!this.state.isRecording) return;

        this.state.mediaRecorder.stop();
        this.state.isRecording = false;
        this.updateRecordingUI(false);
        this.updateStatus('Processing...');
    }

    updateRecordingUI(isRecording) {
        const recordBtn = document.getElementById('vr-record-btn');
        const recordIcon = recordBtn.querySelector('.vr-record-icon');

        if (isRecording) {
            recordBtn.classList.add('recording');
            // Stop button icon: Black Square for Termination: &#9724;
            if (recordIcon) recordIcon.textContent = '\u25A0'; // HTML entity: &#9724; -> \u25A0
        } else {
            recordBtn.classList.remove('recording');
            // Microphone icon: &#127908;
            if (recordIcon) recordIcon.textContent = '\uD83C\uDFA4'; // HTML entity: &#127908; -> \uD83C\uDFA4
        }
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
        // In a real implementation, this would involve complex audio analysis
        // comparing features to the user's calibration profile.

        // Simulate analysis delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate mock VRI score and confidence
        const score = Math.floor(Math.random() * 41) + 30; // Random score between 30-70
        const confidence = Math.floor(Math.random() * 21) + 70; // Random confidence between 70-90
        const quality = Math.floor(Math.random() * 31) + 60; // Random quality between 60-90

        return {
            score: score,
            confidence: confidence,
            quality: quality,
            features: JSON.stringify({ /* Mock features */ rms: 0.5, zcr: 0.1 })
        };
    }

    async saveSegment(segmentData) {
        if (!this.config.is_logged_in) {
            console.warn('User not logged in, cannot save segment.');
            return;
        }

        try {
            const response = await fetch(`${this.config.rest_url}segments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': this.config.nonce
                },
                body: JSON.stringify(segmentData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Segment saved:', data);
            return data;
        } catch (error) {
            console.error('Failed to save segment:', error);
            throw error;
        }
    }

    displayVRIResults(vri) {
        const scoreElement = document.querySelector('.vr-vri-score .vri-score-placeholder');
        const confidenceElement = document.querySelector('.vr-vri-confidence .vri-confidence-placeholder');

        if (scoreElement) {
            scoreElement.textContent = vri.score;
            scoreElement.classList.remove('vri-score-placeholder');
        }
        if (confidenceElement) {
            confidenceElement.textContent = `${vri.confidence}%`;
            confidenceElement.classList.remove('vri-confidence-placeholder');
        }
    }

    // Placeholder methods (to be implemented)
    async saveCalibrationProfile() {
        // This is now handled by finishCalibration calling the backend API
        // Keeping it to avoid breaking existing calls, but it's a no-op now.
        console.log('saveCalibrationProfile is now handled by the new calibration flow.');
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
                            <p class="vr-price">$29/month</p>
                            <ul>
                                <li>Advanced VRI analysis</li>
                                <li>Session history</li>
                                <li>Personalized insights</li>
                            </ul>
                            <button class="vr-btn vr-btn-primary" data-plan="client_pro" data-interval="monthly">Select Plan</button>
                             <button class="vr-btn vr-btn-primary" data-plan="client_pro" data-interval="annual" style="margin-top: 10px;">$290/year (Save $58)</button>
                             <button class="vr-btn vr-btn-primary" data-plan="client_pro" data-interval="lifetime" style="margin-top: 10px;">$429 One-time</button>
                        </div>
                        <div class="vr-pricing-card">
                            <h3>Practitioner Pro</h3>
                            <p class="vr-price">$79/month</p>
                            <ul>
                                <li>All Client Pro features</li>
                                <li>Client management</li>
                                <li>Session notes</li>
                                <li>Export reports</li>
                            </ul>
                            <button class="vr-btn vr-btn-primary" data-plan="practitioner_pro" data-interval="monthly">Select Plan</button>
                             <button class="vr-btn vr-btn-primary" data-plan="practitioner_pro" data-interval="annual" style="margin-top: 10px;">$790/year (Save $158)</button>
                             <button class="vr-btn vr-btn-primary" data-plan="practitioner_pro" data-interval="lifetime" style="margin-top: 10px;">$1179 One-time</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners to modal
        modal.addEventListener('click', (e) => {
            if (e.target.matches('.vr-modal-close') || e.target === modal) {
                modal.remove();
            }
            if (e.target.matches('[data-plan]')) {
                const planType = e.target.dataset.plan;
                const interval = e.target.dataset.interval;
                this.initiateUpgrade(planType, interval);
            }
        });

        document.body.appendChild(modal);
    }

    async initiateUpgrade(planType, interval) {
        // Close the modal
        const modal = document.querySelector('.vr-modal');
        if (modal) modal.remove();

        try {
             // Map plan and interval to Stripe Price ID
             const priceId = this.getPriceId(planType, interval);
             if (!priceId) {
                 this.showError('Invalid plan selected.');
                 return;
             }

            // Call backend API to create Stripe checkout session
            const response = await fetch(`${this.config.rest_url}create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': this.config.nonce
                },
                body: JSON.stringify({ price_id: priceId, plan_type: planType, interval: interval })
            });

            const data = await response.json();

            if (data.success && data.redirect_url) {
                // Redirect to Stripe Checkout
                window.location.href = data.redirect_url;
            } else {
                throw new Error(data.message || 'Failed to initiate checkout.');
            }
        } catch (error) {
            console.error('Failed to initiate upgrade:', error);
            this.showError('Failed to initiate upgrade. Please try again.');
        }
    }

     getPriceId(planType, interval) {
         // Use the constants defined in PHP config
         // These would ideally be passed via wp_localize_script or fetched from an endpoint
         // For now, we'll use a mapping based on the constants you provided
         const priceMap = {
             'client_pro_monthly': 'price_1RteSGRxqwYCmzONdoik9bfd', // $29/mo
             'client_pro_annual': 'price_1RtemWRxqwYCmzONxFLKehqZ',  // $290/yr
             'client_pro_lifetime': 'price_1RtemWRxqwYCmzONX1xjQbf9', // $429 one-time
             'practitioner_pro_monthly': 'price_1RtesSRxqwYCmzON0M1eNLU7', // $79/mo
             'practitioner_pro_annual': 'price_1Rtev8RxqwYCmzON81SFn10x',  // $790/yr
             'practitioner_pro_lifetime': 'price_1Rtev8RxqwYCmzON26at3cVM'  // $1179 one-time
         };
         return priceMap[`${planType}_${interval}`] || null;
     }

}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.VRAppInstance = new VoiceResonanceApp(); // Make instance globally accessible if needed
    });
} else {
    window.VRAppInstance = new VoiceResonanceApp();
}