import 'package:cavern_project/features/caverns/presentation/cavern_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CavernsPage extends ConsumerWidget {
  const CavernsPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final caverns = ref.watch(cavernsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Cavernas')),
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _showCreate(context, ref), icon: const Icon(Icons.add), label: const Text('Nova caverna')),
      body: caverns.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => const Center(child: Text('Não foi possível carregar suas cavernas.')),
        data: (items) => items.isEmpty ? const Center(child: Text('Nenhuma Caverna criada ainda.')) : ListView.builder(padding: const EdgeInsets.all(16), itemCount: items.length, itemBuilder: (_, index) {
          final item = items[index];
          return Card(child: ListTile(title: Text(item.name), subtitle: Text('${_date(item.startDate)} — ${_date(item.endDate)} · ${item.status.name}')));
        }),
      ),
    );
  }

  Future<void> _showCreate(BuildContext context, WidgetRef ref) async {
    final name = TextEditingController();
    final description = TextEditingController();
    var start = DateTime.now();
    var end = DateTime.now().add(const Duration(days: 30));
    await showDialog<void>(context: context, builder: (dialogContext) => StatefulBuilder(builder: (context, setState) => AlertDialog(
      title: const Text('Nova Caverna'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')),
        TextField(controller: description, decoration: const InputDecoration(labelText: 'Descrição opcional')),
        const SizedBox(height: 12),
        ListTile(title: const Text('Início'), subtitle: Text(_date(start)), onTap: () async { final value = await showDatePicker(context: context, firstDate: DateTime(2020), lastDate: DateTime(2100), initialDate: start); if (value != null) setState(() => start = value); }),
        ListTile(title: const Text('Fim'), subtitle: Text(_date(end)), onTap: () async { final value = await showDatePicker(context: context, firstDate: start, lastDate: DateTime(2100), initialDate: end); if (value != null) setState(() => end = value); }),
      ])),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancelar')), FilledButton(onPressed: () async { if (name.text.trim().isEmpty) return; await ref.read(cavernRepositoryProvider).create(name: name.text, description: description.text, startDate: start, endDate: end); if (dialogContext.mounted) Navigator.pop(dialogContext); }, child: const Text('Criar'))],
    )));
    name.dispose(); description.dispose();
  }
}

String _date(DateTime value) => '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')}/${value.year}';
