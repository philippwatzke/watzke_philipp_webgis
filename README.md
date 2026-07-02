# NATO-Verteidigungsausgaben WebGIS

Dieses Projekt stellt die NATO-Verteidigungsausgaben aller aktuellen Mitgliedstaaten als lokal startbares Open-Source-WebGIS bereit. Die Daten wurden bereits recherchiert und liegen als CSV, GeoJSON und GeoPackage vor. GeoPackage dient dabei als portable Austausch- und QGIS-Exportdatei; der aktuell laufende WebGIS-Stack nutzt PostgreSQL/PostGIS als Dienst-Backend. Der Ausbau ergänzt GeoServer, OGC-Dienste, SLD-Styles, eine Leaflet-Hauptkarte, eine zusätzliche MapLibre-Ansicht, QGIS-Projektdateien und eine prüfungsgeeignete Dokumentation.

## Ordnerstruktur

```text
watzke_philipp_webgis/
|-- data/
|   |-- nato_defence_spending.csv
|   |-- nato_defence_spending.geojson
|   `-- nato_defence_spending.gpkg
|-- docker/
|   |-- docker-compose.yml
|   `-- geoserver-init/
|       `-- init-geoserver.sh
|-- geoserver/
|   `-- styles/
|       |-- nato_actual_pct_gdp.sld
|       |-- nato_gap_pct_points.sld
|       `-- nato_target_pct_gdp.sld
|-- qgis/
|   `-- nato_defence_spending.qgz
|-- webapp/
|   |-- index.html
|   |-- maplibre.html
|   |-- css/
|   |   `-- style.css
|   `-- js/
|       `-- main.js
|-- doku/
|   `-- watzke_philipp_webgis_dokumentation.pdf
|-- screenshots/
|   |-- screenshot_1.png
|   |-- screenshot_2.png
|   |-- screenshot_3.png
|   `-- screenshot_4.png
|-- scripts/
|   `-- validate_project.py
`-- README.md
```

## Voraussetzungen

- Docker Desktop mit Docker Compose v2
- Aktueller Desktop-Browser
- Optional: QGIS 3.x für die Sichtprüfung des GeoPackages
- Optional: Python mit `pandas` und `geopandas` für die Validierung

## Setup mit Docker

```bash
cd docker
docker compose up
```

Der Compose-Stack startet:

- GeoServer auf `http://localhost:8080/geoserver`
- PostgreSQL/PostGIS auf `localhost:5432`
- einen Loader, der `data/nato_defence_spending.gpkg` beim Start nach PostGIS importiert
- einen einmaligen Initialisierungscontainer für Workspace, Datastore, Layer und Styles
- die Webapp auf `http://localhost:8000`

GeoServer-Login:

```text
Benutzer: admin
Passwort: geoserver
```

## Wichtige URLs

Webapp:

```text
http://localhost:8000
```

GeoServer:

```text
http://localhost:8080/geoserver
```

Beispiel-WMS:

```text
http://localhost:8080/geoserver/nato/wms?service=WMS&version=1.1.1&request=GetMap&layers=nato:nato_defence_spending&styles=nato_actual_pct_gdp&srs=EPSG:4326&bbox=-180,-25,180,85&width=1000&height=620&format=image/png&transparent=true
```

Beispiel-WFS:

```text
http://localhost:8080/geoserver/nato/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=nato:nato_defence_spending&outputFormat=application/json&srsName=EPSG:4326
```

Beispiel-GetLegendGraphic:

```text
http://localhost:8080/geoserver/nato/wms?service=WMS&request=GetLegendGraphic&version=1.0.0&format=image/png&layer=nato:nato_defence_spending&style=nato_actual_pct_gdp
```

## Webapp

Die Hauptanwendung unter `http://localhost:8000` wurde zu einem hochmodernen, reaktiven Dashboard im Glassmorphism-Design ausgebaut. Sie integriert zwei eigenständige Map-Engines, die über einen Sun/Moon-Button im Sidebar-Header gekoppelt sind:

- **Heller Standardmodus (Leaflet)**: Rendert die Choropleth-Karten als WMS-Layer aus dem GeoServer (konsumiert OGC-Dienste) und bindet WFS-Attribute für interaktive Popups ein. Zudem steht ein interaktiver Swipe-Vergleichsschieber bereit.
- **WebGL-Dunkelmodus (MapLibre GL JS)**: Startet bei Klick auf den Moon-Button. MapLibre lädt die NATO-Grenzpolygone direkt über den WFS-Endpunkt des GeoServers als GeoJSON und symbolisiert sie clientseitig datengetrieben mit performanten Expressions in neonfarbenen Cyber-Styles.
- **Extent-Synchronisation**: Beim Wechsel der Modi wird der Bildausschnitt (Mittelpunkt und Zoomstufe) der beiden Kartendienste latenzfrei bidirektional synchronisiert.

Verfügbare Ansichten:

- Ist-Ausgaben in Prozent des BIP
- Abstand zum 5-%-Ziel in Prozentpunkten

