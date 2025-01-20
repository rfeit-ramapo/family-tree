/**
 * File for providing the logic for drawing the family tree on the canvas.
 */

import defaultPerson from "../assets/default_person.svg";
import eventBus from "./eventBus";
import {
  memberToNode,
  treeToNodes,
  type TreeMember,
  type TreeWithMembers,
} from "./treeToNodes";

/**
 * Holds information about the canvas rendering context and
 * the current position of the cursor while drawing.
 */
interface CanvasState {
  // The canvas rendering context
  ctx: CanvasRenderingContext2D;
  // The current x coordinate
  x: number;
  // The current y coordinate
  y: number;
}

/**
 * Represents a position on the canvas.
 */
export interface Position {
  // The x coordinate for this position
  x: number;
  // The y coordinate for this position
  y: number;
}

/**
 * Holds drawing constants used for rendering nodes and relationships.
 * Easily changed for different drawing styles.
 */
abstract class DrawingConstants {
  // The default width to draw objects
  static readonly DEFAULT_WIDTH = 125;
  // The default height to draw objects
  static readonly DEFAULT_HEIGHT = 200;
  // The default radius used for rounding rectangle corners
  static readonly DEFAULT_RADIUS = 20;
  // The default spacer width between objects
  static readonly SPACER_WIDTH = this.DEFAULT_WIDTH / 2;
  // The default spacer height between objects
  static readonly SPACER_HEIGHT = this.DEFAULT_HEIGHT * 0.75;
  // The default line width used for drawing lines
  static readonly LINE_WIDTH = 5;
  // The padding around the selected object
  static readonly SELECTOR_PADDING = 10;
}

/**
 * Represents a drawable object on the canvas.
 */
export abstract class DrawableObject {
  // The position of the object on the canvas
  position: { x: number; y: number };
  // The unique identifier for this object
  id: string;

  constructor(x: number, y: number, id: string) {
    this.position = { x, y };
    this.id = id;
  }

  // Abstract methods; defined in subclasses
  abstract draw(ctx: CanvasRenderingContext2D): void;
  abstract isInShape(point: { x: number; y: number }): boolean;
  abstract toggleHover(toggle: boolean): void;

  // Default implementation for moving an object
  move(dx: number, dy: number) {
    // Do not move unless overridden in subclasses
    return;
  }
}

/**
 * Represents a drawable node on the canvas.
 */
