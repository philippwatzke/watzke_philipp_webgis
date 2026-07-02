from pathlib import Path
import sys

import geopandas as gpd
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]

EXPECTED_FILES = [
    "data/nato_defence_spending.csv",
    "data/nato_defence_spending.geojson",
    "data/nato_defence_spending.gpkg",
    "docker/docker-compose.yml",
    "docker/geoserver-init/init-geoserver.sh",
    "geoserver/styles/nato_actual_pct_gdp.sld",
    "geoserver/styles/nato_target_pct_gdp.sld",
    "geoserver/styles/nato_gap_pct_points.sld",
    "qgis/nato_defence_spending.qgz",
    "webapp/index.html",
    "webapp/maplibre.html",
    "webapp/css/style.css",
    "webapp/js/main.js",
    "doku/watzke_philipp_webgis_dokumentation.pdf",
    "screenshots/screenshot_1.png",
    "screenshots/screenshot_2.png",
    "screenshots/screenshot_3.png",
    "screenshots/screenshot_4.png",
    "README.md",
    "scripts/validate_project.py",
]

REQUIRED_COLUMNS = [
    "iso3",
    "country",
    "target_pct_gdp",
    "target_year",
    "actual_pct_gdp",
    "actual_year",
    "gap_pct_points",
    "source_target",
    "source_actual",
    "notes",
]


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def assert_files_exist() -> None:
    missing = [path for path in EXPECTED_FILES if not (ROOT / path).exists()]
    if missing:
        fail("missing files: " + ", ".join(missing))


def assert_data_valid() -> None:
    csv_path = ROOT / "data" / "nato_defence_spending.csv"
    df = pd.read_csv(csv_path, na_values=["NULL"])
    if df.columns.tolist() != REQUIRED_COLUMNS:
        fail(f"unexpected CSV columns: {df.columns.tolist()}")
    if len(df) != 32:
        fail(f"expected 32 NATO members, found {len(df)}")
    if df["iso3"].duplicated().any():
        fail("duplicate ISO3 codes found")
    if df["iso3"].str.match(r"^[A-Z]{3}$").sum() != len(df):
        fail("all ISO3 codes must be three uppercase letters")
    if df["target_pct_gdp"].ne(5.0).any():
        fail("target_pct_gdp must be 5.0 for this dataset")
    if df["target_year"].ne(2035).any():
        fail("target_year must be 2035 for this dataset")

    mask = df["actual_pct_gdp"].notna()
    expected_gap = (df["target_pct_gdp"] - df["actual_pct_gdp"]).round(6)
    actual_gap = df["gap_pct_points"].round(6)
    if not expected_gap[mask].equals(actual_gap[mask]):
        fail("gap_pct_points does not equal target_pct_gdp - actual_pct_gdp")
    if df.loc[df["iso3"].eq("ISL"), ["actual_pct_gdp", "actual_year", "gap_pct_points"]].notna().any(axis=None):
        fail("Iceland must keep NULL actual values because the NATO table has no value")
    if int(df.loc[df["iso3"].eq("DEU"), "actual_year"].iloc[0]) != 2024:
        fail("Germany should use actual_year 2024 because the 2025 value is missing")

    for geo_name in ["nato_defence_spending.geojson", "nato_defence_spending.gpkg"]:
        path = ROOT / "data" / geo_name
        gdf = gpd.read_file(path)
        if len(gdf) != 32:
            fail(f"{geo_name}: expected 32 features, found {len(gdf)}")
        if set(gdf["iso3"]) != set(df["iso3"]):
            fail(f"{geo_name}: ISO3 set does not match CSV")
        if "notes" not in gdf.columns:
            fail(f"{geo_name}: missing notes field")
        if str(gdf.crs).upper() not in {"EPSG:4326", "OGC:CRS84"}:
            fail(f"{geo_name}: unexpected CRS {gdf.crs}")
        if int((~gdf.is_valid).sum()) != 0:
            fail(f"{geo_name}: invalid geometries found")
        if path.stat().st_size >= 5 * 1024 * 1024:
            fail(f"{geo_name}: file size is >= 5 MB")


def assert_text_contains() -> None:
    checks = {
        "webapp/index.html": ["Basiskarte", "Swipe", "MapLibre"],
        "webapp/js/main.js": [
            "WMS",
            "WFS",
            "GetFeature",
            "nato:nato_defence_spending",
            "swipeDivider",
            "basemaps",
            "source_target",
            "Quelle Zielwert",
            "Links: Ist-Ausgaben",
            "Rechts: Abstand zum Ziel",
        ],
        "webapp/maplibre.html": ["MapLibre", "maplibre-gl", "index.html?theme=dark"],
        "docker/docker-compose.yml": ["geoserver", "postgis", "postgis-loader", "webapp", "8080", "8000"],
        "README.md": [
            "docker compose up",
            "GeoServer",
            "PostGIS",
            "Webapp",
            "Troubleshooting",
            "Bonus",
            "watzke_philipp_webgis_dokumentation.pdf",
        ],
    }
    for rel_path, needles in checks.items():
        text = (ROOT / rel_path).read_text(encoding="utf-8")
        for needle in needles:
            if needle not in text:
                fail(f"{rel_path}: missing text marker {needle!r}")


def assert_text_excludes() -> None:
    checks = {
        "webapp/index.html": ["GDI-Verbindung", "service-status-badge", "WFS Daten laden"],
        "webapp/js/main.js": [
            "<tr><th>Hinweis</th>",
            "Verbunden:",
            "service-status-badge",
            "service-status-text",
            "Legende im Swipe-Modus",
        ],
    }
    for rel_path, needles in checks.items():
        text = (ROOT / rel_path).read_text(encoding="utf-8")
        for needle in needles:
            if needle in text:
                fail(f"{rel_path}: unexpected text marker {needle!r}")


def main() -> None:
    assert_files_exist()
    assert_data_valid()
    assert_text_contains()
    assert_text_excludes()
    print("validation_ok=true")


if __name__ == "__main__":
    main()
