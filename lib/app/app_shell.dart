import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppShell extends StatelessWidget {
  const AppShell({required this.location, required this.child, super.key});
  final String location;
  final Widget child;

  static const _destinations = [
    _Destination('Home', Icons.home_outlined, '/dashboard'),
    _Destination('Metas', Icons.flag_outlined, '/goals'),
    _Destination('Livros', Icons.menu_book_outlined, '/books'),
    _Destination('Progresso', Icons.insights_outlined, '/statistics'),
    _Destination('Perfil', Icons.person_outline, '/profile'),
  ];

  int get _selectedIndex => _destinations
      .indexWhere((item) => location.startsWith(item.path))
      .clamp(0, _destinations.length - 1) as int;
  void _go(BuildContext context, int index) => context.go(_destinations[index].path);

  @override
  Widget build(BuildContext context) {
    final desktop = MediaQuery.sizeOf(context).width >= 840;
    if (!desktop) {
      return Scaffold(
        body: child,
        bottomNavigationBar: NavigationBar(
          selectedIndex: _selectedIndex,
          onDestinationSelected: (index) => _go(context, index),
          destinations: [for (final item in _destinations) NavigationDestination(icon: Icon(item.icon), label: item.label)],
        ),
      );
    }
    return Scaffold(
      body: Row(children: [
        NavigationRail(
          selectedIndex: _selectedIndex,
          onDestinationSelected: (index) => _go(context, index),
          labelType: NavigationRailLabelType.all,
          leading: const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Icon(Icons.landscape_outlined)),
          destinations: [for (final item in _destinations) NavigationRailDestination(icon: Icon(item.icon), label: Text(item.label))],
        ),
        const VerticalDivider(width: 1),
        Expanded(child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1200), child: child))),
      ]),
    );
  }
}

class _Destination {
  const _Destination(this.label, this.icon, this.path);
  final String label;
  final IconData icon;
  final String path;
}
