import 'dart:convert';
import 'dart:io';

import 'package:dragon_eclipse_deck_builder/models.dart';
import 'package:dragon_eclipse_deck_builder/settings_view.dart';
import 'package:dragon_eclipse_deck_builder/storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Catalog catalog;
  late Directory tempDir;
  late LocalStore store;

  setUpAll(() {
    catalog = Catalog.fromJson(
      jsonDecode(File('data/catalog.json').readAsStringSync())
          as Map<String, dynamic>,
    );
    tempDir = Directory.systemTemp.createTempSync('settings_test_');
    store = LocalStore(tempDir);
  });

  setUp(() {
    try {
      if (store.settingsFile.existsSync()) {
        store.settingsFile.deleteSync();
      }
    } catch (_) {}
  });

  group('AppSettings model', () {
    test('defaults to ThemeMode.system', () {
      const settings = AppSettings();
      expect(settings.themeMode, ThemeMode.system);
    });

    test('serializes to JSON correctly', () {
      const sSystem = AppSettings(themeMode: ThemeMode.system);
      expect(sSystem.toJson(), {'themeMode': 'system'});

      const sLight = AppSettings(themeMode: ThemeMode.light);
      expect(sLight.toJson(), {'themeMode': 'light'});

      const sDark = AppSettings(themeMode: ThemeMode.dark);
      expect(sDark.toJson(), {'themeMode': 'dark'});
    });

    test('deserializes from JSON correctly', () {
      expect(
        AppSettings.fromJson({'themeMode': 'system'}).themeMode,
        ThemeMode.system,
      );
      expect(
        AppSettings.fromJson({'themeMode': 'light'}).themeMode,
        ThemeMode.light,
      );
      expect(
        AppSettings.fromJson({'themeMode': 'dark'}).themeMode,
        ThemeMode.dark,
      );
    });

    test('deserializes unknown or missing value to ThemeMode.system', () {
      expect(
        AppSettings.fromJson({}).themeMode,
        ThemeMode.system,
      );
      expect(
        AppSettings.fromJson({'themeMode': 'invalid_mode'}).themeMode,
        ThemeMode.system,
      );
    });
  });

  group('LocalStore settings persistence', () {
    test('reads default AppSettings when settings.json does not exist', () async {
      final settings = await store.readSettings();
      expect(settings.themeMode, ThemeMode.system);
    });

    test('writes and reads AppSettings successfully', () async {
      await store.writeSettings(const AppSettings(themeMode: ThemeMode.dark));
      final read = await store.readSettings();
      expect(read.themeMode, ThemeMode.dark);

      expect(await store.settingsFile.exists(), isTrue);
      final raw = jsonDecode(await store.settingsFile.readAsString());
      expect(raw, {'themeMode': 'dark'});
    });

    test('gracefully recovers with default AppSettings on corrupt settings file', () async {
      await store.settingsFile.writeAsString('NOT_A_VALID_JSON{:::');
      final settings = await store.readSettings();
      expect(settings.themeMode, ThemeMode.system);
    });
  });

  group('SettingsView widget', () {
    testWidgets('renders appearance options and database info', (tester) async {
      AppSettings currentSettings = const AppSettings(themeMode: ThemeMode.system);

      await tester.pumpWidget(
        MaterialApp(
          home: SettingsView(
            catalog: catalog,
            store: store,
            settings: currentSettings,
            onSettingsChanged: (s) => currentSettings = s,
          ),
        ),
      );

      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Appearance'), findsOneWidget);
      expect(find.text('System default'), findsOneWidget);
      expect(find.text('Light'), findsOneWidget);
      expect(find.text('Dark'), findsOneWidget);
      expect(find.text('Catalog & Storage'), findsOneWidget);
      expect(find.textContaining('Catalog version:'), findsOneWidget);
      expect(find.textContaining(store.file.path), findsOneWidget);
    });

    testWidgets('switching theme calls callback', (tester) async {
      AppSettings currentSettings = const AppSettings(themeMode: ThemeMode.system);
      AppSettings? reportedSettings;

      await tester.pumpWidget(
        MaterialApp(
          home: SettingsView(
            catalog: catalog,
            store: store,
            settings: currentSettings,
            onSettingsChanged: (s) {
              currentSettings = s;
              reportedSettings = s;
            },
          ),
        ),
      );

      // Tap 'Dark' option
      await tester.tap(find.text('Dark'));
      await tester.pumpAndSettle();

      expect(reportedSettings?.themeMode, ThemeMode.dark);
      expect(currentSettings.themeMode, ThemeMode.dark);

      // Tap 'Light' option
      await tester.tap(find.text('Light'));
      await tester.pumpAndSettle();

      expect(reportedSettings?.themeMode, ThemeMode.light);
      expect(currentSettings.themeMode, ThemeMode.light);
    });
  });
}
