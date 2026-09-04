import 'package:cavern_project/features/habits/domain/habit.dart';
import 'package:cavern_project/features/habits/presentation/habit_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HabitsPage extends ConsumerWidget {
  const HabitsPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final habits = ref.watch(habitsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Hábitos')),
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _create(context, ref), icon: const Icon(Icons.add), label: const Text('Novo hábito')),
      body: habits.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => const Center(child: Text('Não foi possível carregar seus hábitos.')),
        data: (items) => items.isEmpty ? const Center(child: Text('Registre um hábito ou contador de abstinência.')) : ListView.builder(padding: const EdgeInsets.all(16), itemCount: items.length, itemBuilder: (_, index) {
          final habit = items[index];
          return Card(child: ListTile(
            title: Text(habit.name),
            subtitle: Text(habit.type == HabitType.abstinence ? 'Contador “sem”' : 'Hábito positivo'),
            trailing: IconButton(icon: const Icon(Icons.check), tooltip: 'Concluir hoje', onPressed: () => ref.read(habitRepositoryProvider).log(habitId: habit.id, status: HabitLogStatus.completed, date: DateTime.now())),
          ));
        }),
      ),
    );
  }

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final name = TextEditingController();
    var type = HabitType.positive;
    await showDialog<void>(context: context, builder: (dialogContext) => StatefulBuilder(builder: (context, setState) => AlertDialog(
      title: const Text('Novo hábito'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')),
        DropdownButtonFormField(value: type, decoration: const InputDecoration(labelText: 'Tipo'), items: const [DropdownMenuItem(value: HabitType.positive, child: Text('Positivo')), DropdownMenuItem(value: HabitType.abstinence, child: Text('Abstinência — Sem X'))], onChanged: (value) => setState(() => type = value!)),
      ]),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancelar')), FilledButton(onPressed: () async { if (name.text.trim().isEmpty) return; await ref.read(habitRepositoryProvider).create(name: name.text, type: type, startedAt: DateTime.now()); if (dialogContext.mounted) Navigator.pop(dialogContext); }, child: const Text('Criar'))],
    )));
    name.dispose();
  }
}
