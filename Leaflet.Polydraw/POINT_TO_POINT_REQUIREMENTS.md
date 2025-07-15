# Point-to-Point Drawing Mode - Requirements Specification

## Overview

This document specifies the requirements for implementing a Point-to-Point (P2P) drawing mode in Leaflet.Polydraw. The P2P mode allows users to create polygons by clicking individual points on the map, as opposed to the existing freehand drawing mode.

## Functional Requirements

### FR-1: Mode Activation and Deactivation

**Requirement**: The system shall provide a Point-to-Point drawing mode that can be activated and deactivated via UI interaction.

**Acceptance Criteria**:

- FR-1.1: When the P2P button is clicked, the system shall activate PointToPoint mode (DrawMode.PointToPoint = 32)
- FR-1.2: When the P2P button is clicked while already in PointToPoint mode, the system shall deactivate and return to Off mode
- FR-1.3: The P2P button shall be accessible through the existing UI button structure (icon-p2p class)
- FR-1.4: Mode activation shall be persistent until explicitly changed by user action

**Test Coverage**: `Mode Activation and UI Behavior` test suite

### FR-2: Visual and Interaction State Management

**Requirement**: The system shall provide appropriate visual feedback and interaction behavior when in PointToPoint mode.

**Acceptance Criteria**:

- FR-2.1: When PointToPoint mode is active, the system shall display a crosshair cursor
- FR-2.2: When PointToPoint mode is active, the system shall disable map dragging
- FR-2.3: When PointToPoint mode is active, the system shall disable double-click zoom
- FR-2.4: When PointToPoint mode is active, the system shall disable scroll wheel zoom
- FR-2.5: When exiting PointToPoint mode, the system shall restore all normal map behaviors
- FR-2.6: The crosshair cursor shall be applied via the 'crosshair-cursor-enabled' CSS class

**Test Coverage**: `Mode Activation and UI Behavior` test suite

### FR-3: Point Placement Functionality

**Requirement**: The system shall allow users to place individual points on the map to build a polygon outline.

**Acceptance Criteria**:

- FR-3.1: When in PointToPoint mode, clicking on the map shall add a point to the polygon outline
- FR-3.2: The first point click shall initialize the polygon creation process
- FR-3.3: Subsequent clicks shall add additional points to the polygon outline
- FR-3.4: Points shall be stored in the existing tracer (L.Polyline) infrastructure
- FR-3.5: Each click shall add exactly one point to the tracer
- FR-3.6: Points shall be added in the order they are clicked
- FR-3.7: Clicks when not in PointToPoint mode shall be ignored for polygon creation

**Test Coverage**: `Point Placement Functionality` test suite

### FR-4: Visual Feedback During Construction

**Requirement**: The system shall provide visual feedback showing the polygon outline as it is being constructed.

**Acceptance Criteria**:

- FR-4.1: After the second point is placed, the system shall display a dashed line connecting the points
- FR-4.2: The dashed line style shall use dashArray: '5, 5'
- FR-4.3: The line color shall match the existing polyLineOptions.color configuration
- FR-4.4: The visual outline shall update in real-time as new points are added
- FR-4.5: The outline shall remain dashed until the polygon is completed

**Test Coverage**: `Point Placement Functionality` test suite

### FR-5: Polygon Completion Methods

**Requirement**: The system shall provide multiple methods for completing a polygon.

**Acceptance Criteria**:

- FR-5.1: Double-clicking shall complete the polygon when minimum 3 points are present
- FR-5.2: Clicking on the first point shall complete the polygon when minimum 3 points are present
- FR-5.3: The system shall detect clicks near the first point with reasonable tolerance (0.0001 degrees)
- FR-5.4: Double-click detection shall use a 300ms threshold between clicks
- FR-5.5: Completion attempts with fewer than 3 points shall be ignored
- FR-5.6: Upon successful completion, the system shall return to Off mode

**Test Coverage**: `Polygon Completion Functionality` test suite

### FR-6: Polygon Integration

**Requirement**: Completed P2P polygons shall integrate seamlessly with the existing polygon system.

**Acceptance Criteria**:

- FR-6.1: Completed polygons shall be converted to solid polygons (no dashed lines)
- FR-6.2: Completed polygons shall be added to the arrayOfFeatureGroups collection
- FR-6.3: Completed polygons shall have associated markers for vertex manipulation
- FR-6.4: Completed polygons shall support all existing polygon operations (drag, edit, etc.)
- FR-6.5: Completed polygons shall integrate with the polygon merging system when enabled
- FR-6.6: Completed polygons shall be available for subtract operations
- FR-6.7: The polygon creation shall use the existing addPolygon() pipeline

**Test Coverage**: `Polygon Completion Functionality` and `Integration with Existing Polygon System` test suites

### FR-7: Error Handling and Edge Cases

**Requirement**: The system shall handle error conditions and edge cases gracefully.

**Acceptance Criteria**:

- FR-7.1: Pressing ESC key shall cancel the current P2P drawing session
- FR-7.2: Switching to a different drawing mode shall clean up any incomplete P2P polygon
- FR-7.3: Rapid clicking shall not create duplicate points or cause system instability
- FR-7.4: Invalid click coordinates (null, undefined) shall be ignored without error
- FR-7.5: Cancellation shall clear the tracer and return to Off mode
- FR-7.6: Mode switching shall properly clean up P2P state

