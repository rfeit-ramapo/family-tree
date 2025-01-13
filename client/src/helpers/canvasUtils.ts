import defaultPerson from "../assets/default_person.svg";
import { treeToNodes, type TreeWithMembers } from "./treeToNodes";

interface CanvasState {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
}

abstract class DrawingConstants {
  static readonly DEFAULT_WIDTH = 125;
  static readonly DEFAULT_HEIGHT = 200;
  static readonly DEFAULT_RADIUS = 20;
  static readonly SPACER_WIDTH = this.DEFAULT_WIDTH / 2;
  static readonly SPACER_HEIGHT = this.DEFAULT_HEIGHT * 0.75;
  static readonly LINE_WIDTH = 5;
}

export abstract class DrawableObject {
  position: { x: number; y: number };
  id: string;

  constructor(x: number, y: number, id: string) {
    this.position = { x, y };
    this.id = id;
  }

  abstract draw(ctx: CanvasRenderingContext2D): void;
  abstract isInShape(point: { x: number; y: number }): boolean;
}

class DrawableNode extends DrawableObject {
  width: number;
  height: number;
  radius: number;
  displayName: string;
  displayImageURL: string | null;
  borderColor: string;
  fillColor: string;
  node: Node;
  image: HTMLImageElement;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    displayName: string,
    displayImageURL: string | null,
    borderColor: string,
    fillColor: string,
    node: Node
  ) {
    super(x, y, node.id);
    this.width = width;
    this.height = height;
    this.radius = DrawingConstants.DEFAULT_RADIUS;
    this.displayName = displayName;
    this.displayImageURL = displayImageURL;
    this.borderColor = borderColor;
    this.fillColor = fillColor;
    this.node = node;

    // Load the image if displayImageURL is provided
    this.image = new Image();
    if (displayImageURL) {
      this.image.src = displayImageURL;
    } else {
      this.image.src = defaultPerson;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw the background shape first
    drawRoundedRectFromLeft(
      ctx,
      this.position.x,
      this.position.y,
      this.width,
      this.height,
      this.radius,
      undefined, // No background image if not available
      DrawingConstants.LINE_WIDTH,
      this.fillColor,
      this.borderColor
    );

    // Wait for the image to be loaded only once, then draw
    if (this.image.complete) {
      // Set the target height to 2/3 of the node height
      let targetHeight = this.height * 0.67;

      // Calculate the proportional width based on the target height and the image aspect ratio
      let targetWidth = this.image.width * (targetHeight / this.image.height);

      // If the width exceeds the node width, scale it to 95% of the node's width
      if (targetWidth > this.width * 0.95) {
        targetWidth = this.width * 0.95;
        targetHeight = this.image.height * (targetWidth / this.image.width);
      }

      // Calculate the position to center the image horizontally
      const centerX = this.position.x + (this.width - targetWidth) / 2;
      const topY = this.position.y - DrawingConstants.DEFAULT_HEIGHT / 2.2;

      // Draw the image with the calculated dimensions and position
      ctx.drawImage(this.image, centerX, topY, targetWidth, targetHeight);
    } else {
      this.image.onload = () => {
        // Set the target height to 2/3 of the node height
        let targetHeight = this.height * 0.67;

        // Calculate the proportional width based on the target height and the image aspect ratio
        let targetWidth = this.image.width * (targetHeight / this.image.height);

        // If the width exceeds the node width, scale it to 95% of the node's width
        if (targetWidth > this.width * 0.95) {
          targetWidth = this.width * 0.95;
          targetHeight = this.image.height * (targetWidth / this.image.width);
        }

        // Calculate the position to center the image horizontally
        const centerX = this.position.x + (this.width - targetWidth) / 2;
        const topY = this.position.y - DrawingConstants.DEFAULT_HEIGHT / 2.2;

        // Draw the image with the calculated dimensions and position
        ctx.drawImage(this.image!, centerX, topY, targetWidth, targetHeight);
      };
    }
    // Draw the text label in the bottom third of the node
    const bottomThirdHeight = this.height / 3;

    // Calculate the vertical position for the text in the bottom third of the node
    const textY = this.position.y + this.height / 2 - bottomThirdHeight / 2;

    ctx.font = "16px Arial";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";

    // Split the display name into two lines if there is a space
    const nameParts = this.displayName.split(" ");
    if (nameParts.length > 1) {
      // Two lines of text
      const line1 = nameParts
        .slice(0, Math.ceil(nameParts.length / 2))
        .join(" ");
      const line2 = nameParts.slice(Math.ceil(nameParts.length / 2)).join(" ");

      // Draw the first line of text
      ctx.fillText(line1, this.position.x + this.width / 2, textY - 10);

      // Draw the second line of text
      ctx.fillText(line2, this.position.x + this.width / 2, textY + 10);
    } else {
      // Single line of text
      ctx.fillText(this.displayName, this.position.x + this.width / 2, textY);
    }
  }

  isInShape({ x, y }: { x: number; y: number }): boolean {
    console.log(`Checking drawable node ${this.displayName}`);
    const upperBound = this.position.y - this.height / 2;
    const lowerBound = this.position.y + this.height / 2;
    const leftBound = this.position.x;
    const rightBound = this.position.x + this.width;

    console.log(
      `Checking if ${x}, ${y} is in ${leftBound}, ${rightBound}, ${upperBound}, ${lowerBound}`
    );

    return (
      x >= leftBound && x <= rightBound && y >= upperBound && y <= lowerBound
    );
  }
}

