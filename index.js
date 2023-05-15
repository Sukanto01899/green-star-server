const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const verifyJwt = require('./middleware/verifyJwt');
const sendSignupEmail = require('./email/email')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const verifyAdmin = require('./middleware/varifyAdmin');
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

// All User api------------*******************
// ----------------------------------------------------
// ----------------------------------All user api
        // Post a user data
        app.put('/user/:email',async (req, res)=>{ //User api
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
                const token = jwt.sign({email: email, role: role}, process.env.JWT_SECRET, {expiresIn: '1d'});
                res.send(token)
            }
        })

        // user verify
        app.get('/user-verify/:email', async (req, res)=>{
            const email = req.params.email;
            const query = {email: email};
            const user = await user_collections.findOne(query);
            console.log(user)
            if(user){
                if(user.role === 'user'){
                    res.send({user: true})
                }else{
                    res.status(403).send({message: 'forbidden'})
                }
            }else{
                res.status(404).send({message: 'Not found'})
            }
        })

        // Post a product
        app.post('/product',async (req, res)=>{ //User api
            const product = req.body;
            const result = await product_collections.insertOne(product);
            res.send(result)
        })

        // Get All Product
        app.get('/products', async (req, res)=>{ //user api
            const query = {};
            const allProducts =await product_collections.find(query).toArray();
            res.send(allProducts)
        })
        
        // Get a product by id
        app.get('/product/:id', async (req, res)=>{ //User api
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const result = await product_collections.findOne(filter);
            res.send(result)
        })

        // Get review for product
        app.get('/review/:id', async (req, res)=>{ //User api
            const id = req.params.id;
            const filter = {productId: id};
            const result = await review_collection.find(filter).toArray();
            res.send(result);
        })
        // Post order details purchase button click
        app.post('/order', async (req, res)=>{ //User api
            const order = req.body;
            const result = await order_collection.insertOne(order)
            res.send(result)
        })

        // get order by user defined
        app.post('/order-list/:email',verifyJwt, async (req, res)=>{ //user api
            const email = req.params.email;
            const orderStatus = req.query.status;
            const decodedEmail = req.decoded.email;
            if(email === decodedEmail){
                if(orderStatus === 'all'){
                    const cursor =await order_collection.find({userEmail: email}).toArray();
                    res.send(cursor);
                }else{
                    const cursor = await order_collection.find({userEmail: email, status: orderStatus}).toArray();
                    res.send(cursor)
                }
            }
        })

        


//Admin Panel api-------------------------***********
// -------------------------
// ---------------------------Admin Panel Api

// Admin login
app.get(`/admin-login/:email`, async (req, res)=>{
    const email = req.params.email;
    const query = {email: email};
    const user = await user_collections.findOne(query);
    if(user){
        if(user.role === 'admin'){
            res.send({admin: true})
        }else{
            res.status(403).send({message: 'forbidden'})
        }
    }else{
        res.status(404).send({message: 'Not fund'})
    }
})

// get all user
app.get(`/all-user/:email`, verifyJwt, verifyAdmin, async (req, res)=>{
    const query = {};
    const all_user = await user_collections.find(query).toArray();
    res.send(all_user)
})

 // get all product for admin
 app.get('/all-product/:email', verifyJwt, verifyAdmin, async (req, res)=>{
    const query = {};
    const all_product = await product_collections.find(query).toArray();
    res.send(all_product)
})

// Put a product
app.post('/product/upload/:email', verifyJwt, verifyAdmin, async (req, res)=>{
    const product = req.body.product;
    const result = await product_collections.insertOne(product);
    console.log(result)
    res.send(result)
})

// Get All order for admin
app.get('/all-order/:email', verifyJwt, verifyAdmin, async (req, res)=>{
    const statusQ = req.query.status;
    const limit = parseInt(req.query.limit);
    const page = parseInt(req.query.page)
    const status = statusQ === 'all' ? {} : {status: statusQ};
    const query = status;
    
    const total_orders = await order_collection.estimatedDocumentCount();
    const all_orders = await order_collection.find(query).limit(limit).skip(limit * page).toArray();
    res.send({orders: all_orders, count: total_orders})
    
})


// get Admin panel data
    app.get('/admin-dashboard/:email',async (req, res)=>{
            const users = await user_collections.estimatedDocumentCount();
            const products = await product_collections.estimatedDocumentCount();
            const orders = await order_collection.find({status: 'shipped'}).toArray();
            const all_orders = await order_collection.find({}).project({time: 1}).toArray();
            let total_sales = 0;
            orders.forEach(order => total_sales += order.price);

            const pending_order = (await order_collection.find({status: 'pending'}).toArray()).length;
            const paid_order = (await order_collection.find({status: 'paid'}).toArray()).length;
            const shipped_order = (await order_collection.find({status: 'shipped'}).toArray()).length;
            const canceled_order = (await order_collection.find({status: 'shipped'}).toArray()).length;

            const data = {
                total_users: users,
                total_product: products,
                pending_order,
                paid_order,
                shipped_order,
                canceled_order,
                total_sales,
                all_orders
            }
            
            res.send(data)
        })

        // Delete product by admin
        app.delete('/product/delete/:id', async (req, res)=>{
            const product_id = req.params.id;
            const query = {_id: new ObjectId(product_id)};
            const result = await product_collections.deleteOne(query);
            req.send(result)
        })

        // shipped order by admin
        app.patch('/order/status-change/:id', async (req, res)=>{
            const order_id = req.params.id;
            const status = req.query.status;
            const filter = {_id: new ObjectId(order_id)};
            const updateDoc = {
                $set: {status: status}
            }
            console.log(order_id, status)
            const result = await order_collection.updateOne(filter, updateDoc)
            res.send(result)
        })

        
    }
    finally{}
};
run().catch(console.dir)




app.listen(port, ()=>{
    console.log('server running')
})