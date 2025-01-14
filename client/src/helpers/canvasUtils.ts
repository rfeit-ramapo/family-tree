import defaultPerson from "../assets/default_person.svg";
import eventBus from "./eventBus";
import { treeToNodes, type TreeWithMembers } from "./treeToNodes";

interface CanvasState {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
}

export interface Position {
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
  static readonly SELECTOR_PADDING = 10;
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
  abstract toggleHover(toggle: boolean): void;
  move(dx: number, dy: number) {
    return;
  }
}

export class DrawableNode extends DrawableObject {
  width: number;
  height: number;
  radius: number;
  displayName: string;
  displayImageURL: string | null;
  lineWidth: number = DrawingConstants.LINE_WIDTH;
  borderColor: string;
  fillColor: string;
  node: Node;
  image: HTMLImageElement;
  startRelationships: DrawableRelationship[] = []; // originating from this node
  endRelationships: DrawableRelationship[] = []; // ending at this node

  constructor(x: number, y: number, node: Node) {
    super(x, y, node.id);
    this.width = node.getWidth();
    this.height = DrawingConstants.DEFAULT_HEIGHT;
    this.radius = DrawingConstants.DEFAULT_RADIUS;
    this.displayName = node.displayName;
    this.displayImageURL = node.displayImageURL;

    this.borderColor = node.isFocalPoint ? "green" : "black";
    this.fillColor = node.isFocalPoint ? "#acbda1" : "lightgray";
    this.node = node;

    // Load the image if displayImageURL is provided
    this.image = new Image();
    if (node.displayImageURL) {
      this.image.src = node.displayImageURL;
    } else {
      this.image.src = defaultPerson;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.borderColor === "blue") {
      console.log(
        "Drawing node",
        this.id,
        "with borderColor",
        this.borderColor
      );
    }
    // Draw the background shape first
    drawRoundedRectFromLeft(
      ctx,
      this.position.x,
      this.position.y,
      this.width,
      this.height,
      this.radius,
      undefined,
      this.lineWidth,
      this.fillColor,
      this.borderColor
    );

    if (this.image.complete) {
      this.drawImage(ctx);
    } else {
      this.image.onload = () => {
        this.drawImage(ctx);
        eventBus.emit("updatedDrawable", this);
      };
    }

    this.drawText(ctx);
  }

  drawImage(ctx: CanvasRenderingContext2D) {
    // Set the target height to 2/3 of the node height
    let targetHeight = this.height * 0.67;

    // Calculate the proportional width based on the target height and the image aspect ratio
    let targetWidth = this.image.width * (targetHeight / this.image.height);

    // If the width exceeds the node width, scale it to 95% of the node's width
    if (targetWidth > this.width * 0.95) {
      targetWidth = this.width * 0.95;
      targetHeight = this.image.height * (targetWidth / this.image.width);
    }

    const centerX = this.position.x + (this.width - targetWidth) / 2;
    const topY = this.position.y - DrawingConstants.DEFAULT_HEIGHT / 2.2;

    // Draw the image
    ctx.drawImage(this.image, centerX, topY, targetWidth, targetHeight);
  }

  drawText(ctx: CanvasRenderingContext2D) {
    // Draw the text label in the bottom third of the node
    const bottomThirdHeight = this.height / 3;
    const textY = this.position.y + this.height / 2 - bottomThirdHeight / 2;

    ctx.font = "16px Arial";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";

    const nameParts = this.displayName.split(" ");
    if (nameParts.length > 1) {
      const line1 = nameParts
        .slice(0, Math.ceil(nameParts.length / 2))
        .join(" ");
      const line2 = nameParts.slice(Math.ceil(nameParts.length / 2)).join(" ");
      ctx.fillText(line1, this.position.x + this.width / 2, textY - 10);
      ctx.fillText(line2, this.position.x + this.width / 2, textY + 10);
    } else {
      ctx.fillText(this.displayName, this.position.x + this.width / 2, textY);
    }
  }

  isInShape({ x, y }: { x: number; y: number }): boolean {
    const upperBound = this.position.y - this.height / 2;
    const lowerBound = this.position.y + this.height / 2;
    const leftBound = this.position.x;
    const rightBound = this.position.x + this.width;

    return (
      x >= leftBound && x <= rightBound && y >= upperBound && y <= lowerBound
    );
  }

  toggleHover(toggle: boolean) {
    console.log("Toggling hover for node", this.id, "to", toggle);
    this.borderColor = toggle
      ? "green"
      : this.node.isFocalPoint
        ? "green"
        : "black";
    this.lineWidth = toggle
      ? DrawingConstants.LINE_WIDTH * 2
      : DrawingConstants.LINE_WIDTH;

    eventBus.emit("updatedDrawable", this);
  }

  move(dx: number, dy: number) {
    this.position.x += dx;
    this.position.y += dy;
    for (const relationship of this.startRelationships) {
      relationship.move(dx, dy);
    }
    for (const relationship of this.endRelationships) {
      relationship.move(dx, dy, true);
    }
  }
}

