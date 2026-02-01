import { useState } from "react";
import type { KanbanColumn, KanbanItem, KanbanStatus } from "../../services/kanbanTypes";
import "./TodoBoard.css";

type TodoBoardProps = {
  columns: KanbanColumn[];
  items: KanbanItem[];
  onAdd: (text: string) => void | Promise<void>;
  onMove: (itemId: string, status: KanbanStatus) => void | Promise<void>;
  onRemove: (itemId: string) => void | Promise<void>;
  isLoading?: boolean;
};

export default function TodoBoard({ columns, items, onAdd, onMove, onRemove, isLoading }: TodoBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [newTodo, setNewTodo] = useState("");

  function handleDrop(status: KanbanStatus) {
    if (draggedId === null) return;
    onMove(draggedId, status);
    setDraggedId(null);
  }

  async function addTodo() {
    if (!newTodo.trim()) return;
    await onAdd(newTodo.trim());
    setNewTodo("");
  }

  function removeTodo(id: string) {
    onRemove(id);
  }

  function renderColumn(column: KanbanColumn) {
    return (
      <div
        className="status"
        onDragOver={e => e.preventDefault()}
        onDrop={() => handleDrop(column.status)}
      >
        <h2>{column.title}</h2>

        {items
          .filter(item => item.status === column.status)
          .map(item => (
            <div
              key={item.id}
              className="todo"
              draggable
              onDragStart={() => setDraggedId(item.id)}
            >
              <span>{item.text}</span>
              <span className="close" onClick={() => removeTodo(item.id)}>
                ×
              </span>
            </div>
          ))}
      </div>
    );
  }

  return (
    <div className="todo-board">
      {/* HEADER */}
      <div className="todo-header">
        <input
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          placeholder="Novo Todo"
          disabled={isLoading}
        />
        <button onClick={addTodo} disabled={isLoading}>Adicionar</button>
      </div>

      {/* BOARD */}
      <div className="todo-container">
        {columns.map(renderColumn)}
      </div>
    </div>
  );
}
