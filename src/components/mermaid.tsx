'use client';

import mermaid from 'mermaid';
import { memo, useEffect, useRef, type ReactNode } from 'react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
});

const Mermaid = memo(({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.run({ nodes: [ref.current] });
    }
  }, []);

  return (
    <div className="mermaid" ref={ref}>
      {children}
    </div>
  );
});

export default Mermaid;