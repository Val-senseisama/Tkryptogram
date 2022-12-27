require("dotenv").config();
const express = require("express");
const path = require('path');
const https = require("https");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const flash = require("connect-flash");
const { request } = require("http");
const methodOverride = require("method-override");
const CronJob = require("cron").CronJob;



const app = express();

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname + '/public')));
app.set('views', path.join(__dirname+'/Views'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method'));

app.use(session({
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:false,
}));
app.use(passport.initialize());
app.use(passport.session());


app.use(flash());
mongoose.connect(process.env.MONGOOSE_CONCETION_STRING,
                 {
    useNewUrlParser: true,
    socketTimeoutMS: 45000,
    keepAlive: true
});

const userSchema = new mongoose.Schema ({
    name:String,
    email:String,
    wallet:{type:String, default:"Please update your wallet address"},
    balance:{type:Number, default:"0.0000000"},
    password:String,
    activity:[]   
});

userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema)
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false";
        https.get(url, function(response){
                console.log(response.statusCode);
                const resData = [];
   
                response.on('data', (chunk) => {
                   resData.push(chunk);
               });
                response.on("end", function(){
                  const coins = JSON.parse(Buffer.concat(resData).toString()); 
                  
                   coins.forEach(function(coin){
                    if(coin.id === 'bitcoin'){
                        let currentRate =coin.current_price;
                    }});
                });
            })


app.get("/api", function(req, res){
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=USD&order=market_cap_desc&per_page=100&page=1&sparkline=false";
      https.get(url, function(response){
              console.log(response.statusCode);
              const resData = [];
 
              response.on('data', (chunk) => {
                 resData.push(chunk);
             });
              response.on("end", function(){
                const coins = JSON.parse(Buffer.concat(resData).toString());   
                    res.render("Api", {coins});        
              });
           })});

          
app.get("/", function(req, res) {
        const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=USD&order=market_cap_desc&per_page=30&page=1&sparkline=false";
        https.get(url, function(response){
            console.log(response.statusCode);
        });
      https.get(url, function(response){
              console.log(response.statusCode);
              let resData = [];
              response.on('data', (chunk) => {
                 resData.push(chunk);
             });
              response.on("end", function(){
                const coins = JSON.parse(Buffer.concat(resData).toString());   
                res.render("index", {coins});       
              });
           }); 
        
});


app.get("/register", function(req,res){
    res.render("Register");
});

app.post("/register", function(req, res){
    User.register(new User({username: req.body.username, name:req.body.name}), req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else {
            passport.authenticate("local") (req, res, function(){
                res.redirect("/login");
            });
        }
    });
});

app.get("/login", function(req,res){
    res.render("Login",  {message: req.flash('message')});
   
});

app.post("/login", function(req, res){
    const admin = "tkryptoadmin@gmail.com";
      let user = new User({
        username : req.body.username,
        password : req.body.password
    });
    req.logIn(user, function(err){
        if(err){
            console.log(err);
        }else{passport.authenticate("local-login", { failureRedirect: "/login", failureFlash:true, failureMessage: req.flash('message', 'Invalid Username or password')})(req, res, function(){
            if(req.body.username === admin){
                res.redirect("admin")
            }else{
                User.update({_id:req.user.id}, {$push: {activity: "Logged in from"+ req.ip + " on " + new Date().toJSON()}})
                res.redirect("Dashboard");
            }
          req.session.user = req.user;
          req.session.save();
         });
        }
        
    });
});

app.get("/Dashboard", function(req, res){
    if (req.isAuthenticated()){
        const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false";
        https.get(url, function(response){
                console.log(response.statusCode);
                const resData = [];
   
                response.on('data', (chunk) => {
                   resData.push(chunk);
               });
                response.on("end", function(){
                  const coins = JSON.parse(Buffer.concat(resData).toString()); 
                  console.log(req.user.activity);
                 
                   coins.forEach(function(coin){
                    if(coin.id === 'bitcoin'){
                        console.log(coin.current_price);
                        res.render("Dashboard",{
                            name:req.user.name,
                            cryptoWallet:req.user.wallet,
                            accountBalance: req.user.balance,
                            activity: req.user.activity,
                            coins:coins,
                            conversionRate:coin.current_price * req.user.balance
                          });
                    }
                  });
                  
                  
             });
          
           });
        
   }else{res.redirect("/login");
}
});



app.patch("/dashboard", function(req, res){
    let walletId = req.body.walletId;
                User.update({id:req.user._id}, {$set: {wallet: walletId}}, function(err){
                    if(err){console.log(err);
                    }else{
                     User.update({_id:req.user.id}, {$push: {activity: "Updated wallet address to"+ walletId + " on " + new Date().toJSON()}})
                        res.redirect("/dashboard");
                    }
                });
});

app.get("/Deposit", function(req,res){
    console.log(req.user);
        res.render("Deposit",{
            accountBalance:req.user.balance  
            });
});

app.get("/Withdraw", function(req, res){
    console.log(req.user);
     const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false";
         https.get(url,{credentials: 'include'}, function(response){
                console.log(response.statusCode);
                const resData = [];
   
                response.on('data', (chunk) => {
                   resData.push(chunk);
               });
                 response.on("end", function(){
                  const coins = JSON.parse(Buffer.concat(resData).toString()); 
                  
                    coins.forEach(function(coin){
                    if(coin.id === 'bitcoin'){
                        let currentRate = coin.current_price;
                        res.render("Withdraw", {
                            accountBalance: req.user.balance,
                           estimtedValue: currentRate * req.user.balance,
                            btcAddress: req.user.wallet
                         });
                    } else{
                       
                        res.redirect("/login");
                    }
                 });
                  
                });
            })
    
});



app.post("/Withdraw", function(req, res){
    let amount = req.body.amount;
    User.update({_id:req.user.id}, {$push: {activity: "Requested to withdraw"+ amount+"BTC" + " on " + new Date().toJSON()}})
    res.redirect("withdraw");
})

app.get("/admin", function(req, res) {    
    User.find({},"name balance", function(err, users){  
    res.render("Admin",  {users});

});
});

// let growthFunction =  
const job = new CronJob(
    '0 0 * * *' ,
    function(){ 
        User.find({},"name balance", function(err, users){  
            users.map(function(user){
                let previousBalance = user.balance;
                let growthFactor = previousBalance/10;
                console.log(growthFactor);
                let newBalance = previousBalance + growthFactor;
                console.log(newBalance);
                User.update({}, {$set: {balance: newBalance}}, function(err){
                  if(err){
                    console.log(err);
                  }
                });
        });
        });;
   },
null,
true,
'America/Los_Angeles');

job.start();

 


app.get("/users/:userId", function(req, res){
    let userId = req.params.userId;
    User.findOne({_id: userId}, function(err, user){
        if(err){
            console.log(err)
        }else{
        res.render("User",{
            name:user.name,
            id:user.id,
            cryptoWallet:user.wallet,
            balance:user.balance,
            accountActivity: user.activity,
            usdBalance: currentRate*user.balance
        });
        }
    })  
})

app.patch("/users/:userId", function(req, res){
    let updateBalance = req.body.update;
    User.update({_id:req.params.userId}, {$set: {balance: updateBalance}}, function(err){
        if(err){console.log(err);
        }else{
            res.redirect("/users/userId");
        }})

})

app.get("/logout", function(req, res){
   req.logOut(function(err){
    if(err){
        console.log(err);
    }
});
   res.redirect("/");
});

       
const port = process.env.PORT || 3000;
if(port == null || port ==""){
port = 3000
}
app.listen(port, function() {
    console.log("Server's running on port");
});
