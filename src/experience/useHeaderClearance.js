import { useLayoutEffect } from 'react';

export default function useHeaderClearance(ref) {
  useLayoutEffect(() => {
    const header = ref.current;
    if (!header) return;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--de-header-bottom');
    const measure = () => root.style.setProperty('--de-header-bottom', Math.ceil(header.getBoundingClientRect().bottom) + 'px');
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); if (previous) root.style.setProperty('--de-header-bottom', previous); else root.style.removeProperty('--de-header-bottom'); };
  }, [ref]);
}
