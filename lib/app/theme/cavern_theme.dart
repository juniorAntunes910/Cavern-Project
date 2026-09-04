import 'package:flutter/material.dart';

abstract final class CavernTheme {
  static const _background = Color(0xFF0D0F0E);
  static const _surface = Color(0xFF171A18);
  static const _accent = Color(0xFF9DBE91);

  static ThemeData dark() => ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: _background,
        colorScheme: const ColorScheme.dark(
          surface: _surface,
          primary: _accent,
          onPrimary: Color(0xFF10140F),
          onSurface: Color(0xFFF1F2EE),
          onSurfaceVariant: Color(0xFFB9BDB6),
        ),
        appBarTheme: const AppBarTheme(centerTitle: false, elevation: 0),
        cardTheme: const CardThemeData(elevation: 0, color: _surface),
        inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
        useMaterial3: true,
      );
}
