import 'package:cavern_project/features/habits/domain/habit.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class HabitRepository {
  HabitRepository(this._client);
  final SupabaseClient _client;

  Stream<List<Habit>> watchActive() {
    final userId = _client.auth.currentUser!.id;
    return _client.from('habits').stream(primaryKey: ['id']).eq('user_id', userId).order('created_at', ascending: false).map((rows) => rows.map(Habit.fromJson).toList());
  }

  Future<void> create({required String name, required HabitType type, required DateTime startedAt, int? targetDays, String? description, String? cavernId}) => _client.from('habits').insert({
        'user_id': _client.auth.currentUser!.id,
        'cavern_id': cavernId,
        'name': name.trim(),
        'description': _emptyToNull(description),
        'type': type.name,
        'target_days': targetDays,
        'started_at': _date(startedAt),
      });

  Future<void> log({required String habitId, required HabitLogStatus status, required DateTime date, String? notes}) => _client.from('habit_logs').upsert({
        'user_id': _client.auth.currentUser!.id,
        'habit_id': habitId,
        'date': _date(date),
        'status': status.name,
        'notes': _emptyToNull(notes),
      }, onConflict: 'habit_id,date');

  String? _emptyToNull(String? value) => value == null || value.trim().isEmpty ? null : value.trim();
  String _date(DateTime value) => DateTime(value.year, value.month, value.day).toIso8601String().substring(0, 10);
}
