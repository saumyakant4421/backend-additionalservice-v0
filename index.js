// Add a root route for service status
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Additional Service is up and running' });
});
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const watchPartyRoutes = require('./routes/watchPartyRoutes'); 
const marathonRoutes = require('./routes/marathonRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Mount the router
app.use('/api/tools/watchparty', watchPartyRoutes);
app.use('/api/tools/marathon', marathonRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.url}`); // Debug log
  res.status(404).json({ error: `Route ${req.url} not found` });
});

const PORT = process.env.PORT || 4004;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));