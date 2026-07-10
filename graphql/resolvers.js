import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret_key', {
    expiresIn: '7d',
  });
};

export const resolvers = {
  Query: {
    getPosts: async (_, { limit = 5, offset = 0, authorId, status }) => {
      try {
        const query = {};
        if (authorId) query.author = authorId;
        if (status) query.status = status;
        else if (!authorId) {
          query.$or = [{ status: 'PUBLISHED' }, { status: { $exists: false } }];
        }

        return await Post.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).populate('author');
      } catch (error) {
        console.error("GET POSTS ERROR:", error);
        throw new Error('Error fetching posts');
      }
    },
    getPost: async (_, { id }) => {
      try {
        return await Post.findById(id).populate('author');
      } catch (error) {
        throw new Error('Error fetching post');
      }
    },
    getUser: async (_, { id }) => {
      try {
        return await User.findById(id);
      } catch (error) {
        throw new Error('Error fetching user');
      }
    }
  },
  Mutation: {
    signup: async (_, { name, username, password }) => {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          throw new Error('Username is already taken');
        }

        // Create user
        const user = new User({ name, username, password });
        await user.save();
        const token = generateToken(user._id);
        return { userId: user._id, token };
      } catch (error) {
        throw new Error(error.message || 'Error signing up');
      }
    },
    login: async (_, { username, password }) => {
      try {
        const user = await User.findOne({ username });
        if (!user) {
          throw new Error('Invalid credentials');
        }
        const isValid = await user.isValidPassword(password);
        if (!isValid) {
          throw new Error('Invalid credentials');
        }
        const token = generateToken(user._id);
        return { userId: user._id, token };
      } catch (error) {
        throw new Error(error.message || 'Error logging in');
      }
    },
    addPost: async (_, { title, description, tags, coverImage, status }, context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      try {
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
        throw new Error('Error adding post');
      }
    },
    updatePost: async (_, { id, title, description, tags, coverImage, status }, context) => {
      if (!context.user) throw new Error('Not authenticated');
      try {
        const post = await Post.findById(id);
        if (!post) throw new Error('Post not found');
        if (post.author.toString() !== context.user.id) throw new Error('Unauthorized');

        if (title !== undefined) post.title = title;
        if (description !== undefined) post.description = description;
        if (tags !== undefined) post.tags = tags;
        if (coverImage !== undefined) post.coverImage = coverImage;
        if (status !== undefined) post.status = status;

        const updatedPost = await post.save();
        return await updatedPost.populate('author');
      } catch (error) {
        throw new Error('Error updating post');
      }
    },
    deletePost: async (_, { id }, context) => {
      if (!context.user) throw new Error('Not authenticated');
      try {
        const post = await Post.findById(id);
        if (!post) throw new Error('Post not found');
        if (post.author.toString() !== context.user.id) throw new Error('Unauthorized');
        
        await Post.findByIdAndDelete(id);
        return id;
      } catch (error) {
        throw new Error('Error deleting post');
      }
    }
  }
};
