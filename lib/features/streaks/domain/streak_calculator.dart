class StreakResult {
  const StreakResult({required this.currentStreak, required this.longestStreak});
  final int currentStreak;
  final int longestStreak;
}

/// Calculates streaks from local civil dates. Dates later than [today] are ignored.
class StreakCalculator {
  const StreakCalculator();

  StreakResult calculate(Iterable<DateTime> activeDates, {required DateTime today}) {
    final reference = _dateOnly(today);
    final dates = activeDates
        .map(_dateOnly)
        .where((date) => !date.isAfter(reference))
        .toSet()
        .toList()
      ..sort();
    if (dates.isEmpty) return const StreakResult(currentStreak: 0, longestStreak: 0);

    var longest = 1;
    var run = 1;
    for (var index = 1; index < dates.length; index++) {
      if (dates[index].difference(dates[index - 1]).inDays == 1) {
        run++;
      } else {
        run = 1;
      }
      if (run > longest) longest = run;
    }

    var cursor = dates.last == reference ? reference : reference.subtract(const Duration(days: 1));
    var current = 0;
    final dateSet = dates.toSet();
    while (dateSet.contains(cursor)) {
      current++;
      cursor = cursor.subtract(const Duration(days: 1));
    }
    return StreakResult(currentStreak: current, longestStreak: longest);
  }

  DateTime _dateOnly(DateTime value) => DateTime(value.year, value.month, value.day);
}
