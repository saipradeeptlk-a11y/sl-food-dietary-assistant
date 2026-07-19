// Entry point for the Sri Lankan Food Assistant backend.
// Sets up Express, loads environment variables (GROQ_API_KEY, PORT),
// and mounts the chat route that handles all AI conversation logic.
const express = require('express');
const cors = require('cors');
require('dotenv').config();


const chat = require('./routes/chat');
const app = express();
const PORT = process.env.PORT || 5000;


// Allows the React frontend (running on a different origin/port) to call
// this API. In production, this should be restricted to the deployed
// frontend's URL instead of allowing all origins.
app.use(cors());

// Parses incoming JSON request bodies, needed for POST /api/chat.
app.use(express.json());

// All chat logic (knowledge base matching, Groq calls, safety validation)
// lives in routes/chat.js — this just wires it to the /api/chat path.
app.use('/api/chat', chat);


// Simple health check — confirms the server is up and reachable.
// Useful for verifying deployment on Render before testing the actual API.
app.get('/', (req, res) => {
    res.send('Sri Lankan Food Assistant API is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});