# Manual Testing Checklist for Polydraw Simplified System

## ✅ Basic Functionality (Core Features)

### Drawing Operations

- [ ] **Draw Single Polygon** - Draw a simple polygon, should appear on map
- [ ] **Draw Multiple Separate Polygons** - Draw 2-3 non-overlapping polygons
- [ ] **Draw Overlapping Polygons (Merge)** - Draw polygon, then draw overlapping polygon → should merge into one
- [ ] **Auto Add Polygon** - Programmatically add polygon via API

### Subtract Operations

- [ ] **Subtract - Remove Bite** - Draw polygon, switch to subtract, remove a "bite" from edge
- [ ] **Subtract - Create Hole** - Draw polygon, switch to subtract, draw inside to create hole
- [ ] **Subtract - Split Polygon** - Draw polygon, switch to subtract, draw through to split into pieces

### Marker Operations

- [ ] **Drag Elbow (Marker)** - Drag corner markers to reshape polygon
- [ ] **Drag Elbow on Split Polygon** - After splitting, drag markers on resulting pieces
- [ ] **Special Markers** - Check menu, info, and delete markers work

### Polygon Operations

- [ ] **Drag Whole Polygon** - Drag entire polygon to new location
- [ ] **Delete Polygon** - Click delete marker to remove polygon
- [ ] **Clear All** - Use erase button to clear all polygons

## 🔄 Advanced Functionality (When Ready)

### Complex Merge Scenarios

- [ ] **Multiple Polygon Merge** - Draw 3+ overlapping polygons, should merge all
- [ ] **Drag to Merge** - Draw separate polygons, drag one to overlap another → should merge
- [ ] **Complex Shape Merge** - Merge L-shaped or complex polygons

### Edge Cases

- [ ] **Very Small Polygons** - Draw tiny polygons
- [ ] **Very Large Polygons** - Draw polygons covering large area
- [ ] **Complex Holes** - Create polygons with multiple holes
- [ ] **Nested Polygons** - Polygon inside another polygon

### Performance Tests

- [ ] **Many Polygons** - Add 10+ polygons to test performance
- [ ] **Complex Shapes** - Very detailed polygons with many points
- [ ] **Rapid Operations** - Quick succession of draw/subtract/drag operations

## 🚫 Known Limitations (Skip for Now)

- Complex hole operations
- Multiple polygon merges (advanced)
- Drag node over pre-merged polygons with holes
- Edge case handling for malformed polygons

## 📝 Testing Notes

- Test on different browsers if possible
- Check console for errors/warnings
- Verify no memory leaks during extended use
- Test both mouse and touch interactions

## ✅ Current Status

- [x] Draw Single Polygon
- [x] Subtract - Remove Bite
- [x] Subtract - Create Hole
- [x] Subtract - Split Polygon
- [x] Draw Overlapping Polygons (Merge)
- [ ] Drag Elbow (Marker) - **NEXT TO TEST**
- [ ] Drag Whole Polygon
- [ ] Delete Polygon
- [ ] Clear All

---

_Update this checklist as you test each feature_
