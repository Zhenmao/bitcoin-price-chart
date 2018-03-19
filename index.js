/* jshint esversion: 6 */
(function lineChart() {
	// Focus Chart (top) and Context Chart (bottom)
	// Initial setup
	const marginFocus = {top: 30, right: 70, bottom: 30, left: 70},
				marginContext = {top: 20, right: marginFocus.right, bottom: 30, left: marginFocus.left},
				heightFocus = 400 - marginFocus.top - marginFocus.bottom,
				heightContext = 100 - marginContext.top - marginContext.bottom,
				tooltipPadding = 3;

	let width = $(".focus-chart").width() - marginFocus.left - marginFocus.right;

	const strokeColor = "#F79514",
				strokeWidth = 2,
				areaColor = "#F7CA8F",
				tooltipStrokeColor = "#4C4C4C",
				tooltipStrokeWidth = 1,
				backgroundStrokeColor = "#ccc",
				backgroundAreaColor = "#eee",
				bodyBackgroundColor = "#fff";

	const parseTime = d3.timeParse("%Y-%m-%d"),
				bisectDate = d3.bisector(d => d.date).left,
				formatPrice = (d) => "$" + d3.format(".2f")(d),
				formatDate = d3.timeFormat("%Y-%m-%d"),
				brush = d3.brushX()
						.extent([[0, 0], [width, heightContext]])
						.on("brush end", brushed),
				zoom = d3.zoom()
						.scaleExtent([1, Infinity])
						.translateExtent([[0, 0], [width, heightFocus]])
						.extent([[0, 0], [width, heightFocus]])
						.on("zoom", zoomed);

	let data; // Hold processed data;

	const lineFocus = d3.line()
		.x(d => xFocus(d.date))
		.y(d => yFocus(d.close));

	const areaFocus = d3.area()
		.x(d => xFocus(d.date))
		.y0(d => heightFocus)
		.y1(d => yFocus(d.close));

	const lineContext = d3.line()
		.x(d => xContext(d.date))
		.y(d => yContext(d.close));

	const areaContext = d3.area()
		.x(d => xContext(d.date))
		.y0(d => heightContext)
		.y1(d => yContext(d.close));

	// Scales
	const xFocus = d3.scaleTime().range([0, width]),
				yFocus = d3.scaleLinear().range([heightFocus, 0]),
				xContext = d3.scaleTime().range([0, width]),
				yContext = d3.scaleLinear().range([heightContext, 0]);

	// Axies
	const xAxisFoucsBottom = d3.axisBottom(xFocus),
				xAxisFocusTop = d3.axisTop(xFocus),
				yAxisFocusLeft = d3.axisLeft(yFocus)
						.tickFormat(formatPrice),
				yAxisFocusRight = d3.axisRight(yFocus)
						.tickFormat(formatPrice),
				xAxisContext = d3.axisBottom(xContext);

	// SVG containers
	const svgFocus = d3.select(".focus-chart").append("svg")
			.attr("class", "focus-svg")
			.attr("width", width + marginFocus.left + marginFocus.right)
			.attr("height", heightFocus + marginFocus.top + marginFocus.bottom);

	const gFocus = svgFocus.append("g")
			.attr("class", "focus-g")
			.attr("transform", `translate(${marginFocus.left},${marginFocus.top})`);

	let tooltipContainer;

	const svgContext = d3.select(".context-chart").append("svg")
			.attr("class", "context-svg")
			.attr("width", width + marginContext.left + marginContext.right)
			.attr("heigth", heightContext + marginContext.top + marginContext.bottom);

	const gContext = svgContext.append("g")
			.attr("class", "context-g")
			.attr("transform", `translate(${marginContext.left},${marginContext.top})`);

	// Clip path
	const svgFocusClipPath = svgFocus.append("defs")
		.append("clipPath")
			.attr("id", "clip-path-focus")
		.append("rect")
			.attr("width", width)
			.attr("height", heightFocus);

	const svgContextClipPath = svgContext.append("defs")
		.append("clipPath")
			.attr("id", "clip-path-context")
		.append("rect")
			.attr("width", width)
			.attr("height", heightContext);

	// Process data
	d3.csv("BTC-USD.csv", d => ({
		date: parseTime(d.Date),
		close: +d.Close
	}), (error, csvData) => {
		if (error) throw error;
		data = csvData;
		renderContext();
		renderFocus();
		renderTooltip();
	});

	function renderContext() {
		gContext.selectAll("*").remove();
		svgContext.select(".brush").remove();

		xContext.domain(d3.extent(data, d => d.date));
		yContext.domain(d3.extent(data, d => d.close));

		// Context background and foreground
		const gContextBF = gContext.selectAll("g.context-bf")
				.data(["background", "foreground"])
			.enter().append("g")
				.attr("class", d => `context-${d}`);

		// Context line
		gContextBF.append("path")
				.attr("class", d => `context-line ${d}-line`)
				.datum(data)
				.style("fill", "none")
				.style("stroke", (d, i) => [backgroundStrokeColor, strokeColor][i])
				.style("stroke-width", strokeWidth)
				.style("stroke-linejoin", "round")
				.style("stroke-linecap", "round")
				.attr("d", lineContext);

		// Context area
		gContextBF.append("path")
			.attr("class", d => `context-area ${d}-area`)
				.datum(data)
				.style("fill", (d, i) => [backgroundAreaColor, areaColor][i])
				.attr("d", areaContext);

		gContext.select(".context-foreground")
				.attr("clip-path", "url(#clip-path-context)");

		// Context axes
		gContext.append("g")
				.attr("class", "axis x-axis")
				.attr("transform", `translate(0,${heightContext})`)
				.call(xAxisContext);

		// Context g to hold brush
		const gBrush = svgContext.append("g")
				.attr("transform", `translate(${marginContext.left},${marginContext.top})`)
				.attr("class", "brush")
				.call(brush)
				.call(brush.move, xContext.range());

		gBrush.selectAll(".brush-handle")
				.data([{type: "w"}, {type: "e"}])
			.enter().append("path")
				.attr("class", "brush-handle")
				.attr("cursor", "ew-resize")
				.attr("d", resizePath)
				.attr("transform", (d, i) => `translate(${xContext.range()[i]},0)`);

		gBrush.select(".selection")
				.style("fill", strokeColor)
				.style("fill-opacity", 0.1);

		gBrush.selectAll(".brush-handle")
				.style("fill", areaColor)
				.style("fill-opacity", 0.1)
				.style("stroke", strokeColor);
	}

	function renderFocus() {
		gFocus.selectAll("*").remove();

		xFocus.domain(d3.extent(data, d => d.date));
		yFocus.domain(d3.extent(data, d => d.close));

		// Focus line
		gFocus
			.append("path")
				.attr("class", "focus-line")
				.style("fill", "none")
				.style("stroke", strokeColor)
				.style("stroke-width", strokeWidth)
				.style("stroke-linejoin", "round")
				.style("stroke-linecap", "round")
				.datum(data)
				.attr("d", lineFocus)
				.attr("clip-path", "url(#clip-path-focus)");

		// Focus area
		gFocus
			.append("path")
				.attr("class", "focus-area")
				.style("fill", areaColor)
				.datum(data)
				.attr("d", areaFocus)
				.attr("clip-path", "url(#clip-path-focus)");

		// Focus axes
		gFocus.append("g")
				.attr("class", "axis x-axis-bottom")
				.attr("transform", `translate(0,${heightFocus})`)
				.call(xAxisFoucsBottom);

		gFocus.append("g")
				.attr("class", "axis x-axis-top")
				.call(xAxisFocusTop);

		gFocus.append("g")
			.attr("class", "axis y-axis-left")
			.call(yAxisFocusLeft);

		gFocus.append("g")
			.attr("class", "axis y-axis-right")
			.attr("transform", `translate(${width}, 0)`)
			.call(yAxisFocusRight);
	}

	function renderTooltip() {
		// Focus tooltip
		tooltipContainer = gFocus.append("g")
				.attr("class", "tooltip-container")
				.style("display", "none");

		// Tooltip line
		tooltipContainer
			.append("line")
				.attr("class", "tooltip-line-vertical")
				.attr("y1", -xAxisFocusTop.tickSizeInner())
				.attr("y2", heightFocus + xAxisFoucsBottom.tickSizeInner())
				.style("fill", "none")
				.style("stroke", tooltipStrokeColor)
				.style("stroke-width", tooltipStrokeWidth);

		tooltipContainer
			.append("line")
				.attr("class", "tooltip-line-horizontal")
				.attr("x1", -yAxisFocusLeft.tickSizeInner())
				.attr("x2", width + yAxisFocusRight.tickSizeInner())
				.style("fill", "none")
				.style("stroke", tooltipStrokeColor)
				.style("stroke-width", tooltipStrokeWidth);

		// Tooltip circle
		tooltipContainer
			.append("circle")
				.attr("class", "tooltip-circle")
				.attr("r", 3)
				.style("fill", bodyBackgroundColor)
				.style("stroke", tooltipStrokeColor)
				.style("stroke-width", tooltipStrokeWidth);

		// Tooltip annotation
		const annotation = tooltipContainer
			.selectAll("g.annotation")
				.data(["top", "bottom", "left", "right"].map(d => ({ orientation: d })))
			.enter().append("g")
				.attr("class", d => `annotation annotation-${d.orientation}`);

		annotation.append("text");
		tooltipContainer.select(".annotation-top text")
				.attr("y", -xAxisFocusTop.tickSizeInner() - xAxisFocusTop.tickPadding())
				.attr("dy", "0em")
				.style("text-anchor", "middle");
		tooltipContainer.select(".annotation-bottom text")
				.attr("y", heightFocus + xAxisFoucsBottom.tickSizeInner() + xAxisFoucsBottom.tickPadding())
				.attr("dy", "0.7em")
				.style("text-anchor", "middle");
		tooltipContainer.select(".annotation-left text")
				.attr("x", -yAxisFocusLeft.tickSizeInner() - yAxisFocusLeft.tickPadding())
				.attr("dy", "0.35em")
				.style("text-anchor", "end");
		tooltipContainer.select(".annotation-right text")
				.attr("x", width + yAxisFocusRight.tickSizeInner() + yAxisFocusRight.tickPadding())
				.attr("dy", "0.35em")
				.style("text-anchor", "start");

		annotation.insert("rect", "text")
				.style("stroke", strokeColor)
				.style("fill", bodyBackgroundColor);

		// Tooltip rect to capture mouse event
		gFocus.append("rect")
				.attr("class", "zoom")
				.attr("width", width)
				.attr("height", heightFocus)
				.attr("fill", "none")
				.style("pointer-events", "all")
				.style("cursor", "move")
				.on("mouseover", () => tooltipContainer.style("display", null))
				.on("mouseout", () => tooltipContainer.style("display", "none"))
				.on("mousemove", mousemove)
				.call(zoom);
	}

	function mousemove() {
		const x0 = xFocus.invert(d3.mouse(this)[0]),
					i = bisectDate(data, x0, 1),
					d0 = data[i - 1],
					d1 = data[i],
					d = x0 - d0.date > d1.date - x0 ? d1 : d0;
		// Tooltip lines
		tooltipContainer.select(".tooltip-line-vertical")
				.attr("x1", xFocus(d.date))
				.attr("x2", xFocus(d.date));
		tooltipContainer.select(".tooltip-line-horizontal")
				.attr("y1", yFocus(d.close))
				.attr("y2", yFocus(d.close));
		// Tooltip circle
		tooltipContainer.select(".tooltip-circle")
				.attr("cx", xFocus(d.date))
				.attr("cy", yFocus(d.close));

		// Tooltip annotations
		// Text
		tooltipContainer.select(".annotation-top text")
				.attr("x", xFocus(d.date))
				.text(formatDate(d.date));
		tooltipContainer.select(".annotation-bottom text")
				.attr("x", xFocus(d.date))
				.text(formatDate(d.date));
		tooltipContainer.select(".annotation-left text")
				.attr("y", yFocus(d.close))
				.text(formatPrice(d.close));
		tooltipContainer.select(".annotation-right text")
				.attr("y", yFocus(d.close))
				.text(formatPrice(d.close));
		tooltipContainer.selectAll(".annotation text")
				.attr("bbox", function(d) { d.bbox = this.getBBox(); });

		// Rect
		tooltipContainer.selectAll(".annotation rect")
				.attr("x", d => d.bbox.x - tooltipPadding)
				.attr("y", d => d.bbox.y - tooltipPadding)
				.attr("width", d => d.bbox.width + 2 * tooltipPadding)
				.attr("height", d => d.bbox.height + 2 * tooltipPadding);
	}

	function brushed() {
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;

		const s = d3.event.selection || xContext.range();
		const xFocusDomain = s.map(xContext.invert, xContext);
		xFocus.domain(xFocusDomain);
		yFocus.domain(d3.extent(data.filter(d => d.date >= xFocusDomain[0] && d.date <= xFocusDomain[1]), d => d.close));

		gFocus.select(".focus-line").attr("d", lineFocus);
		gFocus.select(".focus-area").attr("d", areaFocus);
		gFocus.select(".x-axis-bottom").call(xAxisFoucsBottom);
		gFocus.select(".x-axis-top").call(xAxisFocusTop);
		gFocus.select(".y-axis-left").call(yAxisFocusLeft);
		gFocus.select(".y-axis-right").call(yAxisFocusRight);
		gFocus.select(".zoom").call(zoom.transform, d3.zoomIdentity
					.scale(width / (s[1] - s[0]))
					.translate(-s[0], 0));

		svgContext.selectAll(".brush-handle")
				.attr("transform", (d, i) => `translate(${s[i]},0)`);
		svgContext.select("#clip-path-context rect")
				.attr("x", s[0])
				.attr("width", s[1] - s[0]);
	}

	function zoomed() {
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;

		const t = d3.event.transform;
		const xFocusDomain = t.rescaleX(xContext).domain();
		xFocus.domain(xFocusDomain);
		yFocus.domain(d3.extent(data.filter(d => d.date >= xFocusDomain[0] && d.date <= xFocusDomain[1]), d => d.close));

		gFocus.select(".focus-line").attr("d", lineFocus);
		gFocus.select(".focus-area").attr("d", areaFocus);
		gFocus.select(".x-axis-bottom").call(xAxisFoucsBottom);
		gFocus.select(".x-axis-top").call(xAxisFocusTop);
		gFocus.select(".y-axis-left").call(yAxisFocusLeft);
		gFocus.select(".y-axis-right").call(yAxisFocusRight);

		const s = xFocus.range().map(t.invertX, t); // Brush selection
		svgContext.select(".brush").call(brush.move, s);
		svgContext.selectAll(".brush-handle")
				.attr("transform", (d, i) => `translate(${s[i]},0)`);
		svgContext.select("#clip-path-context rect")
				.attr("x", s[0])
				.attr("width", s[1] - s[0]);
	}

	function resizePath(d) {
		const e = +(d.type == "e"),
				x = e ? 1 : -1,
				y = heightContext / 3;
		return "M" + (0.5 * x) + "," + y +
				"A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) +
				"V" + (2 * y - 6) +
				"A6,6 0 0 " + e + " " + (0.5 * x) + "," + (2 * y) +
				"Z" +
				"M" + (2.5 * x) + "," + (y + 8) +
				"V" + (2 * y - 8) +
				"M" + (4.5 * x) + "," + (y + 8) +
				"V" + (2 * y - 8);
	}

	// Optimized resize
	// https://developer.mozilla.org/en-US/docs/Web/Events/resize
	(function () {
		var throttle = function (type, name, obj) {
			obj = obj || window;
			var running = false;
			var func = function () {
				if (running) { return; }
				running = true;
				requestAnimationFrame(function () {
					obj.dispatchEvent(new CustomEvent(name));
					running = false;
				});
			};
			obj.addEventListener(type, func);
		};

		/* init - you can init any event */
		throttle("resize", "optimizedResize");
	})();

	// Listen for resize changes
	window.addEventListener("optimizedResize", reDraw, false);
	// Listen for orientation changes
	window.addEventListener("orientationchange", reDraw, false);

	function reDraw() {
		width = $(".focus-chart").width() - marginFocus.left - marginFocus.right;
		brush.extent([[0, 0], [width, heightContext]]);
		zoom.translateExtent([[0, 0], [width, heightFocus]])
				.extent([[0, 0], [width, heightFocus]]);
		xFocus.range([0, width]);
		xContext.range([0, width]);
		svgFocus.attr("width", width + marginFocus.left + marginFocus.right);
		svgContext.attr("width", width + marginContext.left + marginContext.right);
		svgFocusClipPath.attr("width", width);
		svgContextClipPath.attr("width", width);
		renderContext();
		renderFocus();
		renderTooltip();
	}
})();