class DrawableRelationship extends DrawableObject {
  relationship: Relationship;
  endPosition: { x: number; y: number };
  lineColor: string;
  lineStyle: LineStyle;
  lineWidth: number = DrawingConstants.LINE_WIDTH;
  connectedRelationships: DrawableRelationship[] = [];
  connectionPoint: number | null = null; // Relative position along the partner line

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

    // If this is a partner relationship, store connection points for child relationships
    if (relationship instanceof PartnerRelationship) {
      this.calculateConnectionPoints();
    }
  }

  // Calculate the connection point on the partner line
  calculateConnectionPoints() {
    if (this.relationship instanceof PartnerRelationship) {
      // For each child relationship, calculate and store its connection point
      for (const childRel of this.connectedRelationships) {
        // Store the relative position along the partner line (0 to 1)
        const relativeX =
          (childRel.position.x - this.position.x) /
          (this.endPosition.x - this.position.x);
        childRel.connectionPoint = relativeX;
      }
    }
  }

  // Update connected relationship positions when the partner line moves
  updateConnectedRelationships() {
    if (this.relationship instanceof PartnerRelationship) {
      for (const connected of this.connectedRelationships) {
        if (connected.connectionPoint) {
          // Calculate new position based on the relative position along the partner line
          const newX =
            this.position.x +
            (this.endPosition.x - this.position.x) * connected.connectionPoint;
          const newY =
            this.position.y +
            (this.endPosition.y - this.position.y) * connected.connectionPoint;

          // Calculate the change in position
          const dx = newX - connected.position.x;
          const dy = newY - connected.position.y;

          // Move the connected relationship
          connected.move(dx, dy);
        }
      }
    }
  }

  move(dx: number, dy: number, isEnd: boolean = false) {
    if (isEnd) {
      this.endPosition.x += dx;
      this.endPosition.y += dy;
    } else {
      this.position.x += dx;
      this.position.y += dy;
    }
    // Update connected relationships after moving
    this.updateConnectedRelationships();
  }

  // Modified draw method to handle angled lines
  draw(ctx: CanvasRenderingContext2D) {
    drawLine(
      ctx,
      this.position.x,
      this.position.y,
      this.endPosition.x,
      this.endPosition.y,
      this.lineColor,
      this.lineStyle,
      this.lineWidth
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
    const tolerance = this.lineWidth;
    return distanceToSegment <= tolerance;
  }

  toggleHover(toggle: boolean) {
    console.log("Toggling hover for relationship", this.id, "to", toggle);
    this.lineWidth = toggle
      ? DrawingConstants.LINE_WIDTH * 2
      : DrawingConstants.LINE_WIDTH;
    console.log("New line width:", this.lineWidth);

    eventBus.emit("updatedDrawable", this);
  }
}

class SelectionBox extends DrawableObject {
  selectedObject: DrawableObject | null = null;

  constructor() {
    super(
      0,
      0, // Initial position is irrelevant
      "selector"
    );
  }

  setSelection(selectedObject: DrawableObject | null) {
    this.position.x = selectedObject
      ? selectedObject.position.x - DrawingConstants.SELECTOR_PADDING
      : 0;
    this.position.y = selectedObject
      ? selectedObject.position.y - DrawingConstants.SELECTOR_PADDING
      : 0;

    this.selectedObject = selectedObject;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // draw a thin rectangle around the selected node
    if (this.selectedObject instanceof DrawableNode) {
      const topLeftCorner = {
        y: this.selectedObject.position.y - this.selectedObject.height / 2,
        x: this.selectedObject.position.x,
      };
      topLeftCorner.x -= DrawingConstants.SELECTOR_PADDING;
      topLeftCorner.y -= DrawingConstants.SELECTOR_PADDING;

      drawRoundedRect(
        ctx,
        topLeftCorner.x,
        topLeftCorner.y,
        this.selectedObject.width + 2 * DrawingConstants.SELECTOR_PADDING,
        this.selectedObject.height + 2 * DrawingConstants.SELECTOR_PADDING,
        DrawingConstants.DEFAULT_RADIUS,
        undefined,
        DrawingConstants.LINE_WIDTH,
        "transparent",
        "blue"
      );
    }
    // Draw two parallel lines above and below the relationship line
    else if (this.selectedObject instanceof DrawableRelationship) {
      const { x: x1, y: y1 } = this.selectedObject.position;
      const { x: x2, y: y2 } = this.selectedObject.endPosition;

      // Calculate the angle of the line
      const angle = Math.atan2(y2 - y1, x2 - x1);

      // Calculate the perpendicular offsets for parallel lines
      const perpX = Math.sin(angle) * DrawingConstants.SELECTOR_PADDING;
      const perpY = -Math.cos(angle) * DrawingConstants.SELECTOR_PADDING;

      // Calculate the points for the upper parallel line
      const upperLine1 = {
        x: x1 + perpX,
        y: y1 + perpY,
      };
      const upperLine2 = {
        x: x2 + perpX,
        y: y2 + perpY,
      };

      // Calculate the points for the lower parallel line
      const lowerLine1 = {
        x: x1 - perpX,
        y: y1 - perpY,
      };
      const lowerLine2 = {
        x: x2 - perpX,
        y: y2 - perpY,
      };

      // Draw both parallel lines
      drawLine(
        ctx,
        upperLine1.x,
        upperLine1.y,
        upperLine2.x,
        upperLine2.y,
        "blue",
        LineStyle.SOLID,
        DrawingConstants.LINE_WIDTH
      );
      drawLine(
        ctx,
        lowerLine1.x,
        lowerLine1.y,
        lowerLine2.x,
        lowerLine2.y,
        "blue",
        LineStyle.SOLID,
        DrawingConstants.LINE_WIDTH
      );
    }
  }

