const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Modality } = require("@google/generative-ai"); 
const { sequelize, Adventure } = require('./database.js'); 

const app = express();
const port = 3001;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "DUMMY_API_KEY_FOR_WORKER_TESTING";
const IS_DUMMY_KEY = GEMINI_API_KEY === "DUMMY_API_KEY_FOR_WORKER_TESTING";

if (IS_DUMMY_KEY) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set or is DUMMY. Using a DUMMY KEY. AI features will use fallbacks.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
const imageModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-preview-image-generation" }); 

app.use(express.json()); 

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is alive!' });
});

const defaultPlayerStats = {
  health: 100,
  energy: 50,
  strength: 10,
  dexterity: 10,
  intelligence: 10
};

const genericStartChoices = [
  { id: "1", text: "Look around the area." },
  { id: "2", text: "Investigate further into the immediate surroundings." },
  { id: "3", text: "Try to talk to someone nearby, if applicable." },
  { id: "4", text: "Consider leaving the current area." },
  { id: "5", text: "Check your belongings or current status." }
];

const defaultErrorChoices = [
    { id: "1", text: "Try to make sense of the situation again." },
    { id: "2", text: "Look around your immediate surroundings." },
    { id: "3", text: "Rest for a moment to gather your thoughts." },
    { id: "4", text: "Yell for help, just in case." }
];

// GET /api/game/start (assumed correct from previous steps)
app.get('/api/game/start', async (req, res) => {
  let generatedScenario = "You find yourself at a dusty crossroads under a sky of swirling twin moons. A rickety signpost points in three directions: towards a dark forest, a shimmering city, and a jagged mountain range. The air is still and expectant. What do you do?";
  let imageStyleTags = ['fantasy art', 'epic', 'detailed', 'crossroads', 'twin moons'];
  let generatedImageData = null; 

  try {
    if (!IS_DUMMY_KEY) {
      try {
        const scenarioPrompt = "Generate a short, exciting opening scenario for a fantasy text adventure game. Max 75 words.";
        const result = await textModel.generateContent(scenarioPrompt);
        generatedScenario = result.response.text();
      } catch (aiError) {
        console.error("Error generating start scenario with AI:", aiError.message);
      }
    }

    if (!IS_DUMMY_KEY) {
      try {
        const tagsPrompt = `Based on the scenario: "${generatedScenario}", generate 5-7 descriptive style tags for creating consistent images. Tags should cover art style (e.g., 'oil painting', 'photorealistic', 'pixel art'), mood (e.g., 'dark', 'mystical', 'adventurous'), and key visual themes. Output as a comma-separated list.`;
        const tagsResult = await textModel.generateContent(tagsPrompt);
        const rawTags = tagsResult.response.text();
        const parsedTags = rawTags.split(',').map(tag => tag.trim()).filter(tag => tag);
        if (parsedTags.length > 0) {
            imageStyleTags = parsedTags;
        } else {
            console.warn("AI generated empty or invalid tags, using default.");
        }
      } catch (aiError) {
        console.error("Error generating image style tags with AI:", aiError.message);
      }
    }
    
    let newAdventure;
    try {
      newAdventure = await Adventure.create({
        storyHistory: JSON.stringify([{ scenario: generatedScenario, choiceMade: null }]),
        playerStats: JSON.stringify(defaultPlayerStats),
        imageStyleTags: JSON.stringify(imageStyleTags),
        currentScenarioText: generatedScenario
      });
    } catch (dbError) {
      console.error("Error creating adventure in database:", dbError);
      return res.status(500).json({ message: "Failed to initialize adventure (database error)." });
    }

    if (!IS_DUMMY_KEY) {
      try {
        const imagePrompt = `"${generatedScenario}". Image style: "${imageStyleTags.join(', ')}".`;
        const imageResult = await imageModel.generateContent({
          prompt: imagePrompt,
          config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
        });
        
        const imagePart = imageResult.response.candidates[0].content.parts.find(part => part.inlineData && part.inlineData.mimeType.startsWith('image/'));
        if (imagePart && imagePart.inlineData.data) {
          generatedImageData = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        } else {
          console.warn("No image data found in AI response or response structure unexpected for /start.");
        }
      } catch (aiError) {
        console.error("Error generating initial image with AI:", aiError.message);
      }
    }

    res.json({
      adventureId: newAdventure.id,
      scenario: generatedScenario,
      choices: genericStartChoices, 
      playerStats: defaultPlayerStats,
      generatedImage: generatedImageData,
      imageStyleTags: imageStyleTags
    });

  } catch (error) { 
    console.error("Unexpected error in /api/game/start:", error);
    res.status(500).json({ message: "An unexpected error occurred while starting the game." });
  }
});


