# Allomancy

Allomancy ist ein früher Prototyp eines seitlich scrollenden 2D-Plattformspiels im Browser. Die geplante Kernmechanik ist das Ziehen und Stoßen an Metallobjekten.

## Start

Das Projekt benötigt zur Laufzeit keine Bibliotheken. Da die Level als JSON-Dateien geladen werden, muss es über einen lokalen Webserver geöffnet werden, zum Beispiel nach Installation von Node.js:

```sh
npx serve .
```

Anschließend die angezeigte lokale Adresse im Browser öffnen.

Der umfangreiche Level-Editor ist unter `/level-editor/` erreichbar. Er kann vorhandene Leveldateien importieren, bearbeiten, validieren und wieder im Format des Hauptspiels exportieren; Details stehen in `level-editor/README.md`.

## Steuerung

Die direkte Charaktersteuerung mit `A`, `D`, `W` und `S` ist testweise nur bei Bodenkontakt aktiv. In der Luft behält der Charakter seinen vorhandenen Impuls; Richtungsänderungen müssen dort über Allomantie erfolgen.

Trifft der Charakter beim Aufsteigen seitlich auf die oberen zwanzig Prozent einer freien Blockkante, greift er sie automatisch und zieht sich mit einer kurzen Animation auf den Block. Das Hochziehen wird nur gestartet, wenn über der Zielposition genügend Platz ist.

| Taste | Aktion |
| --- | --- |
| A / D | Nach links / rechts laufen |
| W | Springen |
| S | Ducken |
| Leertaste | Nahkampfangriff |
| Strg | Eine Münze aus dem Vorrat allomantisch abfeuern |
| Linke Maustaste halten | Vom Metallblock oder der Münze wegstoßen |
| Rechte Maustaste halten | Zum Metallblock oder zur Münze ziehen |
| Q | Gespeichertes Gewicht abrufen ein-/ausschalten |
| E | Gewicht speichern ein-/ausschalten |
| C | Geschwindigkeit speichern ein-/ausschalten |
| Shift | Gespeicherte Geschwindigkeit abrufen ein-/ausschalten |
| 1 | Weißblechverbrennung ein-/ausschalten |
| Esc | Pause ein-/ausschalten |
| R | Aktuellen Versuch neu starten |

Ziehen und Stoßen müssen nicht separat aktiviert werden. Solange die linke beziehungsweise rechte Maustaste gehalten wird, wirkt die passende Kraft auf den Metallblock oder die Münze, deren Verbindungslinie höchstens 30 Grad von der Richtung zum Cursor abweicht. Innerhalb dieses Zielkegels wird das Ziel gewählt, das dem Cursor am nächsten liegt; Ziele außerhalb der Reichweite werden ignoriert. Beim Loslassen endet die Kraft sofort. Die Stärke nimmt mit wachsender Entfernung ab. Das Kontextmenü des Browsers ist über der Spielfläche deaktiviert, damit der Rechtsklick ungestört zum Ziehen verwendet werden kann. Ziel des Testlevels ist das gelb markierte Ausgangs-Tile am rechten Ende. Es führt in ein zweites, weitgehend leeres Level; dessen Ausgang schließt die Demo ab.

Der Spieler beginnt jeden Versuch mit fünf Münzen. Jeder Fernkampfschuss verbraucht eine Münze; bei leerem Vorrat kann nicht geschossen werden. Die Münze fliegt in Richtung des Cursors, hinterlässt eine kurze allomantische Spur und wird von der Schwerkraft beeinflusst. Während sie aktiv gezogen oder gestoßen wird, ist die Gravitation ausgesetzt. Bei Bodenkontakt bleibt sie sofort liegen; an seitlichen Wänden prallt sie leicht ab. Münzen besitzen eine geringe allomantische Masse und reagieren dadurch deutlich stärker als der Charakter auf Ziehen und Stoßen. Schnelle Bewegungen werden für stabile Kollisionen in kleine Physikschritte aufgeteilt. Eine lose Münze wird durch Ziehen oder Stoßen selbst bewegt. Nur wenn die aktuelle Kraft sie gegen den Boden oder die Decke presst, dient sie als Anker und bewegt stattdessen den Charakter. Dieser Kontakt bleibt auch bei einer ruhenden Münze zuverlässig erhalten. Wird sie zum Spieler gezogen und erreicht ihn, wird sie eingesammelt und dem Vorrat zurückgegeben. Münzen verschwinden nicht mehr zeitbasiert.

## Weitere metallische Künste

Feruchemisches Eisen verändert das Gewicht des Charakters. Beim Speichern ist er leichter, springt höher, fällt langsamer und wird durch Metallkräfte stärker beschleunigt. Beim Abrufen wird er schwerer, fällt schneller und lässt sich weniger stark durch Metall bewegen. Die gespeicherte Gewichtsreserve reicht von 0 bis 100.

Allomantisches Weißblech erhöht Laufbeschleunigung, Höchstgeschwindigkeit, Sprungkraft, Angriffsgeschwindigkeit und Nahkampfreichweite, solange der Modus mit `1` eingeschaltet ist und noch Metallreserve vorhanden ist. Die Weißblechreserve regeneriert sich nicht automatisch.

