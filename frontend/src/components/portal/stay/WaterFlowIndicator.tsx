type WaterFlowIndicatorProps = {
  /** Flow rate in liters per minute (null = no data) */
  flowRateLpm: number | null;
  /** Current total in m³ */
  totalM3: number | null;
  /** Device status */
  status: 'NO_DEVICE' | 'NOT_CONNECTED' | 'OFFLINE' | 'STALE' | 'NO_FLOW' | 'ONLINE';
  /** Status message from backend */
  statusMessage?: string;
};

/**
 * Animated water flow indicator — shows live flow rate with CSS wave animation.
 * Green pulsing bars when water is flowing, static when idle.
 */
export default function WaterFlowIndicator({
  flowRateLpm,
  totalM3,
  status,
  statusMessage,
}: WaterFlowIndicatorProps) {
  const hasFlow = flowRateLpm != null && flowRateLpm > 0;
  const isOnline = status === 'ONLINE' || status === 'NO_FLOW';
  const flowLevel = hasFlow ? Math.min(flowRateLpm / 20, 1) : 0; // normalize to 0-1 (20 L/min = max)

  return (
    <div className={`water-flow-indicator ${hasFlow ? 'is-flowing' : ''} ${!isOnline ? 'is-offline' : ''}`}>
      <div className="water-flow-header">
        <div className="water-flow-icon" aria-hidden="true">
          {/* Animated wave bars */}
          <div className="water-flow-bars">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="water-flow-bar"
                style={{
                  height: hasFlow ? `${12 + flowLevel * 20 + Math.sin(i * 1.2) * 4}px` : '8px',
                  animationDelay: `${i * 0.15}s`,
                  animationPlayState: hasFlow ? 'running' : 'paused',
                  opacity: isOnline ? 1 : 0.35,
                }}
              />
            ))}
          </div>
        </div>
        <div className="water-flow-info">
          <strong className="water-flow-label">Aliran Air</strong>
          <span className={`water-flow-value ${hasFlow ? 'text-flowing' : ''}`}>
            {flowRateLpm != null ? `${flowRateLpm.toFixed(1)} L/menit` : '—'}
          </span>
        </div>
      </div>

      <div className="water-flow-status">
        {totalM3 != null ? (
          <span className="water-flow-total">Total: {totalM3.toFixed(3)} m³</span>
        ) : null}
        <span className={`water-flow-badge badge-${isOnline ? (hasFlow ? 'flowing' : 'idle') : 'offline'}`}>
          {statusMessage || (hasFlow ? 'Mengalir' : status === 'NO_FLOW' ? 'Tidak ada aliran' : 'Offline')}
        </span>
      </div>
    </div>
  );
}