export class DrawableNode extends DrawableObject {
  // The width of the node
  width: number;
  // The height of the node
  height: number;
  // The radius for rounding the corners of the node
  radius: number;
  // The name to display on the node
  displayName: string;
  // The URL for the image to display on the node
  displayImageURL: string | null;
  // The line width for the border of the node
  lineWidth: number = DrawingConstants.LINE_WIDTH;
  // The border color for the node
  borderColor: string;
  // The fill color for the node
  fillColor: string;
  // The node object associated with this drawable node
  node: Node;
  // The image to display on the node
  image: HTMLImageElement;
  // The relationships originating from this node
  startRelationships: DrawableRelationship[] = [];
  // The relationships ending at this node
  endRelationships: DrawableRelationship[] = [];

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
    this.loadImage(node.displayImageURL ?? defaultPerson);
  }

  /**
   * NAME: loadImage
   *
   * SYNOPSIS: loadImage(url: string)
   *    url --> the URL of the image to load
   *
   * DESCRIPTION: Loads an image from the provided URL and sets it as the image property of this object.
   *
   * RETURNS: void
   */
  private loadImage(url: string) {
    // Prepend the server URL for relative URLs
    if (url !== defaultPerson && !url.startsWith("http")) {
      url = `${import.meta.env.VITE_SERVER_URL}${url}`;
    }
    this.image = new Image();
    this.image.src = url;
    this.image.onload = () => {
      eventBus.emit("updatedDrawable", this);
    };
    this.image.onerror = () => {
      console.error("Failed to load image:", url);
      if (url !== defaultPerson) {
        this.loadImage(defaultPerson);
      }
    };
  }
  /* loadImage */

  /**
   * NAME: draw
   *
   * SYNOPSIS: draw(ctx: CanvasRenderingContext2D)
   *    ctx --> the rendering context for the canvas
   *
   * DESCRIPTION: Draws the node on the canvas using the provided rendering context.
   *
   * RETURNS: void
   */
  draw(ctx: CanvasRenderingContext2D) {
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
    }

    this.drawText(ctx);
  }

  /**
   * NAME: drawImage
   *
   * SYNOPSIS: drawImage(ctx: CanvasRenderingContext2D)
   *    ctx --> the rendering context for the canvas
   *
   * DESCRIPTION: Draws the image on the node using the provided rendering context.
   *
   * RETURNS: void
   */
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

  /**
   * NAME: drawText
   *
   * SYNOPSIS: drawText(ctx: CanvasRenderingContext2D)
   *    ctx --> the rendering context for the canvas
   *
   * DESCRIPTION: Draws the text label on the node using the provided rendering context.
   *
   * RETURNS: void
   */
  drawText(ctx: CanvasRenderingContext2D) {
    // Draw the text label in the bottom third of the node
    const bottomThirdHeight = this.height / 3;
    const textY = this.position.y + this.height / 2 - bottomThirdHeight / 2;

    ctx.font = "16px Arial";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";

    // Split the name into two lines if it contains a space
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
  /* drawText */

  /**
   * NAME: isInShape
   *
   * SYNOPSIS: isInShape(point: { x: number; y: number }): boolean
   *    point --> the point to check if it is inside the node
   *
   * DESCRIPTION: Checks if the provided point is inside the node.
   *
   * RETURNS: boolean
   */
  isInShape({ x, y }: { x: number; y: number }): boolean {
    const upperBound = this.position.y - this.height / 2;
    const lowerBound = this.position.y + this.height / 2;
    const leftBound = this.position.x;
    const rightBound = this.position.x + this.width;

    return (
      x >= leftBound && x <= rightBound && y >= upperBound && y <= lowerBound
    );
  }
  /* isInShape */

  /**
   * NAME: toggleHover
   *
   * SYNOPSIS: toggleHover(toggle: boolean)
   *    toggle --> a boolean indicating whether the node is being hovered over
   *
   * DESCRIPTION: Toggles the hover effect on the node.
   *
   * RETURNS: void
   */
  toggleHover(toggle: boolean) {
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
  /* toggleHover */

  /**
   * NAME: move
   *
   * SYNOPSIS: move(dx: number, dy: number)
   *    dx --> the change in x position
   *    dy --> the change in y position
   *
   * DESCRIPTION: Moves the node by the provided change in x and y positions.
   *
   * RETURNS: void
   */
  move(dx: number, dy: number) {
    this.position.x += dx;
    this.position.y += dy;

    // Move the connected relationships
    for (const relationship of this.startRelationships) {
      relationship.move(dx, dy);
    }
    for (const relationship of this.endRelationships) {
      relationship.move(dx, dy, true);
    }
  }
  /* move */

  /**
   * NAME: replaceImage
   *
   * SYNOPSIS: replaceImage(newImageUrl: string)
   *   newImageUrl --> the URL of the new image to display on the node
   *
   * DESCRIPTION: Replaces the current image on the node with the image at the provided URL.
   *
   * RETURNS: void
   */
  replaceImage(newImageUrl: string) {
    const replacement = newImageUrl === "" ? defaultPerson : newImageUrl;
    this.loadImage(replacement);
  }

  /**
   * NAME: replaceName
   *
   * SYNOPSIS: replaceName(newName: string)
   *   newName --> the new name to display on the node
   *
   * DESCRIPTION: Replaces the current name on the node with the provided name.
   *
   * RETURNS: void
   */
  replaceName(newName: string) {
    this.displayName = newName;
    eventBus.emit("updatedDrawable", this);
  }
}

/**
 * Represents a drawable relationship on the canvas.
 */
export class DrawableRelationship extends DrawableObject {
  // The relationship object associated with this drawable relationship
  relationship: Relationship;
  // The end position of the relationship line
  endPosition: { x: number; y: number };
  // The color of the line
  lineColor: string;
  // The style of the line
  lineStyle: LineStyle;
  // The width of the line
  lineWidth: number = DrawingConstants.LINE_WIDTH;
  // The relationships connected to this relationship
  connectedRelationships: DrawableRelationship[] = [];
  // For ParentsRelationships, the relative position along the partner line
  connectionPoint: number | null = null;

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

  /**
   * NAME: calculateConnectionPoints
   *
   * SYNOPSIS: calculateConnectionPoints()
   *
   * DESCRIPTION: Calculates the connection points for child relationships of a PartnerRelationship.
   *
   * RETURNS: void
   */
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
  /* calculateConnectionPoints */

  /**
   * NAME: updateConnectedRelationships
   *
   * SYNOPSIS: updateConnectedRelationships()
   *
   * DESCRIPTION: Updates the positions of connected relationships when the partner line moves.
   *
   * RETURNS: void
   */
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
  /* updateConnectedRelationships */

  /**
   * NAME: move
   *
   * SYNOPSIS: move(dx: number, dy: number, isEnd: boolean = false)
   *    dx --> the change in x position
   *    dy --> the change in y position
   *    isEnd --> a boolean indicating whether the end position should be moved
   *
   * DESCRIPTION: Moves the relationship by the provided change in x and y positions.
   *
   * RETURNS: void
   */
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
  /* move */

  /**
   * NAME: draw
   *
   * SYNOPSIS: draw(ctx: CanvasRenderingContext2D)
   *   ctx --> the rendering context for the canvas
   *
   * DESCRIPTION: Draws the relationship on the canvas using the provided rendering context.
   *
   * RETURNS: void
   */
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
  /* draw */

  /**
   * NAME: isInShape
   *
   * SYNOPSIS: isInShape(point: { x: number; y: number }): boolean
   *    point --> the point to check if it is inside the relationship
   *
   * DESCRIPTION: Checks if the provided point is inside the relationship.
   *
   * RETURNS: boolean
   */
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
  /* isInShape */

  /**
   * NAME: toggleHover
   *
   * SYNOPSIS: toggleHover(toggle: boolean)
   *    toggle --> a boolean indicating whether the relationship is being hovered over
   *
   * DESCRIPTION: Toggles the hover effect on the relationship.
   *
   * RETURNS: void
   */
  toggleHover(toggle: boolean) {
    this.lineWidth = toggle
      ? DrawingConstants.LINE_WIDTH * 2
      : DrawingConstants.LINE_WIDTH;

    eventBus.emit("updatedDrawable", this);
  }
  /* toggleHover */
}

/**
 * Represents a selection box drawn around another object.
 */
class SelectionBox extends DrawableObject {
  // The object that is currently selected
  selectedObject: DrawableObject | null = null;

  constructor() {
    super(
      // Initial position is irrelevant
      0,
      0,
      "selector"
    );
  }

  /**
   * NAME: setSelection
   *
   * SYNOPSIS: setSelection(selectedObject: DrawableObject | null)
   *    selectedObject --> the object to set as selected
   *
   * DESCRIPTION: Sets the selected object and updates the position of the selection box.
   *
   * RETURNS: void
   */
  setSelection(selectedObject: DrawableObject | null) {
    this.position.x = selectedObject
      ? selectedObject.position.x - DrawingConstants.SELECTOR_PADDING
      : 0;
    this.position.y = selectedObject
      ? selectedObject.position.y - DrawingConstants.SELECTOR_PADDING
      : 0;

    this.selectedObject = selectedObject;
  }
  /* setSelection */

  /**
   * NAME: draw
   *
   * SYNOPSIS: draw(ctx: CanvasRenderingContext2D)
   *    ctx --> the rendering context for the canvas
   *
   * DESCRIPTION: Draws the selection box around the selected object.
   *
   * RETURNS: void
   */
  draw(ctx: CanvasRenderingContext2D) {
    // Draw a thin rectangle around a selected node
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
  /* draw */

  /**
   * NAME: isInShape
   *
   * SYNOPSIS: isInShape(point: { x: number; y: number }): boolean
   *    point --> the point to check if it is inside the selection box
   *
   * DESCRIPTION: Checks if the provided point is inside the selection box.
   *
   * RETURNS: boolean
   */
  isInShape() {
    return false;
  }
  /* isInShape */

  /**
   * NAME: toggleHover
   *
   * SYNOPSIS: toggleHover(toggle: boolean)
   *    toggle --> a boolean indicating whether the selection box is being hovered over
   *
   * DESCRIPTION: Toggles the hover effect on the selection box.
   *
   * RETURNS: void
   */
  toggleHover() {}
  /* toggleHover */
}

/**
 * Represents an object that can be drawn on the canvas.
 */
abstract class CanvasObject {
  // Function to calculate the layout of this object and add it to the render list
  abstract calculateLayout(
    canvasState: CanvasState,
    renderList: DrawableObject[]
  ): void;
}

/**
 * Represents a node that can be drawn on the canvas.
 */
export class Node extends CanvasObject {
  // The unique identifier for this node
  id: string;
  // The name to display on the node
  displayName: string;
  // The URL for the image to display on the node
  displayImageURL: string | null;
  // The children directly connected to this node
  childRelationships: ParentRelationship[];
  // The parents directly connected to this node
  parentRelationships: ParentRelationship[];
  // The partner connected to this node
  partnerRelationship: PartnerRelationship | null;
  // A boolean indicating whether this node is the second partner in a pair
  isPartner: boolean;
  // A boolean indicating whether this node is the focal point of the tree
  isFocalPoint: boolean = false;
  // A string indicating the gender of the person this node represents
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

  /**
   * NAME: getWidth
   *
   * SYNOPSIS: getWidth(): number
   *
   * DESCRIPTION: Calculates the width required to draw this node based on its children.
   *
   * RETURNS: number
   */
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

  /**
   * NAME: getUnitWidth
   *
   * SYNOPSIS: getUnitWidth(): number
   *
   * DESCRIPTION: Calculates the width of this node plus their partner.
   *
   * RETURNS: number
   */
  getUnitWidth() {
    if (this.partnerRelationship)
      return this.partnerRelationship.getUnitWidth();
    else return this.getWidth();
  }

  /**
   * NAME: calculateLayout
   *
   * SYNOPSIS: calculateLayout(canvasState: CanvasState, renderList: DrawableObject[])
   *    canvasState --> the current canvas state
   *    renderList --> the list of objects to render on the canvas
   *
   * DESCRIPTION: Calculates the layout for this node and adds it to the render list.
   *
   * RETURNS: void
   */
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
  /* calculateLayout */

  /**
   * NAME: calculateLayoutAsDescendant
   *
   * SYNOPSIS: calculateLayoutAsDescendant(canvasState: CanvasState, renderList: DrawableObject[])
   *    canvasState --> the current canvas state
   *    renderList --> the list of objects to render on the canvas
   *
   * DESCRIPTION: Calculates the layout for this node as a descendant and adds it to the render list. Descendant nodes are drawn from the top instead of the left.
   *
   * RETURNS: void
   */
  calculateLayoutAsDescendant(
    { ctx, x: fromX, y: fromY }: CanvasState,
    renderList: DrawableObject[]
  ) {
    // Recalculate to find the left center based on top center
    const leftX = fromX - 0.5 * this.getWidth();
    const topY = fromY + 0.5 * DrawingConstants.DEFAULT_HEIGHT;
    return this.calculateLayout({ ctx, x: leftX, y: topY }, renderList);
  }
  /* calculateLayoutAsDescendant */
}

/**
 * Represents the direction of a relationship.
 */
enum RelationshipDirection {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

/**
 * Represents the type of a relationship.
 */
export enum RelationshipType {
  PARENT = "parent",
  PARTNER = "partner",
}

/**
 * Represents a relationship between two nodes.
 */
export abstract class Relationship extends CanvasObject {
  // The unique identifier for this relationship
  id: string;
  // The title of this relationship (e.g. "Daughter")
  displayName: string;
  // The nodes that this relationship originates from
  fromNodes: Node[];
  // The node that this relationship points to
  toNode: Node;
  // The direction of the relationship (horizontal or vertical)
  direction: RelationshipDirection;
  // The type of the relationship (parent or partner)
  type: RelationshipType;
  // A boolean indicating whether this relationship is an ex-partner
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

  /**
   * NAME: calculateLayout
   *
   * SYNOPSIS: calculateLayout(canvasState: CanvasState, renderList: DrawableObject[])
   *    canvasState --> the current canvas state
   *    renderList --> the list of objects to render on the canvas
   *
   * DESCRIPTION: Calculates the layout for this relationship and adds it to the render list.
   *
   * RETURNS: void
   */
  calculateLayout(
    { ctx, x: fromX, y: fromY }: CanvasState,
    renderList: DrawableObject[]
  ) {
    // Parent-child relationships are black, partner relationships are red
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
  /* calculateLayout */

  // getLength is implemented by subclasses
  abstract getLength(): number;
}

/**
 * Represents a parent-child relationship between two nodes.
 */
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

  /**
   * NAME: getLength
   *
   * SYNOPSIS: getLength(): number
   *
   * DESCRIPTION: Calculates the length of this relationship based on the type of relationship.
   * Child relationships are always drawn using the spacer height.
   *
   * RETURNS: number
   */
  getLength() {
    return DrawingConstants.SPACER_HEIGHT;
  }
}

/**
 * Represents a relationship springing from a partnership.
 * The "fromNodes" are the two parents, with the "toNode" being
 * their shared child.
 */
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

  /**
   * NAME: getLength
   *
   * SYNOPSIS: getLength(): number
   *
   * DESCRIPTION: Calculates the length of this relationship based on the type of relationship.
   * Parent relationships are always drawn using the spacer height and half the default height.
   *
   * RETURNS: number
   */
  getLength() {
    return (
      DrawingConstants.SPACER_HEIGHT + DrawingConstants.DEFAULT_HEIGHT * 0.5
    );
  }
}

/**
 * Represents a relationship between two partners.
 */
export class PartnerRelationship extends Relationship {
  // The child relationships springing from this partnership
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

  /**
   * NAME: getLength
   *
   * SYNOPSIS: getLength(): number
   *
   * DESCRIPTION: Calculates the length of this relationship based on the
   * number of children that need to be drawn below it.
   *
   * RETURNS: number
   */
  getWidth() {
    // Use default width if no children are present
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
  /* getWidth */

  /**
   * NAME: getUnitWidth
   *
   * SYNOPSIS: getUnitWidth(): number
   *
   * DESCRIPTION: Calculates the width of this relationship plus the two partner nodes.
   *
   * RETURNS: number
   */
  getUnitWidth() {
    return (
      this.fromNodes[0].getWidth() + this.toNode.getWidth() + this.getWidth()
    );
  }
  /* getUnitWidth */

  /**
   * NAME: getLength
   *
   * SYNOPSIS: getLength(): number
   *
   * DESCRIPTION: Calculates the length of this relationship. For relationships, this is equal to the width.
   *
   * RETURNS: number
   */
  getLength() {
    return this.getWidth();
  }
  /* getLength */

  /**
   * NAME: calculateLayout
   *
   * SYNOPSIS: calculateLayout(canvasState: CanvasState, renderList: DrawableObject[])
   *    canvasState --> the current canvas state
   *    renderList --> the list of objects to render on the canvas
   *
   * DESCRIPTION: Calculates the layout for this relationship and adds it to the render list.
   *
   * RETURNS: void
   */
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
  /* calculateLayout */
}

/**
 * NAME: drawRoundedRect
 *
 * SYNOPSIS: drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, imgURL: string = "../assets/default_person.svg", borderWidth: number = DrawingConstants.LINE_WIDTH, rectColor: string = "lightgray", borderColor: string = "black")
 *   ctx --> the rendering context for the canvas
 *   x --> the x-coordinate of the top-left corner of the rectangle
 *   y --> the y-coordinate of the top-left corner of the rectangle
 *   width --> the width of the rectangle
 *   height --> the height of the rectangle
 *   radius --> the radius of the rounded corners
 *   imgURL --> the URL of the image to display on the rectangle
 *   borderWidth --> the width of the border
 *   rectColor --> the color of the rectangle
 *   borderColor --> the color of the border
 *
 * DESCRIPTION: Draws a rounded rectangle on the canvas with the provided parameters.
 *
 * RETURNS: void
 */
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
  // Save the canvas state for later restoration
  ctx.save();

  ctx.fillStyle = rectColor;

  // Begin path in top left corner
  ctx.beginPath();
  ctx.moveTo(x + radius, y);

  // Draw the top edge and top-right corner
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);

  // Draw the right edge and bottom-right corner
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);

  // Draw the bottom edge and bottom-left corner
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);

  // Draw the left edge and top-left corner
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);

  // Close the path
  ctx.closePath();

  // Fill the rectangle with the fill color
  ctx.fill();

  // Set the border color and width, then stroke the path
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = borderColor; // Border color
  ctx.stroke();

  // Restore the canvas state
  ctx.restore();
};
/* drawRoundedRect */

