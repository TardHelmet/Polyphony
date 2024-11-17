class Ball {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.velocity = 0;
        this.acceleration = 0.2;
        this.active = true;
        this.brightness = 0;
        this.bounceFactor = 0.5;
    }

    update(rectangles) {
        if (!this.active) return;
        
        this.velocity += this.acceleration;
        this.y += this.velocity;
        
        // Check for collisions with rectangles
        for (let rect of rectangles) {
            if (this.y + this.radius >= rect.getCurrentY() &&
                this.y - this.radius <= rect.getCurrentY() + rect.height &&
                this.x >= rect.x &&
                this.x <= rect.x + rect.width) {
                
                if (this.velocity > 0) {
                    // Bounce
                    this.y = rect.getCurrentY() - this.radius;
                    this.velocity = -this.velocity * this.bounceFactor;
                    
                    // If velocity is very low, stop bouncing
                    if (Math.abs(this.velocity) < 0.5) {
                        this.active = false;
                    }
                    
                    if (rect.enabled) {
                        rect.brightness = 1;
                        return true;
                    }
                    return false;
                }
            }
        }
        
        if (this.brightness > 0) {
            this.brightness -= 0.1;
        }
        
        return false;
    }

    reset(y) {
        this.y = y;
        this.velocity = 0;
        this.active = true;
        this.brightness = 0;
    }

    setBounceFactor(factor) {
        this.bounceFactor = Math.min(factor / 100 * 0.95, 0.95);
    }

    draw(ctx) {
        if (!this.active) return;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        const velocityBrightness = Math.min(Math.abs(this.velocity) / 10, 1);
        const alpha = Math.min(1, 0.6 + this.brightness + velocityBrightness);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        
        if (this.brightness > 0 || velocityBrightness > 0.1) {
            ctx.shadowBlur = (this.brightness + velocityBrightness) * 15;
            ctx.shadowColor = 'white';
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.closePath();
    }
}

class Rectangle {
    constructor(x, y, width, height, index) {
        this.x = x;
        this.baseY = y; // Original Y position
        this.y = y;     // Current Y position
        this.width = width;
        this.height = height;
        this.index = index;
        this.brightness = 0;
        this.baseColor = this.calculateBaseColor(index);
        this.enabled = true;
        this.isDragging = false;
        this.dragOffset = 0;
        this.maxDragUp = 100; // Maximum pixels to drag up
        this.lastPlayedHeight = 0; // Track last height where note was played
        this.noteThreshold = 20; // Pixels to move before triggering new note
    }

    calculateBaseColor(index) {
        const hue = (index / 32) * 360;
        return `hsl(${hue}, 70%, 50%)`;
    }

    getCurrentY() {
        return this.y;
    }

    getHeightPercent() {
        return Math.max(0, (this.baseY - this.y) / this.maxDragUp);
    }

    startDrag(mouseY) {
        this.isDragging = true;
        this.dragOffset = mouseY - this.y;
    }

    updateDrag(mouseY) {
        if (!this.isDragging) return false;

        const newY = mouseY - this.dragOffset;
        const constrainedY = Math.min(this.baseY, Math.max(this.baseY - this.maxDragUp, newY));
        
        // Check if we've moved enough to trigger a new note
        const currentHeight = this.baseY - constrainedY;
        const lastHeight = this.baseY - this.y;
        
        if (Math.abs(currentHeight - this.lastPlayedHeight) >= this.noteThreshold) {
            this.lastPlayedHeight = currentHeight;
            this.y = constrainedY;
            return true; // Indicate note should be played
        }
        
        this.y = constrainedY;
        return false;
    }

    stopDrag() {
        this.isDragging = false;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width - 1, this.height);
        
        if (this.enabled) {
            const alpha = Math.min(1, 0.4 + this.brightness);
            
            if (this.brightness > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.shadowBlur = this.brightness * 15;
                ctx.shadowColor = 'white';
            } else {
                // Modify color based on height
                const heightPercent = this.getHeightPercent();
                const lightness = 50 + (heightPercent * 20); // Increase lightness as it goes up
                ctx.fillStyle = `hsl(${this.baseColor.match(/\d+/)[0]}, 70%, ${lightness}%)`;
                ctx.shadowBlur = 0;
            }
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.closePath();

        // Add border
        ctx.strokeStyle = this.enabled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        // Draw height indicator
        if (this.getHeightPercent() > 0) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.baseY);
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
            ctx.stroke();
        }
    }

    update() {
        if (this.brightness > 0) {
            this.brightness -= 0.1;
        }
    }

    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    toggle() {
        this.enabled = !this.enabled;
    }
}
