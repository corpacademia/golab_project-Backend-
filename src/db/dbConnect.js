const { Pool } = require('pg');

// PostgreSQL connection configuration (to default `postgres` database)
const pool = new Pool({
  user: 'postgres',       // Your PostgreSQL username
  host: 'localhost',      // Database host
  password: 'Corp@123',   // Your PostgreSQL password
  port: 5432,             // PostgreSQL default port
});

// Function to create a database
const createDatabase = async () => {
  const dbName = 'golab'; // Replace with your desired database name

  try {
    // Connect to the default database (postgres)
    const client = await pool.connect();
    
    // Create the new database
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database "${dbName}" created successfully!`);
    
    // Close the client connection
    client.release();
  } catch (err) {
    console.error('Error creating database:', err.message);
  } finally {
    // Close the pool connection
    await pool.end();
  }
};

// Call the function
createDatabase();



module.exports = pool;