/**
 * NAME: drawRoundedRectFromLeft
 *
 * SYNOPSIS: drawRoundedRectFromLeft(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, imgURL: string = "../assets/default_person.svg", borderWidth: number = DrawingConstants.LINE_WIDTH, rectColor: string = "lightgray", borderColor: string = "black")
 *   ctx --> the rendering context for the canvas
 *   x --> the x-coordinate of the top-left corner of the rectangle
 *   y --> the y-coordinate of the top-left corner of the rectangle
 *   width --> the width of the rectangle
 *   height --> the height of the rectangle
 *   radius --> the radius of the rounded corners
 *   imgURL --> the URL of the image to display on the rectangle
 *   borderWidth --> the width of the border
 *   rectColor --> the color of the rectangle
 *   borderColor --> the color of the border
 *
 * DESCRIPTION: Draws a rounded rectangle on the canvas from the center-left with the provided parameters.
 *
 * RETURNS: void
 */

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
/* drawRoundedRectFromLeft */

/**
 * NAME: drawRoundedRectFromCenter
 *
 * SYNOPSIS: drawRoundedRectFromCenter(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, imgURL: string = "../assets/default_person.svg", borderWidth: number = DrawingConstants.LINE_WIDTH, rectColor: string = "lightgray", borderColor: string = "black")
 *   ctx --> the rendering context for the canvas
 *   x --> the x-coordinate of the center of the rectangle
 *   y --> the y-coordinate of the center of the rectangle
 *   width --> the width of the rectangle
 *   height --> the height of the rectangle
 *   radius --> the radius of the rounded corners
 *   imgURL --> the URL of the image to display on the rectangle
 *   borderWidth --> the width of the border
 *   rectColor --> the color of the rectangle
 *   borderColor --> the color of the border
 *
 * DESCRIPTION: Draws a rounded rectangle on the canvas from the center of the rectangle with the provided parameters.
 *
 * RETURNS: void
 */
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
/* drawRoundedRectFromCenter */

