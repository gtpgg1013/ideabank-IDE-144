const MAX_TASK_LENGTH = 120;

function sanitizeTaskText(input) {
  return String(input ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TASK_LENGTH);
}

function createItem(text) {
  const title = sanitizeTaskText(text);
  if (!title) {
    throw new Error("Task text is required");
  }

  return {
    id: `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    text: title,
    completed: false,
    createdAt: new Date().toISOString()
  };
}

function addItem(items, text) {
  return [createItem(text), ...items];
}

function toggleItem(items, id) {
  return items.map((item) => (
    item.id === id ? { ...item, completed: !item.completed } : item
  ));
}

function removeItem(items, id) {
  return items.filter((item) => item.id !== id);
}

module.exports = {
  MAX_TASK_LENGTH,
  addItem,
  createItem,
  removeItem,
  sanitizeTaskText,
  toggleItem
};
