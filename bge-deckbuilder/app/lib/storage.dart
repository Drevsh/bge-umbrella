import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart' show ThemeMode;
import 'package:path_provider/path_provider.dart';

import 'models.dart';

const storageVersion = 1;

class AppSettings {
  const AppSettings({this.themeMode = ThemeMode.system});

  final ThemeMode themeMode;

  Map<String, dynamic> toJson() => {
    'themeMode': themeMode.name,
  };

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    final modeName = json['themeMode'] as String?;
    final mode = ThemeMode.values.firstWhere(
      (m) => m.name == modeName,
      orElse: () => ThemeMode.system,
    );
    return AppSettings(themeMode: mode);
  }
}

class ImportPreview {
  ImportPreview(this.loadouts, this.unknownCards, this.catalogVersion);
  final List<Loadout> loadouts;
  final Set<String> unknownCards;
  final int catalogVersion;
}

class LocalStore {
  LocalStore(this.directory);
  final Directory directory;

  static Future<LocalStore> open() async =>
      LocalStore(await getApplicationDocumentsDirectory());
  File get file =>
      File('${directory.path}${Platform.pathSeparator}deck_builder.json');
  File get settingsFile =>
      File('${directory.path}${Platform.pathSeparator}settings.json');

  Future<AppSettings> readSettings() async {
    if (!await settingsFile.exists()) return const AppSettings();
    try {
      final json =
          jsonDecode(await settingsFile.readAsString()) as Map<String, dynamic>;
      return AppSettings.fromJson(json);
    } catch (_) {
      return const AppSettings();
    }
  }

  Future<void> writeSettings(AppSettings settings) async {
    await directory.create(recursive: true);
    await settingsFile.writeAsString(
      jsonEncode(settings.toJson()),
      flush: true,
    );
  }

  Future<List<Loadout>> read() async {
    final backup = File('${file.path}.bak');
    if (!await file.exists() && await backup.exists()) {
      await backup.rename(file.path);
    }
    if (!await file.exists()) return [];
    final json = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
    if (json['formatVersion'] != storageVersion) {
      throw FormatException(
        'Unsupported save version ${json['formatVersion']}.',
      );
    }
    return (json['loadouts'] as List)
        .map((item) => Loadout.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> write(List<Loadout> loadouts, int catalogVersion) async {
    await directory.create(recursive: true);
    final temporary = File('${file.path}.tmp');
    final payload = exportJson(loadouts, catalogVersion);
    await temporary.writeAsString(payload, flush: true);
    // Windows rename does not replace an existing destination; keep a backup until the new save is in place.
    final backup = File('${file.path}.bak');
    if (await backup.exists()) await backup.delete();
    if (await file.exists()) await file.rename(backup.path);
    try {
      await temporary.rename(file.path);
      if (await backup.exists()) await backup.delete();
    } catch (_) {
      if (await backup.exists() && !await file.exists()) {
        await backup.rename(file.path);
      }
      rethrow;
    }
  }

  Future<File> exportFile(List<Loadout> loadouts, int catalogVersion) async {
    await directory.create(recursive: true);
    final output = File(
      '${directory.path}${Platform.pathSeparator}dragon_eclipse_export.json',
    );
    await output.writeAsString(
      exportJson(loadouts, catalogVersion),
      flush: true,
    );
    return output;
  }
}

String exportJson(List<Loadout> loadouts, int catalogVersion) =>
    const JsonEncoder.withIndent('  ').convert({
      'formatVersion': storageVersion,
      'catalogVersion': catalogVersion,
      'loadouts': loadouts.map((item) => item.toJson()).toList(),
    });

ImportPreview previewImport(String source, Catalog catalog) {
  final decoded = jsonDecode(source);
  if (decoded is! Map<String, dynamic>) {
    throw const FormatException('Expected a JSON object.');
  }
  if (decoded['formatVersion'] != storageVersion) {
    throw FormatException(
      'Unsupported export version ${decoded['formatVersion']}.',
    );
  }
  final version = decoded['catalogVersion'];
  if (version is! int || version > catalog.schemaVersion) {
    throw FormatException('Unsupported catalog version $version.');
  }
  final raw = decoded['loadouts'];
  if (raw is! List) throw const FormatException('Missing loadouts list.');
  final loadouts = raw
      .map((value) => Loadout.fromJson(value as Map<String, dynamic>))
      .toList();
  final unknown = <String>{};
  for (final loadout in loadouts) {
    for (final deck in loadout.decks) {
      unknown.addAll(
        deck.cards.keys.where((id) => !catalog.cardsById.containsKey(id)),
      );
    }
  }
  return ImportPreview(loadouts, unknown, version);
}

int mergeImport(List<Loadout> existing, ImportPreview preview) {
  var added = 0;
  for (final incoming in preview.loadouts) {
    final match = existing.where((item) => item.id == incoming.id).firstOrNull;
    if (match != null && match.canonicalJson() == incoming.canonicalJson()) {
      continue;
    }
    if (match != null) {
      var suffix = 1;
      final base = incoming.id;
      while (existing.any((item) => item.id == '${base}_import_$suffix')) {
        suffix++;
      }
      incoming.id = '${base}_import_$suffix';
      incoming.name = '${incoming.name} (imported)';
    }
    existing.add(incoming);
    added++;
  }
  return added;
}
