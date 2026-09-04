import 'package:cavern_project/features/goals/domain/goal.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class GoalRepository {
  GoalRepository(this._client);
  final SupabaseClient _client;

  Stream<List<Goal>> watchActive() {
    final userId = _client.auth.currentUser!.id;
    return _client.from('goals').stream(primaryKey: ['id']).eq('user_id', userId).order('end_date').map((rows) => rows.map(Goal.fromJson).toList());
  }

  Future<void> create({required String title, required GoalMetric metric, required GoalPeriodType periodType, required num targetValue, required String unit, required DateTime startDate, required DateTime endDate, String? cavernId, String? description}) => _client.from('goals').insert({
        'user_id': _client.auth.currentUser!.id,
        'cavern_id': cavernId,
        'title': title.trim(),
        'description': _emptyToNull(description),
        'metric': _snake(metric.name),
        'period_type': periodType.name,
        'target_value': targetValue,
        'unit': unit.trim(),
        'start_date': _date(startDate),
        'end_date': _date(endDate),
      });

  String? _emptyToNull(String? value) => value == null || value.trim().isEmpty ? null : value.trim();
  String _snake(String value) => value.replaceAllMapped(RegExp(r'[A-Z]'), (match) => '_${match.group(0)!.toLowerCase()}');
  String _date(DateTime value) => DateTime(value.year, value.month, value.day).toIso8601String().substring(0, 10);
}
