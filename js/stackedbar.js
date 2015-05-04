StackedBarVis = function(_eventHandler, _color){
    this.eventHandler = _eventHandler;
    this.color = _color;
}

StackedBarVis.prototype.filterData = function(_data){
    return _data.filter(function(d){
        return d.name != "ALL RESERVOIR AVERAGE" && d.capacity != "NA" && d.id != "EXC" ; //"EXC"->strange data
    })
}

StackedBarVis.prototype.makeDateList = function(_data){
    var dateList = [];

    _data[0].values.forEach(function(d){
        dateList.push(d.date);
    })

    this.dateList = dateList.sort(function(a, b){
        return d3.ascending(a, b);
    })

}

StackedBarVis.prototype.getDateHasData = function(_date){
    var that = this;
    selDate = _date;
    var index = 0;

    try{
        that.dateList.forEach(function(d, i){
            if(d >= selDate){
                index = i;
                throw BreakException;
            }
        })
    }catch(e){ //nothing
    }

    return (index == 0) ? that.dateList[index] : that.dateList[index - 1];
}

StackedBarVis.prototype.reformatData = function(_data, _selectedDate){
    filData = _data;
    selDate = _selectedDate;

    var parseDate = d3.time.format("%Y%m%d").parse;
    var fmDate = d3.time.format("%x");
    var xAxisDate = fmDate(parseDate(selDate))

    //Data wrangling
    var y0 = 0;
    var y1 = 0;
    var index = -1;
    var valForTip = [];
    var count = 0;
    data = 
    [{
        state: "Storage on " + xAxisDate,
        storages: filData.map(function(d, i) {
            index = -1;
            try{      
                d.values.forEach(function(e, i){
                    if(e.date == selDate){
                        index = i
                        throw BreakException;
                    }
                })
            }catch(e){ //nothing
            }

            if(index == -1)
                count++;

            valForTip.push((index != -1) ? +d.values[index].storage : 0)
           
            return {
                "name": d.name,
                "id": d.id,
                "y0": 0, //temporary
                "y1": 0, //temporary
                "value": (index != -1) ? +d.values[index].storage : 0,
                "capacity": +d.capacity
            }
        }),
        total: 0 //temporary
    },
    {
        state: "Capacity",
        storages: filData.map(function(d, i) {
            return {
                "name": d.name,
                "id": d.id,
                "y0": 0, //temporary
                "y1": 0, //temporary
                "value": valForTip[i],
                "capacity": (!isNaN(d.capacity)) ? +d.capacity : 0
            }
        }),
        total: 0 //temporary
    }]

    //console.log("uncounted reservoir,", count)

     //sorting
    data[0].storages = data[0].storages.sort(function(a, b){
        return d3.descending(a["capacity"], b["capacity"]);
    })
    data[1].storages = data[1].storages.sort(function(a, b){
        return d3.descending(a["capacity"], b["capacity"]);
    })

    //Current
    //update y0,y1
    var y0 = 0;
    var y1 = 0;
    //current storage
    data[0].storages.map(function(d){
        y0 = y1;
        y1 = y0 + d.value;
        d.y0 = y0;
        d.y1 = y1;
    })

    //update total
    data[0].total = y1;

    //Capacity
    //update y0,y1
    var y0 = 0;
    var y1 = 0;
    //current storage
    data[1].storages.map(function(d){
        y0 = y1;
        y1 = y0 + d.capacity;
        d.y0 = y0;
        d.y1 = y1;
    })

    //update total
    data[1].total = y1;

    return data;

}