class DrawableRelationship extends DrawableObject {
  relationship: Relationship;
  endPosition: { x: number; y: number };
  lineColor: string;
  lineStyle: LineStyle;

  constructor(
    x: number,
    y: number,
    relationship: Relationship,
    endPosition: { x: number; y: number },
    lineColor: string,
    lineStyle: LineStyle
  ) {
    super(x, y, relationship.id);
    this.relationship = relationship;
    this.endPosition = endPosition;
    this.lineColor = lineColor;
    this.lineStyle = lineStyle;
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawLine(
      ctx,
      this.position.x,
      this.position.y,
      this.endPosition.x,
      this.endPosition.y,
      this.lineColor,
      this.lineStyle
    );
  }

  isInShape({ x, y }: { x: number; y: number }): boolean {
    // Line segment endpoints
    const { x: x1, y: y1 } = this.position;
    const { x: x2, y: y2 } = this.endPosition;

    // Calculate the distance from point (x, y) to the line segment
    const distanceToSegment = (() => {
      const lineLengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;

      // Handle degenerate case where the line segment is actually a point
      if (lineLengthSquared === 0) {
        return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
      }

      // Project the point onto the line, clamping to the segment
      const t = Math.max(
        0,
        Math.min(
          1,
          ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lineLengthSquared
        )
      );
      const projectionX = x1 + t * (x2 - x1);
      const projectionY = y1 + t * (y2 - y1);

      // Return the distance from the point to the projection
      return Math.sqrt((x - projectionX) ** 2 + (y - projectionY) ** 2);
    })();

    // Check if the point is within the line's tolerance
    const tolerance = DrawingConstants.LINE_WIDTH / 2;
    return distanceToSegment <= tolerance;
  }
}

abstract class CanvasObject {
  abstract calculateLayout(
    canvasState: CanvasState,
    renderList: DrawableObject[]
  ): void;
}

export class Node extends CanvasObject {
  id: string;
  displayName: string;
  displayImageURL: string | null;
  childRelationships: ParentRelationship[];
  parentRelationships: ParentRelationship[];
  partnerRelationship: PartnerRelationship | null;
  isPartner: boolean;
  gender?: string;

  constructor(
    id: string,
    displayName: string,
    isPartner: boolean = false,
    displayImageURL: string | null = null,
    gender?: string
  ) {
    super();
    this.id = id;
    this.displayName = displayName;
    this.displayImageURL = displayImageURL;
    this.childRelationships = [];
    this.parentRelationships = [];
    this.partnerRelationship = null;
    this.isPartner = isPartner;
    this.gender = gender;
  }

  // Get the width of this particular node
  getWidth() {
    // If there are no children, use the default
    if (this.childRelationships.length === 0) {
      return DrawingConstants.DEFAULT_WIDTH;
    }

    // Calculate width required for each descendant
    let childWidths = 0;
    for (const childRelationship of this.childRelationships) {
      childWidths += childRelationship.toNode.getUnitWidth();
    }

    const spacerWidths =
      (this.childRelationships.length - 1) * DrawingConstants.SPACER_WIDTH;

    return childWidths + spacerWidths;
  }

