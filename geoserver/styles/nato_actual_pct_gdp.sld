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
      <Title>Ist-Ausgaben in % des BIP</Title>
      <FeatureTypeStyle>
        <Rule>
          <Name>NoData</Name>
          <Title>Kein Wert</Title>
          <ogc:Filter>
            <ogc:PropertyIsNull>
              <ogc:PropertyName>actual_pct_gdp</ogc:PropertyName>
            </ogc:PropertyIsNull>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#d1d5db</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#6b7280</CssParameter><CssParameter name="stroke-width">0.6</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>actual_2_0_2_5</Name>
          <Title>2.00 - 2.50 % des BIP</Title>
          <ogc:Filter>
            <ogc:And>
              <ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>actual_pct_gdp</ogc:PropertyName><ogc:Literal>2.0</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyIsLessThan><ogc:PropertyName>actual_pct_gdp</ogc:PropertyName><ogc:Literal>2.5</ogc:Literal></ogc:PropertyIsLessThan>
            </ogc:And>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#fee08b</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#374151</CssParameter><CssParameter name="stroke-width">0.5</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>actual_2_5_3_0</Name>
          <Title>2.50 - 3.00 % des BIP</Title>
          <ogc:Filter>
            <ogc:And>
              <ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>actual_pct_gdp</ogc:PropertyName><ogc:Literal>2.5</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyIsLessThan><ogc:PropertyName>actual_pct_gdp</ogc:PropertyName><ogc:Literal>3.0</ogc:Literal></ogc:PropertyIsLessThan>
            </ogc:And>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#fdae61</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#374151</CssParameter><CssParameter name="stroke-width">0.5</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>actual_3_0_4_0</Name>
          <Title>3.00 - 4.00 % des BIP</Title>
          <ogc:Filter>
            <ogc:And>
              <ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>actual_pct_gdp</ogc:PropertyName><ogc:Literal>3.0</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyIsLessThan><ogc:PropertyName>actual_pct_gdp</ogc:PropertyName><ogc:Literal>4.0</ogc:Literal></ogc:PropertyIsLessThan>
            </ogc:And>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#66bd63</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#374151</CssParameter><CssParameter name="stroke-width">0.5</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>actual_4_plus</Name>
          <Title>4.00 % des BIP und mehr</Title>
          <ogc:Filter>
            <ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyName>actual_pct_gdp</ogc:PropertyName>
              <ogc:Literal>4.0</ogc:Literal>
            </ogc:PropertyIsGreaterThanOrEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#1a9850</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#374151</CssParameter><CssParameter name="stroke-width">0.5</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
