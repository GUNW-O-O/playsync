import { BlindLevelDto } from "shared/dto/blind-structure.dto";

interface BlindTimingResult {
  currentIndex: number;   // 현재 레벨 인덱스
  nextLevelAt: Date | null; // 다음 상승 시각 (마지막이면 null)
}

export function getCurrentBlindLevel(
  structure: BlindLevelDto[],
  startedAt: Date
): BlindTimingResult {

  const now = Date.now();
  const elapsedMs = now - startedAt.getTime();

  let accumulatedMs = 0;

  for (let i = 0; i < structure.length; i++) {
    const levelMs = structure[i].duration * 60 * 1000;
    accumulatedMs += levelMs;

    if (elapsedMs < accumulatedMs) {
      const nextLevelAt = new Date(
        startedAt.getTime() + accumulatedMs
      );

      return {
        currentIndex: i,
        nextLevelAt,
      };
    }
  }

  // 모든 레벨을 초과한 경우 → 마지막 레벨 유지
  return {
    currentIndex: structure.length - 1,
    nextLevelAt: null,
  };
}
export function parseBlindStructure(data: unknown): BlindLevelDto[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid blind structure");
  }

  return data.map((item) => {
    if (
      typeof item.lv !== "number" ||
      typeof item.sb !== "number" ||
      typeof item.ante !== "boolean" ||
      typeof item.duration !== "number"
    ) {
      throw new Error("Invalid blind level format");
    }

    return item as BlindLevelDto;
  });
}