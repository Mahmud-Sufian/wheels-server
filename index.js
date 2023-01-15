const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5vrlctl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// verify JWT token
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unAthorized' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        else {
            req.decoded = decoded;
            next();
        }
    });
}

async function run() {
    try {
        await client.connect();

        // all DB collections
        const productCollection = client.db('wheels').collection('products');
        const userCollection = client.db('wheels').collection('users');
        const bookingCollection = client.db('wheels').collection('bookings');

        // verify admin
        const verifyAdmin = async (req, res, next) => {
            const requister = req.decoded.email;
            const checkRequister = await userCollection.findOne({ email: requister });
            if (checkRequister.role === 'admin') {
                next();
            } else {
                return res.status(403).send({ message: 'forbidden access' });
            }
        }

        // is admin?
        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const admin = user.role === 'admin';
            res.send(admin);
        })

        // stripe
        // app.post('/create-payment-intent', async (req, res) => {
        //     const booking = req.body;
        //     const price = booking.price;
        //     const amount = price * 100;

        //     const paymentIntent = await stripe.paymentIntents.create({
        //         currency: 'usd',
        //         amount: amount,
        //         "payment_method_types": [
        //             "card"
        //         ]
        //     });
        //     res.send({
        //         clientSecret: paymentIntent.client_secret,
        //     });
        // });

        // add product
        app.post('/addProduct', verifyJWT, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

        // get all product
        app.get('/products',  async (req, res) => {
            const result = await productCollection.find().toArray();
            res.send(result);
        })

        // get single product
        app.get('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const product = await productCollection.findOne(filter);
            res.send(product);
        })

        // booking product
        app.post('/booking', verifyJWT, async(req, res) => {
            const product = req.body;
            const booking = await bookingCollection.insertOne(product);
            res.send(booking);
        })

        // get personal booking product
        app.get('/booking', verifyJWT, async(req, res) => {
            const email = req.query.email;
            const filter = {email: email};
            const result = await bookingCollection.find(filter).toArray();
            res.send(result);
        })

        // get all booking
        app.get('/allBooking', verifyJWT, verifyAdmin, async(req, res) => {
            const booking = await bookingCollection.find().toArray();
            res.send(booking);
        })

        // add or update user and JWT sign
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.send({ result, token });
        })

        // update user an admin role
        app.patch('/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send({ result });
        })

        // get all user
        app.get('/user', async (req, res) => {
            const user = await userCollection.find().toArray();
            res.send(user);
        })

    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', async (req, res) => {
    res.send('YaY... server is running.')
})

app.listen(port, () => {
    console.log(`server on ${port}`);
})