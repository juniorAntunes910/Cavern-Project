import 'package:cavern_project/features/goals/domain/goal.dart';
import 'package:cavern_project/features/goals/presentation/goal_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class GoalsPage extends ConsumerWidget {
  const GoalsPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goals = ref.watch(goalsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Metas')),
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _create(context, ref), icon: const Icon(Icons.add), label: const Text('Nova meta')),
      body: goals.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => const Center(child: Text('Não foi possível carregar suas metas.')),
        data: (items) => items.isEmpty ? const Center(child: Text('Defina a primeira meta da sua Caverna.')) : ListView.builder(padding: const EdgeInsets.all(16), itemCount: items.length, itemBuilder: (_, index) {
          final goal = items[index];
          return Card(child: ListTile(title: Text(goal.title), subtitle: Text('${goal.targetValue} ${goal.unit} · ${goal.periodType.name}')));
        }),
      ),
    );
  }

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final title = TextEditingController();
    final target = TextEditingController();
    final unit = TextEditingController(text: 'páginas');
    var metric = GoalMetric.pagesRead;
    var period = GoalPeriodType.daily;
    final today = DateTime.now();
    await showDialog<void>(context: context, builder: (dialogContext) => StatefulBuilder(builder: (context, setState) => AlertDialog(
      title: const Text('Nova meta'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: title, decoration: const InputDecoration(labelText: 'Título')),
        TextField(controller: target, decoration: const InputDecoration(labelText: 'Valor-alvo'), keyboardType: TextInputType.number),
        TextField(controller: unit, decoration: const InputDecoration(labelText: 'Unidade')),
        DropdownButtonFormField(value: metric, decoration: const InputDecoration(labelText: 'Métrica'), items: GoalMetric.values.map((value) => DropdownMenuItem(value: value, child: Text(value.name))).toList(), onChanged: (value) => setState(() => metric = value!)),
        DropdownButtonFormField(value: period, decoration: const InputDecoration(labelText: 'Período'), items: GoalPeriodType.values.map((value) => DropdownMenuItem(value: value, child: Text(value.name))).toList(), onChanged: (value) => setState(() => period = value!)),
      ])),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancelar')), FilledButton(onPressed: () async { final value = num.tryParse(target.text); if (title.text.trim().isEmpty || value == null || value <= 0 || unit.text.trim().isEmpty) return; await ref.read(goalRepositoryProvider).create(title: title.text, metric: metric, periodType: period, targetValue: value, unit: unit.text, startDate: today, endDate: today.add(const Duration(days: 30))); if (dialogContext.mounted) Navigator.pop(dialogContext); }, child: const Text('Criar'))],
    )));
    title.dispose(); target.dispose(); unit.dispose();
  }
}
