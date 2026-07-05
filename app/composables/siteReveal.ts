export function useSiteReveal(selector = '.site-reveal'): void {
  let observer: IntersectionObserver | undefined;

  onMounted(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

    if (elements.length === 0) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.add('is-visible'));
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add('is-visible');
          observer?.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.16,
      },
    );

    elements.forEach(element => observer?.observe(element));
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
  });
}
