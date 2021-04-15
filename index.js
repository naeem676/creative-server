const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require("firebase-admin");
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config()


const app = express()
const port = 4000


app.use(cors())

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
app.use(bodyParser.json())

app.use(express.static('service'));

app.use(fileUpload());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6i5ol.mongodb.net/creative?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });




const serviceAccount = require("./service/creative-agency-51071-firebase-adminsdk-kwem8-b801503250.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



client.connect(err => {
  const serviceCollection = client.db("creative").collection("service");
  const orderCollection = client.db("creative").collection("orders");
  const adminCollection = client.db("creative").collection("admin");
  const reviewCollection = client.db("creative").collection("review");

  //find all review

  app.get('/findAllReview', (req, res)=>{
    reviewCollection.find({})
    .toArray((err, documents)=>{
      res.send(documents)
    })
  })

  ///review posted on mongodb

  app.post('/addReview', (req, res)=>{
    const review = req.body;
    reviewCollection.insertOne(review)
    .then(result => {
      res.send(result.insertedCount > 0)
    })
  })


  ////admin for special logging
  app.post('/admin', (req, res)=>{
    // console.log(req.body.email)
    adminCollection.find({email:req.body.email})
    .toArray((err, admin)=>{
      res.send(admin.length > 0)
    })
  })

  //add admin
  app.post('/addAdmin', (req, res)=>{
    const email = req.body.email;
    adminCollection.insertOne({email})
    .then(result => {
      res.send(result.insertedCount > 0)
    })
  })
  //////find all order list
  app.get('/allOrder', (req, res)=>{
    orderCollection.find({})
    .toArray((err, documents)=>{
      res.send(documents)
    })
  })
  ////////////////

  app.get('/findService', (req, res)=>{
    serviceCollection.find({})
    .toArray((err, documents)=>{
      res.send(documents)
    })
  })
  //load client service list
  app.get('/findOrder',(req, res)=>{
    
    const Bearer = req.headers.authorization;
    if(Bearer && Bearer.startsWith('Bearer ')){
      const idToken = Bearer.split(' ')[1];
      // idToken comes from the client app
                admin
                .auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                  const tokenEmail = decodedToken.email;
                  if(req.query.email === tokenEmail){
                    orderCollection.find({email:req.query.email})
                    .toArray((err, documents)=>{
                      res.status(200).send(documents)
                    })

                  }
                  else{
                    res.status(401).send('un authorised access')
                  }
                  
                  // ...
                })
                .catch((error) => {
                  // Handle error
                  res.status(401).send('un authorised access')
                });

    }

   
  })

  //added order
  app.post('/addOrder', (req, res)=>{
    const file = req.files.file;
    const name = req.body.name;
    const email = req.body.email;
    const details = req.body.details;
    const price = req.body.price;
    const photo = req.body.photo;
    const course = req.body.course;
    const filePath = `${__dirname}/service/${file.name}`;
    file.mv(filePath, err =>{
      if(err){
        
        res.status(500).send({msg:'Failed to upload Image'});
      }
      const newImg = fs.readFileSync(filePath);
      const encImg = newImg.toString('base64');
      
      const image = {
      
        
        contentType:req.files.file.mimetype,
        size:req.files.file.size,
        img:Buffer.from(encImg, 'base64')
      }
      orderCollection.insertOne({image, name, details, photo, email, details, price, course})
      .then(result =>{
        fs.remove(filePath, err => {
          if(err){
            
            res.status(500).send({msg:'Failed to upload Image'});
          }
          res.send(result.insertedCount > 0)
        })
      })
      
    })
    // console.log(req.body.name, req.body.email, req.body.details, req.body.price,  req.body.course )
  })

  //added our service in mongodb storage...


  app.post('/addService', (req, res)=>{
      const file = req.files.file;
      const title = req.body.title;
      const description = req.body.description;
      const filePath = `${__dirname}/service/${file.name}`;
      file.mv(filePath, err =>{
          if(err){
              
              res.status(500).send({msg:'Failed to upload Image'});
          }
          const newImg = fs.readFileSync(filePath);
          const encImg = newImg.toString('base64');
          var image = {
            contentType:req.files.file.mimetype,
            size:req.files.file.size,
            img: Buffer.from(encImg, 'base64')
          }
          serviceCollection.insertOne({title, description, image})
          .then(result => {
            fs.remove(filePath, err => {
              if(err){
                
                res.status(500).send({msg:'Failed to upload Image'});
              }
              res.send(result.insertedCount > 0)
            })
            
          })
         
      })
      
  })
  
});

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port)