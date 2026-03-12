import { useEffect, useState } from "react";

export default function ActionTimer({ deadline }: { deadline: number }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const total = 30000; // 전체 제한 시간 30초
      const remaining = deadline - now;
      const newProgress = Math.max(0, (remaining / total) * 100);
      
      setProgress(newProgress);

      if (remaining > 0) {
        requestAnimationFrame(updateTimer);
      }
    };

    const frameId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(frameId);
  }, [deadline]);

  // 남은 시간에 따라 색상 변경 (10초 미만이면 빨간색)
  const barColor = progress > 33 ? 'bg-indigo-500' : 'bg-red-500';

  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
      <div 
        className={`h-full ${barColor} transition-all duration-100 ease-linear`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}