# Input:  Existing REST API
# Output: Ariadne schema-first GraphQL server

from ariadne import QueryType, MutationType, make_executable_schema
from ariadne.asgi import GraphQL
import httpx

REST_BASE_URL = "https://api.example.com/v1"

type_defs = """
    type User {
        id: ID!
        name: String!
        email: String!
        posts: [Post!]!
    }

    type Post {
        id: ID!
        title: String!
        content: String!
    }

    type Query {
        users: [User!]!
        user(id: ID!): User
    }

    type Mutation {
        createUser(name: String!, email: String!): User!
    }
"""

query = QueryType()
mutation = MutationType()

@query.field("users")
async def resolve_users(_, info):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{REST_BASE_URL}/users")
        return resp.json()

@query.field("user")
async def resolve_user(_, info, id):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{REST_BASE_URL}/users/{id}")
        if resp.status_code == 404:
            return None
        return resp.json()

# Nested resolver — User.posts
@query.field("posts")  # Actually bind to User type
async def resolve_user_posts(user, info):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{REST_BASE_URL}/users/{user['id']}/posts")
        return resp.json()

@mutation.field("createUser")
async def resolve_create_user(_, info, name, email):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{REST_BASE_URL}/users",
            json={"name": name, "email": email},
        )
        return resp.json()

schema = make_executable_schema(type_defs, query, mutation)
app = GraphQL(schema)
# Run with: uvicorn app:app
