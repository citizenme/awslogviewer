/* 
* @Author: Cédric
* @Date:   2015-06-04 15:40:13
* @Last Modified by:   Cédric
* @Last Modified time: 2015-06-05 13:54:54
*/

'use strict';
var moment = require('moment');

var regions = [
  {
    key:'ap-northeast-1',
    value:'ap-northeast-1'
  },
  {
    key:'ap-southeast-1',
    value:'ap-southeast-1'
  },
  {
    key:'ap-southeast-2',
    value:'ap-southeast-2'
  },
  {
    key:'eu-central-1',
    value:'eu-central-1'
  },
  {
    key:'eu-west-1',
    value:'eu-west-1'
  },
  {
    key:'sa-east-1',
    value:'sa-east-1'
  },
  {
    key:'us-east-1',
    value:'us-east-1'
  },
  {
    key:'us-west-1',
    value:'us-west-1'
  },
  {
    key:'us-west-2',
    value:'us-west-2'
  }
];

var awsKey;
var awsSecret;
var awsRegion;
var cloudwatchlogs;
var table = null;

function onAwsCredChange(){
  awsKey = $('#awskey').val();
  awsSecret = $('#awssecret').val();
  var selectregions = $('#awsregion');
  if(awsKey && awsSecret && typeof(awsKey) === 'string' && typeof(awsSecret) === 'string' && selectregions.children('option').length <= 0 ){
    for(var i in regions){
      var option = $('<option>').val(regions[i].value);
      option.html(regions[i].key);

      if(regions[i].key === 'eu-west-1'){
        option.attr({selected : 'selected'});
      }
      selectregions.append(option);
    }

    $('#awsregion').trigger('change');
  }
}

function onAwsRegionChange() {
    awsKey = $('#awskey').val();
    awsSecret = $('#awssecret').val();
    awsRegion = $('#awsregion').val();
    if(awsKey && awsSecret && typeof(awsKey) === 'string' && typeof(awsSecret) === 'string'){
      AWS.config.update({accessKeyId: awsKey, secretAccessKey: awsSecret});
      AWS.config.region = awsRegion;
      cloudwatchlogs = new AWS.CloudWatchLogs();
      cloudwatchlogs.describeLogGroups({}, function(err, data){
        if(data && data.logGroups){
          var selectLogs = $('#loggroup');
          selectLogs.empty();
          for(var i in data.logGroups){
            var option = $('<option>').val(data.logGroups[i].logGroupName);
            option.html(data.logGroups[i].logGroupName);
            selectLogs.append(option);
          }
        }else{
          console.log(err);
        }
      }); 
    }
}

var getLogs = function () {
  var awsKey = $('#awskey').val();
  var awsSecret = $('#awssecret').val();
  var awsRegion = $('#awsregion').val();
  var logGroup = $('#loggroup').val();
  var filterPattern = $('#filterPattern').val();
  var endTime = Date.now();
  var period = parseInt( $('#period').val() ) * 60000;
  var startTime = endTime - period;

  AWS.config.update({accessKeyId: awsKey, secretAccessKey: awsSecret});
  AWS.config.region = awsRegion;

  cloudwatchlogs = new AWS.CloudWatchLogs();

  $('#progress_bar').progress('reset');

  var events = [];
  var nextToken = null;
  var done = false;

  var asyncLoop = function(o) {

      var loop = function() {

          if (done === true) { o.callback(); return; }

          o.functionToLoop(loop);

      }
      loop([]);//init
  }

  asyncLoop({
      functionToLoop : function(loop) {

          var params = {
              logGroupName: logGroup, /* required */
              startTime: startTime,
              endTime: endTime,
              filterPattern: filterPattern,
              // interleaved: true || false,
               limit: 10000,
              // logStreamNames: [
              //     'STRING_VALUE',
              //     /* more items */
              // ],
              nextToken: nextToken
          };

          cloudwatchlogs.filterLogEvents(params, function(err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              else {
                  // console.log(data);           // successful response

                  $('#progress_bar').progress('increment');
                  events.push.apply(events, data.events);
                  if (!("nextToken" in data)){
                    done = true;
                    $('#progress_bar').progress('increment', 100);
                  }

                  nextToken = data.nextToken;

                  loop();
              }
          });
      },
      callback : function () {
          console.log(table);
          table.clear();
          table.rows.add(events).draw();
          console.log(table.data());
      }
  });
}

$(document).ready(function(){

  table = $('#logs').DataTable({
      //retrieve: true,
      destroy: true,
      columns: [
         // {data: "eventId"},
          {width: "10%", data: "timestamp",
              'mRender': function ( data, type, full ) {
                  if (data) {
                      var mDate = moment.utc(data);
                      return (mDate && mDate.isValid()) ? mDate.format("YYYY-MM-DD HH:mm:ss.SSS") : "";
                  }
                  return "";
              }
          },
          // {data: "ingestionTime"},
          {width: "70%", data: "message"},
          {width: "20%", data: "logStreamName"}
      ]
  });

  $('#js_reloadLogs').click(getLogs);
  $('#progress_bar').progress({
    value : 0,
    total: 20
  });
  $('#awskey').change(onAwsCredChange);
  $('#awssecret').change(onAwsCredChange);
  $('#awsregion').change(onAwsRegionChange);
});
