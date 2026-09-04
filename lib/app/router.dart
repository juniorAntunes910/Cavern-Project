import 'package:cavern_project/app/app_shell.dart';
import 'package:cavern_project/core/config/app_environment.dart';
import 'package:cavern_project/features/auth/presentation/auth_page.dart';
import 'package:cavern_project/features/auth/presentation/profile_page.dart';
import 'package:cavern_project/features/caverns/presentation/caverns_page.dart';
import 'package:cavern_project/features/dashboard/presentation/dashboard_page.dart';
import 'package:cavern_project/features/dashboard/presentation/placeholder_page.dart';
import 'package:cavern_project/features/goals/presentation/goals_page.dart';
import 'package:cavern_project/features/habits/presentation/habits_page.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

GoRouter createRouter(AppEnvironment environment) => GoRouter(
      initialLocation: '/dashboard',
      redirect: (context, state) {
        if (!environment.isConfigured) return '/setup';
        final signedIn = Supabase.instance.client.auth.currentSession != null;
        final authRoute = state.matchedLocation == '/login' || state.matchedLocation == '/register';
        if (!signedIn && !authRoute) return '/login';
        if (signedIn && authRoute) return '/dashboard';
        return null;
      },
      routes: [
        GoRoute(path: '/setup', builder: (_, _) => const _SetupPage()),
        GoRoute(path: '/login', builder: (_, _) => const AuthPage(login: true)),
        GoRoute(path: '/register', builder: (_, _) => const AuthPage(login: false)),
        ShellRoute(
          builder: (_, state, child) => AppShell(location: state.matchedLocation, child: child),
          routes: [
            GoRoute(path: '/dashboard', builder: (_, _) => const DashboardPage()),
            GoRoute(path: '/caverns', builder: (_, _) => const CavernsPage()),
            GoRoute(path: '/goals', builder: (_, _) => const GoalsPage()),
            GoRoute(path: '/habits', builder: (_, _) => const HabitsPage()),
            GoRoute(path: '/books', builder: (_, _) => const PlaceholderPage(title: 'Minha Biblioteca')),
            GoRoute(path: '/statistics', builder: (_, _) => const PlaceholderPage(title: 'Progresso')),
            GoRoute(path: '/profile', builder: (_, _) => const ProfilePage()),
          ],
        ),
      ],
    );

class _SetupPage extends StatelessWidget {
  const _SetupPage();
  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Center(child: Padding(padding: EdgeInsets.all(24), child: Text('Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY usando --dart-define para iniciar o Cavern Project.'))),
      );
}
