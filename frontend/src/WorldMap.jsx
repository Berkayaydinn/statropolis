import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

const COUNTRY_META = {
  Turkey: { flag: "🇹🇷" },
  Germany: { flag: "🇩🇪" },
  Brazil: { flag: "🇧🇷" },
  Japan: { flag: "🇯🇵" },
  "South Africa": { flag: "🇿🇦" },
  "United States": { flag: "🇺🇸" },
  "United Kingdom": { flag: "🇬🇧" },
  France: { flag: "🇫🇷" },
  Italy: { flag: "🇮🇹" },
  Spain: { flag: "🇪🇸" },
  Canada: { flag: "🇨🇦" },
  China: { flag: "🇨🇳" },
  India: { flag: "🇮🇳" },
  Australia: { flag: "🇦🇺" },
  Mexico: { flag: "🇲🇽" },
  Argentina: { flag: "🇦🇷" },
  "Russian Federation": { flag: "🇷🇺" },
  "Korea, Republic Of": { flag: "🇰🇷" }
};

const NAME_ALIASES = {
  Türkiye: "Turkey",
  Turkiye: "Turkey",
  "Republic of Türkiye": "Turkey",
  "United States of America": "United States",
  "Dem. Rep. Congo": "Congo, The Democratic Republic Of The",
  "Central African Rep.": "Central African Republic",
  "S. Sudan": "South Sudan",
  "Dominican Rep.": "Dominican Republic",
  "Bosnia and Herz.": "Bosnia And Herzegovina",
  "Côte d'Ivoire": "Cote D'ivoire",
  "Eq. Guinea": "Equatorial Guinea",
  eSwatini: "Swaziland",
  "North Korea": "Korea, Democratic People's Republic Of",
  "South Korea": "Korea, Republic Of",
  "Lao PDR": "Lao People's Democratic Republic",
  Macedonia: "Macedonia, The Former Yugoslav Republic Of",
  Moldova: "Moldova, Republic Of",
  Russia: "Russian Federation",
  Syria: "Syrian Arab Republic",
  Tanzania: "Tanzania, United Republic Of",
  Venezuela: "Venezuela, Bolivarian Republic Of",
  Vietnam: "Viet Nam",
  Iran: "Iran, Islamic Republic Of",
  Bolivia: "Bolivia, Plurinational State Of"
};

function cleanName(name) {
  return NAME_ALIASES[name] || name;
}

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return `$${Number(value).toLocaleString()}`;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return `${Number(value).toFixed(1)}%`;
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return Number(value).toLocaleString();
}

function formatYears(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return `${Number(value).toFixed(1)} years`;
}

