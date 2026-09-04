import 'package:cavern_project/core/errors/app_exception.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

class AuthRepository {
  AuthRepository(this._client);
  final supabase.SupabaseClient _client;

  Future<void> signIn({required String email, required String password}) async {
    try {
      await _client.auth.signInWithPassword(email: email, password: password);
    } on supabase.AuthException catch (error) {
      throw CavernAuthException(error.message);
    }
  }

  Future<void> signUp({required String email, required String password, required String displayName}) async {
    try {
      await _client.auth.signUp(email: email, password: password, data: {'display_name': displayName});
    } on supabase.AuthException catch (error) {
      throw CavernAuthException(error.message);
    }
  }

  Future<void> resetPassword(String email) => _client.auth.resetPasswordForEmail(email);
  Future<void> signOut() => _client.auth.signOut();
}
