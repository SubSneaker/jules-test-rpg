import React, { useState, useEffect } from 'react';

function GamePage() {
  const [scenario, setScenario] = useState('');
  const [choices, setChoices] = useState([]);
  const [playerStats, setPlayerStats] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // To manage loading state for initial fetch

  const fetchGameData = (url, options = {}) => {
    setLoading(true);
    setError(null);
    return fetch(url, options)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setScenario(data.scenario);
        setChoices(data.choices);
        setPlayerStats(data.playerStats);
        setLoading(false);
        return data; // Return data for further processing if needed
      })
      .catch(err => {
        console.error("Error during fetch operation:", err);
        setError(err.message);
        setLoading(false);
        throw err; // Re-throw to allow caller to handle
      });
  };

  useEffect(() => {
    fetchGameData('http://localhost:3001/api/game/start');
  }, []); // Empty dependency array means this effect runs once on mount

  const handleChoiceClick = (choiceId) => {
    fetchGameData('http://localhost:3001/api/game/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ actionId: choiceId }),
    });
  };

  if (loading && !scenario) { // Show loading only on initial load
    return <div>Loading game...</div>;
  }

  if (error && !scenario) { // Show error prominently if initial load fails
    return <div>Error loading game: {error}</div>;
  }
  
  return (
    <div className="game-page">
      {error && <div className="error-message">Error: {error} (Game might be partially loaded or an action failed)</div>}
      
      <div className="scenario">
        <h2>Scenario</h2>
        <p>{scenario}</p>
      </div>

      <div className="player-stats">
        <h3>Player Stats</h3>
        <ul>
          {Object.entries(playerStats).map(([stat, value]) => (
            <li key={stat}>
              {stat.charAt(0).toUpperCase() + stat.slice(1)}: {value}
            </li>
          ))}
        </ul>
      </div>

      <div className="choices">
        <h3>Choices</h3>
        {choices.map(choice => (
          <button 
            key={choice.id} 
            onClick={() => handleChoiceClick(choice.id)}
            disabled={loading} // Disable button while loading
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default GamePage;
