class AppEnvironment {
  const AppEnvironment({
    required this.supabaseUrl,
    required this.supabasePublishableKey,
  });

  factory AppEnvironment.fromDartDefines() => const AppEnvironment(
        supabaseUrl: String.fromEnvironment('SUPABASE_URL'),
        supabasePublishableKey:
            String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
      );

  final String supabaseUrl;
  final String supabasePublishableKey;

  bool get isConfigured =>
      supabaseUrl.isNotEmpty && supabasePublishableKey.isNotEmpty;
}
