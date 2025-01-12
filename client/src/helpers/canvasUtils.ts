interface CanvasState {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
}

abstract class DrawnObjects {
  readonly DEFAULT_WIDTH = 100;
  readonly DEFAULT_HEIGHT = 125;
  readonly DEFAULT_RADIUS = 20;
  readonly SPACER_WIDTH = this.DEFAULT_WIDTH / 2;
  readonly SPACER_HEIGHT = this.DEFAULT_HEIGHT * 0.75;

  abstract draw(canvasState: CanvasState): CanvasState;
}

class Node extends DrawnObjects {
  id: string;
  displayName: string;
  childRelationships: ParentRelationship[];
  parentRelationships: ParentRelationship[];
  partnerRelationship: PartnerRelationship | null;
  isPartner: boolean;

  constructor(id: string, displayName: string, isPartner: boolean = false) {
    super();
    this.id = id;
    this.displayName = displayName;
    this.childRelationships = [];
    this.parentRelationships = [];
    this.partnerRelationship = null;
    this.isPartner = isPartner;
  }

  getWidth() {
    // If there are no children, use the default
    if (this.childRelationships.length === 0) {
      return this.DEFAULT_WIDTH;
    }

    // Calculate width required for each descendant
    let childWidths = 0;
    for (const childRelationship of this.childRelationships) {
      childWidths += childRelationship.toNode.getUnitWidth();
    }

    const spacerWidths =
      (this.childRelationships.length - 1) * this.SPACER_WIDTH;

    return childWidths + spacerWidths;
  }

  draw({ ctx, x: fromX, y: fromY }: CanvasState) {
    drawRoundedRectFromLeft(
      ctx,
      fromX,
      fromY,
      this.getWidth(),
      this.DEFAULT_HEIGHT,
      this.DEFAULT_RADIUS
    );

    // Draw all descendants of this node
    if (this.childRelationships.length > 0) {
      let currX = fromX;
      const newY = fromY + 0.5 * this.DEFAULT_HEIGHT;

      for (const childRelationship of this.childRelationships) {
        const initialX = currX;
        const childWidth = childRelationship.toNode.getWidth();
        const childUnitWidth = childRelationship.toNode.getUnitWidth();
        currX += childWidth * 0.5;
        const childStart = childRelationship.draw({ ctx, x: currX, y: newY });
        childRelationship.toNode.drawAsDescendant(childStart);
        currX = this.SPACER_WIDTH + initialX + childUnitWidth;
      }
    }
    if (this.partnerRelationship && !this.isPartner) {
      return this.partnerRelationship.draw({
        ctx,
        x: fromX + this.getWidth(),
        y: fromY,
      });
    }

    return { ctx, x: fromX + this.getWidth(), y: fromY };
  }

  drawAsDescendant({ ctx, x: fromX, y: fromY }: CanvasState) {
    // Recalculate to find the left center based on top center
    const leftX = fromX - 0.5 * this.getWidth();
    const topY = fromY + 0.5 * this.DEFAULT_HEIGHT;
    const partnerStart = this.draw({ ctx, x: leftX, y: topY });
    if (this.partnerRelationship) {
      return this.partnerRelationship.toNode.draw(partnerStart);
    }
  }

  getUnitWidth() {
    if (this.partnerRelationship)
      return this.partnerRelationship.getUnitWidth();
    else return this.getWidth();
  }
}

enum RelationshipDirection {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

enum RelationshipType {
  PARENT = "parent",
  PARTNER = "partner",
}

abstract class Relationship extends DrawnObjects {
  id: string;
  displayName: string;
  fromNodes: Node[];
  toNode: Node;
  direction: RelationshipDirection;
  type: RelationshipType;
  isEx: boolean;

  constructor(
    id: string,
    displayName: string,
    fromNodes: Node[],
    toNode: Node,
    direction: RelationshipDirection,
    type: RelationshipType,
    isEx: boolean = false
  ) {
    super();
    this.id = id;
    this.displayName = displayName;
    this.fromNodes = fromNodes;
    this.toNode = toNode;
    this.direction = direction;
    this.type = type;
    this.isEx = isEx;
  }

