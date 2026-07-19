Sri Lankan Food Dietary Assistant

An AI-powered chat assistant that helps tourists in Sri Lanka understand what's in local dishes, whether they're safe for vegan/vegetarian/allergy diets, and what to ask restaurant staff before ordering.

Built for the Artin Solutions AI Product Prototype Challenge.

Live app: https://slfooddietaryassistant.netlify.app
Live API: https://sl-food-dietary-assistant.onrender.com
Repository: https://github.com/saipradeeptlk-a11y/sl-food-dietary-assistant

Features


Natural-language chat about Sri Lankan dishes
Dietary safety badges (safe / check with restaurant / unsafe / unknown)
"Ask your server" suggestions for dishes with hidden or ambiguous ingredients
Regional food recommendations (by province/town)
Grounded in a curated 55-dish knowledge base — the AI never answers dietary questions without verified data


Tech Stack


Frontend: React (Vite), custom CSS
Backend: Node.js, Express
AI: Groq API (Llama 3.1 8B Instant)
Matching: Fuse.js (fuzzy search)
Deployment: Netlify (frontend), Render (backend)


Project Structure

slFood/
├── server/
│   ├── data/dishes.json       # knowledge base
│   ├── routes/chat.js         # matching logic + Groq integration
│   ├── utils/groqClient.js
│   └── server.js
└── client/
    └── src/
        ├── components/        # ChatWindow, MessageBubble, SafetyBadge, AskWaiterTip
        ├── App.jsx
        └── index.css

Setup Instructions (Local)

Prerequisites


Node.js (v18+)
A free Groq API key from console.groq.com


Backend

bashcd server
npm install

Create a .env file in server/ with:

GROQ_API_KEY=your_groq_api_key_here
PORT=5000

Run the server:

bashnpm run dev

The API will be available at http://localhost:5000.

Frontend

bashcd client
npm install
npm run dev

The app will be available at http://localhost:5173 (or whatever port Vite assigns).

Note: client/src/components/ChatWindow.jsx currently points to the deployed Render backend (https://sl-food-dietary-assistant.onrender.com) rather than localhost, so the local frontend will talk to the live backend by default. Change the URL in that file if you want to test against a locally-running backend instead.

Deployment


Backend: deployed on Render (free tier) from the server/ directory. Build command: npm install, start command: npm start. GROQ_API_KEY is set as an environment variable in Render's dashboard.
Frontend: deployed on Netlify (free tier) from the client/ directory. Build command: npm run build, publish directory: client/dist.
CORS on the backend is restricted to the deployed Netlify origin and local dev (localhost:5173).


Note: the backend is on Render's free tier, which spins down after periods of inactivity. The first request after idle time may take 30-50 seconds to respond while the instance wakes up — this is expected behavior, not a bug.

Assumptions


No user authentication — the app is designed for a single anonymous session per visit.
Dietary information is scoped to the 55 dishes in the knowledge base; unlisted dishes return an honest "not verified" response rather than a guess.
Restaurant suggestions are static, curated entries, not live/real-time data.


Limitations & Future Improvements

See SUBMISSION.docx for the full write-up, including design decisions and known limitations.