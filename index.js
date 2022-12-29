const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', async(req, res) => {
    res.send('YaY... server is running.')
})

app.listen(port, () => {
    console.log(`server on ${port}`);
})