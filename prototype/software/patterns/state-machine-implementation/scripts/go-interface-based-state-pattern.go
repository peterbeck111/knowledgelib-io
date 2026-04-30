// Input:  Go 1.21+
// Output: State machine using interfaces for open/closed extensibility

package statemachine

import "fmt"

type Event string

const (
    PlaceOrder    Event = "PLACE_ORDER"
    ConfirmPayment Event = "CONFIRM_PAYMENT"
    Ship          Event = "SHIP"
    Deliver       Event = "DELIVER"
    Cancel        Event = "CANCEL"
)

type State interface {
    Name() string
    Handle(event Event) (State, error)
}

type IdleState struct{}
func (s *IdleState) Name() string { return "idle" }
func (s *IdleState) Handle(e Event) (State, error) {
    if e == PlaceOrder {
        return &PendingState{}, nil
    }
    return nil, fmt.Errorf("invalid event %s in state %s", e, s.Name())
}

type PendingState struct{}
func (s *PendingState) Name() string { return "pending" }
func (s *PendingState) Handle(e Event) (State, error) {
    switch e {
    case ConfirmPayment:
        return &ConfirmedState{}, nil
    case Cancel:
        return &CancelledState{}, nil
    default:
        return nil, fmt.Errorf("invalid event %s in state %s", e, s.Name())
    }
}

// ConfirmedState, ShippedState, DeliveredState, CancelledState follow same pattern

type OrderFSM struct {
    Current State
}

func NewOrderFSM() *OrderFSM {
    return &OrderFSM{Current: &IdleState{}}
}

func (fsm *OrderFSM) Send(event Event) error {
    next, err := fsm.Current.Handle(event)
    if err != nil {
        return err
    }
    fsm.Current = next
    return nil
}
