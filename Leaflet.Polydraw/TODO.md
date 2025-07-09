# Polydraw TODO List

## Known Issues

### 🐛 Green Hole Bug (Minor)

**Priority:** Low  
**Status:** Identified  
**Description:** When performing a complex sequence of operations (adding polygons, dragging, drawing overlapping areas, subtracting, then dragging a polygon with modifier key), a "green hole" appears in the polygon.

**Steps to Reproduce:**

1. Add a few polygons by dragging
2. Draw an overlapping polygon
3. Subtract a bit from the polygon
4. Drag a polygon while holding the modifier key
5. Result: Green hole appears

**Impact:** Visual rendering issue, doesn't affect core functionality
**Investigation Needed:** Check polygon styling and hole rendering logic in modifier drag operations

---

## Future Enhancements

### 🔄 State Manager Migration (In Progress)

**Priority:** High  
**Status:** Phase 1 Complete  
**Description:** Complete migration to State Manager as single source of truth

**Remaining Phases:**

- [ ] Phase 2: Update managers to use State Manager directly
- [ ] Phase 3: Remove direct array access from polydraw.ts
- [ ] Phase 4: Rewrite tests to use State Manager methods
- [ ] Phase 5: Make polygonInformation reactive

---

## Completed Items

### ✅ State Manager Enhancement (Phase 1)

**Completed:** 2025-01-09  
**Description:** Enhanced State Manager with comprehensive array operations and event system

- Added 10 new array-like methods
- 42 comprehensive tests added
- Performance optimizations implemented
- All 244 tests passing

---

_Last Updated: 2025-01-09_
