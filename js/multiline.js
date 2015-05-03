
MultiLineVis = function(_eventHandler, _color){
    this.eventHandler = _eventHandler;
    this.color = _color;
}

MultiLineVis.prototype.PickTop10 = function(_resData){
    var data = _resData;
    var res = [];
    var count = 0;

    sdata = data.sort(function(a, b) {
        return d3.descending(a["capacity"],b["capacity"]);
    });

    sdata.forEach(function(d){
        if(count <= 10)
            res.push(d)
        count++;  
    })
    return res;
}

MultiLineVis.prototype.calCapacity = function(data){
  var totalCap = 0;
  data.forEach(function(d){
      if(!isNaN(d.capacity))
          totalCap += +d.capacity;
  })

  return totalCap;
}

MultiLineVis.prototype.filterData = function(_data, _selLake){
    return _data.filter(function(d){
        return d.id == "ALL" || d.id == _selLake;
    })
}

MultiLineVis.prototype.createMultiLine = function(_allData){
    this.data = _allData;
    var that = this;

    var margin = {top: 20, right: 200, bottom: 30, left: 50},
        width = 850 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var parseDate = d3.time.format("%Y%m%d").parse;

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    //save to "this"
    this.x = x;
    this.y = y;
    this.width = width;

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
    //calculate total capacity
    var totalCapacity = this.calCapacity(this.data);

    var line = d3.svg.line()
        .interpolate("basis")
        .x(function(d) { return x(parseDate(d.date)); })
        .y(function(d) { return y(d.percentage); });
    this.line = line;

    var svg = d3.select("#multiLineVis").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    this.svg = svg;

    var filData = this.filterData(this.data, "SHA");
    console.log("Fil,", filData)

    //x.domain(d3.extent(data, function(c) { return d3.min(c.values, function(v) { return parseDate(v.date); }); }));
    x.domain([parseDate("20000104"),parseDate("20140916")]);

    y.domain([0,120]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Storage(%)");

    var lake = svg.selectAll(".lake")
        .data(filData)
      .enter().append("g")
        .attr("class", "lake")
        //.attr("id", function(d){return "L_"+d.id})
        .attr("id", function(d, i){return (i == 0) ? "L_ALL" :"L_OTH"})
        .attr("opacity", 1);

    lake.append("path")
        .attr("class", "line")
        .attr("d", function(d) { return line(d.values); })
        .style("stroke", function(d) { return that.color(d.id); });

    lake.append("text")
        .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
        .attr("transform", function(d) { return "translate(" + x(parseDate(d.value.date)) + "," + y(d.value.percentage) + ")"; })
        .attr("x", 3)
        .attr("dy", ".35em")
        .text(function(d) { return d.name; });

    //Always All Reservoir is shown
    d3.select("#L_OTH").style("opacity", 0)

    //create slide bar
    this.addSlider(svg);

}

MultiLineVis.prototype.updateMultiLine = function(_barId){
    
    barId = _barId;
    var that = this;
    var parseDate = d3.time.format("%Y%m%d").parse;
    console.log("bar secected!", barId);

    if(barId != "N/A"){ //mouse hover
        filData = this.filterData(that.data, barId)
    
        console.log("upd,", filData)

        var lake = that.svg.selectAll(".lake")
                .data(filData)

            lake.select("path")
                .transition().duration(500)
                .attr("d", function(d) { return that.line(d.values); })
                .style("stroke", function(d) { return that.color(d.id); });

            lake.select("text")
                .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
                .attr("transform", function(d) { return "translate(" + that.x(parseDate(d.value.date)) + "," + that.y(d.value.percentage) + ")"; })
                .text(function(d) { return d.name; });

        d3.select("#L_OTH").transition().duration(500).style("opacity", 1) //show line

    }else{ //mouse leave
        d3.select("#L_OTH").transition().duration(500).style("opacity", 0) //hide line
    }    
}

MultiLineVis.prototype.barSelected = function(_barId){
    this.updateMultiLine(_barId)
}

MultiLineVis.prototype.addSlider = function(svg){
    var that = this;
    var x = that.x;
    var width = that.width; // I don't know why I can't use "that" inside of sliderDragged functionma

    // TODO: Think of what is domain and what is range for the y axis slider !!
    var sliderScale = d3.scale.linear().domain([.1,1]).range([0,width])

    var sliderDragged = function(){
        var value = Math.max(0, Math.min(width,d3.event.x));

        var sliderValue = sliderScale.invert(value);
        var selectValue = x.invert(value);

        d3.selectAll(".sliderHandle").attr("x", function () { return sliderScale(sliderValue); })
        d3.select(".sliderHandle-bg").attr("x", function () { return sliderScale(sliderValue) - 20; })

        //change multi line chart
        $(that.eventHandler).trigger("dateChanged",selectValue);   

    }
    var sliderDragBehaviour = d3.behavior.drag()
        .on("drag", sliderDragged)

    var sliderGroup = svg.append("g").attr({
        class:"sliderGroup",
        "transform":"translate("+0+","+-30+")"
    })

    sliderGroup.append("rect").attr({
        class:"sliderBg",
        y:30,
        width: that.width + 5,
        height:450
    }).style({
        fill:"lightgray",
        opacity:0.1
    })
 
    sliderGroup.append("rect").attr({
        "class":"sliderHandle-bg",
        x:sliderScale(1) - 20,
        y: 11,
        width:50,
        height:20,
        rx:5,
        ry:5
    }).style({
        fill:"red",
        opacity: 0.3,
        stroke: "grey"
    }).call(sliderDragBehaviour)

    sliderGroup.append("rect").attr({
        "class":"sliderHandle",
        x:sliderScale(1),
        y: 30,
        width:10,
        height:450,
        rx:2,
        ry:2
    }).style({
        fill:"red",
        opacity: 0.3
    })

    sliderGroup.append("rect").attr({
            "class":"sliderHandle-bg",
            x:sliderScale(1)-20,
            y: 30,
            width:40,
            height:450,
            rx:2,
            ry:2
        }).style({
        opacity: 0
    }).call(sliderDragBehaviour)

}
