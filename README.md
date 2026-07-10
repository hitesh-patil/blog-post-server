# Blog Posts Server

The backend application for the full-stack blog platform.

## Overview
This is a Node.js and Express server that exposes a GraphQL API using Apollo Server. It handles user authentication, post management (including draft and published states), and securely connects to a MongoDB database using Mongoose.

## Live Demo
The server powers the live frontend application at: **[http://13.60.170.186](http://13.60.170.186)** (API at `/graphql`)

## Screenshots

<details>
<summary>Click to view Application Screenshots</summary>

### Home Page (Feed)
![Home Page](./screenshots/home.png)

### Add Post (Rich Text Editor)
![Add Post](./screenshots/add-post.png)

### User Profile (My Posts & Drafts)
![User Profile](./screenshots/profile.png)

</details>

## Approach
The backend architecture is built as a GraphQL API instead of a traditional REST API. This approach solves over-fetching and under-fetching by allowing the frontend to query exactly the shapes and fields it needs (e.g., retrieving only post titles and authors for the home page, but the full rich-text content for the post detail page). Using **Apollo Server** attached to an **Express** instance gives us maximum flexibility. For data persistence, **Mongoose** defines strict schemas validating required properties, managing relational author bindings, and keeping data uniform. We employ a stateless JSON Web Token (JWT) workflow attached in headers, ensuring the backend scales easily without managing heavy session storage.

## Tech Stack
- **Node.js & Express**: Core server framework
- **Apollo Server**: GraphQL API implementation
- **MongoDB & Mongoose**: Database and ODM
- **JSON Web Tokens (JWT)**: Secure user authentication and session management
- **Bcrypt**: Password hashing

## Prerequisites
- Node.js (v18+)
- MongoDB running locally or a MongoDB Atlas connection string.

You will need to set up the following environment variables in a `.env` file in the `server` directory:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/blog-posts
JWT_SECRET=your_jwt_secret_key
```

## Available Scripts

In the project directory, you can run:

### `npm run dev`
Runs the server in development mode using `nodemon`.
The server will restart automatically if you make edits.
Open [http://localhost:4000/graphql](http://localhost:4000/graphql) to interact with the Apollo Server GraphQL Playground.

### `npm start`
Runs the server in production mode.

### Docker Setup
To run the backend completely containerized (along with a MongoDB instance) via Docker:
```bash
docker-compose up --build
```
This spins up a localized `mongo` database and the server API, automatically connecting the two.

## Key Features
- **GraphQL API**: Fully typed GraphQL queries and mutations for posts and users.
- **Authentication**: JWT-based authentication resolving the current user in the GraphQL context.
- **Drafts and Publishing**: Supports `status` tracking on posts, allowing users to save posts privately as drafts or publish them to the main feed.
- **Security**: Passwords are mathematically hashed via Bcrypt before saving to the database.
