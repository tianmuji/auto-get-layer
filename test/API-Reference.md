# Grouping Algorithm API Reference

## Quick Start

```javascript
// Import the grouping utilities
// <script src="grouping-utils.js"></script>

// Define your elements
const elements = [
    { id: 'title', name: 'Title', x: 20, y: 20, width: 200, height: 30, type: 'text' },
    { id: 'content', name: 'Content', x: 20, y: 60, width: 200, height: 100, type: 'text' },
    { id: 'button', name: 'Button', x: 20, y: 180, width: 80, height: 30, type: 'button' }
];

// Execute grouping
const hierarchy = performCompleteHierarchicalGrouping(elements);

// Use the result
console.log(hierarchy);
```

## Core API Functions

### Main Algorithm

#### `performCompleteHierarchicalGrouping(elements)`
**Description**: Main entry point for the hierarchical grouping algorithm.

**Parameters**:
- `elements` (Array): Array of element objects to be grouped

**Returns**: 
- `Group`: Root group object containing the complete hierarchy

**Example**:
```javascript
const hierarchy = performCompleteHierarchicalGrouping(elements);
```

---

### Group Creation Functions

#### `createPageGroup(elements)`
**Description**: Creates the root page-level group.

**Parameters**:
- `elements` (Array): Array of all elements

**Returns**: 
- `Group`: Page-level group object

#### `buildCompleteHierarchy(parentGroup)`
**Description**: Recursively builds the complete hierarchical structure.

**Parameters**:
- `parentGroup` (Group): Parent group to build hierarchy for

**Returns**: 
- `Group`: Complete hierarchical group structure

---

### Spatial Analysis Functions

#### `performSpatialClustering(elements)`
**Description**: Performs spatial clustering of elements based on their positions.

**Parameters**:
- `elements` (Array): Elements to cluster

**Returns**: 
- `Array<Array>`: Array of element clusters

#### `performFlexLayoutGrouping(elements)`
**Description**: Groups elements following Flex layout principles.

**Parameters**:
- `elements` (Array): Elements to group

**Returns**: 
- `Array<Array>`: Array of grouped elements

---

### Ray Casting Functions

#### `buildRayRelationGraph(elements)`
**Description**: Builds a graph of ray-based relationships between elements.

**Parameters**:
- `elements` (Array): Elements to analyze

**Returns**: 
- `RayGraph`: Graph object containing horizontal and vertical relationships

#### `canConnectHorizontally(elem1, elem2, allElements)`
**Description**: Checks if two elements can be connected horizontally.

**Parameters**:
- `elem1` (Element): First element
- `elem2` (Element): Second element  
- `allElements` (Array): All elements for blocking detection

**Returns**: 
- `boolean`: True if elements can be connected horizontally

#### `canConnectVertically(elem1, elem2, allElements)`
**Description**: Checks if two elements can be connected vertically.

**Parameters**:
- `elem1` (Element): First element
- `elem2` (Element): Second element
- `allElements` (Array): All elements for blocking detection

**Returns**: 
- `boolean`: True if elements can be connected vertically

#### `isHorizontalRayBlocked(elem1, elem2, allElements)`
**Description**: Checks if horizontal ray between elements is blocked.

**Parameters**:
- `elem1` (Element): Source element
- `elem2` (Element): Target element
- `allElements` (Array): All elements for blocking detection

**Returns**: 
- `boolean`: True if ray is blocked

#### `isVerticalRayBlocked(elem1, elem2, allElements)`
**Description**: Checks if vertical ray between elements is blocked.

**Parameters**:
- `elem1` (Element): Source element
- `elem2` (Element): Target element
- `allElements` (Array): All elements for blocking detection

**Returns**: 
- `boolean`: True if ray is blocked

---

### Dynamic Programming Functions

#### `dynamicProgrammingGrouping(elements, rayGraph)`
**Description**: Uses dynamic programming to find optimal grouping solution.

**Parameters**:
- `elements` (Array): Elements to group
- `rayGraph` (RayGraph): Ray relationship graph

**Returns**: 
- `Array<Array>`: Optimal grouping solution

#### `findAllValidGroupings(elements, rayGraph)`
**Description**: Finds all valid grouping possibilities.

**Parameters**:
- `elements` (Array): Elements to group
- `rayGraph` (RayGraph): Ray relationship graph

