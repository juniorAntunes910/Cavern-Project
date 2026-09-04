import 'package:cavern_project/app/router.dart';
import 'package:cavern_project/app/theme/cavern_theme.dart';
import 'package:cavern_project/core/config/app_environment.dart';
import 'package:flutter/material.dart';

class CavernApp extends StatelessWidget {
  const CavernApp({required this.environment, super.key});
  final AppEnvironment environment;

  @override
  Widget build(BuildContext context) => MaterialApp.router(
        title: 'Cavern Project',
        debugShowCheckedModeBanner: false,
        theme: CavernTheme.dark(),
        routerConfig: createRouter(environment),
      );
}