StackedBarVis.prototype.createStackBar = function(_resData){

    var oldData = _resData;
    var that = this;

    this.stateClick = false;

    var margin = {top: 20, right: 50, bottom: 30, left: 40},
        width = 400 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
        .rangeRound([height, 0]);
    //save to this
    this.x = x;
    this.y = y;

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
    this.xAxis = xAxis;

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickFormat(d3.format(".2s"));

    //Tooltips
    var tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("opacity", 0)
        .attr("class","tooltip")
        .text("Loading");
    var fcomma = d3.format(",");

    var svg = d3.select("#stackedbarVis").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    this.svg = svg;

      //Data filtering - remove "All reservoir"
      this.filData = this.filterData(oldData)
      this.makeDateList(this.filData);
      var data = this.reformatData(this.filData, "20140916"); //Latest Date in data

      //total capacity
      var totalCap = 0;
      this.filData.map(function(d) {
          if(!isNaN(d.capacity))
              totalCap += +d.capacity;
      })

      //domain
      x.domain([data[0].state,data[1].state]);
      //y.domain([0, data[0].total]);
      y.domain([0,totalCap]);

      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
          //.attr("transform", "rotate(-90)")
          .attr("y", -20)
          .attr("x", -35)
          .attr("dy", ".71em")
          .style("text-anchor", "start")
          .text("Storage(Acre-ft)");

      var bar = svg.selectAll(".g")
        .data(data)
        .enter().append("g")
          .attr("class", "g")
          .attr("transform", function(d) {return "translate(" + x(d.state) + ",0)"; });

      bar.selectAll("rect")
          .data(function(d){return d.storages})
        .enter().append("rect")
          .attr("width", x.rangeBand())
          .attr("y", function(d) { return y(d.y1); 
          })
          .attr("height", function(d) {return parseFloat(y(d.y0)) - parseFloat(y(d.y1)); })
          .style("fill", function(d) { return that.color(d.id); })
          .attr("class","stuckbar")
          .attr("id", function(d,i){ return d.id })
          .on("mouseover",function(d,i){ 
              // Highlight bar
              d3.selectAll(".stuckbar").style("opacity", 0.3)    
              d3.select(this).style("opacity", 1)
              d3.selectAll("#"+d.id).style("opacity", 1)

              //change multi line chart
              $(that.eventHandler).trigger("barSelected",d.id);
              //unClick 
              this.stateClick = false;

              tooltip.transition()        
                  .duration(200)      
                  .style("opacity", .9);

              var capTip = fcomma(d.capacity.toFixed(0));
              var stoTip = fcomma(d.value.toFixed(0));
              var ratioTip = (d.value / d.capacity) * 100; //percentage
              ratioTip = fcomma(ratioTip.toFixed(0));
              var ent = "<br/>"
              var sp = "&nbsp;&nbsp;&nbsp;"

              tooltip.html(d.name+ent+sp+"Storage : "+ stoTip + "Acre-ft" +ent+sp+"Capacity: "+ capTip + "Acre-ft" +ent+sp+"Utilization: "+ ratioTip + " %")  //<br/> is return/enter
                  .style("left", (d3.event.pageX + 30) + "px")     
                  .style("top", (d3.event.pageY - 20) + "px");  


          })
          .on("click", function(d){
              this.stateClick = true;
          })
          .on("mouseleave",function(){
              //deactivate "mouseleave" when a bar is clicked 
              if(!this.stateClick){
                  d3.selectAll(".stuckbar").style("opacity", 1)
                  //change multi line chart
                  $(that.eventHandler).trigger("barSelected","N/A");
              }

              tooltip.transition()        
                  .duration(200)      
                  .style("opacity", 0);

          });
}

StackedBarVis.prototype.updateStackBar = function(_date){
    var that = this;
    var selDate = _date;

    var data = this.reformatData(that.filData, selDate);

    var bar = that.svg.selectAll(".g")
        .data(data)

    bar.selectAll("rect")
        .data(function(d){return d.storages})
        .transition().duration(0)
        .attr("width", that.x.rangeBand())
        .attr("y", function(d) { return that.y(d.y1); 
        })
        .attr("height", function(d) {return parseFloat(that.y(d.y0)) - parseFloat(that.y(d.y1)); })

    // updates domain and axis
    that.x.domain([data[0].state,data[1].state]);
    that.svg.select(".x.axis")
        .call(that.xAxis);
}

StackedBarVis.prototype.dateChanged = function(_date){

    //read about time format http://stackoverflow.com/questions/17721929/date-format-in-d3-js
    formatDate = d3.time.format("%Y%m%d")
    selDate = formatDate(_date)

    //console.log("selected,",selDate);

    //get the closest date has data
    resDate = this.getDateHasData(selDate);

    //console.log("showned ,", resDate)

    this.updateStackBar(resDate);

    return resDate;

}



