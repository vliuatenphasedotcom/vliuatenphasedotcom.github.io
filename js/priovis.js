PrioVis = function(_parentElement, _data, _metaData){
    this.parentElement = _parentElement;
    this.data = _data;
    this.metaData = _metaData;
    this.displayData = [];

    // defines constants
    this.margin = {top: 20, right: 0, bottom: 300, left: 60},
    this.width = 750 - this.margin.left - this.margin.right,
    this.height = 540 - this.margin.top - this.margin.bottom;

    this.initVis();

}

PrioVis.prototype.initVis = function(){

    var that = this; // read about the this

    this.svg = this.parentElement

    this.x = d3.scale.ordinal()
        .rangeRoundBands([this.margin.left, this.width]);

    this.y = d3.scale.linear()
        .range([this.height, 0]);

    this.xAxis = d3.svg.axis()
      .scale(this.x)
      .orient("bottom")

    this.yAxis = d3.svg.axis()
      .scale(this.y)
      .orient("left");

    // Add axes visual elements
    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")")

    this.svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(50,5)")
      .append("text")
        .attr("transform", "translate(10,0)")
        .attr("y", 6)
        .style("text-anchor", "start")
        .style("font-size","15px")
        .text("Distribution of priorities");

    // filter, aggregate, modify data
    this.wrangleData(this.data,null,null);

    // call the update method
    this.updateVis();
}

PrioVis.prototype.wrangleData= function(_filterFunction, start, end){

    // displayData should hold the data which is visualized
    this.displayData = this.filterAndAggregate(_filterFunction, start, end);

    //// you might be able to pass some options,
    //// if you don't pass options -- set the default options
    //// the default is: var options = {filter: function(){return true;} }
    //var options = _options || {filter: function(){return true;}};
}

PrioVis.prototype.updateVis = function(){

    // Dear JS hipster,
    // you might be able to pass some options as parameter _option
    // But it's not needed to solve the task.
    // var options = _options || {};

    that = this;

    this.x.domain(this.displayData.map(function(d) { return d.title; })); //same as this.y.domain([0,98])
	this.y.domain([0, d3.max(this.displayData.map(function(d){return d.count;}))]);

    // updates axis
    this.svg.select(".x.axis")
        .call(this.xAxis)
        .selectAll("text")  
        .style("text-anchor", "start")
        .attr("dx", ".8em")
        .attr("dy", "-.15em")
        .style("font-size", "13px")
        .attr("transform", function(d) {return "rotate(65)"});

    this.svg.select(".y.axis")
        .call(this.yAxis)

    // Data join
    var bar = this.svg.selectAll(".bar")
      .data(this.displayData, function(d, i) {return i; });

    // Append new bar groups, if required
    var bar_enter = bar.enter().append("g");

    // Append a rect and a text only for the Enter set (new g)
    bar_enter.append("rect")
    	.attr("fill", function(d, i){return that.metaData.priorities[i]["item-color"]});

    // Add attributes (position) to all bars
    bar
      .attr("class", "bar")
      .transition()
      .attr("transform", function(d) { return "translate(" + that.x(d.title) + ",0)"; })

    // Remove the extra bars
    bar.exit()
      .remove();

    // Update all inner rects and texts (both update and enter sets)
    bar.select("rect")
      .attr("x", 0)
      .attr("height", function(d, i) {return that.height - that.y(d.count); })
      .attr("width", this.width / 20)
      .transition().duration(0)
      .attr("y", function(d){return that.y(d.count)})

}

PrioVis.prototype.onSelectionChange= function (selectionStart, selectionEnd){

    this.wrangleData(this.data,selectionStart,selectionEnd)

    this.updateVis();

}

PrioVis.prototype.filterAndAggregate = function(_filter,start,end){

    // create an array of values for prios 0-15
    var res = d3.range(16).map(function () {
        return {
        	title: "",
        	count: 0
        };
    });

    // Set filter to a function that accepts all items
    // ONLY if the parameter _filter is NOT null use this parameter
    var filter = function(){return true;}
    filter = _filter;
    if (start != null){
    //Dear JS hipster, a more hip variant of this construct would be:
    // var filter = _filter || function(){return true;}
        filter = filter.filter(function(d){ 
            return start <= d.time && d.time <= end;
        })
    }

    var that = this;

    // accumulate all values that fulfill the filter criterion
    filter.forEach(function(d){
        for (var i = 0; i < 16; i++) {
            res[i].count += d.prios[i];
        };
    })
    
    i = 0;
    //apply item-title from metaData
    while(i<16){
    	res[i].title = this.metaData.priorities[i]["item-title"];
    	i++;
    }

    return res;
}