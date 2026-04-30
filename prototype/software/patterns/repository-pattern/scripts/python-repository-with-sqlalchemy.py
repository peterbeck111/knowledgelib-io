# domain/repositories.py — abstract interface
from abc import ABC, abstractmethod
from domain.entities import User

class UserRepository(ABC):
    @abstractmethod
    def find_by_id(self, user_id: str) -> User | None: ...

    @abstractmethod
    def find_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    def save(self, user: User) -> None: ...

# infrastructure/sql_user_repository.py
from sqlalchemy.orm import Session
from domain.repositories import UserRepository
from domain.entities import User

class SqlUserRepository(UserRepository):
    def __init__(self, session: Session):
        self._session = session

    def find_by_id(self, user_id: str) -> User | None:
        row = self._session.get(UserModel, user_id)
        return self._to_domain(row) if row else None

    def find_by_email(self, email: str) -> User | None:
        row = self._session.query(UserModel).filter_by(
            email=email
        ).first()
        return self._to_domain(row) if row else None

    def save(self, user: User) -> None:
        model = self._to_model(user)
        self._session.merge(model)
        self._session.flush()

    def _to_domain(self, row: UserModel) -> User:
        return User(id=row.id, email=row.email, name=row.name)

    def _to_model(self, user: User) -> UserModel:
        return UserModel(id=user.id, email=user.email, name=user.name)
