d3.csv("BTC-USD.csv").then((data) => {
  new FocusContextLineChart({
    el: document.getElementById("chart"),
    data,
    xAccessor: (d) => d3.utcParse("%Y-%m-%d")(d.Date),
    yAccessor: (d) => +d.Close,
    xTooltipFormatter: d3.utcFormat("%Y-%m-%d"),
    yTooltipFormatter: (d) =>
      d ? (d < 1 ? d3.format("$,.2f")(d) : d3.format("$,d")(d)) : 0,
  });
});
