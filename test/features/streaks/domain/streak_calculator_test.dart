import 'package:cavern_project/features/streaks/domain/streak_calculator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const calculator = StreakCalculator();

  test('counts a consecutive streak including today', () {
    final result = calculator.calculate([DateTime(2026, 9, 1), DateTime(2026, 9, 2), DateTime(2026, 9, 3)], today: DateTime(2026, 9, 3));
    expect(result.currentStreak, 3);
    expect(result.longestStreak, 3);
  });

  test('allows an unfinished current day and starts from yesterday', () {
    final result = calculator.calculate([DateTime(2026, 9, 1), DateTime(2026, 9, 2)], today: DateTime(2026, 9, 3));
    expect(result.currentStreak, 2);
  });

  test('resets the current streak after a missed day', () {
    final result = calculator.calculate([DateTime(2026, 9, 1), DateTime(2026, 9, 3)], today: DateTime(2026, 9, 3));
    expect(result.currentStreak, 1);
    expect(result.longestStreak, 1);
  });

  test('crosses month and year boundaries', () {
    final result = calculator.calculate([DateTime(2025, 12, 31), DateTime(2026, 1, 1)], today: DateTime(2026, 1, 1));
    expect(result.currentStreak, 2);
    expect(result.longestStreak, 2);
  });
}
