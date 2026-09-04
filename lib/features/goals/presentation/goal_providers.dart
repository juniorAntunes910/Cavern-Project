import 'package:cavern_project/core/services/supabase_provider.dart';
import 'package:cavern_project/features/goals/data/goal_repository.dart';
import 'package:cavern_project/features/goals/domain/goal.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final goalRepositoryProvider = Provider<GoalRepository>((ref) => GoalRepository(ref.watch(supabaseClientProvider)));
final goalsProvider = StreamProvider<List<Goal>>((ref) => ref.watch(goalRepositoryProvider).watchActive());
