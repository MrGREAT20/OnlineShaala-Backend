const express = require('express');
const app = express();
const jwt = require("jsonwebtoken");
const {PORT, MONGO_CONNECT_URL} = require("./config/serverconfig");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

/**
 * MONGOOSE is an ODM (Object Data Modeling) just like what we have ORM for RelationalDBs
 * 
 * MONGOOSE provides APIs which gives us functions to put, get, delete DATA in the MONGODB Database
 * 
 * 
 */
/**
 * handy string 
 * mongodb+srv://pralaywandre20:Ganesh%40089xy084@cluster0.9sbbeu2.mongodb.net/
 */
app.use(express.json());

/*BEFORE DB WE CAN USE THE EMPTY ARRAY APPROACH, AND ALSO AFTER THAT WE CAN USE ".JSON" WALA METHOD*/
// let ADMINS = [];
// let USERS = [];
// let COURSES = [];
const secret = "YOUR_SECRET_KEY";


// Define mongoose schemas
/* 
  We SWITCHED from traditional FILE SYSTEMS to DB particularly MONGODB 


  SCHEMA: The structure of the DB or more particularly the shape of the data




*/
const userSchema = new mongoose.Schema({
  username: {type: String},
  password: String,
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
  /** 
   * 
   * This is Interesting "purchasedCourses"  is an array of typeID where each ID refers to the courses in the COURSE SCHEMA
   * 
   * We can STORE the COPY of the COURSES in "purchasedCourses" but if there are some changes in the COURSE then that will NOT
   * reflect in the user's "purchasedCourses"
   * 
   * 
   * 
   * 
   * 
  */
});

const adminSchema = new mongoose.Schema({
  username: String,
  password: String
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageLink: String,
  published: Boolean
});

//define mongoose models, we know MODELS are nothing but DATA which is going to be stored in the DB
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Course = mongoose.model('Course', courseSchema);

//connect to MONGODB
mongoose.connect(MONGO_CONNECT_URL, { useNewUrlParser: true, useUnifiedTopology: true, dbName: "courses" });


//GENERATING THE JWT TOKENS
const generateJwt = (payload) => {
    return jwt.sign(payload, secret, {expiresIn:'1hr'}); //ek token generate karega with type string
}


/**BEFORE IMPLEMENTING THE APIs, WE CAN MAKE THE MIDDLEWARES FOR IMP APIs */

const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization; 
  /* 
    req body ke header me ek key hai "authorization" ko ek string save karta hai.
    The string looks like this

    "bearer acsnbcc211SP0ssdSNIQNCI02F3NONEI";
    
    the "acsnbcc21........" is JWT TOKEN
  
  */
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    //by doing this above we separated the "bearer" string and "token" string, 
    jwt.verify(token, secret, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      //agar sabh sahi hua toh, req body ke "user" property me user object daaldo joh JWT.verify ne diya
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};
/******************************************************************************* */



/********************************ADMIN ROUTES************************************************/


app.post('/admin/signup', async (req, res) => {
  // logic to sign up admin
  const {username, password} = req.body;
  const admin = await Admin.findOne({username});
  if(admin){
    res.status(403).json({message:"Admin already exist"}); 
    //pralay res.status, res.end ke bhi aage code jaata hai, its not same as RETURN in function
  }else{
    //Admin model class expects object during making of a new Data to be stored in the DB 
    const Obj = {username, password};
    const newAdmin = new Admin(Obj);
    await newAdmin.save();
    const payload = {username, role:"admin"};
    const token = generateJwt(payload);
    res.json({message:'Admin created successfully', token});
  }
});

app.post('/admin/login', authenticateJwt, async (req, res) => {
  // logic to log in admin
  //we will get the credentials from req headers
  const {username, password} = req.headers;
  //now check, if there is an admin with the above given credentials
  const admin = await Admin.findOne({username, password})
  if(admin){
    //if the username and password are correct, we can generate a TOKEN for the admin
    const payload = {username, role:"admin"};
    const token = generateJwt(payload);
    res.status(201).json({message:"Admin logged In Successfully", token});

  }
});

app.post('/admin/courses', async (req, res) => {
  // logic to create a course
  //course will have a title, image, description 

  /*
    hum req.body ko filter bhi kar sakte hai jaise Sanket singh ke course ke time kiya tha 
    Update to the above line, NO FILTER NEEDED, because we have provided SCHEMA to our COURSE DOCUMENT
    It will not take any other data apart from the attributes mentioned in the COURSE SCHEMA

    But still it is good to filter the data to make the BODY lighter
  */
  const course = new Course(req.body);
  await course.save();
  res.json({ message: 'Course created successfully', courseId: course.id });
});

app.put('/admin/courses/:courseId', authenticateJwt, async (req, res) => {
  // logic to edit a course
  //for this mongoose have a good function "findByIdAndUpdate"
  const course = await Course.findByIdAndUpdate(req.params.courseId, req.body, { new: true });
  /*
    what is this {new: true}?
    Ans: When you pass { new: true }, it ensures that the course variable will contain the updated document 
        with the changes you made to it in the req.body. If you omit { new: true }, 
        course would contain the document as it existed in the database before the update.
  */
  if (course) {
    res.json({ message: 'Course updated successfully' });
  } else {
    res.status(404).json({ message: 'Course not found' });
  }

});

app.get('/admin/courses', authenticateJwt, async (req, res) => {
  // logic to get all courses
  const courses = await Course.find({}); 
  /* this {} means that we not added any filters in the search query, we want everything in the course document*/
  res.json({courses});

});

/***************************USER ROUTE**************************** */
app.post('/users/signup', async (req, res) => {
  // logic to sign up user
    const {username, password} = req.body;
    const user = await User.findOne({username});
    if(user){
      res.status(403).json({message:"User already exists"});
    }else{
      const newUser = new User({username, password});
      await newUser.save();
      const payload = {username, role:'user'};
      const token = generateJwt(payload);
      res.status(201).json({message:"User created Successfully", token});
    }
});

app.post('/users/login', async (req, res) => {
  // logic to log in user
  const {username, password} = req.headers;
  const user = await User.findOne({username, password});
  if(user){
    //if the login is successfull
    const payload = {username, role:"user"};
    const token = generateJwt(payload);
    res.status(201).json({message:"User logged In Successfully", token});

  }else{
    res.status(403).json({message:"User doesn't Exist"});
  }
});

app.get('/users/courses', authenticateJwt, async (req, res) => {
  // logic to list all courses
  const courses = await Course.find({published:true});
  //the users should only see those courses which are published
  res.json({courses});
});

app.post('/users/courses/:courseId', authenticateJwt, async (req, res) => {
  // logic to purchase a course
  const course = await Course.findById(req.params.courseId);
  if(course){
    const user = await User.findOne({username:req.user.username});
    //authenticateJWT middleware se humare req ke "user" property me username or password key populate hogaye
    if(user){
      //if the user exists and the course exists then push that course in the user's purchasedCourses list
      user.purchasedCourses.push(course);
      await user.save();
      res.status(201).json({message:"Course purchased Successfully"});
    }else{
      res.status(403).json({message:"The User doesnt Exist"});
    }
  }else{
    res.status(403).json({message:"The Course Not found"}); 
  }
});

app.get('/users/purchasedCourses', async (req, res) => {
  // logic to view purchased courses
  const user = await User.findOne({ username: req.user.username }).populate('purchasedCourses');
  if (user) {
    res.json({ purchasedCourses: user.purchasedCourses || [] });
  } else {
    res.status(403).json({ message: 'User not found' });
  }
});

app.listen(PORT, () => {
  console.log('Server is listening on port ' + PORT);
});