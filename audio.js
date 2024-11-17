class AudioManager {
    constructor() {
        this.audioContext = null;
        this.notes = [];
        this.pentatonicNotes = [];
        this.isInitialized = false;
        this.masterGain = null;
        
        // Sound parameters
        this.volume = 0.5;
        this.harmonicAmount = 0.5;
        this.detuneAmount = 0.5;
        this.attackAmount = 0.5;
    }

    initialize() {
        if (this.isInitialized) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.generateAllNotes();
        
        // Create master gain
        this.masterGain = this.audioContext.createGain();
        this.updateVolume(this.volume);
        this.masterGain.connect(this.audioContext.destination);
        
        this.isInitialized = true;
    }

    generateAllNotes() {
        this.notes = [];
        this.pentatonicNotes = [];
        const baseFrequency = 261.63; // Middle C

        // Generate chromatic scale notes
        for (let i = 0; i < 32; i++) {
            const octave = Math.floor(i / 8);
            const noteInOctave = i % 8;
            const frequency = baseFrequency * Math.pow(2, octave + noteInOctave / 8);
            this.notes.push(frequency);
        }

        // Generate pentatonic scale notes (C, D, E, G, A pattern)
        const pentatonicSteps = [0, 2, 4, 7, 9]; // Semitones in a major pentatonic scale
        for (let octave = 0; octave < 4; octave++) {
            pentatonicSteps.forEach(step => {
                const frequency = baseFrequency * Math.pow(2, octave + step / 12);
                this.pentatonicNotes.push(frequency);
            });
        }
    }

    getNoteFromHeight(baseIndex, heightPercent) {
        // Convert height percentage to pentatonic note index
        const maxNoteShift = 4; // Maximum number of note shifts up
        const noteShift = Math.floor(heightPercent * maxNoteShift);
        
        // Get base pentatonic position
        const basePentatonicIndex = Math.floor(baseIndex / 32 * this.pentatonicNotes.length);
        
        // Calculate new index with shift
        const newIndex = Math.min(
            Math.max(0, basePentatonicIndex + noteShift),
            this.pentatonicNotes.length - 1
        );
        
        return this.pentatonicNotes[newIndex];
    }

    updateVolume(value) {
        this.volume = value;
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume * 0.3;
        }
    }

    updateHarmonic(value) {
        this.harmonicAmount = value;
    }

    updateDetune(value) {
        this.detuneAmount = value;
    }

    updateAttack(value) {
        this.attackAmount = value;
    }

    playNote(index, frequency = null) {
        if (!this.isInitialized) {
            this.initialize();
            return;
        }

        const noteFreq = frequency || this.notes[index];

        const oscillators = [];
        const gainNodes = [];
        
        // Main tone
        const osc1 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(noteFreq, this.audioContext.currentTime);
        gain1.gain.setValueAtTime(0.25, this.audioContext.currentTime);
        oscillators.push(osc1);
        gainNodes.push(gain1);
        
        // Harmonic oscillator
        const harmonicFreq = noteFreq * (2 + this.harmonicAmount * 2);
        const osc2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(harmonicFreq, this.audioContext.currentTime);
        gain2.gain.setValueAtTime(0.15 * this.harmonicAmount, this.audioContext.currentTime);
        oscillators.push(osc2);
        gainNodes.push(gain2);

        // Detuned oscillator
        const detuneAmount = 1 + (this.detuneAmount - 0.5) * 0.02;
        const osc3 = this.audioContext.createOscillator();
        const gain3 = this.audioContext.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(noteFreq * detuneAmount, this.audioContext.currentTime);
        gain3.gain.setValueAtTime(0.15 * this.detuneAmount, this.audioContext.currentTime);
        oscillators.push(osc3);
        gainNodes.push(gain3);

        const attackTime = 0.001 + (this.attackAmount * 0.099);

        oscillators.forEach((osc, i) => {
            const gainNode = gainNodes[i];
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(
                gainNode.gain.value,
                this.audioContext.currentTime + attackTime
            );
            
            gainNode.gain.exponentialRampToValueAtTime(
                0.001,
                this.audioContext.currentTime + 0.2 + attackTime
            );
            
            osc.connect(gainNode);
            gainNode.connect(this.masterGain);
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.2 + attackTime);
        });
    }
}
