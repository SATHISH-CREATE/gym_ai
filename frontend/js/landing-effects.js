/**
 * Gym AI 4D Landing Page Effects
 * Handles parallax mouse tracking, dynamic speed particles, and "fast" interactive elements.
 */

document.addEventListener('DOMContentLoaded', () => {
    initParallax();
    initParticles();
    initSpeedTilt();
});

/**
 * Mouse-tracking parallax for the 4D effect
 */
function initParallax() {
    const hero = document.querySelector('.hero-visual-container');
    const layers = document.querySelectorAll('.parallax-layer');

    if (!hero) return;

    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;

        layers.forEach(layer => {
            const speed = layer.getAttribute('data-speed') || 0.05;
            const xOffset = x * speed * 100;
            const yOffset = y * speed * 100;
            layer.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        });
    });
}

/**
 * Creates dynamic "speed" particles that move across the screen
 */
function initParticles() {
    const container = document.querySelector('.hero');
    if (!container) return;

    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
        createParticle(container);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'speed-particle';

    // Randomize position and speed
    const startY = Math.random() * 100;
    const duration = 0.5 + Math.random() * 1.5;
    const delay = Math.random() * 5;

    particle.style.top = `${startY}%`;
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${delay}s`;

    container.appendChild(particle);

    // Re-run on animation end
    particle.addEventListener('animationiteration', () => {
        particle.style.top = `${Math.random() * 100}%`;
    });
}

/**
 * High-speed tilt effect for category cards
 */
function initSpeedTilt() {
    const cards = document.querySelectorAll('.category-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.05)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`;
        });
    });
}
