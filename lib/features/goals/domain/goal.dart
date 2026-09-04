enum GoalMetric { pagesRead, readingMinutes, studyMinutes, workouts, habitDays, custom }
enum GoalPeriodType { daily, weekly, monthly, total }
enum GoalStatus { active, completed, cancelled }

class Goal {
  const Goal({required this.id, required this.title, required this.metric, required this.periodType, required this.targetValue, required this.unit, required this.startDate, required this.endDate, required this.status, this.description, this.cavernId});
  final String id;
  final String? cavernId;
  final String title;
  final String? description;
  final GoalMetric metric;
  final GoalPeriodType periodType;
  final num targetValue;
  final String unit;
  final DateTime startDate;
  final DateTime endDate;
  final GoalStatus status;

  factory Goal.fromJson(Map<String, dynamic> json) => Goal(
        id: json['id'] as String,
        cavernId: json['cavern_id'] as String?,
        title: json['title'] as String,
        description: json['description'] as String?,
        metric: GoalMetric.values.byName(_camel(json['metric'] as String)),
        periodType: GoalPeriodType.values.byName(json['period_type'] as String),
        targetValue: json['target_value'] as num,
        unit: json['unit'] as String,
        startDate: DateTime.parse(json['start_date'] as String),
        endDate: DateTime.parse(json['end_date'] as String),
        status: GoalStatus.values.byName(json['status'] as String),
      );

  static String _camel(String value) => value.replaceAllMapped(RegExp(r'_([a-z])'), (match) => match.group(1)!.toUpperCase());
}
