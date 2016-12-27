import {select} from "d3-selection";
import {line} from "d3-shape";
import {scaleLinear, scalePoint} from "d3-scale";
import {extent} from "d3-array";
import {axisLeft, axisBottom} from "d3-axis";

const defaultMargin = {top: 10, right: 20, bottom: 30, left: 30};
const defaultHeight = 200;
const defaultWidth = 400;

const defaultXAccessor = "x";
const defaultYAccessor = "y";

/*
 * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 */
const uuid = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    let r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default class ThreesyLine {
  constructor(opts = {}) {
    // Wrapper HTML element for the chart.
    if (opts.element) {
      this.element = select(opts.element);
    }

    // Element id and CSS classes.
    this.id = opts.id || uuid();
    this.classes = opts.classes || [];

    // Chart dimensions and margins/padding.
    this.margin = opts.margin || defaultMargin;
    this.height = (opts.height || defaultHeight) - this.margin.top - this.margin.bottom;
    this.width = (opts.width || defaultWidth) - this.margin.left - this.margin.right;

    // Chart data.
    this.data = opts.data || [];

    this.accessorX = opts.accessorX || defaultXAccessor;
    this.accessorY = opts.accessorY || defaultYAccessor;

    this.domainX = opts.domainX;
    this.domainY = opts.domainY;

    this.showDataPoints = typeof opts.showDataPoints === "undefined" ? true : opts.showDataPoints;
    this.showGridLines = typeof opts.showGridLines === "undefined" ? true : opts.showGridLines;
  }

  draw() {
    if ((typeof this.element) === "undefined") {
      throw new Error("No element selected.")
    }

    if ((typeof this.data) === "undefined" || !this.data.length) {
      throw new Error("No chart data provided.");
    }

    if (typeof this.domainX === "undefined") {
      this.domainX = this.data.map((d) =>
          typeof this.accessorX === "string" ? d[this.accessorX] : this.accessorX(d));
    }

    if (typeof this.domainY === "undefined") {
      this.domainY = extent(this.data, (d) =>
          typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d));
    }

    // Create the x and y scales, and set the
    // the domain and range for each.
    this.scaleX = scalePoint()
        .domain(this.domainX)
        .range([0, this.width]);

    this.scaleY = scaleLinear()
        .domain(this.domainY)
        .range([this.height, 0]);

    // Set the x and y axis types.
    this.axisX = axisBottom(this.scaleX);
    this.axisY = axisLeft(this.scaleY).ticks(this.data.length);

    // Create the SVG and set the margins
    this.chart = this.element
        .append("svg")
        .attr("id", this.id)
        .attr("class", this.classes.join(" "))
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .attr("width", this.width + this.margin.left + this.margin.right)
        .append("g")
        .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

    this.chart
        .classed("threesy-line", true);

    this.gridLineX = this.chart.selectAll(".threesy-grid-line-x")
        .data(this.data.filter((d, i) => i > 0))
        .enter().append("line")
        .attr("class", "threesy-grid-line threesy-grid-line-x")
        .attr("x1", (d) => this.scaleX(typeof this.accessorX === "string" ? d[this.accessorX] : this.accessorX(d)))
        .attr("x2", (d) => this.scaleX(typeof this.accessorX === "string" ? d[this.accessorX] : this.accessorX(d)))
        .attr("y1", 0)
        .attr("y2", this.height);

    this.gridLineY = this.chart.selectAll(".threesy-grid-line-y")
        .data(this.data.filter((d) => {
          return this.scaleY(typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d)) < this.height - 1;
        }))
        .enter().append("line")
        .attr("class", "threesy-grid-line threesy-grid-line-y")
        .attr("x1", 0)
        .attr("x1", this.width)
        .attr("y1", (d) => this.scaleY(typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d)))
        .attr("y2", (d) => this.scaleY(typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d)));

    // Draw the x and y axes
    this.chart.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0, ${this.height})`)
        .call(this.axisX);

    this.chart.append("g")
        .attr("class", "y axis")
        .call(this.axisY);

    // Create the line generator and set the
    // access functions
    this.line = line()
        .x((d) => this.scaleX(typeof this.accessorX === "string" ? d[this.accessorX] : this.accessorX(d)))
        .y((d) => this.scaleY(typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d)));

    // Draw the path
    this.path = this.chart.append("g")
        .append("path")
        .datum(this.data)
        .attr("class", "line")
        .attr("d", this.line);

    // Create circles for each data point.
    // Only visible if showDataPoints = true.
    this.dataPoints = this.chart.selectAll(".threesy-data-point")
        .data(this.data)
        .enter().append("circle")
        .attr("class", "threesy-data-point")
        .attr("data-tooltip", (d) =>
            `${typeof this.accessorX === "string" ? d[this.accessorX] : this.accessorX(d)}: ${typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d)}`)
        .attr("data-tooltip-position", "top center")
        .attr("r", 3.5)
        .attr("cx", (d) => this.scaleX(typeof this.accessorX === "string" ? d[this.accessorX] : this.accessorX(d)))
        .attr("cy", (d) => this.scaleY(typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d)))
        .style("visibility", this.showDataPoints ? "visible" : "hidden");

    return this;
  }

  update(data) {
    if (typeof data === "undefined" || !data.length) {
      throw new Error("Can't invoke update without data.")
    }

    this.data = data;

    this.domainX = this.data.map((d) =>
        typeof this.accessorX === "string" ? d[this.accessorX] : this.accessorX(d));

    this.domainY = extent(this.data, (d) =>
        typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d));

    this.scaleX.domain(this.domainX);
    this.scaleY.domain(this.domainY);

    this.gridLineX
        .data(this.data.filter((d, i) => i > 0))
        .attr("x1", (d) => this.scaleX(typeof this.accessorX === "string" ? d[this.accessorX] : this.accessorX(d)))
        .attr("x2", (d) => this.scaleX(typeof this.accessorX === "string" ? d[this.accessorX] : this.accessorX(d)))
        .attr("y1", 0)
        .attr("y2", this.height);

    this.gridLineY
        .data(this.data.filter((d) => {
          return this.scaleY(typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d)) < this.height - 1;
        }))
        .attr("x1", 0)
        .attr("x1", this.width)
        .attr("y1", (d) => this.scaleY(typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d)))
        .attr("y2", (d) => this.scaleY(typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d)));

    this.gridLineX.exit().remove();
    this.gridLineY.exit().remove();

    select(".x.axis").call(this.axisX);
    select(".y.axis").call(this.axisY);

    this.path.datum(this.data)
        .attr("d", this.line);

    this.dataPoints.data(this.data)
        .attr("cx", (d) => this.scaleX(typeof this.accessorX === "string" ? d[this.accessorX] : this.accessorX(d)))
        .attr("cy", (d) => this.scaleY(typeof this.accessorY === "string" ? d[this.accessorY] : this.accessorY(d)));

    this.dataPoints.exit().remove();
  }

  toggleDataPoints() {
    this.dataPoints
        .style("visibility", (this.showDataPoints = !this.showDataPoints) ? "visible" : "hidden");
  }

  toggleGridLines() {
    this.chart.selectAll(".threesy-grid-line")
        .style("visibility", (this.showGridLines = !this.showGridLines) ? "visible" : "hidden");
  }
}