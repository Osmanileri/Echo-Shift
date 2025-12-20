/**
 * Spirit Renderer - Spirit of the Resonance
 * Renders Pokemon silhouettes inside orbs with elemental aura effects
 * Maintains minimalist cyber aesthetic while adding character depth
 */

import { TYPE_COLORS } from '../api/pokeApi';

/**
 * Render a spirit orb with Pokemon silhouette inside
 * Uses compositing to create "trapped energy" effect
 */
export const renderSpiritOrb = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    image: HTMLImageElement | null,
    orbColor: string,
    pokemonType: string,
    time: number = Date.now()
): void => {
    ctx.save();

    // 1. Draw the base orb
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = orbColor;
    ctx.fill();
    ctx.closePath();

    // 2. Draw Pokemon silhouette inside (if image loaded)
    if (image && image.complete && image.naturalWidth > 0) {
        // Create temporary canvas for silhouette masking
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
            const size = radius * 2.2;
            tempCanvas.width = size;
            tempCanvas.height = size;

            // Draw the sprite
            tempCtx.drawImage(image, 0, 0, size, size);

            // Get image data and convert to silhouette
            const imageData = tempCtx.getImageData(0, 0, size, size);
            const data = imageData.data;

            // Determine silhouette color based on orb color (polarity system)
            const isWhiteOrb = orbColor === '#FFFFFF' || orbColor === 'white';
            const silhouetteColor = isWhiteOrb ? [0, 0, 0] : [255, 255, 255];

            // Convert to silhouette
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha > 50) {
                    data[i] = silhouetteColor[0];
                    data[i + 1] = silhouetteColor[1];
                    data[i + 2] = silhouetteColor[2];
                    // Reduce opacity for ghostly effect
                    data[i + 3] = Math.min(alpha, 180);
                }
            }

            tempCtx.putImageData(imageData, 0, 0);

            // Apply breathing animation
            const breathScale = 1 + Math.sin(time / 500) * 0.05;
            const drawSize = size * breathScale;
            const offset = (drawSize - size) / 2;

            // Clip to orb shape
            ctx.beginPath();
            ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
            ctx.clip();

            // Draw silhouette centered in orb
            ctx.globalAlpha = 0.7;
            ctx.drawImage(
                tempCanvas,
                x - radius * 1.1 - offset / 2,
                y - radius * 1.1 - offset / 2,
                drawSize,
                drawSize
            );
            ctx.globalAlpha = 1;
        }
    }

    ctx.restore();

    // 3. Draw elemental aura glow
    const glowColor = TYPE_COLORS[pokemonType] || '#FFFFFF';
    const pulseIntensity = 15 + Math.sin(time / 300) * 5;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = pulseIntensity;
    ctx.stroke();
    ctx.restore();
};

/**
 * Render elemental particles around the orb
 * Called each frame for active spirit characters
 */
export const renderElementalParticles = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    pokemonType: string,
    time: number = Date.now()
): void => {
    const color = TYPE_COLORS[pokemonType] || '#FFFFFF';

    ctx.save();

    switch (pokemonType) {
        case 'fire':
            // Ember particles rising
            for (let i = 0; i < 3; i++) {
                const angle = (time / 500 + i * 2) % (Math.PI * 2);
                const dist = radius + 5 + Math.sin(time / 200 + i) * 5;
                const px = x + Math.cos(angle) * dist;
                const py = y + Math.sin(angle) * dist - Math.sin(time / 300 + i) * 10;

                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fillStyle = i % 2 === 0 ? '#FF4500' : '#FFD700';
                ctx.globalAlpha = 0.6 + Math.sin(time / 100 + i) * 0.3;
                ctx.fill();
            }
            break;

        case 'electric':
            // Lightning arcs
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5 + Math.random() * 0.3;

            if (Math.random() > 0.7) {
                const startAngle = Math.random() * Math.PI * 2;
                const sx = x + Math.cos(startAngle) * radius;
                const sy = y + Math.sin(startAngle) * radius;
                const ex = sx + (Math.random() - 0.5) * 20;
                const ey = sy + (Math.random() - 0.5) * 20;

                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
            break;

        case 'ghost':
        case 'psychic':
            // Ethereal trail
            for (let i = 0; i < 4; i++) {
                const angle = (time / 800 + i * 1.5) % (Math.PI * 2);
                const dist = radius + 8 + Math.sin(time / 400 + i) * 3;
                const px = x + Math.cos(angle) * dist;
                const py = y + Math.sin(angle) * dist;

                ctx.beginPath();
                ctx.arc(px, py, 3 - i * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.4 - i * 0.1;
                ctx.fill();
            }
            break;

        case 'water':
        case 'ice':
            // Droplets/crystals orbiting
            for (let i = 0; i < 3; i++) {
                const angle = (time / 600 + i * 2.1) % (Math.PI * 2);
                const dist = radius + 6;
                const px = x + Math.cos(angle) * dist;
                const py = y + Math.sin(angle) * dist;

                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fillStyle = pokemonType === 'ice' ? '#87CEEB' : '#00BFFF';
                ctx.globalAlpha = 0.6;
                ctx.fill();
            }
            break;

        default:
            // Default subtle glow pulse
            ctx.beginPath();
            ctx.arc(x, y, radius + 3 + Math.sin(time / 400) * 2, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 1;
            ctx.stroke();
    }

    ctx.restore();
};

/**
 * Preload a Pokemon sprite image
 * Returns a promise that resolves when the image is loaded
 */
export const preloadSpriteImage = (spriteUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load sprite: ${spriteUrl}`));
        img.src = spriteUrl;
    });
};
