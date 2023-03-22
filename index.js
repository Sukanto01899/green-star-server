const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.port || 5000

app.use(cors());
app.use(express.json());

app.get('/', (req, res)=> {
    res.send('Hello world')
})

app.listen(port, ()=>{
    console.log('server running')
})