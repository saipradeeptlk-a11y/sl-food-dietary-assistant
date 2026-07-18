const express = require('express');
const cors = require('cors');
require('dotenv').config();


const chat = require('./routes/chat');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/chat', chat);

app.get('/', (req, res) => {
    res.send('Sri Lankan Food Assistant API is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});