  draw({ ctx, x: fromX, y: fromY }: CanvasState) {
    const lineColor = this.type === RelationshipType.PARENT ? "black" : "red";

    let toX = fromX;
    let toY = fromY;
    if (this.direction === RelationshipDirection.HORIZONTAL) {
      toX += this.getLength();
    } else {
      toY += this.getLength();
    }

    drawLine(
      ctx,
      fromX,
      fromY,
      toX,
      toY,
      lineColor,
      this.isEx ? LineStyle.DOTTED : LineStyle.SOLID
    );

    // Draw lines coming from this relationship
    let currX = fromX + this.SPACER_WIDTH;
    if ("childRelationships" in this) {
      for (const childRelationship of this
        .childRelationships as ParentsRelationship[]) {
        const initialX = currX;
        const childWidth = childRelationship.toNode.getWidth();
        const childUnitWidth = childRelationship.toNode.getUnitWidth();
        currX += childWidth * 0.5;
        const childStart = childRelationship.draw({ ctx, x: currX, y: fromY });
        childRelationship.toNode.drawAsDescendant(childStart);
        currX = this.SPACER_WIDTH + initialX + childUnitWidth;
      }
    }

    return { ctx, x: toX, y: toY };
  }

  abstract getLength(): number;
}

class ParentRelationship extends Relationship {
  constructor(id: string, displayName: string, fromNode: Node, toNode: Node) {
    super(
      id,
      displayName,
      [fromNode],
      toNode,
      RelationshipDirection.VERTICAL,
      RelationshipType.PARENT
    );
  }

  getLength() {
    return this.SPACER_HEIGHT;
  }
}

// Relationship springing from a partnership (multiple parents)
class ParentsRelationship extends Relationship {
  constructor(
    id: string,
    displayName: string,
    fromNodes: Node[],
    toNode: Node
  ) {
    super(
      id,
      displayName,
      fromNodes,
      toNode,
      RelationshipDirection.VERTICAL,
      RelationshipType.PARENT
    );
  }

  getLength() {
    return this.SPACER_HEIGHT + this.DEFAULT_HEIGHT * 0.5;
  }
}

class PartnerRelationship extends Relationship {
  childRelationships: ParentsRelationship[] = [];

  constructor(id: string, displayName: string, fromNode: Node, toNode: Node) {
    super(
      id,
      displayName,
      [fromNode],
      toNode,
      RelationshipDirection.HORIZONTAL,
      RelationshipType.PARTNER
    );
  }

  getWidth() {
    if (this.childRelationships.length === 0) {
      return this.DEFAULT_WIDTH;
    }

    let childWidths = 0;
    for (const childRelationship of this.childRelationships) {
      childWidths += childRelationship.toNode.getUnitWidth();
    }

    const spacerWidths =
      (this.childRelationships.length + 1) * 0.5 * this.DEFAULT_WIDTH;

    return childWidths + spacerWidths;
  }

  getUnitWidth() {
    return (
      this.fromNodes[0].getWidth() + this.toNode.getWidth() + this.getWidth()
    );
  }

  getLength() {
    return this.getWidth();
  }
}

// Original function for drawing rectangles
export const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  borderWidth: number = 2, // Default border width if not provided
  rectColor: string = "lightgray", // Default fill color if not provided
  borderColor: string = "black" // Default border color if not provided
) => {
  ctx.fillStyle = rectColor; // Fill color
  ctx.beginPath();
  ctx.moveTo(x + radius, y); // Start at the top-left corner, offset by radius

  // Draw the top edge
  ctx.lineTo(x + width - radius, y);
  // Draw the top-right corner
  ctx.arcTo(x + width, y, x + width, y + height, radius);

  // Draw the right edge
  ctx.lineTo(x + width, y + height - radius);
  // Draw the bottom-right corner
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);

  // Draw the bottom edge
  ctx.lineTo(x + radius, y + height);
  // Draw the bottom-left corner
  ctx.arcTo(x, y + height, x, y + height - radius, radius);

  // Draw the left edge
  ctx.lineTo(x, y + radius);
  // Draw the top-left corner
  ctx.arcTo(x, y, x + radius, y, radius);

  // Close the path
  ctx.closePath();

  // Fill the rectangle with the fill color
  ctx.fill();

  // Set the border color and width, then stroke the path
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = borderColor; // Border color
  ctx.stroke();
};

