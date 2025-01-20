/**
 * File holding miscellaneous types shared across different components.
 */

/**
 * Enum for the different types of available context menus.
 */
export enum ContextMenuType {
  NODE,
  TREE,
  PARTNER_REL,
  PARENT_REL,
  CANVAS,
}

/**
 * Enum for the different types of context menu events.
 */
export enum ContextMenuEvent {
  RENAME = "rename",
  DELETE = "delete",
  ADD_NODE = "add-node",
  CONNECT = "connect",
  EDIT = "edit",
  VIEW = "view",
  PUBLIC = "toggle-public",
}

/**
 * Enum for the different types relationships that can be suggested.
 */
export enum SuggestionType {
  PARENT,
  CHILD,
  PARTNER,
}
