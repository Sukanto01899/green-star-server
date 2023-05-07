const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const verifyJwt = require('./middleware/verifyJwt');
const sendSignupEmail = require('./email/email')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.port || 5000

app.use(cors());
app.use(express.json());

app.get('/',(req, res)=> {
    res.send('Hello world')
})

const client = new MongoClient(process.env.CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        client.connect();
        const database = client.db('greenstar_DB');
        const product_collections = database.collection('products');
        const user_collections = database.collection('users');
        const review_collection = database.collection('reviews');
        const order_collection = database.collection('orders')

        // Post a user data
        app.put('/user/:email',async (req, res)=>{
            const userEmail = req.params.email
            const {name, email, uid, role, img} = req.body;
            const filter = {email: userEmail}
            const option = {upsert: true};
            const updateUser = {
                $set: {
                    name, email, uid, role, img
                }
            }
            const result =await user_collections.updateOne(filter, updateUser, option);
            if(result.matchedCount ===1){
                const token = jwt.sign({email: email}, process.env.JWT_SECRET, {expiresIn: '1d'});
                res.send(token)
            }
        })

        // Post a product
        app.post('/product',async (req, res)=>{
            const product = req.body;
            const result = await product_collections.insertOne(product);
            res.send(result)
        })


        // Get All Product
        app.get('/products', async (req, res)=>{
            const query = {};
            const allProducts =await product_collections.find(query).toArray();
            res.send(allProducts)
        })

        // Get a product by id
        app.get('/product/:id', async (req, res)=>{
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const result = await product_collections.findOne(filter);
            res.send(result)
        })

        // Get review for product
        app.get('/review/:id', async (req, res)=>{
            const id = req.params.id;
            const filter = {productId: id};
            const result = await review_collection.find(filter).toArray();
            res.send(result);
        })
        // Post order details purchase button click
        app.post('/order', async (req, res)=>{
            const order = req.body;
            const result = await order_collection.insertOne(order)
            res.send(result)
        })

        // get all order
        app.post('/order-list/:email',verifyJwt, async (req, res)=>{
            const email = req.params.email;
            const orderState = req.query.state;
            const decodedEmail = req.decoded.email;
            console.log(decodedEmail)
            if(email === decodedEmail){
                const cursor =await order_collection.find({userEmail: email}).toArray()
                res.send(cursor)
            }

        })
    }
    finally{}
};
run().catch(console.dir)




app.listen(port, ()=>{
    console.log('server running')
})