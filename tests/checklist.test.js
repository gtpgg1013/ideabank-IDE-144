const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MAX_TASK_LENGTH,
  addItem,
  removeItem,
  sanitizeTaskText,
  toggleItem
} = require("../src/checklist");

test("sanitizeTaskText trims and collapses whitespace", () => {
  assert.equal(sanitizeTaskText("  오늘   회의   준비  "), "오늘 회의 준비");
});

test("sanitizeTaskText enforces max length", () => {
  const input = "a".repeat(MAX_TASK_LENGTH + 10);
  assert.equal(sanitizeTaskText(input).length, MAX_TASK_LENGTH);
});

test("addItem prepends a new incomplete task", () => {
  const items = addItem([], "배포 점검");
  assert.ok(Array.isArray(items));
  assert.equal(items.length, 1);
  assert.equal(items[0].text, "배포 점검");
  assert.equal(items[0].completed, false);
});

test("toggleItem flips the completed state for the matching item", () => {
  const items = [{ id: "task-1", text: "문서 업데이트", completed: false }];
  const updated = toggleItem(items, "task-1");
  assert.equal(updated[0].completed, true);
});

test("removeItem deletes the matching task", () => {
  const items = [
    { id: "task-1", text: "A", completed: false },
    { id: "task-2", text: "B", completed: false }
  ];
  const updated = removeItem(items, "task-1");
  assert.deepEqual(updated, [{ id: "task-2", text: "B", completed: false }]);
});
