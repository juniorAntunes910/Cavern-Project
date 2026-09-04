import 'package:cavern_project/core/services/supabase_provider.dart';
import 'package:cavern_project/features/habits/data/habit_repository.dart';
import 'package:cavern_project/features/habits/domain/habit.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final habitRepositoryProvider = Provider<HabitRepository>((ref) => HabitRepository(ref.watch(supabaseClientProvider)));
final habitsProvider = StreamProvider<List<Habit>>((ref) => ref.watch(habitRepositoryProvider).watchActive());