**Returns**: 
- `Array<Array<Array>>`: All valid grouping solutions

#### `calculateGroupingScore(groups)`
**Description**: Calculates quality score for a grouping solution.

**Parameters**:
- `groups` (Array<Array>): Grouping solution to score

**Returns**: 
- `Object`: Score object with detailed metrics

---

### Utility Functions

#### `calculateBounds(elements)`
**Description**: Calculates bounding box for a collection of elements.

**Parameters**:
- `elements` (Array): Elements to calculate bounds for

**Returns**: 
- `Rectangle`: Bounding box object with x, y, width, height

#### `calculateMinDistance(elem1, elem2)`
**Description**: Calculates minimum distance between two elements.

**Parameters**:
- `elem1` (Element): First element
- `elem2` (Element): Second element

**Returns**: 
- `number`: Minimum distance between elements

#### `generateMeaningfulGroupName(elements, fallbackName)`
**Description**: Generates meaningful name for a group based on its elements.

**Parameters**:
- `elements` (Array): Elements in the group
- `fallbackName` (string): Fallback name if generation fails

**Returns**: 
- `string`: Generated group name

#### `determineGroupType(elements, hierarchy)`
**Description**: Determines the semantic type and layout direction for a group.

**Parameters**:
- `elements` (Array): Elements in the group
- `hierarchy` (Object): Hierarchy level information

**Returns**: 
- `Object`: Object with type and direction properties

#### `determineFlexDirection(elements)`
**Description**: Determines the main axis direction for Flex layout.

**Parameters**:
- `elements` (Array): Elements to analyze

**Returns**: 
- `string`: 'HORIZONTAL', 'VERTICAL', or 'NONE'

---

## Data Types

### Element
```javascript
{
    id: string,           // Unique identifier
    name: string,         // Display name
    x: number,           // X coordinate
    y: number,           // Y coordinate  
    width: number,       // Width in pixels
    height: number,      // Height in pixels
    type: string         // Element type (text, image, button, etc.)
}
```

### Group
```javascript
{
    id: string,              // Group identifier
    name: string,            // Group name
    type: string,            // Group type (page, section, div, etc.)
    level: number,           // Hierarchy depth (1-based)
    elements: Element[],     // Direct child elements
    bounds: Rectangle,       // Bounding box
    children: Group[],       // Sub-groups
    direction: string        // Layout direction
}
```

### Rectangle
```javascript
{
    x: number,           // Left coordinate
    y: number,           // Top coordinate
    width: number,       // Width
    height: number       // Height
}
```

### RayGraph
```javascript
{
    horizontal: Map<string, Set<string>>,  // Horizontal connections
    vertical: Map<string, Set<string>>,    // Vertical connections
    elements: Map<string, Element>         // Element lookup
}
```

## Configuration

### Web Hierarchy Levels
The algorithm uses predefined hierarchy levels that can be customized:

```javascript
const WEB_HIERARCHY = [
    { name: 'page', label: 'Page', minSize: 0, priority: 1 },
    { name: 'section', label: 'Section', minSize: 100, priority: 2 },
    { name: 'article', label: 'Article', minSize: 80, priority: 3 },
    { name: 'header', label: 'Header', minSize: 60, priority: 4 },
    { name: 'nav', label: 'Nav', minSize: 40, priority: 5 },
    { name: 'main', label: 'Main', minSize: 60, priority: 6 },
    { name: 'aside', label: 'Aside', minSize: 40, priority: 7 },
    { name: 'div', label: 'Div', minSize: 30, priority: 8 },
    { name: 'component', label: 'Component', minSize: 20, priority: 9 }
];
```

## Error Handling

The algorithm includes built-in error handling for common scenarios:

- **Empty input**: Returns empty group structure
- **Single element**: Creates minimal hierarchy
- **Invalid coordinates**: Logs warnings and continues
- **Circular references**: Prevented by design

## Performance Considerations

- **Element count**: Algorithm performance degrades with O(n³) complexity
- **Recommended limit**: < 50 elements for real-time performance
- **Memory usage**: Proportional to n² for relationship graphs
- **Optimization**: Use spatial partitioning for large datasets

## Browser Compatibility

- **Modern browsers**: Full support (ES6+)
- **IE11**: Requires polyfills for Map, Set
- **Node.js**: Compatible with minor modifications
- **Dependencies**: None (pure JavaScript)
