require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai"); // CommonJS import

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:5173', // Allow requests from your frontend
  credentials: true
}));

// Initialize Google GenAI
console.log("Initializing Google GenAI");
console.log(process.env);
console.log("GEMINI_API_KEY", process.env.GEMINI_API_KEY);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "DUMMY_API_KEY_FOR_WORKER_TESTING";
if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Using a DUMMY KEY. AI features will likely fail actual API calls.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Model name updated based on common availability, adjust if needed.
const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); 

app.use(express.json()); // Middleware to parse JSON bodies

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is alive!' });
});

const defaultChoices = [
  { id: "1", text: "Investigate the strange noise." },
  { id: "2", text: "Fortify your current position." },
  { id: "3", text: "Search for supplies." },
  { id: "4", text: "Try to find other survivors." },
  { id: "5", text: "Rest and regain energy." }
];

const defaultPlayerStats = {
  health: 100,
  energy: 50,
  strength: 10,
  dexterity: 10,
  intelligence: 10
};

// GET /api/game/start
app.get('/api/game/start', async (req, res) => {
  try {
    const prompt = "Generate a short, exciting opening scenario for a fantasy text adventure game. Describe a scene and a situation that requires the player to make a choice. Max 100 words.";
    const result = await textModel.generateContent(prompt);
    const generatedScenario = result.response.text(); 

    res.json({
      scenario: generatedScenario,
      choices: [ // Keeping original choices for start as per instruction
        { id: "1", text: "Approach the mysterious figure." },
        { id: "2", text: "Order an ale from the bartender." },
        { id: "3", text: "Scan the room for familiar faces." },
        { id: "4", text: "Quietly leave the tavern." },
        { id: "5", text: "Ask the bartender about local rumors." }
      ],
      playerStats: defaultPlayerStats
    });
  } catch (error) {
    console.error("Error generating start scenario:", error.message); // Log only message for brevity
    res.status(500).json({ 
      scenario: "The air shimmers, and for a moment, you feel a strange presence before it fades. You are standing at a crossroads, a dense forest to your left, a towering mountain to your right, a quaint village straight ahead, and a dark cave behind you. What path will you choose?", // Fallback
      choices: [ // Fallback choices matching the new scenario
        { id: "1", text: "Enter the dense forest." },
        { id: "2", text: "Attempt to climb the towering mountain." },
        { id: "3", text: "Walk towards the quaint village." },
        { id: "4", text: "Explore the dark cave." },
        { id: "5", text: "Sit and observe your surroundings." }
      ],
      playerStats: defaultPlayerStats
    });
  }
});

// POST /api/game/action
app.post('/api/game/action', async (req, res) => {
  const { actionId, actionText, currentScenario } = req.body; // Expecting actionText and currentScenario from client
  
  // Fallback if actionText is not provided by the client yet
  const playerActionDetail = actionText || `chose action ${actionId}`; 
  // Fallback for current game context if not provided by client
  const gameContext = currentScenario || "The player was in a situation described previously.";

  // Slightly modified player stats for demonstration
  const updatedPlayerStats = {
    ...defaultPlayerStats,
    energy: defaultPlayerStats.energy - 2, // Example: energy slightly decreased
    health: defaultPlayerStats.health - Math.floor(Math.random() * 3) // Small random health change
  };

  try {
    const prompt = `Given the previous situation: "${gameContext}". The player chose to: "${playerActionDetail}". Generate a short, engaging outcome for this action and a new situation (max 100 words). This outcome should directly result from the player's choice.`;
    const result = await textModel.generateContent(prompt);
    const newScenario = result.response.text();

    res.json({
      scenario: newScenario,
      choices: defaultChoices, // Using default choices for now
      playerStats: updatedPlayerStats
    });
  } catch (error) {
    console.error("Error generating action response:", error.message); // Log only message
    res.status(500).json({
      scenario: "A thick fog suddenly rolls in, obscuring your view. When it clears, the world around you seems subtly changed, and you are unsure if your action had any effect or if some other force is at play.", // Fallback
      choices: defaultChoices,
      playerStats: updatedPlayerStats // Return updated stats even on error
    });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  if (GEMINI_API_KEY === "DUMMY_API_KEY_FOR_WORKER_TESTING") {
    console.log("INFO: Running with DUMMY_API_KEY. Actual AI calls will fail but the server will operate with fallback scenarios.");
  }
});
