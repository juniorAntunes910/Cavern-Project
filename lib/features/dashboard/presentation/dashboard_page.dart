import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('CAVERN')),
        body: ListView(padding: const EdgeInsets.all(24), children: [
          Text('Bom dia.', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text('Sua visão diária aparecerá aqui quando você criar a primeira Caverna.'),
          const SizedBox(height: 32),
          const _Metric(label: 'Sequência atual', value: '— dias'),
          const SizedBox(height: 16),
          const _Metric(label: 'Hoje', value: 'Sem atividades registradas'),
          const SizedBox(height: 32),
          Text('Próximo passo', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text('Crie uma Caverna para definir o período que deseja acompanhar.'),
          const SizedBox(height: 12),
          FilledButton(onPressed: () => context.go('/caverns'), child: const Text('Criar Caverna')),
          TextButton(onPressed: () => context.go('/habits'), child: const Text('Gerenciar hábitos')),
        ]),
      );
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 6),
            Text(value, style: Theme.of(context).textTheme.titleLarge),
          ]),
        ),
      );
}
