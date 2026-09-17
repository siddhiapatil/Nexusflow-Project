const express = require('express');
const app = express();
const PORT = 3000;

// This allows our server to understand JSON data from machines
app.use(express.json());

// A simple test route to check if server is working
app.get('/', (req, res) => {
  res.send('NexusFlow Backend is running smoothly!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});