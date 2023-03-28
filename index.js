const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const verifyJwt = require('./middleware/verifyJwt');
const sendSignupEmail = require('./email/email')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.port || 5000

app.use(cors());
app.use(express.json());

app.get('/',(req, res)=> {
    sendSignupEmail('sukanto01874@gmail.com', 'test', 'hi sukanto')
    res.send('Hello world')
})

const client = new MongoClient(process.env.CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        client.connect();
        const database = client.db('greenstar_DB');
        const product_collections = database.collection('products');
        const user_collections = database.collection('users');

        // get jwt token
        app.post('/token', async (req, res)=>{
            const {email} = req.body;
            const token = jwt.sign({email: email}, process.env.JWT_SECRET, {expiresIn: '1d'});
            res.send(token)
        })

        // Post a user data
        app.put('/user',async (req, res)=>{
            const {name, email, uid, role, img} = req.body;
            const filter = {email: email}
            const option = {upsert: true};
            const updateUser = {
                $set: {
                    name, email, uid, role, img
                }
            }
            const result =await user_collections.updateOne(filter, updateUser, option);
            res.send(result)
        })

        // Post a product
        app.post('/product',async (req, res)=>{
            const product = req.body;
            const result = await product_collections.insertOne(product);
            res.send(result)
        })
    }
    finally{}
};
run().catch(console.dir)




app.listen(port, ()=>{
    console.log('server running')
})