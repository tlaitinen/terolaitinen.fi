'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

function getThemeVariables(isDark: boolean) {
  if (isDark) {
    return {
      primaryColor: '#1f2937',
      primaryTextColor: '#f3f4f6',
      primaryBorderColor: '#9ca3af',
      secondaryBorderColor: '#9ca3af',
      tertiaryBorderColor: '#9ca3af',
      lineColor: '#d1d5db',
      background: '#111827',
      mainBkg: '#1f2937',
      fontSize: '24px',
    };
  }
  return {
    primaryColor: '#ffffff',
    primaryTextColor: '#1f2937',
    primaryBorderColor: '#374151',
    secondaryBorderColor: '#374151',
    tertiaryBorderColor: '#374151',
    lineColor: '#4b5563',
    background: '#ffffff',
    mainBkg: '#ffffff',
    fontSize: '24px',
  };
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const isDark = document.documentElement.classList.contains('dark');
    const themeVariables = getThemeVariables(isDark);

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables,
    });

    const renderChart = async () => {
      try {
        const id = 'mermaid-' + Math.random().toString(36).substring(2, 11);
        const { svg } = await mermaid.render(id, chart);
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
  }, [chart]);

  return <div ref={ref} className="my-6 flex justify-center" />;
}