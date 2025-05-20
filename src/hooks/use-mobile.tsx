import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Set initial value based on window width
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    // Default to desktop if window is not available (SSR)
    return false;
  });

  React.useEffect(() => {
    // Skip if window is not available (SSR)
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Use ResizeObserver for more efficient detection of size changes
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentBoxSize) {
            handleResize();
          }
        }
      });
      
      resizeObserver.observe(document.documentElement);
      
      // Also keep the window resize handler for backup
      window.addEventListener("resize", handleResize);
      
      // Call it once to set initial value
      handleResize();
      
      // Clean up
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("resize", handleResize);
      };
    } else {
      // Fallback to just window resize for older browsers
      window.addEventListener("resize", handleResize);
      handleResize();
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return isMobile;
}
