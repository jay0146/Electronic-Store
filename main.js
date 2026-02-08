const getJSONString = function(obj) { return JSON.stringify(obj, null, 2);}

const express = require ('express');
const bcrypt = require("bcryptjs");
const app = express(); 

const layouts=require("express-ejs-layouts");

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.use(layouts);

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const cookieParser = require("cookie-parser");
const session = require('express-session');
app.use(session({
secret: '1234567',
resave: true,
saveUninitialized: true
}))
app.use(cookieParser());

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/cis485",{useUnifiedTopology: true,useNewUrlParser: true });

var loginSchema = new mongoose.Schema({
    userid: String,
    password: String
});

var cartSchema = new mongoose.Schema({
	userid:String,
	code: String,
    name: String,
    price:Number,
    quantity:Number
});

var catalogSchema = new mongoose.Schema({
	code: String,
    name: String,
	image: String,
	description: String,
    price:Number,
    quantity:Number
});

mongoose.pluralize(null);

var User = mongoose.model("login", loginSchema);
var Cart = mongoose.model("cart", cartSchema);
var Catalog = mongoose.model("catalog", catalogSchema);

app.use((req, res, next) => {
  console.log(`request made to: ${req.url}`);
  next();
});

app.get ("/", function (req,res) 
{
	res.render ( "login.ejs",{message:"",flag:""});	
} );

app.get ("/login", function (req,res) 
{
	res.render ( "login.ejs",{message:"",flag:""});	
} );

app.get ("/register", function (req,res) 
{
	res.render ( "registration.ejs",{message:"",flag:""});	
} );

app.post("/register", (req, res) =>
{
    User.findOne({userid:req.body.userid}, '', function (err, data)
    {
        if (err) return handleError(err);
        if (data==null)
        {       
                bcrypt.hash(req.body.password, 5, function (err,hashpass)
                {
                    console.log("hashpassword="+hashpass);
                    req.body.password=hashpass;
                    var x = new User(req.body);
                    x.save(function (err)
                    { 
                        if (err) return handleError(err);
                        res.render ( "login",{message:'Registration Succelfull',flag:""});
                    });
                });
        }
        else
        {
            res.render ( "registration",{message:'ERROR: User Already In Database',flag:""});
        }
    });
});

app.post("/login", (req, res) =>
{
    User.findOne({userid:req.body.userid}, '', function (err, data)
    {
        if (err) return handleError(err);
        if (data==null)
        {
            if (err) return handleError(err);
            res.render ( "login",{message:"Invalid Userid",flag:""});
        }
        else
        {
            bcrypt.compare(req.body.password, data.password,
            function (err, result)
            {
                if(result)
                {
					req.session.userid=req.body.userid; 
					req.session["flag"]="1";
                    res.redirect("/products");
                } 
                else
                {
                    res.render( "login",{message:"Invalid Password",flag:""});
                }
            });
        }
    });
});

app.get("/products", (req, res) => 
{  
	if(req.session.flag!="1") res.render( "login",{message:"Session Expired",flag:""});
	console.log("body="+getJSONString(req.body));
	var msg="No MSG";
	var message="";
	const item2find = new Object();
	
    Catalog.find(item2find, '', function (err, data) 
    {
		var catalog=""
		if (err) return handleError(err);
		console.log("result="+getJSONString(data));
		if(data=="")
		{
			var cart="CART EMPTY<br><a href='/products'>Back To Shopping</a>";
			res.render ( "products.ejs",{cart:cart,message:"",flag:"1"});
		}
		else
		{
			let catalog="";

			for(var i=0;i<data.length;i++)
			{
				var image=`images/${data[i].image}`;
				console.log("IMAGE="+image);
			    catalog+=
						`
							<form onclick="this.submit()" method="post" action="solopage"><input type='hidden' name='code' value='${data[i].code}' /><img src='${image}' style="width:200px" /></form>
							<div>${data[i].name}</div>
							<p>
								${data[i].description}<form onclick="this.submit()" method="post" action="solopage"><input type='hidden' name='code' value='${data[i].code}' /><a>More...</a></form><br />
								
									<a href="#" onclick="addItem('${data[i].code}','${data[i].name}',${data[i].price});">Add to Cart</a>
									<a href="cart">Goto Cart</a>
							</p>
						
						<p style="clear:both"></p>
						`;
			}
			res.render ( "products.ejs",{catalog:catalog,message:"",flag:"1"});
		}
		
	});
});

