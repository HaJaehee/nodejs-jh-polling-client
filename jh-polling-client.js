/**
 *jh-polling-client.js
 *Created by HJH on 2015-05-19 at 21:40

 *Modified by HJH on 2015-06-01 at 17:35
 *	added user POST data code

 *Modified by HJH on 2015-06-08 at 17:41
 *   added jh-push-provider code
 */

var gcm = require('node-gcm');
//load node-gcm module

var querystring = require('querystring');
var http = require('http');
var mysql = require('mysql');
//load mysql module

//var fs = require('fs');

// create a message with default values
var message = new gcm.Message();

var server_access_key = 'AIzaSyA0pi-beq3_bvjFbndnEaM4W9bh4_9o6zI';
var sender = new gcm.Sender(server_access_key);
var registrationIds = [];

var deviceRegDBConn = mysql.createConnection ({
host: 'localhost',
port: 3306,
user: 'root',
password: 'root',
database: 'device_registration'
});//database connection option define

deviceRegDBConn.connect (function(err)
        {
        if(err)
        {
        console.error('mysql connection error');
        console.error('error');
        throw err;
        }
        });//database connection function

var wattLimitDBConn = mysql.createConnection ({
host: 'localhost',
port: 3306,
user: 'root',
password: 'root',
database: 'watt_limit'
});//database connection option define

wattLimitDBConn.connect (function(err)
        {
        if(err)
        {
        console.error('mysql connection error');
        console.error('error');
        throw err;
        }
        });//database connection function


function PostCode() {
    // Build the post string from an object
    var post_data = querystring.stringify({
    	
    });//user POST data

    // An object of options to indicate where to post to
    var post_options = {
      host: '127.0.0.1',
      port: '80',
      path: '/check.php',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': post_data.length
      }
    };

    // Set up the request
    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        var body='';
        res.on('data', function (chunk) {
            body+=chunk; 
            });
        res.on('end',function(){
            var resBodyObj = JSON.parse(body); 
            console.log(body);
            wattLimitDBConn.query('select * from watthour_currentwatt',function (err,Wrows){
                //console.log(rows);
                // At least one required
                
                var watt=resBodyObj.watt;
                var wattHour=resBodyObj.watthour;
                var wattLimit;
                var wattHourLimit;
                if (Wrows.length != 0)
                {
                    for (var i = 0 ; i < Wrows.length ; i++)
                    {   
                        wattLimit=Wrows[i].currentwatt;
                        wattHourLimit=Wrows[i].watthour;
                    }
                    if (watt>wattLimit || wattHour>wattHourLimit)
                    {

                        deviceRegDBConn.query('select device_reg_id from device',function (err,Drows){
                            //console.log(rows);
                            // At least one required
                            if (Drows.length != 0)
                            {
                                registrationIds = [];
                                for (var i = 0 ; i < Drows.length ; i++)
                                {      
                                    registrationIds.push(Drows[i].device_reg_id);
                                    console.log(Drows[i].device_reg_id);
                                }
                                
                                var message = new gcm.Message({
                                    collapseKey: 'demo',
                                    delayWhileIdle: true,
                                    timeToLive: 3,
                                    data: {
                                        key1:'limited W : '+ wattLimit + ' W',
                                        key2:'limited Wh: '+ wattHourLimit + ' Wh',
                                        key3:'current W : '+ watt + ' W',
                                        key4:'current Wh: '+ wattHour + ' Wh'
                                    } 
                                });
                                /**
                                * Params   :
                                * message-literal,
                                * registrationIds-array,
                                * No.
                                * of
                                * retries,
                                * callback-function
                                **/
                                sender.send(message, registrationIds, 4, function (err, result) {
                                    console.log(result);
                                });
                                return;
                            }
                        });
                    }
                }           
            });
        });
    });
    // post the data
    post_req.write(post_data);
    post_req.end();
}

function showObj(obj){
    var str = "";
    for(key in obj){
        str+= key+"="+obj[key]+"\n";
    }


    console.log(str);
    return;
}

(function reqRepeat(i) {
 setTimeout(function () {
     PostCode(); //http request
     if (i) reqRepeat(i); //for i is non zero -> infinite loop
     }, 10000) //every 10 seconds
 })(1); //repeat 1 times -> infinite loop

/*
// This is an async file read
fs.readFile('LinkedList.js', 'utf-8', function (err, data) {
if (err) {
// If this were just a small part of the application, you would
// want to handle this differently, maybe throwing an exception
// for the caller to handle. Since the file is absolutely essential
// to the program's functionality, we're going to exit with a fatal
// error instead.
console.log("FATAL An error occurred trying to read in the file: " + err);
process.exit(-2);
}
// Make sure there's data before we post it
if(data) {
PostCode(data);
}
else {
console.log("No data to post");
process.exit(-1);
}
});*/
