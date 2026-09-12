# Allomancy

Allomancy ist ein früher Prototyp eines seitlich scrollenden 2D-Plattformspiels im Browser. Die geplante Kernmechanik ist das Ziehen und Stoßen an Metallobjekten.

## Start

Das Projekt benötigt zur Laufzeit keine Bibliotheken. Für zuverlässiges Laden von Audio und Assets sollte es über einen lokalen Webserver geöffnet werden, zum Beispiel nach Installation von Node.js:

```sh
npx serve .
```

Anschließend die angezeigte lokale Adresse im Browser öffnen.

## Steuerung

Die direkte Charaktersteuerung mit `A`, `D`, `W` und `S` ist testweise nur bei Bodenkontakt aktiv. In der Luft behält der Charakter seinen vorhandenen Impuls; Richtungsänderungen müssen dort über Allomantie erfolgen.

| Taste | Aktion |
| --- | --- |
| A / D | Nach links / rechts laufen |
| W | Springen |
| S | Ducken |
| Leertaste | Nahkampfangriff |
| Strg | Eine Münze aus dem Vorrat allomantisch abfeuern |
| Maustaste 4 halten | Zum Metallblock ziehen, der dem Cursor am nächsten liegt |
| Maustaste 5 halten | Vom Metallblock wegstoßen, der dem Cursor am nächsten liegt |
| Q | Gespeichertes Gewicht abrufen ein-/ausschalten |
| E | Gewicht speichern ein-/ausschalten |
| C | Geschwindigkeit speichern ein-/ausschalten |
| Shift | Gespeicherte Geschwindigkeit abrufen ein-/ausschalten |
| F | Weißblechverbrennung ein-/ausschalten |
| Esc | Pause ein-/ausschalten |
| R | Aktuellen Versuch neu starten |

Ziehen und Stoßen müssen nicht separat aktiviert werden. Solange Maustaste 4 beziehungsweise Maustaste 5 gehalten wird, wirkt die passende Kraft auf den Metallblock, der dem Cursor am nächsten liegt und innerhalb der Reichweite liegt. Beim Loslassen endet die Kraft sofort. Die Stärke nimmt mit wachsender Entfernung ab. Die Zifferntasten `1` und `2` haben keine Funktion mehr. Ziel des Testlevels ist das gelb markierte Ausgangs-Tile am rechten Ende. Es führt in ein zweites, weitgehend leeres Level; dessen Ausgang schließt die Demo ab.

Der Spieler beginnt jeden Versuch mit fünf Münzen. Jeder Fernkampfschuss verbraucht eine Münze; bei leerem Vorrat kann nicht geschossen werden. Die Münze fliegt in Richtung des Cursors, hinterlässt eine kurze allomantische Spur und wird von der Schwerkraft beeinflusst. Während sie aktiv gezogen oder gestoßen wird, ist die Gravitation ausgesetzt. Bei Bodenkontakt bleibt sie sofort liegen; an seitlichen Wänden prallt sie leicht ab. Münzen besitzen eine geringe allomantische Masse und reagieren dadurch deutlich stärker als der Charakter auf Ziehen und Stoßen. Schnelle Bewegungen werden für stabile Kollisionen in kleine Physikschritte aufgeteilt. Eine lose Münze wird durch Ziehen oder Stoßen selbst bewegt. Nur wenn die aktuelle Kraft sie gegen den Boden oder die Decke presst, dient sie als Anker und bewegt stattdessen den Charakter. Dieser Kontakt bleibt auch bei einer ruhenden Münze zuverlässig erhalten. Wird sie zum Spieler gezogen und erreicht ihn, wird sie eingesammelt und dem Vorrat zurückgegeben. Münzen verschwinden nicht mehr zeitbasiert.

## Weitere metallische Künste

Feruchemisches Eisen verändert das Gewicht des Charakters. Beim Speichern ist er leichter, springt höher, fällt langsamer und wird durch Metallkräfte stärker beschleunigt. Beim Abrufen wird er schwerer, fällt schneller und lässt sich weniger stark durch Metall bewegen. Die gespeicherte Gewichtsreserve reicht von 0 bis 100.

Allomantisches Weißblech erhöht Laufbeschleunigung, Höchstgeschwindigkeit, Sprungkraft, Angriffsgeschwindigkeit und Nahkampfreichweite, solange der Modus mit `F` eingeschaltet ist und noch Metallreserve vorhanden ist. Die Weißblechreserve regeneriert sich nicht automatisch.

Feruchemischer Stahl speichert körperliche Geschwindigkeit. Ist der Speichermodus mit `C` eingeschaltet, bewegt sich der Charakter langsamer und füllt seinen Speicher. Mit `Shift` wird der Abrufmodus für schnellere Bewegung, höhere Sprünge und beschleunigte Animationen ein- oder ausgeschaltet. Bei Eisen ruft `Q` Gewicht ab und `E` speichert es; die beiden Zustände schließen sich gegenseitig aus. Erreicht ein Eisen- oder Stahlspeicher sein Maximum, wird der jeweilige Speichermodus automatisch ausgeschaltet.

## Entwicklung

```sh
npm install
npm test
npm run lint
npm run format:check
```

Die Simulation nutzt einen festen Zeitschritt von 60 Hz. Das Zeichnen wird mit `requestAnimationFrame` an den Browser gekoppelt. Level bestehen derzeit aus zweidimensionalen Zahlenfeldern: `0` ist leer, `1` ist ein normales festes Tile und `2` ein festes Metall-Tile.

Die beiden Sprunglücken des Testlevels sind sechs Tiles tiefe Gruben mit festem Boden. Die linken und rechten Levelgrenzen sind für Spieler und Physikobjekte undurchlässig.

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