// POST /api/game/action/:adventureId
app.post('/api/game/action/:adventureId', async (req, res) => {
  const { adventureId } = req.params;
  const { actionText } = req.body;

  if (!actionText) {
    return res.status(400).json({ message: "actionText is required in the request body." });
  }

  try {
    const adventure = await Adventure.findByPk(adventureId);
    if (!adventure) {
      return res.status(404).json({ message: `Adventure with ID ${adventureId} not found.` });
    }

    let storyHistory = JSON.parse(adventure.storyHistory);
    let playerStats = JSON.parse(adventure.playerStats);
    // Retrieve imageStyleTags for current action's image generation
    let imageStyleTags = JSON.parse(adventure.imageStyleTags || "[]"); // Ensure fallback to empty array if null/undefined

    let newAiScenario = "The world shimmers strangely around you, and you feel a sense of disorientation.";
    let newAiChoicesArray = defaultErrorChoices;

    if (!IS_DUMMY_KEY) {
      try {
        const storySummary = storyHistory.slice(-3).map(h => h.scenario).join(' -> ');
        const prompt = `Previous situation: ${adventure.currentScenarioText}. Player stats: ${JSON.stringify(playerStats)}. Story so far: ${storySummary}. Player action: ${actionText}. Generate a new scenario outcome resulting from this action (max 75 words) AND 4 distinct, relevant choices for this new situation. Output format should be: SCENARIO: [new scenario text] CHOICES: [choice1 | choice2 | choice3 | choice4].`;
        
        const result = await textModel.generateContent(prompt);
        const responseText = result.response.text();
        
        const scenarioMatch = responseText.match(/SCENARIO: (.*?) CHOICES:/s);
        const choicesMatch = responseText.match(/CHOICES: (.*)/s);

        if (scenarioMatch && scenarioMatch[1] && choicesMatch && choicesMatch[1]) {
          newAiScenario = scenarioMatch[1].trim();
          const choicesText = choicesMatch[1].trim();
          const parsedChoices = choicesText.split('|').map(choice => choice.trim()).filter(c => c);
          
          if (parsedChoices.length === 4) {
            newAiChoicesArray = parsedChoices.map((text, index) => ({ id: (index + 1).toString(), text }));
          } else {
            console.warn("AI did not return exactly 4 choices. Using default error choices.");
            if (!newAiScenario) newAiScenario = "The AI's response was unclear, but you sense a change.";
          }
        } else {
          console.warn("Failed to parse AI response for scenario and choices. Using defaults.");
        }
      } catch (aiError) {
        console.error("Error generating action response with AI:", aiError.message);
      }
    }

    playerStats.energy = Math.max(0, playerStats.energy - 2); 

    storyHistory.push({ scenario: adventure.currentScenarioText, choiceMade: actionText }); 
    storyHistory.push({ scenario: newAiScenario, choiceMade: null }); 
    
    adventure.storyHistory = JSON.stringify(storyHistory);
    adventure.currentScenarioText = newAiScenario;
    adventure.playerStats = JSON.stringify(playerStats);
    
    await adventure.save(); // Save changes before generating image for the new state

    // 1. Image Generation Logic (New part for this subtask)
    let generatedImageData = null;
    if (!IS_DUMMY_KEY) {
      try {
        // Use the imageStyleTags loaded from the adventure record
        const imagePrompt = `"${newAiScenario}". Image style: "${imageStyleTags.join(', ')}".`;
        const imageResult = await imageModel.generateContent({
          prompt: imagePrompt,
          config: { responseModalities: [Modality.TEXT, Modality.IMAGE] } // Using Modality enum
        });
        
        const imagePart = imageResult.response.candidates[0].content.parts.find(part => part.inlineData && part.inlineData.mimeType.startsWith('image/'));
        if (imagePart && imagePart.inlineData.data) {
          generatedImageData = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        } else {
          console.warn("No image data found in AI response or response structure unexpected for /action.");
        }
      } catch (aiError) {
        console.error("Error generating image for action with AI:", aiError.message);
        // generatedImageData remains null
      }
    }

    // 2. Return JSON Response (Updated to include generatedImageData)
    res.json({
      adventureId: adventure.id,
      scenario: newAiScenario,
      choices: newAiChoicesArray,
      playerStats: playerStats,
      generatedImage: generatedImageData // This is the updated field
    });

  } catch (error) {
    console.error(`Error processing action for adventure ${adventureId}:`, error);
    res.status(500).json({ message: "An unexpected error occurred while processing the action." });
  }
});


// Synchronize database and then start server
sequelize.sync()
  .then(() => {
    console.log('Database synchronized successfully.');
    app.listen(port, () => {
      console.log(`Backend server is running on port ${port}`);
      if (IS_DUMMY_KEY) {
        console.log("INFO: Running with DUMMY_API_KEY. Actual AI calls will use fallbacks. Image generation might be skipped or use placeholders if model call fails.");
      }
    });
  })
  .catch(err => {
    console.error('Error synchronizing database:', err);
    process.exit(1); 
  });
