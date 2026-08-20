"use client";

interface ScoreSliderProps {
  maxScore: number;
  value: number;
  onChange: (value: number) => void;
}

export function ScoreSlider({ maxScore, value, onChange }: ScoreSliderProps) {
  // 生成可选的分数按钮
  const scores = Array.from({ length: maxScore + 1 }, (_, i) => i);

  const getScoreColor = (score: number) => {
    const ratio = maxScore > 0 ? score / maxScore : 0;
    if (ratio >= 0.8) return "bg-emerald-500 text-white";
    if (ratio >= 0.5) return "bg-amber-500 text-white";
    if (ratio > 0) return "bg-red-400 text-white";
    return "bg-gray-100 text-gray-400";
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 shrink-0">得分</span>
      <div className="flex gap-1.5 flex-wrap">
        {scores.map((score) => (
          <button
            key={score}
            onClick={() => onChange(score)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all active:scale-90 ${
              value === score
                ? getScoreColor(score) + " ring-2 ring-offset-1 ring-amber-300"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-400 shrink-0 ml-1">/{maxScore}</span>
    </div>
  );
}
