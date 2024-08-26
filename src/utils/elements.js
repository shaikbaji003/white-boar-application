import roughjs from "roughjs/bin/rough"; // Importing roughjs for generating sketchy graphics
import { toolTypes } from "../constants/constants"; // Importing tool types from constants
import { getArrowHeadsCoordinates, isPointCloseToLine } from "./math"; // Utility functions for drawing
import { getStroke } from "perfect-freehand"; // Utility for generating strokes for brush tool

// Function to create a new rough element based on the selected tool type
export const createRoughElement = (
  id,   // Unique identifier for the element
  x1,   // Starting x-coordinate
  y1,   // Starting y-coordinate
  x2,   // Ending x-coordinate
  y2,   // Ending y-coordinate
  { toolType, strokeColor, fillColor, size }  // Options: tool type, stroke color, fill color, and size
) => {
  const generator = roughjs.generator(); // Create a new roughjs generator instance
  const newItem = {
    id, // Assigning the provided ID to the new element
    x1, // Assigning start x-coordinate
    y1, // Assigning start y-coordinate
    x2, // Assigning end x-coordinate
    y2, // Assigning end y-coordinate
    toolType, // Assigning the selected tool type
  };
  
  // Default options for the roughjs element
  let options = {
    seed: id + 1,   // Seed for generating consistent randomness
    fillStyle: "solid",  // Fill style for shapes
  };

  // Add stroke color if provided
  if (strokeColor) {
    options.stroke = strokeColor;
  }

  // Add fill color if provided
  if (fillColor) {
    options.fill = fillColor;
  }

  // Add stroke width if provided
  if (size) {
    options.strokeWidth = size;
  }

  // Switch based on the tool type to create the appropriate element
  switch (toolType) {
    case toolTypes.LINE:
      newItem.roughEle = generator.line(x1, y1, x2, y2, options);
      return newItem;

    case toolTypes.RECTANGLE:
      newItem.roughEle = generator.rectangle(x1, y1, x2 - x1, y2 - y1, options); // Create rectangle with width and height
      return newItem;

    case toolTypes.CIRCLE:
      const cx = (x1 + x2) / 2, // Calculate center x-coordinate
        cy = (y1 + y2) / 2,     // Calculate center y-coordinate
        width = x2 - x1,        // Calculate width
        height = y2 - y1;       // Calculate height
      newItem.roughEle = generator.ellipse(cx, cy, width, height, options); // Create ellipse (circle)
      return newItem;

    case toolTypes.ARROW:
      const { x3, y3, x4, y4 } = getArrowHeadsCoordinates(x1, y1, x2, y2, 20); // Get arrowhead coordinates
      const coords = [
        [x1, y1],
        [x2, y2],
        [x3, y3],
        [x2, y2],
        [x4, y4],
      ];
      newItem.roughEle = generator.linearPath(coords, options); // Create arrow using linear path
      return newItem;

    case toolTypes.BRUSH:
      const points = [{ x: x1, y: y1 }]; // Initial brush point
      const strokes = getStroke(points); // Generate stroke using perfect-freehand
      const path = getSvgPathFromStroke(strokes); // Convert stroke to SVG path
      const brushElement = {
        id,
        points,
        path: new Path2D(path), // Create path for brush strokes
        strokeColor,
        toolType,
      };
      return brushElement;

    default:
      throw new Error("Select a valid tool type"); // Error handling for unknown tool types
  }
};

// Function to convert a stroke to an SVG path string
export const getSvgPathFromStroke = (stroke) => {
  if (!stroke.length) return ""; // Return empty string if stroke is empty

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2); // Create path points
      return acc;
    },
    ["M", ...stroke[0], "Q"] // Start path with "Move to" and "Quadratic curve"
  );

  d.push("Z"); // Close the path
  return d.join(" "); // Join all parts to create the final path string
};

// Function to check if a point is near an element
export const isPointNearElement = (element, { pointX, pointY }) => {
  const { x1, y1, x2, y2, toolType } = element;
  const context = document.getElementById("canvas").getContext("2d"); // Get canvas context

  // Switch based on the tool type to determine proximity
  switch (toolType) {
    case toolTypes.LINE:
    case toolTypes.ARROW:
      return isPointCloseToLine(x1, y1, x2, y2, pointX, pointY); // Check if point is near the line

    case toolTypes.RECTANGLE:
    case toolTypes.CIRCLE:
      return (
        isPointCloseToLine(x1, y1, x2, y1, pointX, pointY) || // Check proximity to rectangle or circle edges
        isPointCloseToLine(x2, y1, x2, y2, pointX, pointY) ||
        isPointCloseToLine(x2, y2, x1, y2, pointX, pointY) ||
        isPointCloseToLine(x1, y2, x1, y1, pointX, pointY)
      );

    case toolTypes.BRUSH:
      return context.isPointInPath(element.path, pointX, pointY); // Check if point is within brush path
    default:
      throw new Error(`Tool type not recognized: ${toolType}`); // Error handling for unknown tool types
  }
};
