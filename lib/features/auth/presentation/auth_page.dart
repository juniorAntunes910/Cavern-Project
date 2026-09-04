import 'package:cavern_project/features/auth/data/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthPage extends StatefulWidget {
  const AuthPage({required this.login, super.key});
  final bool login;
  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  bool _loading = false;

  @override
  void dispose() { _email.dispose(); _password.dispose(); _name.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final repository = AuthRepository(Supabase.instance.client);
      if (widget.login) {
        await repository.signIn(email: _email.text.trim(), password: _password.text);
      } else {
        await repository.signUp(email: _email.text.trim(), password: _password.text, displayName: _name.text.trim());
      }
      if (mounted) context.go('/dashboard');
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível autenticar. Verifique seus dados e tente novamente.')));
    } finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _resetPassword() async {
    final email = _email.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Informe seu e-mail para recuperar a senha.')));
      return;
    }
    try {
      await AuthRepository(Supabase.instance.client).resetPassword(email);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enviamos as instruções de recuperação para seu e-mail.')));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível enviar a recuperação agora.')));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 420), child: Padding(
      padding: const EdgeInsets.all(24),
      child: Form(key: _formKey, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('CAVERN', style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 8),
        Text(widget.login ? 'Entre na sua caverna.' : 'Comece um ciclo com intenção.'),
        const SizedBox(height: 32),
        if (!widget.login) TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Nome'), validator: (value) => value == null || value.trim().isEmpty ? 'Informe seu nome' : null),
        if (!widget.login) const SizedBox(height: 16),
        TextFormField(controller: _email, decoration: const InputDecoration(labelText: 'E-mail'), keyboardType: TextInputType.emailAddress, validator: (value) => value == null || !value.contains('@') ? 'Informe um e-mail válido' : null),
        const SizedBox(height: 16),
        TextFormField(controller: _password, decoration: const InputDecoration(labelText: 'Senha'), obscureText: true, validator: (value) => value == null || value.length < 8 ? 'Use ao menos 8 caracteres' : null),
        const SizedBox(height: 24),
        FilledButton(onPressed: _loading ? null : _submit, child: Text(_loading ? 'Aguarde...' : widget.login ? 'Entrar' : 'Criar conta')),
        if (widget.login) TextButton(onPressed: _resetPassword, child: const Text('Esqueci minha senha')),
        TextButton(onPressed: () => context.go(widget.login ? '/register' : '/login'), child: Text(widget.login ? 'Criar conta' : 'Já tenho uma conta')),
      ])),
    )));
}