  // Get the width of the unit containing this node and its partner
  getUnitWidth() {
    if (this.partnerRelationship)
      return this.partnerRelationship.getUnitWidth();
    else return this.getWidth();
  }

  calculateLayout(
    { ctx, x: fromX, y: fromY }: CanvasState,
    renderList: DrawableObject[]
  ) {
    // Calculate the layout for this node
    const drawableNode = new DrawableNode(
      fromX,
      fromY,
      this.getWidth(),
      DrawingConstants.DEFAULT_HEIGHT,
      this.displayName,
      this.displayImageURL,
      "black",
      "lavender",
      this
    );
    renderList.push(drawableNode);

    // Update the position for the next object
    const childRelationshipStart = {
      x: fromX,
      y: fromY + 0.5 * DrawingConstants.DEFAULT_HEIGHT,
    };

    // Add all descendant layouts
    for (const childRelationship of this.childRelationships) {
      const childWidth = childRelationship.toNode.getWidth();
      const childUnitWidth = childRelationship.toNode.getUnitWidth();
      childRelationshipStart.x += childWidth * 0.5;

      childRelationship.calculateLayout(
        { ctx, ...childRelationshipStart },
        renderList
      );

      // Draw the current descendant
      childRelationship.toNode.calculateLayoutAsDescendant(
        {
          ctx,
          x: childRelationshipStart.x,
          y: childRelationshipStart.y + DrawingConstants.SPACER_HEIGHT,
        },
        renderList
      );

      // Update position for the next relationship and descendant
      childRelationshipStart.x +=
        DrawingConstants.SPACER_WIDTH +
        (childUnitWidth - DrawingConstants.SPACER_WIDTH);
    }

    // Draw the partner relationship, if it exists
    if (this.partnerRelationship && !this.isPartner) {
      this.partnerRelationship.calculateLayout(
        {
          ctx,
          x: fromX + this.getWidth(),
          y: fromY,
        },
        renderList
      );

      // Draw the partner node
      this.partnerRelationship.toNode.calculateLayout(
        {
          ctx,
          x: fromX + this.partnerRelationship.getWidth() + this.getWidth(),
          y: fromY,
        },
        renderList
      );
    }
  }

  calculateLayoutAsDescendant(
    { ctx, x: fromX, y: fromY }: CanvasState,
    renderList: DrawableObject[]
  ) {
    // Recalculate to find the left center based on top center
    const leftX = fromX - 0.5 * this.getWidth();
    const topY = fromY + 0.5 * DrawingConstants.DEFAULT_HEIGHT;
    this.calculateLayout({ ctx, x: leftX, y: topY }, renderList);
    if (this.partnerRelationship) {
      this.partnerRelationship.calculateLayout(
        { ctx, x: leftX + this.getWidth(), y: topY },
        renderList
      );
    }
  }
}

enum RelationshipDirection {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

export enum RelationshipType {
  PARENT = "parent",
  PARTNER = "partner",
}

export abstract class Relationship extends CanvasObject {
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

  calculateLayout(
    { ctx, x: fromX, y: fromY }: CanvasState,
    renderList: DrawableObject[]
  ) {
    const lineColor = this.type === RelationshipType.PARENT ? "black" : "red";
    let toX = fromX;
    let toY = fromY;
    if (this.direction === RelationshipDirection.HORIZONTAL) {
      toX += this.getLength();
    } else {
      toY += this.getLength();
    }

    const drawableRelationship = new DrawableRelationship(
      fromX,
      fromY,
      this,
      { x: toX, y: toY },
      lineColor,
      this.isEx ? LineStyle.DOTTED : LineStyle.SOLID
    );
    renderList.push(drawableRelationship);

    // Add all descendant layouts for this relationship
    const childRelationshipStart = {
      x: fromX + DrawingConstants.SPACER_WIDTH,
      y: fromY,
    };

    if ("childRelationships" in this) {
      for (const childRelationship of this
        .childRelationships as ParentsRelationship[]) {
        const childWidth = childRelationship.toNode.getWidth();
        const childUnitWidth = childRelationship.toNode.getUnitWidth();

        childRelationshipStart.x += childWidth * 0.5;
        childRelationship.calculateLayout(
          { ctx, ...childRelationshipStart },
          renderList
        );

        // Draw the current descendant
        childRelationship.toNode.calculateLayoutAsDescendant(
          {
            ctx,
            x: childRelationshipStart.x,
            y:
              childRelationshipStart.y +
              DrawingConstants.SPACER_HEIGHT +
              DrawingConstants.DEFAULT_HEIGHT * 0.5,
          },
          renderList
        );

        // Update position for the next relationship and descendant
        childRelationshipStart.x +=
          DrawingConstants.SPACER_WIDTH +
          (childUnitWidth - DrawingConstants.SPACER_WIDTH);
      }
    }
  }

