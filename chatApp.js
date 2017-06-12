var express = require('express');
var path = require('path');
var mongoose = require('mongoose');
var app = express(); 
//create a server and bind it to socket io
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var users = {};
server.listen(process.env.PORT || 4999);

// connect to mongodb

mongoose.connect('mongodb://127.0.0.1:27017/chat',function(err){
	if(err){
		console.error(err);
	}
	else
	{
		console.log('Db created successfully !')
	}
}); //creates chat database automatically in db

// create a schema
var chatSchema = mongoose.Schema({
	user : String,
	msg : String,
	createdMsg : {type : Date, default : Date.now}

});

// this is where u create the collection of your database
var chat = mongoose.model('Message',chatSchema);




app.get('/',function(req,res){
	res.sendFile(__dirname + '/UI/chat.html');
});


// turn on connection event
io.sockets.on('connection',function(socket){
  // retrieving the stored data
	var query = chat.find({});
	// in descending order
	query.sort('-createdMsg').limit(8).exec(function(err,docs){
	if(err) throw err;
		console.log("Sending received messages.");
		socket.emit('load old msgs',docs);
	});
	socket.on('new user',function(data,callback){
		if(data in users){
			callback(false);
		}
		else{
			callback(true);
			socket.user = data;
			users[socket.user] = socket;
			updateUsers();
		}
	});

	function updateUsers(){
		io.sockets.emit('users',Object.keys(users));
	}

	// receive message : use same name that u gave the event on client side
	socket.on('send message',function(data,callback){
		var msg = data.trim();// removes white spaces form the begining and end
		if(msg.substr(0,3) === '/w '){
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name  = msg.substring(0,ind);
				var msg = msg.substring(ind + 1);
				// create whispers
				if(name in users){
					users[name].emit('whisper',{msg:msg,user: socket.user});
					console.log("That's a secret !");
					}else{
						callback("Error! Enter a valid user.");
					}
			}
			else{
				callback("Empty!Please enter a message for your private chat!");
			}

		}
		else
		{
			var newMsg = new chat({msg:msg,user: socket.user});
			//to save
			newMsg.save(function(err){
				if(err) throw err;
		   		io.sockets.emit('new message',{msg:msg,user: socket.user});
			});
		}
	});


socket.on('disconnect',function(data){
		if(!socket.user) return;
		delete users[socket.user];
		updateUsers();
	});
});
app.use(express.static('UI'));




