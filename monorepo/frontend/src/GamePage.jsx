import React, { useState, useEffect } from 'react';

function GamePage() {
  const [adventureId, setAdventureId] = useState(null);
  const [scenario, setScenario] = useState('');
  const [choices, setChoices] = useState([]);
  const [playerStats, setPlayerStats] = useState({});
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageStyleTags, setImageStyleTags] = useState([]);
  const [freeTextInput, setFreeTextInput] = useState(''); // State for free-text input
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false); // Separate loading for image

  const updateGameState = (data) => {
    if (data.adventureId) setAdventureId(data.adventureId);
    setScenario(data.scenario);
    setChoices(data.choices || []); // Ensure choices is always an array
    setPlayerStats(data.playerStats || {}); // Ensure playerStats is always an object
    
    if (data.generatedImage) {
      setGeneratedImage(data.generatedImage);
      setImageLoading(false); // Image has been received
    } else {
      setGeneratedImage(null); // No image or error
      setImageLoading(false);
    }
    setImageStyleTags(data.imageStyleTags || []);
  };

  const callGameApi = (url, options = {}) => {
    setLoading(true);
    setError(null);
    // If it's an action that will generate a new image, set imageLoading to true
    if (options.method === 'POST' && url.includes('/action/')) {
        setImageLoading(true); 
    }

    return fetch(url, options)
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            throw new Error(`HTTP error! status: ${response.status}, message: ${errData.message || response.statusText}`);
          });
        }
        return response.json();
      })
      .then(data => {
        updateGameState(data);
        setLoading(false);
        // Image loading state is handled by updateGameState based on presence of data.generatedImage
        return data; 
      })
      .catch(err => {
        console.error("Error during API call:", err);
        setError(err.message);
        setLoading(false);
        setImageLoading(false); // Reset image loading on error too
        throw err; 
      });
  };

  useEffect(() => {
    setImageLoading(true); // Expect an image on initial load
    callGameApi('http://localhost:3001/api/game/start');
  }, []); 

  const handleChoiceClick = (choiceText) => {
    if (!adventureId) {
      setError("Cannot make an action: Adventure ID is not set.");
      return;
    }
    if (!choiceText || typeof choiceText !== 'string') {
        setError("Invalid choice selected.");
        return;
    }
    callGameApi(`http://localhost:3001/api/game/action/${adventureId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionText: choiceText }), 
    });
  };

  const handleFreeTextSubmit = (e) => {
    e.preventDefault(); // Prevent form submission from reloading page
    if (!freeTextInput.trim()) {
      setError("Please enter an action.");
      return;
    }
    handleChoiceClick(freeTextInput); // Use the same handler as button choices
    setFreeTextInput(''); // Clear input after submission
  };

  if (loading && !scenario && !adventureId && !error) { 
    return <div className="loading-fullscreen">Loading adventure...</div>;
  }

  if (error && !scenario && !adventureId) { 
    return <div className="error-fullscreen">Error loading game: {error}. Please try refreshing.</div>;
  }
  
  return (
    <div className="game-page">
      <div className="game-visuals">
        {imageLoading && !generatedImage && <div className="image-placeholder">Loading image...</div>}
        {!imageLoading && generatedImage && (
          <img src={generatedImage} alt="Current game scene" className="game-image" />
        )}
        {!imageLoading && !generatedImage && <div className="image-placeholder">No image available for this scene.</div>}
      </div>

      <div className="game-content">
        {error && <div className="error-message">Error: {error}</div>}
        <div className="scenario">
          <h2>Scenario</h2>
          <p>{scenario || "Waiting for scenario..."}</p>
        </div>

        <div className="choices-section">
          <h3>Choices</h3>
          {choices && choices.length > 0 ? (
            choices.map(choice => (
              <button 
                key={choice.id} 
                onClick={() => handleChoiceClick(choice.text)}
                disabled={loading} 
                className="choice-button"
              >
                {choice.text}
              </button>
            ))
          ) : (
            !loading && <p>No choices available. Perhaps the story ended or an error occurred.</p>
          )}
        </div>

        <form onSubmit={handleFreeTextSubmit} className="free-text-form">
          <input 
            type="text" 
            value={freeTextInput} 
            onChange={(e) => setFreeTextInput(e.target.value)} 
            placeholder="Or type your custom action here..."
            disabled={loading}
            className="free-text-input"
          />
          <button type="submit" disabled={loading} className="submit-action-button">
            Submit Action
          </button>
        </form>
        
        {loading && <div className="loading-indicator">Processing your action...</div>}
      </div>

      <div className="game-sidebar">
        <div className="player-stats">
          <h3>Player Stats</h3>
          <ul>
            {Object.entries(playerStats).map(([stat, value]) => (
              <li key={stat}>
                {stat.charAt(0).toUpperCase() + stat.slice(1)}: {value}
              </li>
            ))}
          </ul>
          {imageStyleTags.length > 0 && (
            <div className="image-styles-info">
              <p><strong>Visual Style:</strong> {imageStyleTags.join(', ')}</p>
            </div>
          )}
        </div>
        {adventureId && <p className="adventure-id-display">Adventure ID: {adventureId}</p>}
      </div>
    </div>
  );
}

export default GamePage;
