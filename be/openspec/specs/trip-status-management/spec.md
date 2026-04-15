# Trip Status Management Specification

## Overview
Manage trip lifecycle through status transitions from scheduled to completion, including in-progress tracking, delays, and cancellations.

## Functional Requirements

### FR-1: Trip Status Lifecycle
**Description:** Define and enforce valid status transitions throughout the trip lifecycle.

**Status Values:**
- `scheduled` - Trip is planned and resources are assigned
- `in-progress` - Trip has started (vehicle departed)
- `completed` - Trip has finished successfully
- `cancelled` - Trip was cancelled before or during execution
- `delayed` - Trip is delayed but still scheduled to run

**Valid Transitions:**
```
scheduled → in-progress, cancelled, delayed
delayed → in-progress, cancelled
in-progress → completed, cancelled
completed → (terminal state, no transitions)
cancelled → (terminal state, no transitions)
```

**Business Rules:**
- Cannot transition from completed or cancelled states
- Status changes must follow the defined lifecycle
- Certain status changes require additional data (reasons, times)

### FR-2: Start Trip
**Description:** Mark a trip as in-progress when the vehicle departs.

**Inputs:**
- Trip ID (required)

**Validation:**
- Trip status must be 'scheduled' or 'delayed'
- Current time should be close to scheduledDeparture (within tolerance)

**Actions:**
- Set actualDeparture to current timestamp
- Update status to 'in-progress'

**Outputs:**
- Success: 200 OK with updated trip
- Failure: 400 Bad Request (invalid status), 404 Not Found

**Business Rules:**
- Can start from 'scheduled' or 'delayed' status only
- actualDeparture is automatically set to current time
- Cannot start completed or cancelled trips

### FR-3: Complete Trip
**Description:** Mark a trip as completed when the vehicle arrives at destination.

**Inputs:**
- Trip ID (required)
- Passenger count (optional, number >= 0)
- Notes (optional, string)

**Validation:**
- Trip status must be 'in-progress'
- Passenger count cannot exceed vehicle capacity

**Actions:**
- Set actualArrival to current timestamp
- Update status to 'completed'
- Update passengerCount if provided
- Update notes if provided

**Outputs:**
- Success: 200 OK with updated trip
- Failure: 400 Bad Request (invalid status, invalid passenger count), 404 Not Found

**Business Rules:**
- Can only complete trips that are 'in-progress'
- actualArrival is automatically set to current time
- Completed trips are immutable (except notes field)

### FR-4: Cancel Trip
**Description:** Cancel a trip before or during execution.

**Inputs:**
- Trip ID (required)
- Cancellation reason (required, string)

**Validation:**
- Trip status must be 'scheduled', 'delayed', or 'in-progress'
- Cancellation reason is mandatory

**Actions:**
- Update status to 'cancelled'
- Set cancellationReason
- If in-progress, set actualArrival to current time

**Outputs:**
- Success: 200 OK with updated trip
- Failure: 400 Bad Request (invalid status, missing reason), 404 Not Found

**Business Rules:**
- Cannot cancel completed or already cancelled trips
- Cancellation reason is required for audit trail
- Cancelled trips are immutable

### FR-5: Mark Trip as Delayed
**Description:** Mark a trip as delayed with reason and estimated delay duration.

**Inputs:**
- Trip ID (required)
- Delay reason (required, string)
- Delay duration (required, number in minutes)

**Validation:**
- Trip status must be 'scheduled'
- Delay duration must be positive
- Delay reason is mandatory

**Actions:**
- Update status to 'delayed'
- Set delayReason
- Set delayDuration

**Outputs:**
- Success: 200 OK with updated trip
- Failure: 400 Bad Request (invalid status, missing data), 404 Not Found

**Business Rules:**
- Can only delay scheduled trips
- Delayed trips can still be started or cancelled
- Delay information is preserved even after trip starts

### FR-6: Update Trip Notes
**Description:** Add or update notes for a trip at any stage.

**Inputs:**
- Trip ID (required)
- Notes (required, string)

**Validation:**
- Trip must exist

**Actions:**
- Update notes field
- Preserve all other trip data

**Outputs:**
- Success: 200 OK with updated trip
- Failure: 404 Not Found

**Business Rules:**
- Notes can be updated at any status
- Only field that can be updated on completed/cancelled trips

## Non-Functional Requirements

