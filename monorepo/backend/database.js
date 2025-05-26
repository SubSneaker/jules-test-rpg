const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize to connect to a SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite' // This will create database.sqlite in the backend directory
});

// Define the Adventure model
const Adventure = sequelize.define('Adventure', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  storyHistory: { // Will store JSON.stringify(array of {scenario: string, choiceMade: string})
    type: DataTypes.TEXT,
    allowNull: false
  },
  playerStats: { // Will store JSON.stringify(object like {health: 100, energy: 50, ...})
    type: DataTypes.TEXT,
    allowNull: false
  },
  imageStyleTags: { // Will store JSON.stringify(array of strings, e.g., ["fantasy", "dark", "tavern"])
    type: DataTypes.TEXT,
    allowNull: true // Can be optional
  },
  currentScenarioText: {
    type: DataTypes.TEXT,
    allowNull: false
  }
  // Sequelize adds createdAt and updatedAt by default
});

// Test connection function (optional, for direct execution)
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    // Optional: Sync all models
    // await sequelize.sync({ alter: true }); // Use alter: true or force: true carefully in dev
    // console.log("All models were synchronized successfully.");
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

// Call testConnection only if the script is run directly
if (require.main === module) {
  testConnection();
}

// Export the sequelize instance and the Adventure model
module.exports = { sequelize, Adventure };
