# API Documentation

This document provides detailed information about the Enterprise TypeScript Starter API endpoints.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://yourdomain.com/api`

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this consistent format:

```typescript
{
  success: boolean;
  data?: any;
  message?: string;
  errors?: string[];
}
```

## Error Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## Endpoints

### Health Check

#### GET /health

Returns the health status of the API.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "development"
  }
}
```

### Authentication

#### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token-here"
  },
  "message": "User registered successfully"
}
```

**Validation Rules:**
- `name`: 2-50 characters
- `email`: Valid email format
- `password`: Minimum 8 characters with uppercase, lowercase, number, and special character

#### POST /auth/login

Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token-here"
  },
  "message": "Login successful"
}
```

#### GET /auth/profile

Get the current user's profile. Requires authentication.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Profile retrieved successfully"
}
```

#### PUT /auth/profile

Update the current user's profile. Requires authentication.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Updated",
    "email": "john.updated@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:10.000Z"
  },
  "message": "Profile updated successfully"
}
```

### User Management

All user management endpoints require authentication.

#### GET /users

Get a paginated list of all users.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "message": "Users retrieved successfully"
}
```

#### GET /users/:id

Get a specific user by ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `id`: User UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User retrieved successfully"
}
```

#### PUT /users/:id

Update a specific user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `id`: User UUID

**Request Body:**
```json
{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Updated",
    "email": "john.updated@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:10.000Z"
  },
  "message": "User updated successfully"
}
```

#### DELETE /users/:id

Delete a specific user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `id`: User UUID

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "User deleted successfully"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Window**: 15 minutes
- **Max Requests**: 100 per window per IP
- **Headers**: Rate limit information is included in response headers

When rate limit is exceeded:
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

## Error Handling

### Validation Errors (422)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Password must be at least 8 characters long"
  ]
}
```

### Authentication Errors (401)

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### Not Found Errors (404)

```json
{
  "success": false,
  "message": "User not found"
}
```

### Server Errors (500)

```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Testing the API

### Using curl

```bash
# Health check
curl http://localhost:3000/api/health

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestPass123!"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Get profile (replace with actual token)
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer your-jwt-token-here"
```

### Using Postman

1. Import the API collection (if available)
2. Set the base URL to `http://localhost:3000/api`
3. For authenticated endpoints, add the JWT token to the Authorization header

## WebSocket Support

Currently, the API does not include WebSocket support, but it can be easily added using Socket.io if real-time features are needed.

## API Versioning

The current API is version 1. Future versions can be implemented using URL versioning:
- `/api/v1/users`
- `/api/v2/users`

## CORS Configuration

CORS is configured to allow requests from the frontend application. In production, make sure to set the `CORS_ORIGIN` environment variable to your frontend domain.