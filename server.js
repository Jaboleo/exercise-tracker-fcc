
'use strict'
// init project
var express = require('express');
var app = express();
var mongodb = require("mongodb").MongoClient;
let mongoose = require("mongoose");
let bodyParser = require('body-parser');
mongoose.connect(process.env.DB_KEY)


// create application/json parser
var jsonParser = bodyParser.json() 
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })



app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});
//Validate input date
function isValidDate(dateString) {
  var regEx = /^\d{4}-\d{2}-\d{2}$/;
  if(!dateString.match(regEx)) return false;  // Invalid format
  var d = new Date(dateString);
  if(!d.getTime() && d.getTime() !== 0) return false; // Invalid date
  return d.toISOString().slice(0,10) === dateString;
}

//initiate database
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function () {
  console.log("Database opened")
  //Defining new Schemas and models
  let exerciseSchema = mongoose.Schema({
  description: String,
  duration: Number,
  date: String
  });
  
  let userSchema = mongoose.Schema({
    username: String,
    exercises:[exerciseSchema]
  })

  let User = mongoose.model("User",userSchema)


  // POST NEW USER 
  app.post("/api/exercise/new-user",urlencodedParser, (req, res) => {
  User.find({username:req.body.username}, (err,docs)=>{
  if (docs.length) res.send("Username already taken");
  else{
  let newUser = new User({
  username:req.body.username
  })
  newUser.save();
  res.send({username:newUser.username});
  }
  });
  });
  // PUT or POST new exercise
  app.post('/api/exercise/add', urlencodedParser, (req,res)=>{
  if(!req.body.userId || typeof(req.body.userId) !== "string") res.send("username is required")
  else if(!req.body.description || typeof(req.body.description)!== "string") res.send("description is required")
  else if(!req.body.duration ) res.send("duration is required")
  else{
  User.find({username:req.body.userId},(err,docs)=>{
  if(docs.length){
  // Everythink OK but no date provided
  if(!req.body.date){
  User.findOne({username:req.body.userId}, (err,docs)=>{
   console.log(docs) 
  docs.exercises.push({description:req.body.description , duration:req.body.duration});
  docs.save();
    res.send(docs); 
  })  
    
  }
  else{
  console.log(typeof(req.body.date))
  if(isValidDate(req.body.date)){
   User.findOne({username:req.body.userId}, (err,docs)=>{
  docs.exercises.push({description:req.body.description , duration:req.body.duration, date: req.body.date});
  docs.save();
    res.send(docs);  
  })  
  }
  else res.send("Invalid date")  
  }  
  }
  else res.send('No such username in database')
  })
  }

  
  })
  
  //TODO GET EXERCISE LOG
app.get("/api/exercise/log", (req,res)=>{
 console.log(req.query) 
User.findOne({username:req.query.userId},{'_id':0,'exercises._id':0, '__v':0}, function(err,docs){
if(!docs) res.send("Invalid username");
else{
if(req.query.from && isValidDate(req.query.from)){
  let array = []
  let dateLowerLimit = new Date(req.query.from)
  console.log(dateLowerLimit);
  for(let exercise of docs.exercises){
  let exerciseDate = new Date(exercise.date)
  if(exerciseDate>dateLowerLimit){
    array.push(exercise)}
  }
  docs.exercises = array;
  console.log(docs.exercises);
//lower filter
}
if(req.query.to && isValidDate(req.query.to)){
  let array = []
  let dateUpperLimit = new Date(req.query.to)
  console.log(dateUpperLimit);
  for(let exercise of docs.exercises){
  let exerciseDate = new Date(exercise.date)
  if(exerciseDate<dateUpperLimit){array.push(exercise)}
  }
  docs.exercises = array;
  console.log(docs.exercises);
}
if(req.query.limit){
docs.exercises  = docs.exercises.slice(0,parseInt(req.query.limit))
}  
  res.send(docs);
}
})
  
})
});




var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});