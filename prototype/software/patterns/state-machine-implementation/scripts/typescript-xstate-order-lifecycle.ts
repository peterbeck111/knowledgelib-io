// Input:  XState v5 installed (npm install xstate)
// Output: Type-safe order state machine with guards and actions

import { createMachine, createActor } from 'xstate';

const orderMachine = createMachine({
  id: 'order',
  initial: 'idle',
  context: { items: [] as string[], trackingId: '' },
  states: {
    idle: {
      on: { PLACE_ORDER: { target: 'pending', actions: 'setItems' } }
    },
    pending: {
      on: {
        CONFIRM_PAYMENT: 'confirmed',
        CANCEL: 'cancelled'
      }
    },
    confirmed: {
      on: {
        SHIP: { target: 'shipped', actions: 'setTracking' },
        CANCEL: 'cancelled'
      }
    },
    shipped: {
      on: { DELIVER: 'delivered' },
      entry: 'notifyShipped'
    },
    delivered: { type: 'final' },
    cancelled: { type: 'final' }
  }
});

const actor = createActor(orderMachine).start();
actor.send({ type: 'PLACE_ORDER', items: ['Widget'] });
console.log(actor.getSnapshot().value); // 'pending'
