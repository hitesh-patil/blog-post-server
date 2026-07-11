import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not defined.');
  }
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

export const resolvers = {
  Query: {
    getPosts: async (_, { limit = 5, offset = 0, authorId, status }) => {
      try {
        const safeLimit = Math.min(Math.max(1, limit), 50); // Cap at 50 to prevent abuse
        const safeOffset = Math.max(0, offset);
        const query = {};
        if (authorId) query.author = authorId;
        if (status) query.status = status;
        else if (!authorId) {
          query.$or = [{ status: 'PUBLISHED' }, { status: { $exists: false } }];
        }

        return await Post.find(query).sort({ createdAt: -1 }).skip(safeOffset).limit(safeLimit).populate('author');
      } catch (error) {
        console.error("GET POSTS ERROR:", error);
        throw new GraphQLError('Error fetching posts', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    },
    getPost: async (_, { id }) => {
      try {
        return await Post.findById(id).populate('author');
      } catch (error) {
        throw new GraphQLError('Error fetching post', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    },
    getUser: async (_, { id }) => {
      try {
        return await User.findById(id);
      } catch (error) {
        throw new GraphQLError('Error fetching user', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    },
    me: async (_, __, context) => {
      if (!context.user) return null;
      try {
        return await User.findById(context.user.id);
      } catch (error) {
        throw new GraphQLError('Error fetching user', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    }
  },
  Mutation: {
    signup: async (_, { name, username, password }, context) => {
      try {
        if (!name || name.trim().length < 2 || name.length > 50) {
          throw new GraphQLError('Name must be between 2 and 50 characters', { extensions: { code: 'BAD_USER_INPUT' } });
        }
        if (!username || username.trim().length < 3 || username.length > 30) {
          throw new GraphQLError('Username must be between 3 and 30 characters', { extensions: { code: 'BAD_USER_INPUT' } });
        }
        if (!password || password.length < 6) {
          throw new GraphQLError('Password must be at least 6 characters', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
          throw new GraphQLError('Username is already taken', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }

        const user = new User({ name, username, password });
        await user.save();
        const token = generateToken(user._id);
        
        if (context.res) {
          setAuthCookie(context.res, token);
        }

        return { userId: user._id, token };
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(error.message || 'Error signing up', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    },
    login: async (_, { username, password }, context) => {
      try {
        const user = await User.findOne({ username });
        if (!user) {
          throw new GraphQLError('Invalid credentials', {
            extensions: { code: 'UNAUTHENTICATED' }
          });
        }
        const isValid = await user.isValidPassword(password);
        if (!isValid) {
          throw new GraphQLError('Invalid credentials', {
            extensions: { code: 'UNAUTHENTICATED' }
          });
        }
        const token = generateToken(user._id);
        
        if (context.res) {
          setAuthCookie(context.res, token);
        }

        return { userId: user._id, token };
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(error.message || 'Error logging in', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    },
    logout: async (_, __, context) => {
      if (context.res) {
        context.res.clearCookie('token');
      }
      return true;
    },
    addPost: async (_, { title, description, tags, coverImage, status }, context) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }
      try {
        if (!title || title.trim().length < 3 || title.length > 100) {
          throw new GraphQLError('Title must be between 3 and 100 characters', { extensions: { code: 'BAD_USER_INPUT' } });
        }
        
        const newPost = new Post({ 
          title, 
          description, 
          tags: tags || [], 
          coverImage: coverImage || '',
          status: status || 'PUBLISHED',
          author: context.user.id
        });
        const savedPost = await newPost.save();
        return await savedPost.populate('author');
      } catch (error) {
        throw new GraphQLError('Error adding post', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    },
    updatePost: async (_, { id, title, description, tags, coverImage, status }, context) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }
      try {
        const post = await Post.findById(id);
        if (!post) {
          throw new GraphQLError('Post not found', {
            extensions: { code: 'NOT_FOUND' }
          });
        }
        if (post.author.toString() !== context.user.id) {
          throw new GraphQLError('Unauthorized', {
            extensions: { code: 'FORBIDDEN' }
          });
        }

        if (title !== undefined) post.title = title;
        if (description !== undefined) post.description = description;
        if (tags !== undefined) post.tags = tags;
        if (coverImage !== undefined) post.coverImage = coverImage;
        if (status !== undefined) post.status = status;

        const updatedPost = await post.save();
        return await updatedPost.populate('author');
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Error updating post', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    },
    deletePost: async (_, { id }, context) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }
      try {
        const post = await Post.findById(id);
        if (!post) {
          throw new GraphQLError('Post not found', {
            extensions: { code: 'NOT_FOUND' }
          });
        }
        if (post.author.toString() !== context.user.id) {
          throw new GraphQLError('Unauthorized', {
            extensions: { code: 'FORBIDDEN' }
          });
        }
        
        await Post.findByIdAndDelete(id);
        return id;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Error deleting post', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    }
  }
};