  abstract getLength(): number;
}

export class ParentRelationship extends Relationship {
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
    return DrawingConstants.SPACER_HEIGHT;
  }
}

// Relationship springing from a partnership (multiple parents)
export class ParentsRelationship extends Relationship {
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
    return (
      DrawingConstants.SPACER_HEIGHT + DrawingConstants.DEFAULT_HEIGHT * 0.5
    );
  }
}

export class PartnerRelationship extends Relationship {
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
      return DrawingConstants.DEFAULT_WIDTH;
    }

    let childWidths = 0;
    for (const childRelationship of this.childRelationships) {
      childWidths += childRelationship.toNode.getUnitWidth();
    }

    const spacerWidths =
      (this.childRelationships.length + 1) *
      0.5 *
      DrawingConstants.DEFAULT_WIDTH;

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
  imgURL: string = "../assets/default_person.svg",
  borderWidth: number = DrawingConstants.LINE_WIDTH,
  rectColor: string = "lightgray",
  borderColor: string = "black"
) => {
  ctx.save(); // Save the current canvas state

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

  // Render an image if a URL is provided; if this fails, use the default image

  // CODE GOES HERE

  ctx.restore(); // Restore the canvas state
};

// Function to draw rectangle with `y` being the center and `x` as the left edge
export const drawRoundedRectFromLeft = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  imgURL: string = "../assets/default_person.svg",
  borderWidth: number = DrawingConstants.LINE_WIDTH,
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
    imgURL,
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
  imgURL: string = "../assets/default_person.svg",
  borderWidth: number = DrawingConstants.LINE_WIDTH,
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
    imgURL,
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
  style: LineStyle = LineStyle.SOLID,
  lineWidth: number = DrawingConstants.LINE_WIDTH // Add lineWidth parameter
) => {
  ctx.save(); // Save the current canvas state
  ctx.setLineDash(style === LineStyle.DOTTED ? [5, 5] : []); // Set line style
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth; // Ensure consistent line width
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore(); // Restore the canvas state
};

export const testDraw = (
  ctx: CanvasRenderingContext2D,
  tree: TreeWithMembers
) => {
  const rootNode = treeToNodes(tree);

  const renderList: DrawableObject[] = [];
  if (rootNode) rootNode.calculateLayout({ ctx, x: 100, y: 100 }, renderList);
  console.log("root node", rootNode);

  // Sort renderList: DrawableRelationship objects first, DrawableNode objects last
  // Among DrawableRelationship objects, PartnerRelationship is sorted last
  renderList.sort((a, b) => {
    const isRelationshipA = a instanceof DrawableRelationship;
    const isRelationshipB = b instanceof DrawableRelationship;

    const isNodeA = a instanceof DrawableNode;
    const isNodeB = b instanceof DrawableNode;

    if (isRelationshipA && isNodeB) {
      return -1; // a comes before b
    }
    if (isNodeA && isRelationshipB) {
      return 1; // b comes before a
    }
    if (isRelationshipA && isRelationshipB) {
      // Sort within DrawableRelationship objects
      const isPartnerA = a.relationship instanceof PartnerRelationship;
      const isPartnerB = b.relationship instanceof PartnerRelationship;

      if (isPartnerA && !isPartnerB) {
        return 1; // PartnerRelationship goes last
      }
      if (!isPartnerA && isPartnerB) {
        return -1; // Non-PartnerRelationship goes first
      }
    }
    return 0; // Keep the order unchanged for other cases
  });

  // Render the objects
  for (const obj of renderList) {
    obj.draw(ctx);
  }

  return renderList;
};

export function isClickInsideObject(
  clickPosition: { x: number; y: number },
  renderList: DrawableObject[]
): DrawableObject | null {
  // Loop through the render list and check if the click position is inside any drawable object
  for (const drawable of renderList) {
    if (drawable.isInShape(clickPosition)) {
      return drawable; // Return the object if the click is inside
    }
  }
  return null; // Return null if no object was clicked
}
