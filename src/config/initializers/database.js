const config = require('../../config.js');
const mongoose = require('mongoose');
const path = require('path');

let authString=""
if(config.db_user_name && config.db_password ){
  authString = authString.concat(config.db_user_name,':',config.db_password, '@');
} 
const str="";
let dbURL = str.concat('mongodb://', authString, config.db_service_name, ':', config.dp_service_port ,'/',config.db_name)


console.log('dbURL', dbURL);
var connectWithRetry = function() {
    mongoose.connect(dbURL,{ 
        useNewUrlParser: true,
        reconnectTries: Number.MAX_VALUE
    }).then(() => {
        console.log('connected!!');
    }).catch((err) => {
        setTimeout(connectWithRetry, 5000);
    });
};
connectWithRetry();