/**
 * File to set up the event bus between the Canvas component and canvasUtils
 * functions.
 */

import mitt from "mitt";
const eventBus = mitt();
export default eventBus;
