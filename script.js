// ============================================
// CYBERPUNK PORTFOLIO - SCRIPTS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize effects
    initScrollEffects();
    initTypingEffect();
    initParallax();
    initCodeRain();
});

// Smooth scroll for navigation
function initScrollEffects() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar background on scroll
    const nav = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(10, 10, 15, 0.98)';
        } else {
            nav.style.background = 'rgba(10, 10, 15, 0.95)';
        }
    });

    // Reveal animations on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.mission-card, .stat-card, .skill-category').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// Typing effect for hero subtitle
function initTypingEffect() {
    const heroPrefix = document.querySelector('.hero-prefix');
    if (!heroPrefix) return;

    const text = heroPrefix.textContent;
    heroPrefix.textContent = '';
    
    let i = 0;
    const typeWriter = () => {
        if (i < text.length) {
            heroPrefix.textContent += text.charAt(i);
            i++;
            setTimeout(typeWriter, 50);
        }
    };
    
    setTimeout(typeWriter, 500);
}

// Parallax effect for hero
function initParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        
        hero.style.backgroundPosition = `${50 + x * 0.1}% ${50 + y * 0.1}%`;
    });
}

// Matrix-style code rain effect
function initCodeRain() {
    const canvas = document.createElement('canvas');
    canvas.className = 'code-rain-canvas';
    canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.05;
    `;
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    const draw = () => {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ffff';
        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(char, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    };

    setInterval(draw, 50);
}

// Add revealed class styles
const style = document.createElement('style');
style.textContent = `
    .revealed {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

// Console easter egg
console.log(`
%c╔══════════════════════════════════════╗
║     SURYA.DEV PORTFOLIO SYSTEM       ║
║         STATUS: OPERATIONAL          ║
╚══════════════════════════════════════╝
`, 'color: #00ffff; font-family: monospace;');

console.log('%c> Welcome, fellow developer! 👋', 'color: #00ff88;');
console.log('%c> Feel free to explore the code.', 'color: #888;');