app.post("/solopage", (req, res) => {
  if (req.session.flag != "1")
    return res.render("login.ejs", { message: "Session Expired", flag: "" });

  Catalog.findOne({ code: req.body.code }, "", (err, data) => {
    if (err) return res.send("DB error");
    if (!data) return res.send("Product not found");

    return res.render("solopage.ejs", { product: data });
  });
});

app.post("/add", (req, res) => 
{
	const item2find = new Object();
	item2find.code=req.body.code;
	item2find.userid=req.session.userid;
    Cart.findOne(item2find, '', function (err, data) 
    {
		if (err) return handleError(err);
		if(data==null)
		{
			const item = new Object();
			item.userid=req.session.userid;
			item.code=req.body.code;
			item.name=req.body.name;
			item.quantity=req.body.quantity;
			item.price=req.body.price;
			console.log(getJSONString(item));
			var x = new Cart(item);
			x.save(function (err) 
			{
				if (err) return handleError(err);
			});
		}
		else
		{
			const item2update = new Object();
			item2update.code=req.body.code;
			item2update.userid=req.session.userid;
			const update=new Object();
			update.quantity=parseInt(data.quantity)+1;;
			Cart.updateOne(item2update, update,function(err,result)
			{
				if(err) console.log("ERROR="+err);
				else console.log("RECORD UPDATED"); 
			});
		}
        res.redirect ( "/products");
	});
});

app.get("/cart/add/:code", (req, res) => {
  if (req.session.flag != "1") {
    return res.render("login", { message: "Session Expired", flag: "" });
  }

  const code = req.params.code;
  const userid = req.session.userid;

  Catalog.findOne({ code: code }, (err, product) => {
    if (err) return res.send("DB error");
    if (!product) return res.send("Product not found");

    const item2find = { userid: userid, code: code };

    Cart.findOne(item2find, (err, existing) => {
      if (err) return res.send("DB error");

      if (!existing) {
        const newItem = {
          userid: userid,
          code: product.code,
          name: product.name,
          price: product.price,
          quantity: 1
        };

        new Cart(newItem).save((err) => {
          if (err) return res.send("Save error");
          return res.redirect("/products");
        });
      } else {
        Cart.updateOne(
          item2find,
          { quantity: parseInt(existing.quantity) + 1 },
          (err) => {
            if (err) return res.send("Update error");
            return res.redirect("/products");
          }
        );
      }
    });
  });
});

app.get("/cart/remove/:code", (req, res) => {
  if (req.session.flag != "1") {
    return res.render("login", { message: "Session Expired", flag: "" });
  }

  Cart.deleteOne(
    { userid: req.session.userid, code: req.params.code },
    (err) => {
      if (err) console.log("REMOVE ERROR:", err);
      res.redirect("/cart");
    }
  );
});

app.post("/cart/update", (req, res) => {
  if (req.session.flag != "1") {
    return res.render("login", { message: "Session Expired", flag: "" });
  }

  const qty = parseInt(req.body.quantity);

  if (isNaN(qty) || qty <= 0) {
    return Cart.deleteOne(
      { userid: req.session.userid, code: req.body.code },
      () => res.redirect("/cart")
    );
  }

  Cart.updateOne(
    { userid: req.session.userid, code: req.body.code },
    { quantity: qty },
    (err) => {
      if (err) console.log("UPDATE ERROR:", err);
      res.redirect("/cart");
    }
  );
});

