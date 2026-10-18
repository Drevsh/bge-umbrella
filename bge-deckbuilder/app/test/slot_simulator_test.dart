import 'dart:convert';
import 'dart:io';

import 'package:dragon_eclipse_deck_builder/models.dart';
import 'package:dragon_eclipse_deck_builder/slot_simulator.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Catalog catalog;

  setUpAll(() {
    catalog = Catalog.fromJson(
      jsonDecode(File('data/catalog.json').readAsStringSync())
          as Map<String, dynamic>,
    );
  });

  group('SlotSimulatorModel logic', () {
    test('handles empty deck gracefully', () {
      final deck = Deck(
        id: 'deck-empty',
        name: 'Empty Deck',
        mystlingId: 'eldrithia',
        cards: {},
      );

      final model = SlotSimulatorModel(catalog, deck);
      expect(model.totalCards, 0);
      expect(model.slots, [null, null, null, null]);
      expect(model.drawPile, isEmpty);
      expect(model.discardPile, isEmpty);
      expect(model.energy, 0);

      // Playing any slot is a no-op
      model.playCard(0);
      model.playCard(3);
      expect(model.energy, 0);
      expect(model.discardPile, isEmpty);
    });

    test('deals rightmost slots first when deck has fewer than 4 cards', () {
      final c1 = catalog.cards[0].id;
      final c2 = catalog.cards[1].id;
      final deck = Deck(
        id: 'deck-small',
        name: 'Small Deck',
        mystlingId: 'eldrithia',
        cards: {c1: 1, c2: 1},
      );

      final model = SlotSimulatorModel(catalog, deck);
      expect(model.totalCards, 2);
      expect(model.drawPile, isEmpty);
      // Slots 0 and 1 should be empty, Slots 2 and 3 should be occupied
      expect(model.slots[0], isNull);
      expect(model.slots[1], isNull);
      expect(model.slots[2], isNotNull);
      expect(model.slots[3], isNotNull);
    });

    test('slot energy values match 1, 2, 2, 3', () {
      expect(SlotSimulatorModel.slotEnergy, [1, 2, 2, 3]);
    });

    test('playing Slot 4 (index 3) grants +3 energy, shifts right, and refills Slot 1 (index 0)', () {
      // Create a deck with 6 distinct cards to trace movement
      final deckCards = <String, int>{};
      for (int i = 0; i < 6; i++) {
        deckCards[catalog.cards[i].id] = 1;
      }
      final deck = Deck(
        id: 'deck-6',
        name: 'Six Card Deck',
        mystlingId: 'eldrithia',
        cards: deckCards,
      );

      final model = SlotSimulatorModel(catalog, deck);
      expect(model.drawPile.length, 2);
      expect(model.slots.where((c) => c != null).length, 4);

      final slot0Before = model.slots[0];
      final slot1Before = model.slots[1];
      final slot2Before = model.slots[2];
      final slot3Before = model.slots[3];

      // Play slot 3 (Slot 4 in UI)
      model.playCard(3);

      expect(model.energy, 3);
      expect(model.discardPile, [slot3Before]);
      expect(model.drawPile.length, 1);

      // Remaining cards (slot 0, 1, 2) shift right to become slot 1, 2, 3
      expect(model.slots[1], slot0Before);
      expect(model.slots[2], slot1Before);
      expect(model.slots[3], slot2Before);
      // Slot 0 is refilled from draw pile
      expect(model.slots[0], isNotNull);
      expect(model.slots[0], isNot(slot0Before));
    });

    test('playing Slot 2 (index 1) grants +2 energy and shifts remaining cards to the right', () {
      final deckCards = <String, int>{};
      for (int i = 0; i < 5; i++) {
        deckCards[catalog.cards[i].id] = 1;
      }
      final deck = Deck(
        id: 'deck-5',
        name: 'Five Card Deck',
        mystlingId: 'eldrithia',
        cards: deckCards,
      );

      final model = SlotSimulatorModel(catalog, deck);
      final s0 = model.slots[0];
      final s1 = model.slots[1];
      final s2 = model.slots[2];
      final s3 = model.slots[3];

      // Play slot 1 (Slot 2 in UI, awards 2 energy)
      model.playCard(1);

      expect(model.energy, 2);
      expect(model.discardPile, [s1]);

      // Before refill: Remaining cards were [s0, s2, s3].
      // When shifted right in 4 slots: [null, s0, s2, s3].
      // Then Slot 0 is refilled from draw pile.
      expect(model.slots[1], s0);
      expect(model.slots[2], s2);
      expect(model.slots[3], s3);
      expect(model.slots[0], isNotNull);
    });

    test('playing Slot 1 (index 0) grants +1 energy and Slot 3 (index 2) grants +2 energy', () {
      final deckCards = <String, int>{};
      for (int i = 0; i < 8; i++) {
        deckCards[catalog.cards[i].id] = 1;
      }
      final deck = Deck(
        id: 'deck-8',
        name: 'Eight Card Deck',
        mystlingId: 'eldrithia',
        cards: deckCards,
      );

      final model = SlotSimulatorModel(catalog, deck);

      // Play slot 0 (+1 energy)
      model.playCard(0);
      expect(model.energy, 1);

      // Play slot 2 (+2 energy) -> total 3 energy
      model.playCard(2);
      expect(model.energy, 3);
    });

    test('deck exhaustion leaves open slots on the left, recycling reshuffles discard', () {
      final deckCards = <String, int>{};
      for (int i = 0; i < 4; i++) {
        deckCards[catalog.cards[i].id] = 1;
      }
      final deck = Deck(
        id: 'deck-4',
        name: 'Four Card Deck',
        mystlingId: 'eldrithia',
        cards: deckCards,
      );

      final model = SlotSimulatorModel(catalog, deck);
      expect(model.drawPile, isEmpty);

      // Play slot 3
      model.playCard(3);
      expect(model.energy, 3);
      expect(model.discardPile.length, 1);
      // Because draw pile is empty, Slot 0 remains null, slots 1..3 occupied
      expect(model.slots[0], isNull);
      expect(model.slots[1], isNotNull);
      expect(model.slots[2], isNotNull);
      expect(model.slots[3], isNotNull);

      // Play slot 3 again
      model.playCard(3);
      // Slots 0 and 1 are null, slots 2 and 3 occupied
      expect(model.slots[0], isNull);
      expect(model.slots[1], isNull);
      expect(model.slots[2], isNotNull);
      expect(model.slots[3], isNotNull);
      expect(model.discardPile.length, 2);

      // Recycle discard back into draw pile and fill open slots
      model.recycleDiscard();
      expect(model.discardPile, isEmpty);
      // Both open slots (0 and 1) should now be refilled
      expect(model.slots[0], isNotNull);
      expect(model.slots[1], isNotNull);
      expect(model.slots[2], isNotNull);
      expect(model.slots[3], isNotNull);
    });

    test('energy adjustments and clear work as expected', () {
      final deck = Deck(
        id: 'deck-energy',
        name: 'Energy Deck',
        mystlingId: 'eldrithia',
        cards: {catalog.cards[0].id: 4},
      );

      final model = SlotSimulatorModel(catalog, deck);
      expect(model.energy, 0);

      model.modifyEnergy(3);
      expect(model.energy, 3);

      model.modifyEnergy(2);
      expect(model.energy, 5);

      model.modifyEnergy(-1);
      expect(model.energy, 4);

      // Cannot decrease below zero
      model.modifyEnergy(-10);
      expect(model.energy, 0);

      model.modifyEnergy(4);
      model.clearEnergy();
      expect(model.energy, 0);
    });
  });

  group('SlotSimulatorView widget', () {
    testWidgets('displays empty state when deck has no cards', (tester) async {
      final deck = Deck(
        id: 'deck-empty-ui',
        name: 'Empty Deck',
        mystlingId: 'eldrithia',
        cards: {},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SlotSimulatorView(catalog: catalog, deck: deck),
          ),
        ),
      );

      expect(find.text('No cards in Empty Deck'), findsOneWidget);
      expect(find.text('Add cards to your deck to run the Action Slot simulator.'), findsOneWidget);
      expect(find.text('Back to Deck Builder'), findsOneWidget);
    });

    testWidgets('renders conveyor slots, energy HUD, and plays cards', (tester) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final deckCards = <String, int>{};
      for (int i = 0; i < 6; i++) {
        deckCards[catalog.cards[i].id] = 1;
      }
      final deck = Deck(
        id: 'deck-full-ui',
        name: 'Battle Deck',
        mystlingId: 'eldrithia',
        cards: deckCards,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SlotSimulatorView(catalog: catalog, deck: deck),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Battle Deck Slot Simulator'), findsOneWidget);
      expect(find.text('4-Slot Conveyor: Shift Right & Refill'), findsOneWidget);

      // Verify energy headers / badges exist: Slot 1 (+1⚡), Slot 2 (+2⚡), Slot 3 (+2⚡), Slot 4 (+3⚡)
      expect(find.textContaining('Slot 1'), findsOneWidget);
      expect(find.textContaining('Slot 2'), findsOneWidget);
      expect(find.textContaining('Slot 3'), findsOneWidget);
      expect(find.textContaining('Slot 4'), findsOneWidget);

      // Find Play buttons: there should be 4 play buttons initially
      final playButtons = find.textContaining('Play (+');
      expect(playButtons, findsNWidgets(4));

      // Initial energy is 0
      expect(find.text('0 Energy'), findsOneWidget);

      // Play card in Slot 4 (the last play button in left-to-right order)
      await tester.tap(playButtons.last);
      await tester.pumpAndSettle();

      // Energy should now be 3!
      expect(find.text('3 Energy'), findsOneWidget);

      // Test manual energy + button
      final addEnergyButton = find.byIcon(Icons.add_circle_outline);
      await tester.tap(addEnergyButton);
      await tester.pumpAndSettle();
      expect(find.text('4 Energy'), findsOneWidget);

      // Test manual energy - button
      final removeEnergyButton = find.byIcon(Icons.remove_circle_outline);
      await tester.tap(removeEnergyButton);
      await tester.pumpAndSettle();
      expect(find.text('3 Energy'), findsOneWidget);

      // Test Reset button in header
      final resetButton = find.byIcon(Icons.refresh);
      await tester.tap(resetButton);
      await tester.pumpAndSettle();

      // After reset, energy returns to 0
      expect(find.text('0 Energy'), findsOneWidget);
    });
  });
}
