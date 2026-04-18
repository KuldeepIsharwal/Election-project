const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const voteRoutes = require('./routes/voteRoutes');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Attach database to request object for easy access in controllers
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
app.use('/api/votes', voteRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});