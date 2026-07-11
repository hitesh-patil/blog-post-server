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
The backend architecture is built as a GraphQL API instead of a traditional REST API. This approach solves over-fetching and under-fetching by allowing the frontend to query exactly the shapes and fields it needs (e.g., retrieving only post titles and authors for the home page, but the full rich-text content for the post detail page). Using **Apollo Server** attached to an **Express** instance gives us maximum flexibility.

Authentication uses **HTTP-only cookies** to store JWTs — the token is set server-side after login or signup and sent automatically on every subsequent request. The GraphQL context middleware verifies the cookie on each request using `JWT_SECRET`. If a cookie carries an invalid or expired token, the server calls `res.clearCookie('token')` immediately so the browser is not left in a broken state. Input validation and a `getPosts` query limit (max 50 results) guard against abuse.

For data persistence, **Mongoose** defines strict schemas validating required properties, managing relational author bindings, and keeping data uniform. Compound indexes on the `Post` collection (`{ status, createdAt }` and `{ author, createdAt }`) ensure homepage and profile queries stay fast as the dataset grows.

## Tech Stack
- **Node.js v18+ & Express 5**: Core server framework
- **Apollo Server 5**: GraphQL API implementation
- **MongoDB & Mongoose 9**: Database and ODM
- **JSON Web Tokens (JWT)**: Secure user authentication (stored in HTTP-only cookies)
- **bcryptjs**: Password hashing
- **cookie-parser**: Cookie middleware for reading the session token
- **dotenv**: Environment variable loading

## Prerequisites
- Node.js (v18+)
- MongoDB running locally or a MongoDB Atlas connection string.

You will need to set up the following environment variables in a `.env` file in the `server` directory:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/blog-posts
JWT_SECRET=your_jwt_secret_key   # Required — server will refuse to start tokens without this
PORT=4000                         # Optional, defaults to 4000
```

## Local Development

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/hitesh-patil/blog-post-server.git
   cd blog-post-server
   npm install
   ```

2. **Start MongoDB** (if running locally, not Atlas)
   ```bash
   mongod --dbpath /usr/local/var/mongodb   # macOS Homebrew default
   # or
   brew services start mongodb-community    # if installed via Homebrew
   ```

3. **Create your `.env` file** in the `server` root (see Prerequisites above for values).

4. **Start the server**
   ```bash
   npm run dev    # development (auto-restarts on changes)
   # or
   npm start      # production mode
   ```
   API available at [http://localhost:4000/graphql](http://localhost:4000/graphql).

5. **Point the client at this server** by setting `VITE_API_URL=http://localhost:4000/graphql` in the client's `.env` file.

> **Cookie note:** Both the server and client must run on `localhost` (not `127.0.0.1`) for the HTTP-only session cookie to be shared correctly during local development.

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
- **Cookie-based Authentication**: JWTs stored in HTTP-only cookies — resistant to XSS. The server validates `JWT_SECRET` on startup; invalid tokens are cleared from the browser automatically.
- **Drafts and Publishing**: Supports `status` tracking on posts, allowing users to save posts privately as drafts or publish them to the main feed.
- **Security**: Passwords hashed via bcryptjs. Input validation on `signup` and `addPost` mutations. `getPosts` query capped at 50 results to prevent abuse.
- **Performance**: Compound MongoDB indexes on `{ status, createdAt }` and `{ author, createdAt }` keep feed and profile queries fast at scale.

## GraphQL API Reference

### Queries
| Query | Args | Auth | Returns |
|---|---|---|---|
| `getPosts` | `limit` (max 50), `offset`, `authorId`, `status` | No | `[Post]` |
| `getPost` | `id` | No | `Post` |
| `getUser` | `id` | No | `User` |
| `me` | — | Yes (cookie) | `User` |

### Mutations
| Mutation | Args | Auth | Returns |
|---|---|---|---|
| `signup` | `name`, `username`, `password` | No | `AuthData` |
| `login` | `username`, `password` | No | `AuthData` |
| `logout` | — | Yes | `Boolean` |
| `addPost` | `title`, `description`, `tags?`, `coverImage?`, `status?` | Yes | `Post` |
| `updatePost` | `id`, `title?`, `description?`, `tags?`, `coverImage?`, `status?` | Yes | `Post` |
| `deletePost` | `id` | Yes | `ID` |

## CI/CD Deployment

Deployment is handled by GitHub Actions (`.github/workflows/deploy.yml`). On every push to the `production` branch:
1. SSH into the EC2 instance using secrets `EC2_HOST`, `EC2_USERNAME`, `EC2_SSH_KEY`.
2. Pull the latest `production` branch.
3. Run `npm ci && node index.js` (the server is managed separately, e.g. via PM2).

Required GitHub repository secrets: `EC2_HOST`, `EC2_USERNAME`, `EC2_SSH_KEY`.

