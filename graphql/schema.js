export const typeDefs = `#graphql
  type Post {
    id: ID!
    title: String!
    description: String!
    tags: [String!]!
    coverImage: String
    author: User
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type User {
    id: ID!
    name: String!
    username: String!
  }

  type AuthData {
    userId: ID!
    token: String!
  }

  type Query {
    getPosts(limit: Int, offset: Int, authorId: ID, status: String): [Post!]!
    getPost(id: ID!): Post
    getUser(id: ID!): User
    me: User
  }

  type Mutation {
    addPost(title: String!, description: String!, tags: [String!], coverImage: String, status: String): Post
    updatePost(id: ID!, title: String, description: String, tags: [String!], coverImage: String, status: String): Post
    deletePost(id: ID!): ID
    signup(name: String!, username: String!, password: String!): AuthData!
    login(username: String!, password: String!): AuthData!
    logout: Boolean
  }
`;
