class StarField {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.layers = [];
        this.nebulae = [];
        this.init();
    }

    init() {
        // 3 layers of stars with different parallax
        for (let layer = 0; layer < 3; layer++) {
            const stars = [];
            const count = 80 + layer * 40;
            for (let i = 0; i < count; i++) {
                stars.push({
                    x: Math.random() * this.width * 3 - this.width,
                    y: Math.random() * this.height * 3 - this.height,
                    size: 0.5 + Math.random() * (1.5 - layer * 0.3),
                    brightness: 0.3 + Math.random() * 0.7,
                    twinkle: Math.random() * Math.PI * 2,
                    twinkleSpeed: 0.01 + Math.random() * 0.03,
                    color: this.randomStarColor(),
                });
            }
            this.layers.push({ stars, parallax: 0.1 + layer * 0.15 });
        }

        // Nebulae
        for (let i = 0; i < 5; i++) {
            this.nebulae.push({
                x: Math.random() * this.width * 3 - this.width,
                y: Math.random() * this.height * 3 - this.height,
                radius: 100 + Math.random() * 200,
                color: this.randomNebulaColor(),
                alpha: 0.03 + Math.random() * 0.05,
                parallax: 0.05,
            });
        }
    }

    randomStarColor() {
        const colors = [
            { r: 255, g: 255, b: 255 },
            { r: 200, g: 220, b: 255 },
            { r: 255, g: 220, b: 180 },
            { r: 180, g: 200, b: 255 },
            { r: 255, g: 200, b: 200 },
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    randomNebulaColor() {
        const colors = [
            { r: 123, g: 47, b: 247 },
            { r: 0, g: 100, b: 200 },
            { r: 200, g: 50, b: 100 },
            { r: 0, g: 150, b: 150 },
            { r: 100, g: 0, b: 200 },
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    draw(ctx, cameraX, cameraY, time) {
        // Draw nebulae
        this.nebulae.forEach(neb => {
            const px = neb.x - cameraX * neb.parallax;
            const py = neb.y - cameraY * neb.parallax;
            
            const gradient = ctx.createRadialGradient(px, py, 0, px, py, neb.radius);
            gradient.addColorStop(0, `rgba(${neb.color.r}, ${neb.color.g}, ${neb.color.b}, ${neb.alpha})`);
            gradient.addColorStop(0.5, `rgba(${neb.color.r}, ${neb.color.g}, ${neb.color.b}, ${neb.alpha * 0.5})`);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(px - neb.radius, py - neb.radius, neb.radius * 2, neb.radius * 2);
        });

        // Draw star layers
        this.layers.forEach(layer => {
            layer.stars.forEach(star => {
                const px = star.x - cameraX * layer.parallax;
                const py = star.y - cameraY * layer.parallax;

                // Wrap around
                const screenX = ((px % this.width) + this.width) % this.width;
                const screenY = ((py % this.height) + this.height) % this.height;

                star.twinkle += star.twinkleSpeed;
                const twinkle = 0.5 + Math.sin(star.twinkle) * 0.5;
                const alpha = star.brightness * twinkle;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `rgb(${star.color.r}, ${star.color.g}, ${star.color.b})`;
                ctx.shadowColor = `rgb(${star.color.r}, ${star.color.g}, ${star.color.b})`;
                ctx.shadowBlur = star.size * 4;
                
                ctx.beginPath();
                ctx.arc(screenX, screenY, star.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        });
    }
}

class GridBackground {
    constructor() {
        this.gridSize = 80;
        this.alpha = 0.06;
    }

    draw(ctx, cameraX, cameraY, width, height) {
        ctx.strokeStyle = `rgba(123, 47, 247, ${this.alpha})`;
        ctx.lineWidth = 0.5;

        const offsetX = -cameraX % this.gridSize;
        const offsetY = -cameraY % this.gridSize;

        ctx.beginPath();
        for (let x = offsetX; x < width; x += this.gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = offsetY; y < height; y += this.gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
    }
}