/**
 * Represents possible line styles for drawing lines on the canvas.
 */
enum LineStyle {
  SOLID = "solid",
  DOTTED = "dotted",
}

/**
 * NAME: drawLine
 *
 * SYNOPSIS: drawLine(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string = "black", style: LineStyle = LineStyle.SOLID, lineWidth: number = DrawingConstants.LINE_WIDTH)
 *    ctx --> the rendering context for the canvas
 *    fromX --> the x-coordinate of the starting point
 *    fromY --> the y-coordinate of the starting point
 *    toX --> the x-coordinate of the ending point
 *    toY --> the y-coordinate of the ending point
 *    color --> the color of the line
 *    style --> the style of the line (solid or dotted)
 *    lineWidth --> the width of the line
 *
 * DESCRIPTION: Draws a line on the canvas with the provided parameters.
 *
 * RETURNS: void
 */
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
  // Save the current canvas state for later restoration
  ctx.save();

  // Set line style, color, and width
  ctx.setLineDash(style === LineStyle.DOTTED ? [5, 5] : []); // Set line style
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  // Draw the line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Restore the canvas state
  ctx.restore();
};
/* drawLine */

/**
 * NAME: drawObjects
 *
 * SYNOPSIS: drawObjects(ctx: CanvasRenderingContext2D, tree: TreeWithMembers) => DrawableObject[]
 *    ctx --> the rendering context for the canvas
 *    tree --> the tree to draw on the canvas
 *
 * DESCRIPTION: Calculates the layout of each node and creates a reusable render list.
 * Then, draws the nodes and relationships on the canvas.
 *
 * RETURNS: An array of DrawableObject objects representing the nodes and relationships drawn on the canvas. This can be used to redraw the canvas with adjustments later.
 */
