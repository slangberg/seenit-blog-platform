var app = express();
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.use('/public',  express.static(__dirname + '/public'));



app.get("/json",function(req,res){
  var submittedURL = url.format(submitted);
  
  request(submittedURL, function(error, response, body) {
    var posts = JSON.parse(body);
    blogData.after_posts = posts.data.after;
    blogData.before_posts = posts.data.before;
    returnRole(posts.data.children);
    res.send(blogData);
  });

});

app.get("/signin",function(req,res){
  res.sendFile(__dirname + "/signin.html");
});


app.get("/",function(req,res){
  res.sendFile(__dirname + "/index.html");
});

app.listen(8080);
