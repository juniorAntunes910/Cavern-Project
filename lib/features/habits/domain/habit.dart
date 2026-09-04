enum HabitType { positive, abstinence }
enum HabitLogStatus { completed, failed, skipped }

class Habit {
  const Habit({required this.id, required this.name, required this.type, required this.startedAt, required this.active, this.description, this.cavernId, this.targetDays});
  final String id;
  final String? cavernId;
  final String name;
  final String? description;
  final HabitType type;
  final int? targetDays;
  final DateTime startedAt;
  final bool active;

  factory Habit.fromJson(Map<String, dynamic> json) => Habit(
        id: json['id'] as String,
        cavernId: json['cavern_id'] as String?,
        name: json['name'] as String,
        description: json['description'] as String?,
        type: HabitType.values.byName(json['type'] as String),
        targetDays: json['target_days'] as int?,
        startedAt: DateTime.parse(json['started_at'] as String),
        active: json['active'] as bool,
      );
}
