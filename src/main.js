import './style.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectCards } from 'swiper/modules';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// 1. Initialize Lenis Smooth Scroll
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  touchMultiplier: 1.6,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Synchronize Lenis with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Export lenis instance globally for inline scripts
window.lenis = lenis;

// 2. Initialize Swiper Sliders
document.addEventListener('DOMContentLoaded', () => {
  // Quote Banner Swiper
  if (document.querySelector('.quote-swiper')) {
    new Swiper('.quote-swiper', {
      modules: [Autoplay, Pagination],
      loop: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
      pagination: {
        el: '.quote-swiper-pagination',
        clickable: true,
      },
    });
  }

  // Subject Cards Swiper (Mobile / Interactive Carousel)
  if (document.querySelector('.subject-swiper')) {
    new Swiper('.subject-swiper', {
      modules: [Navigation, Pagination, Autoplay],
      slidesPerView: 1,
      spaceBetween: 24,
      loop: false,
      autoplay: {
        delay: 6000,
        disableOnInteraction: false,
      },
      pagination: {
        el: '.subject-swiper-pagination',
        clickable: true,
      },
      navigation: {
        nextEl: '.subject-swiper-next',
        prevEl: '.subject-swiper-prev',
      },
      breakpoints: {
        640: { slidesPerView: 2, spaceBetween: 24 },
        1024: { slidesPerView: 3, spaceBetween: 30 },
      },
    });
  }

  // Current Affairs Cards Swiper
  if (document.querySelector('.ca-swiper')) {
    new Swiper('.ca-swiper', {
      modules: [EffectCards, Pagination, Navigation],
      effect: 'cards',
      grabCursor: true,
      pagination: {
        el: '.ca-swiper-pagination',
        clickable: true,
      },
    });
  }

  // 3. Fluid Blob Background Animations with GSAP
  gsap.to('.fluid-blob-1', {
    x: 'random(-60, 60)',
    y: 'random(-40, 40)',
    scale: 'random(0.9, 1.2)',
    duration: 10,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  });

  gsap.to('.fluid-blob-2', {
    x: 'random(-50, 50)',
    y: 'random(-60, 60)',
    scale: 'random(0.85, 1.15)',
    duration: 12,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  });

  gsap.to('.fluid-blob-3', {
    x: 'random(-40, 40)',
    y: 'random(-50, 50)',
    scale: 'random(0.9, 1.1)',
    duration: 14,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  });

  // 4. GSAP Entrance Animations & Timeline
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from('.hero-badge', {
    scale: 0.8,
    opacity: 0,
    duration: 0.6,
  })
  .from('.hero-title', {
    y: 35,
    opacity: 0,
    duration: 0.8,
  }, '-=0.4')
  .from('.hero-sub', {
    y: 20,
    opacity: 0,
    duration: 0.6,
  }, '-=0.4')
  .from('.hero-quote', {
    y: 20,
    opacity: 0,
    duration: 0.6,
  }, '-=0.4');

  // GSAP ScrollTrigger for liquid cards (per section container)
  const cardContainers = document.querySelectorAll('.cards-container');
  cardContainers.forEach((container) => {
    const cards = container.querySelectorAll('.liquid-card');
    if (cards.length > 0) {
      gsap.from(cards, {
        scrollTrigger: {
          trigger: container,
          start: 'top 92%',
        },
        y: 25,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
      });
    }
  });

  // Section Headers Reveal
  const sectionHeaders = document.querySelectorAll('.section-title-wrapper');
  sectionHeaders.forEach((header) => {
    gsap.from(header, {
      scrollTrigger: {
        trigger: header,
        start: 'top 88%',
      },
      x: -30,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out',
    });
  });

  // Liquid Magnetic 3D Physics on Cards
  liquidCards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(card, {
        rotateX: -y * 0.04,
        rotateY: x * 0.04,
        duration: 0.4,
        ease: 'power2.out',
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.6,
        ease: 'power2.out',
      });
    });
  });
});
