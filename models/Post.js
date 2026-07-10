import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  coverImage: {
    type: String,
    default: '',
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED'],
    default: 'PUBLISHED'
  }
}, { timestamps: true });

export const Post = mongoose.model('Post', postSchema);