  isInShape() {
    return false;
  }
  toggleHover() {}
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
  isFocalPoint: boolean = false;
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
    const drawableNode = new DrawableNode(fromX, fromY, this);
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

      const childRelationshipDrawable = childRelationship.calculateLayout(
        { ctx, ...childRelationshipStart },
        renderList
      );

      drawableNode.startRelationships.push(childRelationshipDrawable);

      // Draw the current descendant
      const childNode = childRelationship.toNode.calculateLayoutAsDescendant(
        {
          ctx,
          x: childRelationshipStart.x,
          y: childRelationshipStart.y + DrawingConstants.SPACER_HEIGHT,
        },
        renderList
      );
      childNode.endRelationships.push(childRelationshipDrawable);

      // Update position for the next relationship and descendant
      childRelationshipStart.x +=
        DrawingConstants.SPACER_WIDTH +
        (childUnitWidth - DrawingConstants.SPACER_WIDTH);
    }

    // Draw the partner relationship, if it exists
    if (this.partnerRelationship && !this.isPartner) {
      const partnerRelationshipDrawable =
        this.partnerRelationship.calculateLayout(
          {
            ctx,
            x: fromX + this.getWidth(),
            y: fromY,
          },
          renderList
        );
      drawableNode.startRelationships.push(partnerRelationshipDrawable);

      // Draw the partner node
      const drawablePartner = this.partnerRelationship.toNode.calculateLayout(
        {
          ctx,
          x: fromX + this.partnerRelationship.getWidth() + this.getWidth(),
          y: fromY,
        },
        renderList
      );
      drawablePartner.endRelationships.push(partnerRelationshipDrawable);
    }

    return drawableNode;
  }

  calculateLayoutAsDescendant(
    { ctx, x: fromX, y: fromY }: CanvasState,
    renderList: DrawableObject[]
  ) {
    // Recalculate to find the left center based on top center
    const leftX = fromX - 0.5 * this.getWidth();
    const topY = fromY + 0.5 * DrawingConstants.DEFAULT_HEIGHT;
    return this.calculateLayout({ ctx, x: leftX, y: topY }, renderList);
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
        const drawableChildRel = childRelationship.calculateLayout(
          { ctx, ...childRelationshipStart },
          renderList
        );

        // Draw the current descendant
        const drawableChild =
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
        // Ensure the drawings are connected
        drawableChild.endRelationships.push(drawableChildRel);

        // Update position for the next relationship and descendant
        childRelationshipStart.x +=
          DrawingConstants.SPACER_WIDTH +
          (childUnitWidth - DrawingConstants.SPACER_WIDTH);
      }
    }
    return drawableRelationship;
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

  calculateLayout(
    { ctx, x: fromX, y: fromY }: CanvasState,
    renderList: DrawableObject[]
  ) {
    const drawableRelationship = super.calculateLayout(
      { ctx, x: fromX, y: fromY },
      renderList
    ) as DrawableRelationship;

    // Connect child relationships to the partner relationship
    for (const childRel of this.childRelationships) {
      const drawableChild = renderList.find(
        (r): r is DrawableRelationship =>
          r instanceof DrawableRelationship && r.relationship.id === childRel.id
      );

      if (drawableChild) {
        drawableRelationship.connectedRelationships.push(drawableChild);
      }
    }

    // Calculate initial connection points
    drawableRelationship.calculateConnectionPoints();

    return drawableRelationship;
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
  if (rootNode) rootNode.calculateLayout({ ctx, x: 200, y: 150 }, renderList);

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

  // Add the selection box that will be updated when an object is selected
  renderList.push(new SelectionBox());

  // Render the objects
  for (const obj of renderList) {
    obj.draw(ctx);
  }

  return renderList;
};

export const redraw = (
  ctx: CanvasRenderingContext2D,
  renderList: DrawableObject[]
): void => {
  for (const obj of renderList) {
    obj.draw(ctx);
  }
};

export function isPointInsideObject(
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

export function updateSelectionBox(
  selectedObject: DrawableObject | null,
  renderList: DrawableObject[]
) {
  const selector = renderList.find(
    (obj) => obj.id === "selector"
  ) as SelectionBox;
  // Move the selected node to the front of the render list
  if (selectedObject instanceof DrawableNode) {
    renderList.splice(renderList.indexOf(selectedObject), 1);
    renderList.push(selectedObject);
  }
  selector.setSelection(selectedObject);
  eventBus.emit("updatedDrawable", selector);
}
