sealed class AppException implements Exception {
  const AppException(this.message);
  final String message;
}

class CavernAuthException extends AppException {
  const CavernAuthException(super.message);
}

class NetworkException extends AppException {
  const NetworkException(super.message);
}

class StorageException extends AppException {
  const StorageException(super.message);
}

class DatabaseException extends AppException {
  const DatabaseException(super.message);
}

class PdfException extends AppException {
  const PdfException(super.message);
}

class SyncException extends AppException {
  const SyncException(super.message);
}