export const drawObjects = (
  ctx: CanvasRenderingContext2D,
  tree: TreeWithMembers
) => {
  // Convert the tree to nodes and relationships
  const rootNode = treeToNodes(tree);

  // Fill the render list starting from the above returned node
  const renderList: DrawableObject[] = [];
  if (rootNode) rootNode.calculateLayout({ ctx, x: 200, y: 150 }, renderList);

  // Sort renderList: DrawableRelationship objects first, DrawableNode objects last
  // Among DrawableRelationship objects, PartnerRelationship is sorted last
  renderList.sort((a, b) => {
    const isRelationshipA = a instanceof DrawableRelationship;
    const isRelationshipB = b instanceof DrawableRelationship;

    const isNodeA = a instanceof DrawableNode;
    const isNodeB = b instanceof DrawableNode;

    // Relationships come before nodes
    if (isRelationshipA && isNodeB) {
      return -1;
    }
    if (isNodeA && isRelationshipB) {
      return 1;
    }

    // Sort DrawableRelationship objects
    if (isRelationshipA && isRelationshipB) {
      const isPartnerA = a.relationship instanceof PartnerRelationship;
      const isPartnerB = b.relationship instanceof PartnerRelationship;

      // Partner relationships come last
      if (isPartnerA && !isPartnerB) {
        return 1;
      }
      if (!isPartnerA && isPartnerB) {
        return -1;
      }
    }
    // Any other case, the order doesn't matter
    return 0;
  });

  // Add the selection box that will be updated when an object is selected
  renderList.push(new SelectionBox());

  // Render the objects
  for (const obj of renderList) {
    obj.draw(ctx);
  }

  return renderList;
};
/* drawObjects */

