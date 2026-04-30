# Input:  Python 3.10+ (match/case syntax)
# Output: Strict FSM that rejects invalid transitions

from enum import Enum, auto
from dataclasses import dataclass, field
from typing import Callable

class State(Enum):
    IDLE = auto()
    PENDING = auto()
    CONFIRMED = auto()
    SHIPPED = auto()
    DELIVERED = auto()
    CANCELLED = auto()

class Event(Enum):
    PLACE_ORDER = auto()
    CONFIRM_PAYMENT = auto()
    SHIP = auto()
    DELIVER = auto()
    CANCEL = auto()

@dataclass
class StateMachine:
    state: State = State.IDLE
    _transitions: dict[tuple[State, Event], State] = field(
        default_factory=lambda: {
            (State.IDLE, Event.PLACE_ORDER): State.PENDING,
            (State.PENDING, Event.CONFIRM_PAYMENT): State.CONFIRMED,
            (State.PENDING, Event.CANCEL): State.CANCELLED,
            (State.CONFIRMED, Event.SHIP): State.SHIPPED,
            (State.CONFIRMED, Event.CANCEL): State.CANCELLED,
            (State.SHIPPED, Event.DELIVER): State.DELIVERED,
        }
    )

    def send(self, event: Event) -> State:
        key = (self.state, event)
        if key not in self._transitions:
            raise ValueError(
                f"Invalid transition: {self.state.name} + {event.name}"
            )
        self.state = self._transitions[key]
        return self.state

# Usage
fsm = StateMachine()
fsm.send(Event.PLACE_ORDER)   # -> State.PENDING
fsm.send(Event.CONFIRM_PAYMENT)  # -> State.CONFIRMED
# fsm.send(Event.PLACE_ORDER)  # raises ValueError
