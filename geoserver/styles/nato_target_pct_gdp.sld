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
      <Title>NATO target defence investment as % GDP</Title>
      <FeatureTypeStyle>
        <Rule>
          <Name>target_5_percent</Name>
          <Title>5.00 target by 2035</Title>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>target_pct_gdp</ogc:PropertyName>
              <ogc:Literal>5.0</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#2b83ba</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#1f2937</CssParameter><CssParameter name="stroke-width">0.5</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>target_other_or_missing</Name>
          <Title>Other or missing target</Title>
          <ElseFilter/>
          <PolygonSymbolizer>
            <Fill><CssParameter name="fill">#d1d5db</CssParameter></Fill>
            <Stroke><CssParameter name="stroke">#6b7280</CssParameter><CssParameter name="stroke-width">0.6</CssParameter></Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
