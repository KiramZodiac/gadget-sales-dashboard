
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
    
    // Add event listener
    window.addEventListener("resize", handleResize);
    
    // Call it once to set initial value
    handleResize();
    
    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}
