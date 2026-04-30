# Input:  Existing Flask REST API
# Output: Strawberry GraphQL server wrapping the REST endpoints

import strawberry
import httpx
from typing import Optional
from dataclasses import dataclass

REST_BASE_URL = "https://api.example.com/v1"

@strawberry.type
class User:
    id: strawberry.ID
    name: str
    email: str

@strawberry.type
class Post:
    id: strawberry.ID
    title: str
    content: str
    author_id: strawberry.ID

@strawberry.input
class CreateUserInput:
    name: str
    email: str

@strawberry.type
class Query:
    @strawberry.field
    async def users(self) -> list[User]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{REST_BASE_URL}/users")
            resp.raise_for_status()
            return [User(**u) for u in resp.json()]

    @strawberry.field
    async def user(self, id: strawberry.ID) -> Optional[User]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{REST_BASE_URL}/users/{id}")
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return User(**resp.json())

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_user(self, input: CreateUserInput) -> User:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{REST_BASE_URL}/users",
                json={"name": input.name, "email": input.email},
            )
            resp.raise_for_status()
            return User(**resp.json())

schema = strawberry.Schema(query=Query, mutation=Mutation)

# Run with: uvicorn app:app
from strawberry.fastapi import GraphQLRouter
from fastapi import FastAPI

app = FastAPI()
graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")