Feruchemischer Stahl speichert körperliche Geschwindigkeit. Ist der Speichermodus mit `C` eingeschaltet, bewegt sich der Charakter langsamer und füllt seinen Speicher. Mit `Shift` wird der Abrufmodus für schnellere Bewegung, höhere Sprünge und beschleunigte Animationen ein- oder ausgeschaltet. Bei Eisen ruft `Q` Gewicht ab und `E` speichert es; die beiden Zustände schließen sich gegenseitig aus. Erreicht ein Eisen- oder Stahlspeicher sein Maximum, wird der jeweilige Speichermodus automatisch ausgeschaltet.

## Code-Struktur

Die Anwendung verwendet native ES-Module. `gameStates.js` steuert den allgemeinen Spielfluss, `gameRuntime.js` hält die gemeinsam benötigten Laufzeitreferenzen und `gameConfig.js` bündelt Konstanten. `coins.js` verwaltet Lebenszyklus und Darstellung der Münzen, `metal.js` übernimmt Metallziele und Kräfte, und `collisions.js` enthält die Münz-Tile-Kollisionen. Levelaufbau, Eingaben und Charakterlogik bleiben in ihren jeweiligen Dateien.

## Entwicklung

```sh
npm install
npm test
npm run lint
npm run format:check
```

Die Simulation nutzt einen festen Zeitschritt von 60 Hz. Das Zeichnen wird mit `requestAnimationFrame` an den Browser gekoppelt. `levels/manifest.json` führt alle Leveldateien auf und bestimmt über `startLevel` den Einstiegspunkt. Jedes Level besitzt eine eigene JSON-Datei mit Name, Größe und Spawnpunkt in Tile-Koordinaten. Rechteckige feste Geometrie steht unter `areas`; Metall, Ausgänge, Türen, Schalter und Gefahren sind eigenständige Einträge unter `objects`. Der optionale Wert `tile` wählt eine der 640 Grafiken aus `Tileset.png`; ohne ihn wird die jeweilige Standardgrafik verwendet.

Ein Ausgang wechselt nur dann in ein anderes Level, wenn sein `targetLevel` explizit auf eine Datei aus dem Manifest zeigt. Ein Ausgang ohne `targetLevel` beendet das Spiel. Schalter verweisen mit `targetDoor` auf die eindeutige ID einer Tür im selben Level. `levelCore.js` enthält die gemeinsam von Spiel, Editor und Tests verwendete Normalisierung, Validierung und Übergangslogik; `level.js` baut daraus die Laufzeitgeometrie und die getrennten Levelobjekte auf.

Die beiden Sprunglücken des Testlevels sind sechs Tiles tiefe Gruben mit festem Boden. Die linken und rechten Levelgrenzen sind für Spieler und Physikobjekte undurchlässig.

## Projektstruktur

- `main.js`: Initialisierung, gemeinsamer Spielzustand und Hauptschleife
- `gameConfig.js`: zentrale Bildschirm-, Physik- und Gameplay-Konfiguration
- `gameRuntime.js`: explizit geteilte Laufzeitreferenzen und Zustandswechsel
- `gameStates.js`: Spielfluss, Kamera, HUD und Zustandswechsel
- `coins.js`: Münz-Lebenszyklus, Physikaktualisierung und Darstellung
- `metal.js`: Metallziele, Allomantiekräfte und Verbindungslinien
- `collisions.js`: Kollisionen zwischen Münzen und Level-Tiles
- `hero.js`: Figur, Bewegung und Darstellung
- `inputs.js`: Tastatur- und Mauseingaben
- `levelCore.js`: gemeinsame Levelvalidierung, Objektmodell und Übergangslogik
- `level.js`: Laufzeitaufbau, Darstellung und Kollision der Levelgeometrie und -objekte
- `levels/manifest.json`: Leveldateien und explizites Startlevel
- `levels/level-*.json`: Geometrie, Objekte, Metadaten und Spawnpunkte der einzelnen Level
- `level-editor/editor.js`: Oberfläche und Interaktionssteuerung des Editors
- `level-editor/editor-model.js`: Import, Export und internes Editormodell
- `level-editor/editor-project.js`: Laden zusammengehöriger Levelprojekte
- `level-editor/editor-storage.js`: Downloads und lokale Entwürfe
- `level-editor/tileset-catalog.js`: eindeutige Tileset-Gruppen und Namen
- `level-editor/project-graph.js`: Darstellung der Levelverbindungen
- `MathLib.js`: testbare Winkel- und Umrechnungsfunktionen
- `tests/`: Tests für Mathematik, Leveldaten, Übergänge, Kollisionen und Metallkräfte

## Assets und Herkunft

Die Bergkulisse stammt von Luis Zuno (`@ansimuz`) und steht laut beiliegender Datei unter CC0; siehe `assets/parallax_mountain_pack/license.txt`.

`notes.txt` verweist als frühere Vorlage auf das Repository `ZeroDayArcade/HTML5_Platformer`. Für Tileset, Figuren-Sprites und Musik sind im Projekt aktuell keine eindeutigen Lizenzangaben hinterlegt. Diese sollten vor einer Veröffentlichung geklärt und ergänzt werden.