// Function to draw rectangle with `y` being the center and `x` as the left edge
export const drawRoundedRectFromLeft = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  borderWidth: number = 2,
  rectColor: string = "lightgray",
  borderColor: string = "black"
) => {
  // Calculate top and bottom based on y (center) and height
  const top = y - height / 2;

  // Call the original function with adjusted top and bottom
  drawRoundedRect(
    ctx,
    x,
    top,
    width,
    height,
    radius,
    borderWidth,
    rectColor,
    borderColor
  );
};

// Function to draw rectangle with `x` and `y` as the center
export const drawRoundedRectFromCenter = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  borderWidth: number = 2,
  rectColor: string = "lightgray",
  borderColor: string = "black"
) => {
  // Call the original function with adjusted y as center
  drawRoundedRect(
    ctx,
    x - width / 2,
    y - height / 2,
    width,
    height,
    radius,
    borderWidth,
    rectColor,
    borderColor
  );
};

enum LineStyle {
  SOLID = "solid",
  DOTTED = "dotted",
}

export const drawLine = (
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string = "black",
  style: LineStyle = LineStyle.SOLID
) => {
  ctx.setLineDash(style === LineStyle.DOTTED ? [5, 5] : []); // Set line style
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
};

export const testDraw = (ctx: CanvasRenderingContext2D) => {
  const node1 = new Node("1", "John Smith");
  const node2 = new Node("2", "Jane Smith", true);
  const rel1_2 = new PartnerRelationship("1_2", "Married", node1, node2);
  const partnerChild = new Node("3", "Joey Smith");
  node1.partnerRelationship = rel1_2;
  rel1_2.childRelationships.push(
    new ParentsRelationship("1_2_3", "Child", [node1, node2], partnerChild)
  );

  // add a partner for the partner child
  const partnerChildPartner = new Node("9", "Jill NotSmith", true);
  partnerChild.partnerRelationship = new PartnerRelationship(
    "3_9",
    "Married",
    partnerChild,
    partnerChildPartner
  );

  const myChild = new Node("4", "Jackie NotSmith");
  node1.childRelationships.push(
    new ParentRelationship("1_4", "Child", node1, myChild)
  );

  const myChild2 = new Node("5", "Jack NotSmith");
  node1.childRelationships.push(
    new ParentRelationship("1_5", "Child", node1, myChild2)
  );

  // add another sibling to the only children and a partner for that child
  const myChild3 = new Node("6", "Jill NotSmith");
  node1.childRelationships.push(
    new ParentRelationship("1_6", "Child", node1, myChild3)
  );
  myChild3.partnerRelationship = new PartnerRelationship(
    "6_7",
    "Married",
    myChild3,
    new Node("7", "Jill Smith", true)
  );

  // fourth child for the only children
  const myChild4 = new Node("8", "Jackie NotSmith");
  node1.childRelationships.push(
    new ParentRelationship("1_8", "Child", node1, myChild4)
  );

  // add another partner child
  const partnerChild2 = new Node("10", "Jill NotSmith", false);
  rel1_2.childRelationships.push(
    new ParentsRelationship("1_2_10", "Child", [node1, node2], partnerChild2)
  );

  const afterNode1 = node1.draw({ ctx, x: 100, y: 100 });
  node2.draw(afterNode1);
};