/**
 * NAME: redraw
 *
 * SYNOPSIS: redraw(ctx: CanvasRenderingContext2D, renderList: DrawableObject[]) => void
 *   ctx --> the rendering context for the canvas
 *   renderList --> the list of objects to redraw on the canvas
 *
 * DESCRIPTION: Redraws all objects in the render list given a rendering context.
 *
 * RETURNS: void
 */
export const redraw = (
  ctx: CanvasRenderingContext2D,
  renderList: DrawableObject[]
) => {
  for (const obj of renderList) {
    obj.draw(ctx);
  }
};
/* redraw */

/**
 * NAME: isPointInsideObject
 *
 * SYNOPSIS: isPointInsideObject(clickPosition: { x: number; y: number }, renderList: DrawableObject[]) => DrawableObject | null
 *    clickPosition --> the point to check if it is inside an object
 *    renderList --> the list of objects to check if the point is inside
 *
 * DESCRIPTION: Determines if a point is inside a drawable object in the render list.
 *
 * RETURNS: The drawable object that contains the point, or null if no object contains the point.
 */
export function isPointInsideObject(
  clickPosition: { x: number; y: number },
  renderList: DrawableObject[]
) {
  // Loop through the render list and check if the click position is inside any drawable object
  for (const drawable of renderList) {
    if (drawable.isInShape(clickPosition)) {
      return drawable;
    }
  }
  return null;
}
/* isPointInsideObject */

/**
 * NAME: updateSelectionBox
 *
 * SYNOPSIS: updateSelectionBox(selectedObject: DrawableObject | null, renderList: DrawableObject[]) => void
 *    selectedObject --> the object that is currently selected
 *    renderList --> the list of objects to render on the canvas
 */
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
/* updateSelectionBox */

/**
 * NAME: addMemberToDrawing
 *
 * SYNOPSIS: addMemberToDrawing(member: TreeMember, renderList: DrawableObject[], canvasState: CanvasState) => DrawableNode
 *  member --> the tree member to add to the drawing
 *  renderList --> the list of objects to render on the canvas
 *  canvasState --> the current canvas state
 */
export function addMemberToDrawing(
  member: TreeMember,
  renderList: DrawableObject[],
  canvasState: CanvasState
) {
  const node = memberToNode(member, false);
  const drawableNode = node.calculateLayout(
    { ctx: canvasState.ctx, x: canvasState.x, y: canvasState.y },
    renderList
  );
  // Add the node to the beginning of the list so it's rendered on top
  renderList.unshift(drawableNode);
  eventBus.emit("updatedDrawable", drawableNode);
  return drawableNode;
}
/* addMemberToDrawing */
