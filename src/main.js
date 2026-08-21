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
  touchMultiplier: 1.8,
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
  // Quote Banner Carousel
  if (document.querySelector('.quote-swiper')) {
    new Swiper('.quote-swiper', {
      modules: [Autoplay, Pagination],
      loop: true,
      autoplay: {
        delay: 4500,
        disableOnInteraction: false,
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
    });
  }

  // Subject Cards Swiper (Mobile / Interactive Carousel)
  if (document.querySelector('.subject-swiper')) {
    new Swiper('.subject-swiper', {
      modules: [Navigation, Pagination, Autoplay],
      slidesPerView: 1,
      spaceBetween: 20,
      loop: false,
      autoplay: {
        delay: 5000,
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
        1024: { slidesPerView: 3, spaceBetween: 28 },
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

  // 3. GSAP Entrance & Scroll Animations
  // Hero reveal animation
  gsap.from('.hero-reveal', {
    y: 40,
    opacity: 0,
    duration: 1,
    stagger: 0.15,
    ease: 'power3.out',
  });

  // Staggered reveal for cards & sections on scroll
  const gsapCards = document.querySelectorAll('.gsap-card');
  if (gsapCards.length > 0) {
    gsap.from(gsapCards, {
      scrollTrigger: {
        trigger: '.gsap-card-container',
        start: 'top 85%',
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power2.out',
    });
  }

  // Scroll triggers for chapter note sections
  const headings = document.querySelectorAll('h2, .chapter-header');
  headings.forEach((heading) => {
    gsap.from(heading, {
      scrollTrigger: {
        trigger: heading,
        start: 'top 90%',
        toggleActions: 'play none none reverse',
      },
      x: -25,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
    });
  });
});
