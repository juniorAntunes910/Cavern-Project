enum CavernStatus { planned, active, completed, cancelled }

class Cavern {
  const Cavern({required this.id, required this.name, required this.startDate, required this.endDate, required this.status, this.description});
  final String id;
  final String name;
  final String? description;
  final DateTime startDate;
  final DateTime endDate;
  final CavernStatus status;

  factory Cavern.fromJson(Map<String, dynamic> json) => Cavern(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        startDate: DateTime.parse(json['start_date'] as String),
        endDate: DateTime.parse(json['end_date'] as String),
        status: CavernStatus.values.byName(json['status'] as String),
      );
}
