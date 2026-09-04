import 'package:cavern_project/app/app.dart';
import 'package:cavern_project/core/config/app_environment.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final environment = AppEnvironment.fromDartDefines();
  if (environment.isConfigured) {
    await Supabase.initialize(
      url: environment.supabaseUrl,
      publishableKey: environment.supabasePublishableKey,
    );
  }
  runApp(ProviderScope(child: CavernApp(environment: environment)));
}
