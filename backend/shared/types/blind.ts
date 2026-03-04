export interface BlindTimingResult {
  currentIndex: number;   // 현재 레벨 인덱스
  nextLevelAt: Date | null; // 다음 상승 시각 (마지막이면 null)
}