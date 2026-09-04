import 'package:cavern_project/core/services/supabase_provider.dart';
import 'package:cavern_project/features/caverns/data/cavern_repository.dart';
import 'package:cavern_project/features/caverns/domain/cavern.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final cavernRepositoryProvider = Provider<CavernRepository>((ref) => CavernRepository(ref.watch(supabaseClientProvider)));
final cavernsProvider = StreamProvider<List<Cavern>>((ref) => ref.watch(cavernRepositoryProvider).watchAll());
