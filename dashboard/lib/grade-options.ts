export type GradeOption = {
  id: number;
  displayGrade: string;
};

function toGradeCandidate(rawId: unknown, rawLabel: unknown): GradeOption | null {
  const id = Number(rawId);
  if (Number.isNaN(id) || rawLabel === undefined || rawLabel === null) {
    return null;
  }
  return { id, displayGrade: String(rawLabel) };
}

function extractGradeCandidates(input: unknown): GradeOption[] {
  if (input === null || input === undefined) {
    return [];
  }

  if (Array.isArray(input)) {
    return input
      .flatMap((item) => {
        if (Array.isArray(item) && item.length >= 2) {
          const candidate = toGradeCandidate(item[0], item[1]);
          return candidate ? [candidate] : [];
        }

        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          const directCandidate = toGradeCandidate(
            row.id,
            row.display_grade ?? row.displayGrade ?? row.label ?? row.name,
          );
          if (directCandidate) {
            return [directCandidate];
          }
          return extractGradeCandidates(row);
        }

        return [];
      })
      .filter((item) => item.displayGrade.trim().length > 0);
  }

  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;

    if ("body" in obj) {
      const nested = extractGradeCandidates(obj.body);
      if (nested.length > 0) {
        return nested;
      }
    }

    if ("data" in obj) {
      const nested = extractGradeCandidates(obj.data);
      if (nested.length > 0) {
        return nested;
      }
    }

    return Object.entries(obj)
      .flatMap(([key, value]) => {
        if (key === "code" || key === "status" || key === "message" || key === "error") {
          return [];
        }

        if (value && typeof value === "object") {
          const row = value as Record<string, unknown>;
          const candidate = toGradeCandidate(
            row.id ?? key,
            row.display_grade ?? row.displayGrade ?? row.label ?? row.name,
          );
          if (candidate) {
            return [candidate];
          }

          const nested = extractGradeCandidates(value);
          return nested;
        }

        const candidate = toGradeCandidate(key, value);
        return candidate ? [candidate] : [];
      })
      .filter((item) => item.displayGrade.trim().length > 0);
  }

  return [];
}

export function normalizeGradeOptions(input: unknown): GradeOption[] {
  const uniqueById = new Map<number, string>();
  for (const candidate of extractGradeCandidates(input)) {
    if (!uniqueById.has(candidate.id)) {
      uniqueById.set(candidate.id, candidate.displayGrade);
    }
  }

  return [...uniqueById.entries()]
    .map(([id, displayGrade]) => ({ id, displayGrade }))
    .sort((a, b) => a.id - b.id);
}