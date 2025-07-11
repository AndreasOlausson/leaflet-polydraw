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

1. [x] Draw Single Polygon
2. [x] Subtract - Remove Bite
3. [x] Subtract - Create Hole
4. [x] Subtract - Split Polygon
5. [x] Draw Overlapping Polygons (Merge)
6. [x] Drag Elbow (Marker) - **TESTED: Success with merge!**
7. [ ] Drag Whole Polygon - **NEXT TO TEST**
8. [ ] Delete Polygon
9. [ ] Clear All
10. [ ] Draw Multiple Separate Polygons
11. [ ] Auto Add Polygon
12. [ ] Special Markers (menu, info, delete)

---

_Update this checklist as you test each feature_
