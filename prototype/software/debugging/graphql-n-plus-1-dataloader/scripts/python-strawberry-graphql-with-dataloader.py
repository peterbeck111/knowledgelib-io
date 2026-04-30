# Input:  GraphQL query { posts { id title author { id name } } }
# Output: 2 DB queries total instead of N+1

import strawberry
from strawberry.dataloader import DataLoader
from typing import List, Optional

async def load_users_batch(keys: List[int]) -> List[Optional['User']]:
    """Batch function: fetch all users in one query, return in key order."""
    rows = await db.fetch('SELECT * FROM users WHERE id = ANY($1)', keys)
    user_map = {row['id']: User(id=row['id'], name=row['name']) for row in rows}
    return [user_map.get(key) for key in keys]  # Same order as keys

@strawberry.type
class User:
    id: int
    name: str

@strawberry.type
class Post:
    id: int
    title: str
    author_id: int

    @strawberry.field
    async def author(self, info: strawberry.Info) -> Optional[User]:
        return await info.context["user_loader"].load(self.author_id)

# Context factory — new DataLoader per request
async def get_context():
    return {"user_loader": DataLoader(load_fn=load_users_batch)}

schema = strawberry.Schema(query=Query)