export default function WorldMap({ countries = [], onSelect }) {
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const selectedNameRef = useRef(null);
  const countryByNameRef = useRef(new Map());
  const playableNamesRef = useRef(new Set());
  const onSelectRef = useRef(onSelect);

  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!countries || countries.length === 0) return;

    const countryByName = new Map(
      countries.map((country) => [cleanName(country.country_name), country])
    );

    countryByNameRef.current = countryByName;
    playableNamesRef.current = new Set(countryByName.keys());
  }, [countries]);

  useEffect(() => {
    if (!countries || countries.length === 0) return;

    let cancelled = false;

    const svgElement = svgRef.current;
    const wrapper = wrapRef.current;

    const width = wrapper.clientWidth || 900;
    const height = Math.round(width * 0.5);

    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();

    svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svgElement.setAttribute("width", "100%");
    svgElement.setAttribute("height", height);

    const projection = d3
      .geoNaturalEarth1()
      .scale(width / 6.25)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath(projection);

    async function drawMap() {
      try {
        const world = await d3.json(
          "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
        );

        if (cancelled || !world) return;

        const features = topojson.feature(world, world.objects.countries).features;

        svg
          .append("path")
          .datum(d3.geoGraticule()())
          .attr("d", path)
          .attr("fill", "none")
          .attr("stroke", "rgba(125,211,252,0.06)")
          .attr("stroke-width", 0.5);

        const mapLayer = svg.append("g").attr("class", "mapLayer");
        const markerLayer = svg.append("g").attr("class", "markerLayer");

        mapLayer
          .selectAll("path.country")
          .data(features)
          .join("path")
          .attr("class", "country")
          .attr("d", path)
          .attr("data-name", (feature) => cleanName(feature.properties.name))
          .attr("fill", (feature) => {
            const name = cleanName(feature.properties.name);

            if (name === selectedNameRef.current) {
              return "#38bdf8";
            }

            return playableNamesRef.current.has(name) ? "#1a3a5c" : "#0d1f33";
          })
          .attr("stroke", "rgba(125,211,252,0.18)")
          .attr("stroke-width", 0.4)
          .style("cursor", (feature) => {
            const name = cleanName(feature.properties.name);
            return playableNamesRef.current.has(name) ? "pointer" : "default";
          })
          .on("mousemove", function (event, feature) {
            const name = cleanName(feature.properties.name);

            if (!playableNamesRef.current.has(name)) {
              setTooltip(null);
              return;
            }

            const matchedCountry = countryByNameRef.current.get(name);
            const rect = wrapper.getBoundingClientRect();
            const meta = COUNTRY_META[name] || {};

            setTooltip({
              name,
              flag: meta.flag || "🌍",
              population: matchedCountry?.population,
              gdp: matchedCountry?.gdp,
              gdpPerCapita: matchedCountry?.gdp_per_capita,
              lifeExpectancy: matchedCountry?.life_expectancy,
              literacyRate: matchedCountry?.literacy_rate,
              unemployment: matchedCountry?.unemployment_rate,
              x: event.clientX - rect.left + 12,
              y: event.clientY - rect.top - 10
            });

            d3.select(this).attr(
              "fill",
              name === selectedNameRef.current ? "#7dd3fc" : "#2563a8"
            );
          })
          .on("mouseleave", function (event, feature) {
            const name = cleanName(feature.properties.name);

            setTooltip(null);

            d3.select(this).attr("fill", () => {
              if (name === selectedNameRef.current) return "#38bdf8";
              return playableNamesRef.current.has(name) ? "#1a3a5c" : "#0d1f33";
            });
          })
          .on("click", function (event, feature) {
            const name = cleanName(feature.properties.name);

            if (!playableNamesRef.current.has(name)) return;

            selectedNameRef.current = name;
            setTooltip(null);

            mapLayer.selectAll("path.country").attr("fill", (currentFeature) => {
              const currentName = cleanName(currentFeature.properties.name);

              if (currentName === selectedNameRef.current) {
                return "#38bdf8";
              }

              return playableNamesRef.current.has(currentName) ? "#1a3a5c" : "#0d1f33";
            });

            markerLayer.selectAll(".mapMarkerDot").attr("fill", function () {
              const markerName = d3.select(this).attr("data-name");
              return markerName === selectedNameRef.current ? "#38bdf8" : "#7dd3fc";
            });

            const matchedCountry = countryByNameRef.current.get(name);

            if (matchedCountry && onSelectRef.current) {
              onSelectRef.current(matchedCountry);
            }
          });

        features.forEach((feature) => {
          const name = cleanName(feature.properties.name);

          if (!playableNamesRef.current.has(name)) return;

          const [cx, cy] = path.centroid(feature);

          if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;

          const meta = COUNTRY_META[name] || {};

          const marker = markerLayer
            .append("g")
            .attr("class", "countryMarker")
            .attr("transform", `translate(${cx}, ${cy})`)
            .attr("pointer-events", "none");

          marker
            .append("circle")
            .attr("class", "mapMarkerDot")
            .attr("data-name", name)
            .attr("r", 4)
            .attr("fill", name === selectedNameRef.current ? "#38bdf8" : "#7dd3fc")
            .attr("stroke", "rgba(3, 7, 18, 0.75)")
            .attr("stroke-width", 1.4);

          marker
            .append("text")
            .attr("class", "mapMarkerFlag")
            .attr("x", 8)
            .attr("y", 4)
            .attr("font-size", "13")
            .attr("fill", "#eaf7ff")
            .attr("stroke", "rgba(0,0,0,0.32)")
            .attr("stroke-width", "0.35")
            .attr("paint-order", "stroke")
            .text(meta.flag || "");
        });
      } catch {
        svg
          .append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .attr("fill", "#94b8d0")
          .attr("font-size", 14)
          .text("Map could not be loaded. Check your internet connection.");
      }
    }

    drawMap();

    return () => {
      cancelled = true;
    };
  }, [countries]);

  return (
    <div className="worldMapWrap" ref={wrapRef}>
      <svg ref={svgRef} className="worldMapSvg" />

      {tooltip && (
        <div className="mapTooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <strong>
            {tooltip.flag} {tooltip.name}
          </strong>
      
          <div>
            <span>Population</span>
            <b>{formatNumber(tooltip.population)}</b>
          </div>
      
          <div>
            <span>GDP</span>
            <b>{formatMoney(tooltip.gdp)}</b>
          </div>
      
          <div>
            <span>GDP/cap</span>
            <b>{formatMoney(tooltip.gdpPerCapita)}</b>
          </div>
      
          <div>
            <span>Life expectancy</span>
            <b>{formatYears(tooltip.lifeExpectancy)}</b>
          </div>
      
          <div>
            <span>Literacy rate</span>
            <b>{formatPercent(tooltip.literacyRate)}</b>
          </div>
      
          <div>
            <span>Unemployment</span>
            <b>{formatPercent(tooltip.unemployment)}</b>
          </div>
      
          <em>Click to select →</em>
        </div>
      )}
      <div className="mapLegend">
        <span>
          <i className="legendPlayable" /> Playable
        </span>
        <span>
          <i className="legendSelected" /> Selected
        </span>
      </div>
    </div>
  );
}
