import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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

const allowedOrigins = [
  'http://localhost:5174', 
  'http://localhost:4000', 
  'http://13.60.170.186'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cookieParser());

app.use(
  '/graphql',
  cors(corsOptions),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req, res }) => {
      let user = null;
      let token = req.cookies?.token;
      
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader) {
          token = authHeader.split('Bearer ')[1];
        }
      }
      
      if (token) {
        try {
          user = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        } catch (err) {
          console.error('JWT Verification Error:', err.message);
          res.clearCookie('token');
        }
      }
      return { req, res, user };
    },
  })
);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/graphql`);
});
