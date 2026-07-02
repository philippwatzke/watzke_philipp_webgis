#!/bin/sh
set -eu

GEOSERVER_URL="${GEOSERVER_URL:-http://geoserver:8080/geoserver}"
AUTH="${GEOSERVER_USER:-admin}:${GEOSERVER_PASSWORD:-geoserver}"
WORKSPACE="nato"
STORE="nato_postgis"
LAYER="nato_defence_spending"

request() {
  method="$1"
  url="$2"
  content_type="$3"
  data_file="$4"
  if [ "$data_file" = "-" ]; then
    curl -sS -u "$AUTH" -X "$method" -H "Content-Type: $content_type" --data-binary @- "$url"
  else
    curl -sS -u "$AUTH" -X "$method" -H "Content-Type: $content_type" --data-binary @"$data_file" "$url"
  fi
}

echo "Waiting for GeoServer REST API..."
for i in $(seq 1 60); do
  if curl -fsS -u "$AUTH" "$GEOSERVER_URL/rest/about/status" >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo "Creating workspace ${WORKSPACE}"
cat <<XML | request POST "$GEOSERVER_URL/rest/workspaces" "text/xml" - || true
<workspace><name>${WORKSPACE}</name></workspace>
XML

echo "Removing older NATO layer/datastores if present"
curl -sS -u "$AUTH" -X DELETE "$GEOSERVER_URL/rest/layers/${WORKSPACE}:${LAYER}?recurse=true" >/dev/null 2>&1 || true
curl -sS -u "$AUTH" -X DELETE "$GEOSERVER_URL/rest/workspaces/${WORKSPACE}/datastores/nato_gpkg?recurse=true" >/dev/null 2>&1 || true
curl -sS -u "$AUTH" -X DELETE "$GEOSERVER_URL/rest/workspaces/${WORKSPACE}/datastores/${STORE}?recurse=true" >/dev/null 2>&1 || true

echo "Creating PostGIS datastore ${STORE}"
cat <<XML | request POST "$GEOSERVER_URL/rest/workspaces/${WORKSPACE}/datastores" "text/xml" - || true
<dataStore>
  <name>${STORE}</name>
  <type>PostGIS</type>
  <enabled>true</enabled>
  <connectionParameters>
    <entry key="host">postgis</entry>
    <entry key="port">5432</entry>
    <entry key="database">nato</entry>
    <entry key="schema">public</entry>
    <entry key="user">nato</entry>
    <entry key="passwd">nato</entry>
    <entry key="dbtype">postgis</entry>
    <entry key="Expose primary keys">true</entry>
  </connectionParameters>
</dataStore>
XML

echo "Publishing feature type ${LAYER}"
cat <<XML | request POST "$GEOSERVER_URL/rest/workspaces/${WORKSPACE}/datastores/${STORE}/featuretypes" "text/xml" - || true
<featureType>
  <name>${LAYER}</name>
  <nativeName>${LAYER}</nativeName>
  <title>NATO defence spending 2025 to 2035</title>
  <srs>EPSG:4326</srs>
  <enabled>true</enabled>
</featureType>
XML

for style in nato_actual_pct_gdp nato_target_pct_gdp nato_gap_pct_points; do
  echo "Uploading style ${style}"
  cat <<XML | request POST "$GEOSERVER_URL/rest/workspaces/${WORKSPACE}/styles" "text/xml" - || true
<style><name>${style}</name><filename>${style}.sld</filename></style>
XML
  request PUT "$GEOSERVER_URL/rest/workspaces/${WORKSPACE}/styles/${style}" "application/vnd.ogc.sld+xml" "/styles/${style}.sld" >/dev/null
done

echo "Assigning default and alternate styles"
cat <<XML | request PUT "$GEOSERVER_URL/rest/layers/${WORKSPACE}:${LAYER}" "text/xml" -
<layer>
  <defaultStyle><name>nato_actual_pct_gdp</name><workspace>${WORKSPACE}</workspace></defaultStyle>
  <styles>
    <style><name>nato_target_pct_gdp</name><workspace>${WORKSPACE}</workspace></style>
    <style><name>nato_gap_pct_points</name><workspace>${WORKSPACE}</workspace></style>
  </styles>
  <enabled>true</enabled>
</layer>
XML

echo "GeoServer NATO workspace setup finished."
