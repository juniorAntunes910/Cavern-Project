import 'package:cavern_project/features/caverns/domain/cavern.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CavernRepository {
  CavernRepository(this._client);
  final SupabaseClient _client;

  Stream<List<Cavern>> watchAll() {
    final userId = _client.auth.currentUser!.id;
    return _client.from('caverns').stream(primaryKey: ['id']).eq('user_id', userId).order('start_date', ascending: false).map((rows) => rows.map(Cavern.fromJson).toList());
  }

  Future<void> create({required String name, String? description, required DateTime startDate, required DateTime endDate}) => _client.from('caverns').insert({
        'user_id': _client.auth.currentUser!.id,
        'name': name.trim(),
        'description': _emptyToNull(description),
        'start_date': _date(startDate),
        'end_date': _date(endDate),
      });

  String? _emptyToNull(String? value) => value == null || value.trim().isEmpty ? null : value.trim();
  String _date(DateTime value) => DateTime(value.year, value.month, value.day).toIso8601String().substring(0, 10);
}