app.get("/cart", (req, res) => {
  if (req.session.flag != "1") return res.render("login", { message: "Session Expired", flag: "" });

  const item2find = { userid: req.session.userid };

  Cart.find(item2find, "", function (err, data) {
    if (err) return handleError(err);

    if (!data || data.length === 0) {
      var cart = "CART EMPTY<br><a href='/products'>Back To Shopping</a>";
      return res.render("cart.ejs", { cart: cart, flag: req.session.flag, message: "" });
    }

    const codes = data.map(x => x.code);

    Catalog.find({ code: { $in: codes } }, "code image", function (err, cat) {
      if (err) return handleError(err);

      const imgMap = {};
      for (let i = 0; i < cat.length; i++) {
        imgMap[cat[i].code] = cat[i].image;
      }

      let grandTotal = 0;
      let cartHtml = "<div class='cart'><table style='background-color:white'><tr><th>ITEM</th><th>NAME</th><th>QTY</th><th>PRICE</th><th>SUBTOTAL</th><th>REMOVE</th></tr>";

      for (let i = 0; i < data.length; i++) {
        const qty = parseInt(data[i].quantity);
        const price = parseFloat(data[i].price);
        const subtotal = price * qty;
        grandTotal += subtotal;

        const filename = imgMap[data[i].code] || "default.png";
        const imgSrc = "/images/" + filename;

        cartHtml += "<tr>"
          + "<td><img style='width:60px' src='" + imgSrc + "' /></td>"
          + "<td>" + data[i].name + "</td>"
          + "<td>"
          + "<form method='post' action='/cart/update' style='display:inline'>"
          + "<input type='hidden' name='code' value='" + data[i].code + "' />"
          + "<input size=1 type=text name=quantity value='" + qty + "' />"
          + "<input type=submit value=Update />"
          + "</form>"
          + "</td>"
          + "<td class='right'>$" + price.toFixed(2) + "</td>"
          + "<td class='right'>$" + subtotal.toFixed(2) + "</td>"
          + "<td><a href='/cart/remove/" + data[i].code + "'><img src='/images/x.png' style='width:20px;'/></a></td>"
          + "</tr>";
      }

      cartHtml += "<tr><td colspan=4><b>GRAND TOTAL:</b></td><td class='right'><b>$" + grandTotal.toFixed(2) + "</b></td><td></td></tr>";
      cartHtml += "</table></div>";

      res.render("cart.ejs", { cart: cartHtml, flag: req.session.flag, message: "" });
    });
  });
});

app.get("/about", (req, res) => {
  if (req.session.flag != "1") return res.render("login", { message: "Session Expired", flag: "" });
  res.render("about.ejs", { message: "", flag: req.session.flag });
});



app.get("/contact", (req, res) => {
  if (req.session.flag != "1") return res.render("login", { message: "Session Expired", flag: "" });
  res.render("contact.ejs", { message: "", flag: req.session.flag });
});

app.post("/contact", (req, res) => {
  if (req.session.flag != "1") return res.render("login", { message: "Session Expired", flag: "" });

  res.render("contact.ejs", { message: "Message sent!", flag: req.session.flag });
});



app.get("/checkout", (req, res) => {
  if (req.session.flag != "1")
    return res.render("login.ejs", { message: "Session Expired", flag: "" });

  Cart.deleteMany({ userid: req.session.userid }, (err) => {
    if (err) return res.send("Checkout error");
    res.render("thankyou.ejs", { flag: req.session.flag });
  });
});





app.get ("/logoff", function (req,res) 
{
    if(req.session.flag =="1") res.render ( "logoff.ejs",{message:"",flag:"1"});
    else res.render ( "login.ejs",{message:"Must Login First",flag:""});	
} );

app.post("/logoff", (req, res) => 
{
	console.log("POST LOGOFF");
	req.session.destroy(function(err) 
	{
        res.redirect ( "/login");
    });
});


app.listen(3000 , function () {
	console.log ("server is listening!!!");
} );