**Test Coverage**: `Edge Cases and Error Handling` test suite

### FR-8: System Integration

**Requirement**: The P2P mode shall integrate with existing Polydraw features and configurations.

**Acceptance Criteria**:

- FR-8.1: P2P polygons shall respect the mergePolygons configuration setting
- FR-8.2: P2P polygons shall merge with existing polygons when overlapping (if merging enabled)
- FR-8.3: P2P polygons shall be available as targets for subtract operations
- FR-8.4: P2P mode shall coexist with existing drawing modes without conflicts
- FR-8.5: P2P polygons shall support all existing polygon information features

**Test Coverage**: `Integration with Existing Polygon System` test suite

## Technical Requirements

### TR-1: Implementation Architecture

**Requirement**: The P2P mode shall reuse existing infrastructure where possible.

**Technical Specifications**:

- TR-1.1: Shall reuse the existing tracer (L.Polyline) for point storage
- TR-1.2: Shall reuse the existing setDrawMode() infrastructure
- TR-1.3: Shall reuse the existing polygon creation pipeline (addPolygon method)
- TR-1.4: Shall reuse the existing TurfHelper for polygon conversion
- TR-1.5: Shall integrate with existing event handling system

### TR-2: State Management

**Requirement**: The P2P mode shall maintain appropriate state during operation.

**Technical Specifications**:

- TR-2.1: Shall track double-click timing with lastClickTime property
- TR-2.2: Shall use 300ms threshold for double-click detection
- TR-2.3: Shall maintain point collection in tracer.getLatLngs()
- TR-2.4: Shall clear state appropriately on mode changes
- TR-2.5: Shall handle keyboard events for ESC cancellation

### TR-3: Event Handling

**Requirement**: The P2P mode shall handle user input events appropriately.

**Technical Specifications**:

- TR-3.1: Shall handle mousedown events for point placement
- TR-3.2: Shall handle keydown events for ESC cancellation
- TR-3.3: Shall detect double-clicks through timing analysis
- TR-3.4: Shall detect first-point clicks through distance calculation
- TR-3.5: Shall validate click coordinates before processing

## Performance Requirements

### PR-1: Responsiveness

- PR-1.1: Point placement shall respond within 100ms of click
- PR-1.2: Visual feedback shall update within 50ms of point addition
- PR-1.3: Mode switching shall complete within 200ms

### PR-2: Resource Usage

- PR-2.1: Shall not create memory leaks during extended use
- PR-2.2: Shall clean up event listeners on mode exit
- PR-2.3: Shall reuse existing objects where possible

## Usability Requirements

### UR-1: User Experience

- UR-1.1: Shall provide clear visual feedback for incomplete polygons
- UR-1.2: Shall provide intuitive completion methods
- UR-1.3: Shall handle user errors gracefully
- UR-1.4: Shall maintain consistency with existing UI patterns

### UR-2: Accessibility

- UR-2.1: Shall support keyboard navigation (ESC to cancel)
- UR-2.2: Shall provide appropriate cursor feedback
- UR-2.3: Shall work with touch devices

## Implementation Priority

### Phase 1: Core Functionality (High Priority)

- Mode activation/deactivation (FR-1, FR-2)
- Basic point placement (FR-3)
- Visual feedback (FR-4)

### Phase 2: Completion Logic (High Priority)

- Double-click completion (FR-5)
- First-point completion (FR-5)
- Basic integration (FR-6)

### Phase 3: Error Handling (Medium Priority)

- ESC cancellation (FR-7)
- Mode switching cleanup (FR-7)
- Edge case handling (FR-7)

### Phase 4: Advanced Integration (Medium Priority)

- Polygon merging (FR-8)
- System integration (FR-8)

### Phase 5: Polish (Low Priority)

- Performance optimization (PR-1, PR-2)
- Enhanced usability (UR-1, UR-2)

## Test Strategy

### Unit Tests

- Individual method functionality
- State management
- Event handling logic

### Integration Tests

- Mode switching behavior
- Polygon creation pipeline
- System integration points

### Functional Tests

- End-to-end user workflows
- Cross-browser compatibility
- Touch device support

### Performance Tests

- Response time measurements
- Memory usage monitoring
- Stress testing with many points

## Definition of Done

A requirement is considered complete when:

1. All acceptance criteria are met
2. All associated tests pass
3. Code review is completed
4. Documentation is updated
5. No regressions in existing functionality
6. Performance requirements are met

## Risk Assessment

### High Risk

- Integration with existing polygon system
- Event handling conflicts
- Memory leaks from incomplete cleanup

### Medium Risk

- Cross-browser compatibility
- Touch device support
- Performance with many points

### Low Risk

- Visual styling
- Basic point placement
- Mode switching

## Dependencies

### Internal Dependencies

- Existing DrawMode enum
- TurfHelper polygon conversion
- Existing button infrastructure
- Polygon creation pipeline

### External Dependencies

- Leaflet.js event system
- Browser event handling
- DOM manipulation APIs

## Success Metrics

- All functional tests pass (100%)
- No performance regressions
- User can create polygons with 3+ points
- Integration with existing features works
- No memory leaks detected
- Cross-browser compatibility maintained
