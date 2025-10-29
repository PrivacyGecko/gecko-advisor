/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { describe, it, expect } from 'vitest';
import { getLetterGrade, getGradeInfo, getGradeAriaLabel } from './grading';

describe('grading', () => {
  describe('getLetterGrade', () => {
    it('should return A for scores 90-100', () => {
      expect(getLetterGrade(100)).toBe('A');
      expect(getLetterGrade(95)).toBe('A');
      expect(getLetterGrade(90)).toBe('A');
    });

    it('should return B for scores 80-89', () => {
      expect(getLetterGrade(89)).toBe('B');
      expect(getLetterGrade(85)).toBe('B');
      expect(getLetterGrade(80)).toBe('B');
    });

    it('should return C for scores 70-79', () => {
      expect(getLetterGrade(79)).toBe('C');
      expect(getLetterGrade(75)).toBe('C');
      expect(getLetterGrade(70)).toBe('C');
    });

    it('should return D for scores 60-69', () => {
      expect(getLetterGrade(69)).toBe('D');
      expect(getLetterGrade(65)).toBe('D');
      expect(getLetterGrade(60)).toBe('D');
    });

    it('should return F for scores below 60', () => {
      expect(getLetterGrade(59)).toBe('F');
      expect(getLetterGrade(50)).toBe('F');
      expect(getLetterGrade(25)).toBe('F');
      expect(getLetterGrade(0)).toBe('F');
    });

    it('should handle boundary cases correctly', () => {
      expect(getLetterGrade(90)).toBe('A'); // Lower boundary of A
      expect(getLetterGrade(89)).toBe('B'); // Just below A
      expect(getLetterGrade(80)).toBe('B'); // Lower boundary of B
      expect(getLetterGrade(79)).toBe('C'); // Just below B
      expect(getLetterGrade(70)).toBe('C'); // Lower boundary of C
      expect(getLetterGrade(69)).toBe('D'); // Just below C
      expect(getLetterGrade(60)).toBe('D'); // Lower boundary of D
      expect(getLetterGrade(59)).toBe('F'); // Just below D
    });
  });

  describe('getGradeInfo', () => {
    it('should return correct info for grade A', () => {
      const info = getGradeInfo(95);
      expect(info.letter).toBe('A');
      expect(info.label).toBe('Excellent');
      expect(info.emoji).toBe('🎉');
      expect(info.colors.bg).toBe('bg-green-100');
      expect(info.colors.text).toBe('text-green-800');
      expect(info.colors.border).toBe('border-green-200');
    });

    it('should return correct info for grade B', () => {
      const info = getGradeInfo(85);
      expect(info.letter).toBe('B');
      expect(info.label).toBe('Good');
      expect(info.emoji).toBe('✅');
      expect(info.colors.bg).toBe('bg-green-50');
      expect(info.colors.text).toBe('text-green-700');
      expect(info.colors.border).toBe('border-green-200');
    });

    it('should return correct info for grade C', () => {
      const info = getGradeInfo(75);
      expect(info.letter).toBe('C');
      expect(info.label).toBe('Fair');
      expect(info.emoji).toBe('⚠️');
      expect(info.colors.bg).toBe('bg-blue-100');
      expect(info.colors.text).toBe('text-blue-700');
      expect(info.colors.border).toBe('border-blue-200');
    });

    it('should return correct info for grade D', () => {
      const info = getGradeInfo(65);
      expect(info.letter).toBe('D');
      expect(info.label).toBe('Poor');
      expect(info.emoji).toBe('⚠️');
      expect(info.colors.bg).toBe('bg-amber-100');
      expect(info.colors.text).toBe('text-amber-800');
      expect(info.colors.border).toBe('border-amber-200');
    });

    it('should return correct info for grade F', () => {
      const info = getGradeInfo(50);
      expect(info.letter).toBe('F');
      expect(info.label).toBe('Bad');
      expect(info.emoji).toBe('❌');
      expect(info.colors.bg).toBe('bg-red-100');
      expect(info.colors.text).toBe('text-red-800');
      expect(info.colors.border).toBe('border-red-200');
    });

    it('should have consistent color schemes', () => {
      // A & B should both use green
      const gradeA = getGradeInfo(95);
      const gradeB = getGradeInfo(85);
      expect(gradeA.colors.bg).toContain('green');
      expect(gradeB.colors.bg).toContain('green');
      expect(gradeA.colors.text).toContain('green');
      expect(gradeB.colors.text).toContain('green');

      // C should use blue
      const gradeC = getGradeInfo(75);
      expect(gradeC.colors.bg).toContain('blue');
      expect(gradeC.colors.text).toContain('blue');

      // D should use amber
      const gradeD = getGradeInfo(65);
      expect(gradeD.colors.bg).toContain('amber');
      expect(gradeD.colors.text).toContain('amber');

      // F should use red
      const gradeF = getGradeInfo(50);
      expect(gradeF.colors.bg).toContain('red');
      expect(gradeF.colors.text).toContain('red');
    });
  });

  describe('getGradeAriaLabel', () => {
    it('should generate correct aria-label for grade A', () => {
      const label = getGradeAriaLabel(95);
      expect(label).toBe('Grade A: Excellent privacy score, 95 out of 100');
    });

    it('should generate correct aria-label for grade B', () => {
      const label = getGradeAriaLabel(85);
      expect(label).toBe('Grade B: Good privacy score, 85 out of 100');
    });

    it('should generate correct aria-label for grade C', () => {
      const label = getGradeAriaLabel(75);
      expect(label).toBe('Grade C: Fair privacy score, 75 out of 100');
    });

    it('should generate correct aria-label for grade D', () => {
      const label = getGradeAriaLabel(65);
      expect(label).toBe('Grade D: Poor privacy score, 65 out of 100');
    });

    it('should generate correct aria-label for grade F', () => {
      const label = getGradeAriaLabel(50);
      expect(label).toBe('Grade F: Bad privacy score, 50 out of 100');
    });

    it('should include all important information for screen readers', () => {
      const label = getGradeAriaLabel(88);
      expect(label).toContain('Grade B');
      expect(label).toContain('Good');
      expect(label).toContain('privacy score');
      expect(label).toContain('88 out of 100');
    });
  });

  describe('real-world score scenarios', () => {
    it('should handle typical good privacy scores', () => {
      // Common "Safe" scores in Privacy Gecko
      expect(getLetterGrade(88)).toBe('B'); // Good
      expect(getLetterGrade(92)).toBe('A'); // Excellent
      expect(getLetterGrade(75)).toBe('C'); // Fair
    });

    it('should handle typical problematic scores', () => {
      // Common "Caution" or "High Risk" scores
      expect(getLetterGrade(55)).toBe('F'); // Bad
      expect(getLetterGrade(45)).toBe('F'); // Bad
      expect(getLetterGrade(65)).toBe('D'); // Poor
    });

    it('should map to existing Safe/Caution/High Risk categories', () => {
      // Safe >= 70 should be A, B, or C
      expect(['A', 'B', 'C']).toContain(getLetterGrade(95));
      expect(['A', 'B', 'C']).toContain(getLetterGrade(85));
      expect(['A', 'B', 'C']).toContain(getLetterGrade(70));

      // Caution 40-69 should be D or F
      expect(['D', 'F']).toContain(getLetterGrade(65));
      expect(['D', 'F']).toContain(getLetterGrade(50));

      // High Risk < 40 should be F
      expect(getLetterGrade(35)).toBe('F');
      expect(getLetterGrade(20)).toBe('F');
    });
  });

  describe('edge cases', () => {
    it('should handle perfect score', () => {
      expect(getLetterGrade(100)).toBe('A');
      const info = getGradeInfo(100);
      expect(info.label).toBe('Excellent');
    });

    it('should handle minimum score', () => {
      expect(getLetterGrade(0)).toBe('F');
      const info = getGradeInfo(0);
      expect(info.label).toBe('Bad');
    });

    it('should handle decimal scores (if they occur)', () => {
      expect(getLetterGrade(89.5)).toBe('B');
      expect(getLetterGrade(79.9)).toBe('C');
    });
  });
});
