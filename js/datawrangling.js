Wrangling = function(){
}

Wrangling.resDataWrang = function(_resData){
	var resData = [];

	var totalCapacity = 0;
	_resData.forEach(function(d){
		if(!isNaN(d.Capacity))
			totalCapacity += +d.Capacity
	})

	var objTotal = [];
    _resData.forEach(function(d){

    	stoData = [];
		for (var date in d.Storage ) {
			stoData.push({
				date: date,
				storage: d.Storage[date],
				percentage: d3.round(d.Storage[date] / d.Capacity, 4) * 100
			})

			//for total
			objTotal.push({
				date: date,
				storage: d.Storage[date]
			})
		}

    	resData.push({
    			name: d.Station,
    			id: d.ID,
                capacity: d.Capacity,
                latitude: d.Latitude,
                longitude: d.Longitude,
    			values: stoData
    	})
    })

    //objTotal has storage data with all dates for all reservoir
    //aggregate storage data by each date and push to totalSto object 
    var totalSto = [];
    var addflg = false;
    objTotal.forEach(function(d){
    	totalSto.forEach(function(e){
    		if(e.date==d.date){
    			e.storage += d.storage;
    			addflg = true;
    		}
    	})
    	if(addflg==false){
    		totalSto.push({
    			date: d.date,
    			storage: d.storage,
    			percentage: 0

    		})
    	}
    })

    //calculate percentage
    totalSto.forEach(function(d){
    	d.percentage = d3.round(d.storage / totalCapacity, 4) * 100
    })

    //create a distinct dataset for an aggregation of all reservoir capacity data
	resData.push({
		name: "ALL RESERVOIR AVERAGE",
	    capacity: totalCapacity,
	    latitude: 0,
	    longitude: 0,
		values: totalSto
	})   


    console.log("RESDATA,",resData)

    this.saveToFile(resData,"reservoirData_processed.json")

    return resData;
}


Wrangling.usageDataWrang = function(_usageData, _dicData){
	var usageData = [];

	//filter by state = California
	filUsageData = _usageData.filter(function(d){ return d.STATE == "CA"})
	console.log("filterCA: ",filUsageData.length)

	//get neccesary column name
	var colList = [];
	var colLevel5 = []; //irrigation sprinkler etc
	_dicData.map(function(d){
		if(d.ColumnUse == "y")
			colList.push(d);
		if(d.ColumnUse == "s")
			colLevel5.push(d);
	})

	//aggregate by all counties
	var agUsageData = {}; 
	filUsageData.map(function(d){
		for (var column in d) {
			if(!isNaN(+d[column]) && column != "STATE" && column != "COUNTY"){

				if(agUsageData[column]==undefined)	
					agUsageData[column] = 0;
			
				agUsageData[column] += +d[column];
			}
		}
	})

	//create Nodes
	var nodes = [];
	var tmp = [];
	colList.map(function(d){
			//"indexOf"--search word in object, if word is found, then return the place, else, return "-1"
			//colList has many duplicate words and tmp object will get unique word, no duplicates will be returned.
			if(tmp.indexOf(d.Source) == -1 && d.Source != "")
				tmp.push(d.Source)
			if(tmp.indexOf(d.Type) == -1 && d.Type != "")
				tmp.push(d.Type)
			if(tmp.indexOf(d.Use) == -1 && d.Use != "")
				tmp.push(d.Use)
			if(tmp.indexOf(d.UseDetail) == -1 && d.UseDetail != "")
				tmp.push(d.UseDetail)
	})
	tmp.push("Crop - Sprinkler", "Crop - Micro Irrigation", "Crop - Surface Flood"); //for level 5

	debugger;

	//make nodes format for Sankey 
	nodes = tmp.map(function(d){
		return {
			"name" : d
		};
	})
	console.log(nodes.length)

	//create links
	var links = [];
	colList.map(function(d){

		//Level 1-2(source to type)
		var aggrFlg = false; 
		links.forEach(function(e){

			//aggregate when source and target are duplicated
			if(d.Source != "N/A" && d.Type != "N/A"){
				if(e.source == d.Source && e.target == d.Type){
					e.value += agUsageData[d.ColumnTag];
					aggrFlg = true;
				}
			}
		})
		if(!aggrFlg && d.Source != "" && d.Type != ""){
			links.push({
				"source": d.Source,
				"target": d.Type,
				"value": (d.Source != "N/A" && d.Type != "N/A") ? agUsageData[d.ColumnTag] : 1
			})
		}

		//Level 2-3 (Type and Use, respectively)
		aggrFlg = false; //initialize flag
		links.forEach(function(e){
			if(d.Type != "N/A" && d.Use != "N/A"){
				if(e.source == d.Type && e.target == d.Use){
					e.value += agUsageData[d.ColumnTag];
					aggrFlg = true;
				}
			}
		})
		if(!aggrFlg && d.Type != "" && d.Use != ""){
			links.push({
				"source": d.Type,
				"target": d.Use ,
				"value":  (d.Type != "N/A" && d.Use != "N/A") ? agUsageData[d.ColumnTag] : 1
			})
		}

		//Level 3-4 (Use and UseDetail, respectively)
		aggrFlg = false; //initialize
		links.forEach(function(e){
			if(d.Use != "N/A" && d.UseDetail != "N/A"){
				if(e.source == d.Use && e.target == d.UseDetail){
					e.value += agUsageData[d.ColumnTag];
					aggrFlg = true;
				}
			}
		})
		if(!aggrFlg && d.Use != "" && d.UseDetail != ""){
			links.push({
				"source": d.Use,
				"target": d.UseDetail ,
				"value":  (d.Use != "N/A" && d.UseDetail != "N/A") ? agUsageData[d.ColumnTag] : 1
			})
		}

	})

	//ColumnUse="s" only
	var cropTotal = 0;
	colLevel5.forEach(function(d){
		cropTotal += agUsageData[d.ColumnTag]
	})
	console.log(cropTotal)

	colLevel5.forEach(function(d){
		links.push({
			"source": d.UseDetail,
			"target": d.UseDetail2,
			"value": 23056 * (agUsageData[d.ColumnTag] / cropTotal)
		})
	})

	console.log(links.length)

	var result = 
		{
			"nodes": nodes,
			"links": links
		};


	nodes.forEach(function(d){
		console.log(d.name)
	})
	links.forEach(function(d){
		console.log(d.source,"/",d.target,d.value)
	})
	

	//Export files
	//this.saveToFile(agUsageData,"aggregatedUsageData_processed.json")
	//this.saveToFile(colList,"dictionaryData_processed.json")
	//this.saveToFile(result,"sankeyData_processed.json")

	return result;
}



Wrangling.saveToFile = function(object, filename){
    var blob, blobText;
    blobText = [JSON.stringify(object, null, '\t')];
    blob = new Blob(blobText, {
        type: "text/plain;charset=utf-8"
    });
    saveAs(blob, filename);

    console.log("finish!")
}





           	