### NFR-1: Audit Trail
- Log all status changes with timestamp and user
- Preserve cancellation and delay reasons
- Track actual vs scheduled times

### NFR-2: Real-time Updates
- Status changes should be reflected immediately
- Consider event-driven notifications for status changes

### NFR-3: Data Integrity
- Enforce status transition rules at database level
- Validate timestamps (actual times must be logical)
- Prevent concurrent status updates

## API Endpoints

- `POST /api/v1/trips/:id/start` - Start trip (trips:update)
- `POST /api/v1/trips/:id/complete` - Complete trip (trips:update)
- `POST /api/v1/trips/:id/cancel` - Cancel trip (trips:update)
- `POST /api/v1/trips/:id/delay` - Mark as delayed (trips:update)
- `PUT /api/v1/trips/:id` - Update trip (including status) (trips:update)

## Status Transition Validation

### `validateStatusTransition(currentStatus, newStatus)`
**Logic:**
```javascript
const validTransitions = {
  scheduled: ['in-progress', 'cancelled', 'delayed'],
  delayed: ['in-progress', 'cancelled'],
  'in-progress': ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

return validTransitions[currentStatus]?.includes(newStatus) || false;
```

## Test Cases

### TC-1: Start Scheduled Trip
- Input: Trip with status 'scheduled'
- Expected: 200 OK, status changed to 'in-progress', actualDeparture set

### TC-2: Start Delayed Trip
- Input: Trip with status 'delayed'
- Expected: 200 OK, status changed to 'in-progress', actualDeparture set

### TC-3: Start Completed Trip
- Input: Trip with status 'completed'
- Expected: 400 Bad Request, invalid status transition

### TC-4: Complete In-Progress Trip
- Input: Trip with status 'in-progress', passengerCount: 45
- Expected: 200 OK, status changed to 'completed', actualArrival set

### TC-5: Complete Scheduled Trip
- Input: Trip with status 'scheduled'
- Expected: 400 Bad Request, invalid status transition

### TC-6: Complete with Excessive Passenger Count
- Input: passengerCount exceeds vehicle capacity
- Expected: 400 Bad Request, validation error

### TC-7: Cancel Scheduled Trip
- Input: Trip with status 'scheduled', cancellationReason provided
- Expected: 200 OK, status changed to 'cancelled'

### TC-8: Cancel In-Progress Trip
- Input: Trip with status 'in-progress', cancellationReason provided
- Expected: 200 OK, status changed to 'cancelled', actualArrival set

### TC-9: Cancel Without Reason
- Input: Trip cancellation without cancellationReason
- Expected: 400 Bad Request, missing reason error

### TC-10: Cancel Completed Trip
- Input: Trip with status 'completed'
- Expected: 400 Bad Request, invalid status transition

### TC-11: Mark Trip as Delayed
- Input: Trip with status 'scheduled', delayReason and delayDuration
- Expected: 200 OK, status changed to 'delayed'

### TC-12: Delay In-Progress Trip
- Input: Trip with status 'in-progress'
- Expected: 400 Bad Request, invalid status transition

### TC-13: Update Notes on Completed Trip
- Input: Completed trip, new notes
- Expected: 200 OK, notes updated, status unchanged

### TC-14: Update Other Fields on Completed Trip
- Input: Completed trip, attempt to change vehicle
- Expected: 400 Bad Request, immutable trip error

### TC-15: Status Transition Validation
- Input: Various invalid status transitions
- Expected: 400 Bad Request for all invalid transitions

### TC-16: Concurrent Status Updates
- Input: Two simultaneous status change requests
- Expected: One succeeds, one fails with conflict error

## Status Change Notifications

### Events to Emit
- `trip.started` - When trip status changes to 'in-progress'
- `trip.completed` - When trip status changes to 'completed'
- `trip.cancelled` - When trip status changes to 'cancelled'
- `trip.delayed` - When trip status changes to 'delayed'

### Event Payload
```javascript
{
  tripId: ObjectId,
  previousStatus: String,
  newStatus: String,
  timestamp: Date,
  userId: ObjectId,
  metadata: {
    // Status-specific data (reason, passenger count, etc.)
  }
}
```

## Reporting and Analytics

### Status Metrics
- Total trips by status
- Average trip duration (actual vs scheduled)
- Cancellation rate and reasons
- Delay frequency and average duration
- On-time performance percentage

### Status History
- Track status change history for each trip
- Include timestamps and user who made the change
- Useful for audit and analysis
