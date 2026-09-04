import 'package:cavern_project/features/auth/data/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  Future<void> _signOut(BuildContext context) async {
    await AuthRepository(Supabase.instance.client).signOut();
    if (context.mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Perfil')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(Supabase.instance.client.auth.currentUser?.email ?? '', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 24),
            OutlinedButton.icon(onPressed: () => _signOut(context), icon: const Icon(Icons.logout), label: const Text('Sair')),
          ]),
        ),
      );
}
