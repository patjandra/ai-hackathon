const METRIC_KEYWORDS: Record<string, string[]> = {
  pain: ["pain", "hurt", "hurts", "ache", "sore", "tender", "burning", "throbbing",
         " 1 ", " 2 ", " 3 ", " 4 ", " 5 ", " 6 ", " 7 ", " 8 ", " 9 ", " 10 "],
  fatigue: ["tired", "fatigue", "exhausted", "energy", "worn out", "drained", "sluggish"],
  swelling: ["swelling", "swollen", "puffy", "inflamed", "inflammation", "puffiness"],
  morning_stiffness: ["stiffness", "stiff", "morning", "woke up", "getting up", "rigid"],
  medication_adherence: ["medication", "meds", "pill", "dose", "took", "missed", "forgot", "tablet"],
};

export function optimisticHighlight(transcript: string): string[] {
  const lower = " " + transcript.toLowerCase() + " ";
  return Object.entries(METRIC_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => lower.includes(kw)))
    .map(([metric]) => metric);
}
