# Allomancy

Allomancy ist ein früher Prototyp eines seitlich scrollenden 2D-Plattformspiels im Browser. Die geplante Kernmechanik ist das Ziehen und Stoßen an Metallobjekten.

## Start

Das Projekt benötigt zur Laufzeit keine Bibliotheken. Für zuverlässiges Laden von Audio und Assets sollte es über einen lokalen Webserver geöffnet werden, zum Beispiel nach Installation von Node.js:

```sh
npx serve .
```

Anschließend die angezeigte lokale Adresse im Browser öffnen.

## Steuerung

| Taste | Aktion |
| --- | --- |
| A / D | Nach links / rechts laufen |
| W | Springen |
| S | Ducken |
| Leertaste | Nahkampfangriff |
| Strg | Allomantisch beschleunigte Münze abfeuern |
| Maustaste 4 halten | Zum Metallblock ziehen, der dem Cursor am nächsten liegt |
| Maustaste 5 halten | Vom Metallblock wegstoßen, der dem Cursor am nächsten liegt |
| Q | Gewicht speichern ein-/ausschalten |
| E | Gespeichertes Gewicht abrufen ein-/ausschalten |
| C | Geschwindigkeit speichern ein-/ausschalten |
| Shift | Gespeicherte Geschwindigkeit abrufen ein-/ausschalten |
| F | Weißblechverbrennung ein-/ausschalten |
| Esc | Pause ein-/ausschalten |
| R | Aktuellen Versuch neu starten |

Ziehen und Stoßen müssen nicht separat aktiviert werden. Solange Maustaste 4 beziehungsweise Maustaste 5 gehalten wird, wirkt die passende Kraft auf den Metallblock, der dem Cursor am nächsten liegt und innerhalb der Reichweite liegt. Beim Loslassen endet die Kraft sofort. Die Stärke nimmt mit wachsender Entfernung ab. Die Zifferntasten `1` und `2` haben keine Funktion mehr. Ziel des Testlevels ist das gelb markierte Ausgangs-Tile am rechten Ende.

Die Münze fliegt in Richtung des Cursors, hinterlässt eine kurze allomantische Spur und wird von der Schwerkraft beeinflusst. Sie prallt stark gedämpft an Levelblöcken ab und kommt durch hohe Bodenreibung schnell zum Liegen. Bewegte Münzen werden durch Ziehen und Stoßen selbst beschleunigt; ruhende Münzen dienen dagegen als Anker und bewegen den Charakter. Erreicht eine bewegte Münze wieder den Spieler, wird sie eingesammelt. Nachdem sie zur Ruhe gekommen ist, verschwindet sie nach 15 Sekunden; während der letzten drei Sekunden blinkt sie.

## Weitere metallische Künste

Feruchemisches Eisen verändert das Gewicht des Charakters. Beim Speichern ist er leichter, springt höher, fällt langsamer und wird durch Metallkräfte stärker beschleunigt. Beim Abrufen wird er schwerer, fällt schneller und lässt sich weniger stark durch Metall bewegen. Die gespeicherte Gewichtsreserve reicht von 0 bis 100.

Allomantisches Weißblech erhöht Laufbeschleunigung, Höchstgeschwindigkeit, Sprungkraft, Angriffsgeschwindigkeit und Nahkampfreichweite, solange der Modus mit `F` eingeschaltet ist und noch Metallreserve vorhanden ist. Die Weißblechreserve regeneriert sich nicht automatisch.

Feruchemischer Stahl speichert körperliche Geschwindigkeit. Ist der Speichermodus mit `C` eingeschaltet, bewegt sich der Charakter langsamer und füllt seinen Speicher. Mit `Shift` wird der Abrufmodus für schnellere Bewegung, höhere Sprünge und beschleunigte Animationen ein- oder ausgeschaltet. Eisen funktioniert entsprechend mit `Q` und `E`; die beiden Zustände schließen sich jeweils gegenseitig aus.

## Entwicklung

```sh
npm install
npm test
npm run lint
npm run format:check
```

Die Simulation nutzt einen festen Zeitschritt von 60 Hz. Das Zeichnen wird mit `requestAnimationFrame` an den Browser gekoppelt. Level bestehen derzeit aus zweidimensionalen Zahlenfeldern: `0` ist leer, `1` ist ein normales festes Tile und `2` ein festes Metall-Tile.

`level.js` bleibt wegen der großen, eingebetteten Levelmatrix von der automatischen Formatprüfung ausgenommen.

## Projektstruktur

- `main.js`: Initialisierung, gemeinsamer Spielzustand und Hauptschleife
- `gameStates.js`: Update und Rendering der Spielzustände
- `hero.js`: Figur, Bewegung und Darstellung
- `inputs.js`: Tastatur- und Mauseingaben
- `level.js`: Testlevel, Tiles, Kollisionen, Metallpositionen und Levelziel
- `MathLib.js`: testbare Winkel- und Umrechnungsfunktionen

## Assets und Herkunft

Die Bergkulisse stammt von Luis Zuno (`@ansimuz`) und steht laut beiliegender Datei unter CC0; siehe `assets/parallax_mountain_pack/license.txt`.

`notes.txt` verweist als frühere Vorlage auf das Repository `ZeroDayArcade/HTML5_Platformer`. Für Tileset, Figuren-Sprites und Musik sind im Projekt aktuell keine eindeutigen Lizenzangaben hinterlegt. Diese sollten vor einer Veröffentlichung geklärt und ergänzt werden.
