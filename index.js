import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Set up Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

await server.start();

app.use(
  '/graphql',
  cors(),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      let user = null;
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split('Bearer ')[1];
        if (token) {
          try {
            user = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
          } catch (err) {
            console.error('JWT Verification Error:', err.message);
          }
        }
      }
      return { req, user };
    },
  })
);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/graphql`);
});
