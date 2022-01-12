class FocusContextLineChart {
  constructor({
    el,
    data,
    xAccessor,
    yAccessor,
    xTooltipFormatter,
    yTooltipFormatter,
  }) {
    this.el = el;
    this.data = data;
    this.xAccessor = xAccessor;
    this.yAccessor = yAccessor;
    this.xTooltipFormatter = xTooltipFormatter;
    this.yTooltipFormatter = yTooltipFormatter;

    this.resize = this.resize.bind(this);
    this.entered = this.entered.bind(this);
    this.moved = this.moved.bind(this);
    this.left = this.left.bind(this);
    this.zoomed = this.zoomed.bind(this);
    this.brushed = this.brushed.bind(this);
    this.resizePath = this.resizePath.bind(this);

    this.init();
  }

  init() {
    this.setup();
    this.scaffold();
    this.wrangle();
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  setup() {
    this.margin = {
      top: 32,
      right: 80,
      bottom: 32,
      left: 80,
    };
    this.height = 400;
    this.boundedHeight = this.height - this.margin.top - this.margin.bottom;

    this.tickSize = 8;
    this.tickPadding = 4;
    this.annotationHeight = this.tickPadding * 2 + 10;

    this.margin2 = {
      top: 4,
      right: this.margin.right,
      bottom: this.margin.bottom,
      left: this.margin.left,
    };
    this.height2 = 100;
    this.boundedHeight2 = this.height2 - this.margin2.top - this.margin2.bottom;

    this.x = d3.scaleUtc();
    this.y = d3
      .scaleLinear()
      .range([this.height - this.margin.bottom, this.margin.top]);

    this.x2 = d3.scaleUtc();
    this.y2 = d3
      .scaleLinear()
      .range([this.height2 - this.margin2.bottom, this.margin2.top]);

    this.area = d3
      .area()
      .x((d, i) => this.x(this.displayData.dates[i]))
      .y0((d) => this.y(0))
      .y1((d) => this.y(d))
      .curve(d3.curveMonotoneX);
    this.line = this.area.lineY1();

    this.area2 = d3
      .area()
      .x((d, i) => this.x2(this.displayData.dates[i]))
      .y0((d) => this.y2(0))
      .y1((d) => this.y2(d))
      .curve(d3.curveMonotoneX);
    this.line2 = this.area2.lineY1();

    this.zoom = d3.zoom().scaleExtent([1, Infinity]).on("zoom", this.zoomed);

    this.brush = d3.brushX().on("start brush end", this.brushed);
  }

  scaffold() {
    this.id = "_" + Math.random().toString(36).slice(2, 11); // https://gist.github.com/gordonbrander/2230317
    this.clipId = `${this.id}-focus-clip`;
    this.clipId2 = `${this.id}-context-clip`;

    this.container = d3
      .select(this.el)
      .classed("focus-context-line-chart", true);

    this.svg = this.container.append("svg").attr("class", "svg--focus");
    this.defs = this.svg.append("defs");
    this.g = this.svg.append("g").attr("clip-path", `url(#${this.clipId})`);
    this.gAreas = this.g.attr("class", "areas-g");
    this.gLines = this.g.attr("class", "lines-g");
    this.gXTop = this.svg.append("g").attr("class", "axis-g");
    this.gXBottom = this.svg.append("g").attr("class", "axis-g");
    this.gYLeft = this.svg.append("g").attr("class", "axis-g");
    this.gYRight = this.svg.append("g").attr("class", "axis-g");
    this.gTooltip = this.svg
      .append("g")
      .attr("class", "tooltip-g")
      .style("display", "none");
    this.gTooltipX = this.gTooltip.append("g").attr("class", "tooltip-g--x");
    this.gTooltipY = this.gTooltip.append("g").attr("class", "tooltip-g--y");
    this.gZoom = this.svg
      .append("g")
      .attr("class", "zoom-g")
      .on("mouseenter", this.entered)
      .on("mousemove", this.moved)
      .on("mouseleave", this.left);

    this.svg2 = this.container.append("svg").attr("class", "svg--context");
    this.defs2 = this.svg2.append("defs");
    this.gLayer = this.svg2
      .append("g")
      .selectAll(".layer-g")
      .data(["background", "focus"])
      .join("g")
      .attr("class", (d) => `layer-g layer-g--${d}`)
      .attr("clip-path", (d, i) => (i ? `url(#${this.clipId2})` : null));
    this.gAreas2 = this.gLayer.append("g").attr("class", "areas-g");
    this.gLines2 = this.gLayer.append("g").attr("class", "lines-g");
    this.gXBottom2 = this.svg2.append("g").attr("class", "axis-g");
    this.gBrush = this.svg2.append("g").attr("class", "brush-g");
    this.handle = this.gBrush
      .selectAll(".brush-handle")
      .data([{ type: "w" }, { type: "e" }])
      .join("path")
      .attr("class", "brush-handle")
      .attr("cursor", "ew-resize")
      .attr("d", this.resizePath);
  }

  resize() {
    this.width = this.el.clientWidth;
    this.boundedWidth = this.width - this.margin.left - this.margin.right;

    this.x.range([this.margin.left, this.width - this.margin.right]);
    this.x2.range([this.margin.left, this.width - this.margin.right]);

    this.zoom
      .translateExtent([
        [this.margin.left, this.margin.top],
        [this.width - this.margin.left, this.height - this.margin.bottom],
      ])
      .extent([
        [this.margin.left, this.margin.top],
        [this.width - this.margin.left, this.height - this.margin.bottom],
      ]);

    this.brush.extent([
      [this.margin2.left, this.margin2.top],
      [this.width - this.margin2.left, this.height2 - this.margin2.bottom],
    ]);

    this.svg.attr("viewBox", [0, 0, this.width, this.height]);
    this.svg2.attr("viewBox", [0, 0, this.width, this.height2]);

    this.gZoom.call(this.zoom);

    this.gBrush
      .call(this.brush)
      .call(this.brush.move, this.filter.map(this.x2));

    this.draw();
  }

  wrangle() {
    this.displayData = {
      dates: this.data.map(this.xAccessor),
      values: this.data.map(this.yAccessor),
    };

    this.x.domain(d3.extent(this.displayData.dates));
    this.x2.domain(this.x.domain());

    this.y.domain([0, d3.max(this.displayData.values)]).nice();
    this.y2.domain(this.y.domain()).nice();

    this.filter = this.x2.domain();
  }

  draw() {
    this.drawFocusClip();
    this.drawFocusAreas();
    this.drawFocusLines();
    this.drawFocusXTopAxis();
    this.drawFocusXBottomAxis();
    this.drawFocusYLeftAxis();
    this.drawFocusYRightAxis();
    this.drawZoom();

    this.drawContextClip();
    this.drawContextAreas();
    this.drawContextLines();
    this.drawContextXBottomAxis();
  }

  drawFiltered() {
    this.drawFocusAreas();
    this.drawFocusLines();
    this.drawFocusXTopAxis();
    this.drawFocusXBottomAxis();
    this.drawFocusYLeftAxis();
    this.drawFocusYRightAxis();

    this.drawContextClip();
  }

  drawTooltip() {
    this.drawTooltipX();
    this.drawTooltipY();
  }

  drawFocusClip() {
    this.defs
      .selectAll("clipPath")
      .data([0])
      .join((enter) =>
        enter
          .append("clipPath")
          .attr("id", this.clipId)
          .call((clipPath) =>
            clipPath
              .append("rect")
              .attr("x", this.margin.left)
              .attr("y", this.margin.top)
              .attr("height", this.boundedHeight)
          )
      )
      .select("rect")
      .attr("width", this.boundedWidth);
  }

  drawFocusAreas() {
    this.gAreas
      .selectAll(".area-path")
      .data([this.displayData.values])
      .join((enter) =>
        enter
          .append("path")
          .attr("class", "area-path")
          .attr("fill", "currentColor")
      )
      .attr("d", this.area);
  }

  drawFocusLines() {
    this.gLines
      .selectAll(".line-path")
      .data([this.displayData.values])
      .join((enter) =>
        enter
          .append("path")
          .attr("class", "line-path")
          .attr("fill", "none")
          .attr("stroke", "currentColor")
      )
      .attr("d", this.line);
  }

  drawFocusXTopAxis() {
    this.gXTop.attr("transform", `translate(0,${this.margin.top})`).call(
      d3
        .axisTop(this.x)
        .ticks(this.boundedWidth / 120)
        .tickPadding(this.tickPadding)
        .tickSizeInner(this.tickSize)
        .tickSizeOuter(0)
    );
  }

  drawFocusXBottomAxis() {
    this.gXBottom
      .attr("transform", `translate(0,${this.height - this.margin.bottom})`)
      .call(
        d3
          .axisBottom(this.x)
          .ticks(this.boundedWidth / 120)
          .tickPadding(this.tickPadding)
          .tickSizeInner(this.tickSize)
          .tickSizeOuter(0)
      );
  }

  drawFocusYLeftAxis() {
    this.gYLeft.attr("transform", `translate(${this.margin.left},0)`).call(
      d3
        .axisLeft(this.y)
        .ticks(this.boundedHeight / 50)
        .tickPadding(this.tickPadding)
        .tickSizeInner(this.tickSize)
        .tickSizeOuter(0)
        .tickFormat(this.yTooltipFormatter)
    );
  }

  drawFocusYRightAxis() {
    this.gYRight
      .attr("transform", `translate(${this.width - this.margin.right},0)`)
      .call(
        d3
          .axisRight(this.y)
          .ticks(this.boundedHeight / 50)
          .tickPadding(this.tickPadding)
          .tickSizeInner(this.tickSize)
          .tickSizeOuter(0)
          .tickFormat(this.yTooltipFormatter)
      );
  }

  drawZoom() {
    this.gZoom
      .selectAll(".zoom-rect")
      .data([0])
      .join((enter) =>
        enter
          .append("rect")
          .attr("class", "zoom-rect")
          .attr("x", this.margin.left)
          .attr("y", this.margin.top)
          .attr("height", this.boundedHeight)
      )
      .attr("width", this.boundedWidth);
  }

  drawContextClip() {
    this.defs2
      .selectAll("clipPath")
      .data([0])
      .join((enter) =>
        enter
          .append("clipPath")
          .attr("id", this.clipId2)
          .call((clipPath) =>
            clipPath
              .append("rect")
              .attr("y", this.margin2.top)
              .attr("height", this.boundedHeight2)
          )
      )
      .select("rect")
      .attr("x", this.x2(this.filter[0]))
      .attr("width", this.x2(this.filter[1]) - this.x2(this.filter[0]));
  }

  drawContextAreas() {
    this.gAreas2
      .selectAll(".area-path")
      .data([this.displayData.values])
      .join((enter) =>
        enter
          .append("path")
          .attr("class", "area-path")
          .attr("fill", "currentColor")
      )
      .attr("d", this.area2);
  }

  drawContextLines() {
    this.gLines2
      .selectAll(".line-path")
      .data([this.displayData.values])
      .join((enter) =>
        enter
          .append("path")
          .attr("class", "line-path")
          .attr("fill", "none")
          .attr("stroke", "currentColor")
      )
      .attr("d", this.line2);
  }

  drawContextXBottomAxis() {
    this.gXBottom2
      .attr("transform", `translate(0,${this.height2 - this.margin2.bottom})`)
      .call(
        d3
          .axisBottom(this.x)
          .ticks(this.boundedWidth / 120)
          .tickPadding(this.tickPadding)
          .tickSizeInner(this.tickSize)
          .tickSizeOuter(0)
      );
  }

  drawTooltipX() {
    if (this.idxActive === null) return;

    const date = this.displayData.dates[this.idxActive];
    let annotationWidth;

    this.gTooltipX.attr("transform", `translate(${this.x(date)},0)`);

    this.gTooltipX
      .selectAll(".tooltip-line")
      .data([0])
      .join((enter) =>
        enter
          .append("line")
          .attr("class", "tooltip-line")
          .attr("stroke", "currentColor")
          .attr("y1", this.margin.top - this.tickSize)
          .attr("y2", this.height - this.margin.bottom + this.tickSize)
      );

    const gXAnnotation = this.gTooltipX
      .selectAll(".annotation-g")
      .data(["top", "bottom"])
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "annotation-g")
          .attr(
            "transform",
            (d, i) =>
              `translate(0,${
                i
                  ? this.height - this.margin.bottom + this.tickSize
                  : this.margin.top - this.tickSize
              })`
          )
          .call((g) =>
            g
              .append("rect")
              .attr("class", "annotation-rect")
              .attr("fill", "#fff")
              .attr("stroke", "currentColor")
              .attr("y", (d, i) => (i ? 0 : -this.annotationHeight))
              .attr("height", this.annotationHeight)
          )
          .call((g) =>
            g
              .append("text")
              .attr("class", "annotation-text")
              .attr("fill", "currentColor")
              .attr("text-anchor", "middle")
              .attr("y", (d, i) => (i ? this.tickPadding : -this.tickPadding))
              .attr("dy", (d, i) => (i ? "0.71em" : "0em"))
          )
      )
      .call((g) => g.select("text").text(this.xTooltipFormatter(date)));

    gXAnnotation
      .select("text")
      .filter((d, i) => i === 0)
      .each((d, i, n) => {
        annotationWidth = n[i].getBBox().width + this.tickPadding * 2;
      });

    gXAnnotation
      .select("rect")
      .attr("x", -annotationWidth / 2)
      .attr("width", annotationWidth);
  }

  drawTooltipY() {
    if (this.idxActive === null) return;

    const value = this.displayData.values[this.idxActive];
    let annotationWidth;

    this.gTooltipY.attr(
      "transform",
      `translate(0,${this.y(this.displayData.values[this.idxActive])})`
    );

    this.gTooltipY
      .selectAll(".tooltip-line")
      .data([0])
      .join((enter) =>
        enter
          .append("line")
          .attr("class", "tooltip-line")
          .attr("stroke", "currentColor")
          .attr("x1", this.margin.left - this.tickSize)
      )
      .attr("x2", this.width - this.margin.right + this.tickSize);

    const gYAnnotation = this.gTooltipY
      .selectAll(".annotation-g")
      .data(["left", "right"])
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "annotation-g")
          .attr(
            "transform",
            (d, i) =>
              `translate(${
                i
                  ? this.width - this.margin.right + this.tickSize
                  : this.margin.left - this.tickSize
              },0)`
          )
          .call((g) =>
            g
              .append("rect")
              .attr("class", "annotation-rect")
              .attr("fill", "#fff")
              .attr("stroke", "currentColor")
              .attr("y", -this.annotationHeight / 2)
              .attr("height", this.annotationHeight)
          )
          .call((g) =>
            g
              .append("text")
              .attr("class", "annotation-text")
              .attr("fill", "currentColor")
              .attr("text-anchor", (d, i) => (i ? "start" : "end"))
              .attr("dy", "0.32em")
              .attr("x", (d, i) => (i ? this.tickPadding : -this.tickPadding))
          )
      )
      .call((g) => g.select("text").text(this.yTooltipFormatter(value)));

    gYAnnotation
      .select("text")
      .filter((d, i) => i === 0)
      .each((d, i, n) => {
        annotationWidth = n[i].getBBox().width + this.tickPadding * 2;
      });

    gYAnnotation
      .select("rect")
      .attr("x", (d, i) => (i ? 0 : -annotationWidth))
      .attr("width", annotationWidth);
  }

  zoomed({ transform: t }) {
    const filter = t.rescaleX(this.x2).domain();

    if (!this.isFilterChanged(this.filter, filter)) return;

    this.filter = filter;
    this.updateScaleDomains();
    this.drawFiltered();
    this.drawTooltip();

    this.gBrush.call(this.brush.move, this.x.range().map(t.invertX, t));
  }

  brushed({ selection: s }) {
    if (!s) s = this.x2.range();
    if (s[1] === s[0]) s[1] += 0.5;

    this.handle.attr(
      "transform",
      (d, i) =>
        `translate(${s[i]},${this.margin2.top - this.boundedHeight2 / 4})`
    );

    const filter = s.map(this.x2.invert);

    if (!this.isFilterChanged(this.filter, filter)) return;

    this.filter = filter;
    this.updateScaleDomains();
    this.drawFiltered();

    const scale = this.boundedWidth / (s[1] - s[0]);
    const translateX = this.margin.left - s[0] * scale;
    const transform = d3.zoomIdentity.translate(translateX, 0).scale(scale);
    this.gZoom.call(this.zoom.transform, transform);
  }

  entered() {
    this.gTooltip.style("display", null);
  }

  moved(event) {
    const [px] = d3.pointer(event);
    const x0 = this.x.invert(px);
    const idx = d3.bisectCenter(this.displayData.dates, x0);
    if (
      this.x(this.displayData.dates[idx]) < this.x.range()[0] ||
      this.x(this.displayData.dates[idx]) > this.x.range()[1]
    )
      return;
    if (this.idxActive !== idx) {
      this.idxActive = idx;
      this.drawTooltip();
    }
  }

  left() {
    this.gTooltip.style("display", "none");
    this.idxActive = null;
  }

  updateScaleDomains() {
    this.x.domain(this.filter);

    const i0 = d3.bisectLeft(this.displayData.dates, this.filter[0]);
    const i1 = d3.bisectRight(this.displayData.dates, this.filter[1]);
    this.y.domain([0, d3.max(this.displayData.values.slice(i0, i1))]).nice();
  }

  isFilterChanged(oldFilter, newFilter) {
    return (
      !oldFilter ||
      +oldFilter[0] !== +newFilter[0] ||
      +oldFilter[1] !== +newFilter[1]
    );
  }

  resizePath(d) {
    const e = +(d.type == "e"),
      x = e ? 1 : -1,
      y = this.boundedHeight2 / 2;
    return (
      "M" +
      0.5 * x +
      "," +
      y +
      "A6,6 0 0 " +
      e +
      " " +
      6.5 * x +
      "," +
      (y + 6) +
      "V" +
      (2 * y - 6) +
      "A6,6 0 0 " +
      e +
      " " +
      0.5 * x +
      "," +
      2 * y +
      "Z" +
      "M" +
      2.5 * x +
      "," +
      (y + 8) +
      "V" +
      (2 * y - 8) +
      "M" +
      4.5 * x +
      "," +
      (y + 8) +
      "V" +
      (2 * y - 8)
    );
  }
}
