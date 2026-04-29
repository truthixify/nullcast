/**
 * Sparkline — minimal SVG line chart for inline trend indicators.
 * Renders the path + an area fill + a gold endpoint dot.
 */
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
  showDot?: boolean;
}

export const Sparkline = ({
  data,
  width = 120,
  height = 32,
  stroke = "hsl(var(--primary))",
  fill = "hsl(var(--primary) / 0.12)",
  className,
  showDot = true,
}: SparklineProps) => {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={area} fill={fill} stroke="none" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      {showDot && (
        <>
          <circle cx={last[0]} cy={last[1]} r="2.5" fill={stroke} />
          <circle cx={last[0]} cy={last[1]} r="5" fill={stroke} opacity="0.18" />
        </>
      )}
    </svg>
  );
};
