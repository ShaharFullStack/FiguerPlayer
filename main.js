// Create an audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Variable to store the selected waveform
let selectedWaveform = 'sine';

// Create a convolver node for reverb
const convolver = audioContext.createConvolver();

// Create a delay node
const delayNode = audioContext.createDelay();
delayNode.delayTime.value = 0; // Start with no delay

// Gain node for wet/dry mix of reverb
const reverbGainNode = audioContext.createGain();
reverbGainNode.gain.value = 0;

// Gain node for overall volume control
const masterGainNode = audioContext.createGain();
masterGainNode.gain.value = 0.5; // Default volume

// Load a simple reverb impulse response (could be a short noise burst)
fetch('impulse-response.wav')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.arrayBuffer();
    })
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
    .then(audioBuffer => {
        convolver.buffer = audioBuffer;
    })
    .catch(error => {
        console.error('Error loading or decoding impulse response:', error);
    });

let activeOscillator = null;
const activeKeys = new Set();

// Function to create and start an oscillator with the selected waveform
function startTone(frequency, element) {
    // Ensure frequency is finite
    if (!isFinite(frequency)) {
        console.error('Invalid frequency:', frequency);
        return;
    }

    // Create an oscillator node
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = selectedWaveform; // Use the selected waveform

    // Create a gain node to control the volume
    const gainNode = audioContext.createGain();

    // Apply an envelope to the gain (volume)
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.7, now + 0.01); // Attack
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.1); // Decay
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.2); // Sustain

    // Connect the oscillator to the gain node
    oscillator.connect(gainNode);

    // Connect the gain node to both the convolver (reverb) and the delay node
    gainNode.connect(convolver);
    gainNode.connect(delayNode);
    convolver.connect(reverbGainNode);
    reverbGainNode.connect(masterGainNode);
    delayNode.connect(masterGainNode);
    masterGainNode.connect(audioContext.destination);

    // Start the oscillator
    oscillator.start();

    // Store the active oscillator so it can be stopped later
    activeOscillator = oscillator;

    // Add visual feedback
    if (element) {
        element.classList.add('active');
    }
    // Force stop the oscillator after 1 second
    setTimeout(() => stopTone(note, element), 1000);

}

// Function to stop the currently active oscillator
function stopTone(element) {
    if (activeOscillator) {
        activeOscillator.stop();
        activeOscillator.disconnect();
        activeOscillator = null;
    }

    // Remove visual feedback
    if (element) {
        element.classList.remove('active');
    }
}

// Map note names to their corresponding frequencies
const noteFrequencies = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13, 'E': 329.63,
    'F': 349.23, 'F#': 369.99, 'G': 392.00, 'G#': 415.30, 'A': 440.00,
    'A#': 466.16, 'B': 493.88, 'C2': 523.25, 'C#2': 554.37, 'D2': 587.33,
    'D#2': 622.25, 'E2': 659.25, 'F2': 698.46, 'F#2': 739.99, 'G2': 783.99,
    'G#2': 830.61, 'A2': 880.00, 'A#2': 932.33, 'B2': 987.77, 'C3': 1046.50,
    'C#3': 1108.73, 'D3': 1174.66, 'D#3': 1244.51, 'E3': 1318.51, 'F3': 1396.91,
    'F#3': 1479.98, 'G3': 1567.98, 'G#3': 1661.22, 'A3': 1760.00, 'A#3': 1864.66,
    'B3': 1975.53, 'C4': 2093.00
};

// Function to setup event listeners
function setupEventListeners() {
    document.querySelectorAll('.waveform').forEach(button => {
        button.addEventListener('click', () => {
            selectedWaveform = button.getAttribute('data-wave');
        });
    });

    document.querySelectorAll('.key').forEach(button => {
        const note = button.getAttribute('data-note');
        const frequency = noteFrequencies[note];

        button.addEventListener('mousedown', () => startTone(frequency, button));
        button.addEventListener('mouseup', () => stopTone(button));
        button.addEventListener('mouseleave', () => stopTone(button));
        button.addEventListener('touchstart', (event) => {
            event.preventDefault();
            startTone(frequency, button);
        });
        button.addEventListener('touchend', (event) => {
            event.preventDefault();
            stopTone(button);
        });
        button.addEventListener('touchcancel', (event) => {
            event.preventDefault();
            stopTone(button);
        });
    });

    document.getElementById('reverb').addEventListener('input', event => {
        reverbGainNode.gain.value = event.target.value;
    });

    document.getElementById('delay').addEventListener('input', event => {
        delayNode.delayTime.value = event.target.value;
    });

    document.getElementById('volume').addEventListener('input', event => {
        masterGainNode.gain.value = event.target.value;
    });
}

// Function to show or hide the rotate message based on orientation
function checkOrientation() {
    const rotateMessage = document.querySelector('.rotate-device-message');
    const content = document.getElementById('content');
    if (window.innerWidth < window.innerHeight) {
        rotateMessage.style.display = 'flex';
        content.style.display = 'none';
    } else {
        rotateMessage.style.display = 'none';
        content.style.display = 'block';
    }
}

// Keyboard controls for accessibility
function setupKeyboardControls() {
    const keyMap = {
        'e': 'C', '4': 'C#', 'r': 'D', '5': 'D#', 't': 'E', 'y': 'F', '7': 'F#',
        'u': 'G', '8': 'G#', 'i': 'A', '9': 'A#', 'o': 'B',
        'x': 'C2', 'd': 'C#2',
        'c': 'D2', 'f': 'D#2', 'v': 'E2', 'b': 'F2', 'g': 'F#2', 'b': 'G2', 'h': 'G#2', 'n': 'A2', 'j': 'A#2', 'm': 'B2',
        'm': 'C3', 'j': 'C#3', 'k': 'D3', 'i': 'D#3', 'o': 'E3', '0': 'F3', ',': 'F#3',
        '.': 'G3', 'l': 'G#3', ';': 'A3', 'p': 'A#3', '[': 'B3'
    };

    document.addEventListener('keydown', (event) => {
        const note = keyMap[event.key];
        if (note && !activeKeys.has(note)) {
            const frequency = noteFrequencies[note];
            const keyElement = document.querySelector(`.key[data-note="${note}"]`);
            startTone(frequency, keyElement);
            activeKeys.add(note);
        }
    });

    document.addEventListener('keyup', (event) => {
        const note = keyMap[event.key];
        if (note) {
            const keyElement = document.querySelector(`.key[data-note="${note}"]`);
            stopTone(keyElement);
            activeKeys.delete(note);
        }
    });
}

// Initial setup
setupEventListeners();
setupKeyboardControls();
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
window.addEventListener('load', checkOrientation);
