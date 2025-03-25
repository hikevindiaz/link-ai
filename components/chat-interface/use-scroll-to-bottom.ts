import { useEffect, useRef, type RefObject } from 'react';

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T>,
  RefObject<T>,
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      // Only scroll when the end element is added or when its content changes
      const observer = new MutationObserver((mutations) => {
        // Check if the mutation is related to the end element
        const isEndElementMutation = mutations.some(mutation => 
          mutation.target === end || 
          mutation.target.parentElement === end
        );
        
        if (isEndElementMutation) {
          end.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      return () => observer.disconnect();
    }
  }, []);

  return [containerRef, endRef];
}
