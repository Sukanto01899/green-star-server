const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const verifyJwt = require('./middleware/verifyJwt');
const sendEmail = require('./email/email')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const verifyAdmin = require('./middleware/varifyAdmin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const {paidEmail} = require('./email/PaidEmail')
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
        const order_collection = database.collection('orders');
        const blog_collection = database.collection('blogs');

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
            const allProducts =await product_collections.find(query).limit(6).toArray();
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
        app.get('/order-list/:email',verifyJwt, async (req, res)=>{ //user api
            const email = req.params.email;
            const orderStatus = req.query.status;
            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
            const decodedEmail = req.decoded.email;
            if(decodedEmail === email){
                const total_order = (await order_collection.find({userEmail: email}).project({}).toArray()).length;
                if(orderStatus === 'all'){
                    const cursor = await order_collection.find({userEmail: email}).limit(limit).skip(page * limit).toArray();
                    res.send({cursor, total_order});
                }else{
                    const cursor = await order_collection.find({userEmail: email, status: orderStatus}).limit(limit).skip(page * limit).toArray();
                    res.send({cursor, total_order});
                }
            }else{
                res.status(403).send({message: 'Forbidden'})
            }
        })

        // Add review by user
        app.put('/review/add/:email',verifyJwt, async(req, res)=>{
            const email = req.params.email;
            const review = req.body.review;
            const filter = {}
            const updateDoc = {
                $set: {...review}
            }
            const option = {upsert: true}
            const result = await review_collection.updateOne(filter, updateDoc, option);
            res.send(result)
        })

        // Check review given or nor
        app.get('/rating/check/:email/:id', async(req, res)=>{
            const email = req.params.email;
            const product_id = req.params.id;
            const filter = {userId: email,productId: product_id};
            const result = await review_collection.findOne(filter);
            res.send(result)
        })

        // Get a product image
        app.get('/product/image/:id', async (req, res)=>{
            const product_id = req.params.id;
            const query = {_id: new ObjectId(product_id)};
            const image = await product_collections.findOne(query, {projection: {image: 1}})
            res.send(image);
        })

        // cancel order status
        app.patch('/order/cancel/:id',verifyJwt, async (req, res)=>{
            const order_id = req.params.id;
            const filter = {_id: new ObjectId(order_id)};
            const updateDoc = {
                $set: {status: 'canceled'}
            }
            const result = await order_collection.updateOne(filter, updateDoc)
            res.send(result)
        })

        // Get all reviews
        app.get('/reviews/get', async(req, res)=>{
            const query = {};
            const cursor =await review_collection.find(query).project({rating: 1, title: 1, desc: 1, user: 1}).toArray();
            res.send(cursor)
        })

        // get a order by id
        app.get('/order/get/:id', verifyJwt, async(req, res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await order_collection.findOne(query);
            res.send(result)
        })

        // Order status change after payment success
        app.patch('/payment/success/:id',verifyJwt, async(req, res)=> {
            const id = req.params.id;
            const trxID = req.body.trxID;
            const email = req.query.email;
            const title = req.body.title;
            const price = req.body.price;
            const quantity = req.body.quantity;
            const filter = {_id: new ObjectId(id)};
            const emailSubject = 'Your Payment Successful'
            const emailCallback = ()=> paidEmail(id, {title, price, quantity}); //Email text callback
            const updateDoc = {
                $set: {status: 'paid', trxID }
            }
            sendEmail(email, emailSubject, emailCallback) //Send Email
            const result = await order_collection.updateOne(filter, updateDoc)
            res.send(result)
        })

        // User dashboard status
        app.get('/user-dashboard/data/:email', verifyJwt, async(req, res)=>{
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            if(email === decodedEmail){
                const pending_order = (await order_collection.find({userEmail: email, status: 'pending'}).project({}).toArray()).length;
               const paid_order = (await order_collection.find({userEmail: email, status: 'paid'}).project({}).toArray()).length;
                const shipped_order = (await order_collection.find({userEmail: email, status: 'shipped'}).project({}).toArray()). length;
               const canceled_order = (await order_collection.find({userEmail: email, status: 'canceled'}).project({}).toArray()).length;

               res.send({pending_order, paid_order, shipped_order, canceled_order})
            }else{
                res.status(403).send({message: 'Forbidden'})
            }
        })

        // Get single blog
        app.get('/blog/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await blog_collection.findOne(query);
            res.send(result)
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
        res.status(404).send({message: 'Not found'})
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

            const pending_order = (await order_collection.find({status: 'pending'}).project({}).toArray()).length;
            const paid_order = (await order_collection.find({status: 'paid'}).project({}).toArray()).length;
            const shipped_order = (await order_collection.find({status: 'shipped'}).project({}).toArray()). length;
            const canceled_order = (await order_collection.find({status: 'canceled'}).project({}).toArray()).length;

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
        app.delete('/product/delete/:id/:email',verifyJwt, verifyAdmin, async (req, res)=>{
            const product_id = req.params.id;
            const query = {_id: new ObjectId(product_id)};
            const result = await product_collections.deleteOne(query);
            res.send(result)
        })

        // change order status by admin
        app.patch('/order/status-change/:email/:id',verifyJwt, verifyAdmin, async (req, res)=>{
            const order_id = req.params.id;
            const status = req.query.status;
            const filter = {_id: new ObjectId(order_id)};
            const updateDoc = {
                $set: {status: status}
            }
            const result = await order_collection.updateOne(filter, updateDoc)
            console.log(result)
            res.send(result)
        })

        // User role change api
        app.patch('/role/change/:email',verifyJwt, verifyAdmin, async(req, res)=>{
            const email = req.body.email;
            const userRole = req.query.role;
            const filter = {email: email};
            const updateDoc = {
                $set:{role: userRole}
            }
            const result = await user_collections.updateOne(filter, updateDoc);
            res.send(result)
        })

        // Post a blog
        app.get('/blogs', async (req, res)=>{
            const query = {};
            const cursor = await blog_collection.find(query).toArray();
            res.send(cursor)
        })
        // Post a blog
        app.post('/blog/add/:email', async (req, res)=> {
            const blog = req.body.blog;
            const result = await blog_collection.insertOne(blog);
            res.send(result)
        })
        // delete blog
        app.delete('/blog/delete/:email/:id',verifyJwt, verifyAdmin, async(req, res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await blog_collection.deleteOne(query)
            res.send(result)
        })


        // Payment intent api
        app.post('/create-payment-intent',verifyJwt, async(req, res)=>{
            const order = req.body;
            const price = order.price;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })

            res.send({
                clientSecret: paymentIntent.client_secret,
              })
        })

        
    }
    finally{}
};
run().catch(console.dir)




app.listen(port, ()=>{
    console.log('server running')
})