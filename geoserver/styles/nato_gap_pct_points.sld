<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>nato_defence_spending</Name>
    <UserStyle>
      <Title>Abstand zum 5-%-Ziel in Prozentpunkten</Title>
      <FeatureTypeStyle>
        <Rule>
          <Name>NoData</Name>
          <Title>Kein Wert</Title>
          <ogc:Filter>
            <ogc:PropertyIsNull>
              <ogc:PropertyName>gap_pct_points</ogc:PropertyName>
            </ogc:PropertyIsNull>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#d1d5db</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#6b7280</CssParameter><CssParameter name="stroke-width">0.6</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>gap_0_1</Name>
          <Title>0.00 - 1.00 Prozentpunkte bis 5 %</Title>
          <ogc:Filter>
            <ogc:And>
              <ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>gap_pct_points</ogc:PropertyName><ogc:Literal>0.0</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyIsLessThan><ogc:PropertyName>gap_pct_points</ogc:PropertyName><ogc:Literal>1.0</ogc:Literal></ogc:PropertyIsLessThan>
            </ogc:And>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#1a9850</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#374151</CssParameter><CssParameter name="stroke-width">0.5</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>gap_1_2</Name>
          <Title>1.00 - 2.00 Prozentpunkte bis 5 %</Title>
          <ogc:Filter>
            <ogc:And>
              <ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>gap_pct_points</ogc:PropertyName><ogc:Literal>1.0</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyIsLessThan><ogc:PropertyName>gap_pct_points</ogc:PropertyName><ogc:Literal>2.0</ogc:Literal></ogc:PropertyIsLessThan>
            </ogc:And>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#91cf60</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#374151</CssParameter><CssParameter name="stroke-width">0.5</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>gap_2_3</Name>
          <Title>2.00 - 3.00 Prozentpunkte bis 5 %</Title>
          <ogc:Filter>
            <ogc:And>
              <ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>gap_pct_points</ogc:PropertyName><ogc:Literal>2.0</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyIsLessThan><ogc:PropertyName>gap_pct_points</ogc:PropertyName><ogc:Literal>3.0</ogc:Literal></ogc:PropertyIsLessThan>
            </ogc:And>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#fee08b</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#374151</CssParameter><CssParameter name="stroke-width">0.5</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>gap_3_plus</Name>
          <Title>3.00 und mehr Prozentpunkte bis 5 %</Title>
          <ogc:Filter>
            <ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyName>gap_pct_points</ogc:PropertyName>
              <ogc:Literal>3.0</ogc:Literal>
            </ogc:PropertyIsGreaterThanOrEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#d73027</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#374151</CssParameter><CssParameter name="stroke-width">0.5</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
