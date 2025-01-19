export enum ContextMenuType {
  NODE,
  TREE,
  PARTNER_REL,
  PARENT_REL,
  CANVAS,
}

export enum ContextMenuEvent {
  RENAME = "rename",
  DELETE = "delete",
  ADD_NODE = "add-node",
  CONNECT = "connect",
  EDIT = "edit",
  VIEW = "view",
  PUBLIC = "toggle-public",
}

export enum SuggestionType {
  PARENT,
  CHILD,
  PARTNER,
}
