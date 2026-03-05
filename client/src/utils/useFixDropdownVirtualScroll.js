// useFixDropdownVirtualScroll.js
import { useRef } from "react";

export const useFixDropdownVirtualScroll = () => {
  const retryRef = useRef(0);
  const maxRetries = 6;
  const delay = 100;

  const fixVirtualScroller = () => {
    const panel = document.querySelector(".p-dropdown-panel, .p-multiselect-panel");

    if (!panel) {
      if (retryRef.current < maxRetries) {
        retryRef.current++;
        setTimeout(fixVirtualScroller, delay);
      }
      return;
    }

    const scroller = panel.querySelector(".p-virtualscroller");
    const content = scroller?.querySelector(".p-virtualscroller-content");

    if (scroller && content) {
      // 👇 Forzamos reflow antes de aplicar transform
      void scroller.offsetHeight;

      // Reset scroll position
      scroller.scrollTop = 0;

      // Corrige transform
      content.style.transform = "translateY(0px)";
      content.style.transition = "none"; // evita animación involuntaria
      content.style.willChange = "auto";

      retryRef.current = 0;
    } else if (retryRef.current < maxRetries) {
      retryRef.current++;
      setTimeout(fixVirtualScroller, delay);
    }
  };

  return () => {
    retryRef.current = 0;
    requestAnimationFrame(() => {
      setTimeout(fixVirtualScroller, 20);
    });
  };
};
