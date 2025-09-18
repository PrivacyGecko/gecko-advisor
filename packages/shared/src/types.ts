export type ScoreLabel = 'Safe' | 'Caution' | 'High Risk';

export interface ScoreExplanation {
  evidenceId: string;
  points: number; // negative numbers for deductions
  reason: string;
}

export interface ScoreResult {
  score: number;
  label: ScoreLabel;
  explanations: ScoreExplanation[];
}
