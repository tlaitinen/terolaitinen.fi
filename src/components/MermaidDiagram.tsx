'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          primaryColor: '#ffffff',
          primaryTextColor: '#1f2937',
          primaryBorderColor: '#e5e7eb',
          lineColor: '#6b7280',
          background: '#ffffff',
          mainBkg: '#ffffff',
          fontSize: '24px'
        }
      });

      const renderChart = async () => {
        try {
          const { svg } = await mermaid.render('mermaid-' + Math.random().toString(36).substr(2, 9), chart);
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          if (ref.current) {
            ref.current.innerHTML = `<pre class="text-red-500">Error rendering diagram: ${error}</pre>`;
          }
        }
      };

      renderChart();
    }
  }, [chart]);

  return <div ref={ref} className="my-6 flex justify-center" />;
}