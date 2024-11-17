class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioManager = new AudioManager();
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.balls = [];
        this.rectangles = [];
        this.isPaused = false;
        this.currentBallIndex = 0;
        this.spawnInterval = 20;
        this.frameCount = 0;
        this.hasStarted = false;
        this.draggedRectangle = null;
        
        this.initializeObjects();
        this.setupControls();
        this.setupEventListeners();
        this.showStartPrompt();
    }

    setupControls() {
        // Volume control
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.getElementById('volumeValue');
        volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            this.audioManager.updateVolume(value);
            volumeValue.textContent = `${e.target.value}%`;
        });

        // Bounce control
        const bounceSlider = document.getElementById('bounceSlider');
        const bounceValue = document.getElementById('bounceValue');
        bounceSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            this.balls.forEach(ball => ball.setBounceFactor(value));
            bounceValue.textContent = `${value}%`;
        });

        // Speed control
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        speedSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.spawnInterval = 55 - value;
            speedValue.textContent = value;
        });

        // Knob controls
        this.setupKnob('harmonicKnob', value => this.audioManager.updateHarmonic(value));
        this.setupKnob('detuneKnob', value => this.audioManager.updateDetune(value));
        this.setupKnob('attackKnob', value => this.audioManager.updateAttack(value));
    }

    setupKnob(id, callback) {
        const knob = document.getElementById(id);
        let isDragging = false;
        let startY;
        let startValue;

        const updateKnob = (value) => {
            const normalizedValue = Math.max(0, Math.min(100, value)) / 100;
            knob.style.transform = `rotate(${normalizedValue * 270 - 135}deg)`;
            knob.dataset.value = Math.round(normalizedValue * 100);
            callback(normalizedValue);
        };

        knob.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startValue = parseInt(knob.dataset.value);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaY = startY - e.clientY;
            const deltaValue = deltaY * 0.5;
            const newValue = startValue + deltaValue;
            
            updateKnob(newValue);
            e.preventDefault();
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        updateKnob(parseInt(knob.dataset.value));
    }

    getCanvasMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleCanvasMouseDown(e) {
        if (!this.hasStarted) {
            this.start();
            return;
        }

        const pos = this.getCanvasMousePosition(e);
        
        // Check for rectangle interaction
        this.rectangles.forEach(rectangle => {
            if (rectangle.containsPoint(pos.x, pos.y)) {
                if (e.ctrlKey || e.metaKey) {
                    // Toggle enable/disable with Ctrl/Cmd + click
                    rectangle.toggle();
                } else {
                    // Start dragging
                    this.draggedRectangle = rectangle;
                    rectangle.startDrag(pos.y);
                }
            }
        });
    }

    handleCanvasMouseMove(e) {
        if (this.draggedRectangle) {
            const pos = this.getCanvasMousePosition(e);
            const shouldPlayNote = this.draggedRectangle.updateDrag(pos.y);
            
            if (shouldPlayNote && this.draggedRectangle.enabled) {
                // Get frequency based on height
                const heightPercent = this.draggedRectangle.getHeightPercent();
                const frequency = this.audioManager.getNoteFromHeight(
                    this.draggedRectangle.index,
                    heightPercent
                );
                this.audioManager.playNote(this.draggedRectangle.index, frequency);
            }
        }
    }

    handleCanvasMouseUp() {
        if (this.draggedRectangle) {
            this.draggedRectangle.stopDrag();
            this.draggedRectangle = null;
        }
    }

    showStartPrompt() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Polyphonic Physics', this.width / 2, this.height / 2 - 40);
        
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Click anywhere or press any key to start', this.width / 2, this.height / 2);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Space: Pause    R: Restart', this.width / 2, this.height / 2 + 40);
        this.ctx.fillText('Drag blocks up/down to change pitch', this.width / 2, this.height / 2 + 70);
        this.ctx.fillText('Ctrl+Click blocks to toggle sound', this.width / 2, this.height / 2 + 90);
    }

    start() {
        if (!this.hasStarted) {
            this.hasStarted = true;
            this.audioManager.initialize();
            this.gameLoop();
        }
    }

    initializeObjects() {
        // Create balls
        const ballSpacing = this.width / 32;
        for (let i = 0; i < 32; i++) {
            this.balls.push(new Ball(ballSpacing * (i + 0.5), -10));
            this.balls[i].active = false;
        }

        // Create rectangles
        const rectWidth = this.width / 32;
        const rectHeight = 60;
        const rectY = this.height - rectHeight - 20;
        
        for (let i = 0; i < 32; i++) {
            this.rectangles.push(new Rectangle(
                rectWidth * i,
                rectY,
                rectWidth,
                rectHeight,
                i
            ));
        }
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (!this.hasStarted) {
                this.start();
                return;
            }

            if (e.code === 'Space') {
                this.isPaused = !this.isPaused;
            } else if (e.code === 'KeyR') {
                this.reset();
            }
        });

        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleCanvasMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleCanvasMouseUp());
    }

    reset() {
        this.balls.forEach(ball => {
            ball.active = false;
            ball.reset(-10);
        });
        this.currentBallIndex = 0;
        this.frameCount = 0;
        this.isPaused = false;
    }

    update() {
        if (this.isPaused) return;

        this.frameCount++;
        
        if (this.frameCount % this.spawnInterval === 0) {
            this.balls[this.currentBallIndex].reset(-10);
            this.balls[this.currentBallIndex].active = true;
            this.currentBallIndex = (this.currentBallIndex + 1) % this.balls.length;
        }

        this.balls.forEach(ball => {
            const collision = ball.update(this.rectangles);
            if (collision) {
                const hitRect = this.rectangles.find(rect => 
                    ball.y + ball.radius >= rect.getCurrentY() &&
                    ball.y - ball.radius <= rect.getCurrentY() + rect.height &&
                    ball.x >= rect.x &&
                    ball.x <= rect.x + rect.width &&
                    rect.enabled
                );
                if (hitRect) {
                    const frequency = this.audioManager.getNoteFromHeight(
                        hitRect.index,
                        hitRect.getHeightPercent()
                    );
                    this.audioManager.playNote(hitRect.index, frequency);
                }
            }
        });
        this.rectangles.forEach(rect => rect.update());
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.width / 2, 30);
        }
        
        this.rectangles.forEach(rect => rect.draw(this.ctx));
        this.balls.forEach(ball => ball.draw(this.ctx));
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('load', () => {
    new Game();
});
