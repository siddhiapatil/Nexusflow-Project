export default function Sparkline({ points, target = 5000, width = 560, height = 120 }) {
  if (!points?.length) return <div className="empty">Waiting for data...</div>;
  const max = Math.max(target, ...points.map((p) => p.writes)) * 1.1;
  const x = (i) => (i / Math.max(points.length - 1, 1)) * width;
  const y = (v) => height - (v / max) * height;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.writes).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="spark" role="img" aria-label="Writes per second">
      <line x1="0" x2={width} y1={y(target)} y2={y(target)} className="spark-target" />
      <path d={path} className="spark-line" />
    </svg>
  );
}