Der Zielwert wird im Datensatz, im Info-Bereich und in den Popups dokumentiert, aber nicht als eigene Kartenansicht angeboten, weil alle Alliierten laut Hague Summit Declaration denselben Zielwert von 5 % des BIP bis 2035 haben. Eine Zielwert-Choroplethenkarte würde alle NATO-Mitglieder mit derselben Klasse darstellen; dadurch entstünde keine räumliche Differenzierung und kein zusätzlicher kartografischer Erkenntniswert. Die eigentliche Gegenüberstellung erfolgt deshalb über Ist-Ausgaben und Abstand zum konstanten Zielwert.

## Bonusfunktionen

Umgesetzt wurden alle empfohlenen Bonusfunktionen des Moduls, aufbereitet in einer hochmodernen Benutzeroberfläche:

- **PostGIS-Datenbackend**: PostgreSQL/PostGIS-Backend statt einfacher GeoPackage-Veröffentlichung (GPKG wird beim Docker-Start automatisch via `ogr2ogr` importiert).
- **Zwei Map-Bibliotheken (Leaflet + MapLibre GL JS)**: Vollständig integriert in ein gemeinsames Dashboard mit automatischer Viewport- und Zoom-Synchronisierung.
- **Zusätzliche Ansichten**: Abstand zum 5-%-Ziel als eigene Choropleth-Karte ("Lücke").
- **Swipe-Vergleich**: Echtzeit-Vergleichsschieber in Leaflet (links Ist-Ausgaben, rechts Abstand).
- **Mehrere Basiskarten mit Umschalter**: OSM Light und CARTO Positron im hellen Modus, CARTO Dark Matter im dunklen MapLibre-Modus.
- **Responsive Web-Interface**: Fließendes, zweispaltiges Grid, das auf kleinen Bildschirmen/Tablets automatisch in ein mobiles Split-Layout umbricht.

## Bekannte Einschränkungen

- Die NATO-Werte für 2024 und 2025 sind Schätzungen der NATO-Quelle.
- Deutschland nutzt 2024, weil 2025 in der NATO-Tabelle fehlt.
- Island ist als NATO-Mitglied enthalten, hat aber keinen Prozentwert für die Ist-Ausgaben in der verwendeten NATO-Tabelle; wegen Islands Sonderrolle ohne eigene Streitkräfte bleiben die Werte `NULL`.
- Der Docker-Stack setzt voraus, dass das GeoServer-Image PostGIS-Datastores unterstützt.
- Screenshots der Ist-Ausgaben-, Abstands-, Swipe- und MapLibre-Ansicht liegen in `screenshots/`.

## Troubleshooting

Problem: `docker compose up` meldet, dass `dockerDesktopLinuxEngine` fehlt oder `docker info` liefert einen 500-Fehler.

Lösung: Docker Desktop vollständig starten, warten bis der Engine-Status grün ist, und den Befehl erneut ausführen. Falls der Fehler bleibt, Docker Desktop neu starten oder WSL/Docker-Backend prüfen.

Problem: GeoServer ist erreichbar, aber der Layer fehlt.

Lösung: Logs prüfen:

```bash
cd docker
docker compose logs postgis-loader geoserver-init
```

Problem: Webkarte zeigt Basiskarte, aber keine NATO-Polygone.

Lösung: WMS-URL im Browser testen und prüfen, ob Workspace `nato`, Store `nato_postgis` und Layer `nato:nato_defence_spending` existieren.

Problem: Polygone sind sichtbar, aber Popups laden nicht.

Lösung: WFS-URL im Browser testen. Falls der Browser CORS meldet, GeoServer-CORS prüfen oder die Webapp über denselben Host/Proxy ausliefern.

Problem: Ports sind belegt.

Lösung: In `docker/docker-compose.yml` die Host-Ports `8080` oder `8000` anpassen.

## Qualitätscheckliste

- 32 NATO-Mitgliedstaaten im CSV enthalten.
- ISO3-Codes eindeutig.
- CSV, GeoJSON und GPKG enthalten dieselben ISO3-Codes.
- Pflichtfelder inklusive `notes` vorhanden.
- GeoJSON und GPKG in EPSG:4326.
- Geometrien gültig.
- GeoServer-Workspace `nato` vorhanden.
- PostGIS-Container gestartet und Tabelle `public.nato_defence_spending` importiert.
- WMS und WFS erreichbar.
- Drei SLD-Styles vorhanden.
- Webkarte nutzt WMS und WFS aus GeoServer.
- Leaflet-Basiskartenumschalter funktioniert.
- Swipe-Vergleich funktioniert.
- MapLibre-Ansicht erreichbar.
- PDF-Dokumentation vorhanden.

Automatischer Check:

```bash
python scripts/validate_project.py
```

Hinweis zur Laufzeitprüfung: Der Stack wurde nach Aktualisierung und Start des Windows-Subsystems erfolgreich mit Docker gestartet. GeoServer, WMS, WFS, Legende und Webapp wurden lokal getestet; WFS lieferte 32 Features.
