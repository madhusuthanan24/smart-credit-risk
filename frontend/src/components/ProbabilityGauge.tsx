import React from 'react';

interface ProbabilityGaugeProps {
  probability: number; // 0.0 to 1.0
  threshold?: number;   // 0.35
}

export const ProbabilityGauge: React.FC<ProbabilityGaugeProps> = ({ probability, threshold = 0.35 }) => {
  const percentage = Math.round(probability * 100);
  const thresholdPercentage = Math.round(threshold * 100);
  
  // Calculate SVG arc parameters
  const radius = 80;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * Math.PI; // Semi-circle
  const strokeDashoffset = circumference - (probability * circumference);

  let gaugeColor = '#10b981'; // emerald-500
  if (probability >= threshold) {
    gaugeColor = '#ef4444'; // red-500
  } else if (probability >= 0.20) {
    gaugeColor = '#f59e0b'; // amber-500
  }

  return (
    <div className="relative flex flex-col items-center justify-center py-4">
      <svg height={radius + strokeWidth} width={radius * 2 + strokeWidth} className="overflow-visible">
        {/* Background Arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="dark:stroke-slate-700"
        />
        {/* Value Arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius}`}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute top-12 flex flex-col items-center">
        <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{percentage}%</span>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Predicted Default Prob</span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span>Cutoff Boundary: <strong className="text-slate-700 dark:text-slate-200">{thresholdPercentage}%</strong></span>
      </div>
    </div>
  );
};
