import { useState } from "react";
import "./TodoBoard.css";

type Status = "no_status" | "not_started" | "in_progress" | "completed";

interface Todo {
  id: number;
  text: string;
  status: Status;
}

export default function TodoBoard() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: "POLÍCIA PENAL", status: "not_started" },
    { id: 2, text: "TJDFT", status: "in_progress" },
    { id: 3, text: "MINISTÉRIO DA ECONOMIA", status: "completed" },
  ]);

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [newTodo, setNewTodo] = useState("");

  function handleDrop(status: Status) {
    if (draggedId === null) return;

    setTodos(prev =>
      prev.map(todo =>
        todo.id === draggedId ? { ...todo, status } : todo
      )
    );
    setDraggedId(null);
  }

  function addTodo() {
    if (!newTodo.trim()) return;

    setTodos(prev => [
      ...prev,
      { id: Date.now(), text: newTodo, status: "no_status" },
    ]);
    setNewTodo("");
  }

  function removeTodo(id: number) {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  }

  function renderColumn(title: string, status: Status) {
    return (
      <div
        className="status"
        onDragOver={e => e.preventDefault()}
        onDrop={() => handleDrop(status)}
      >
        <h2>{title}</h2>

        {todos
          .filter(todo => todo.status === status)
          .map(todo => (
            <div
              key={todo.id}
              className="todo"
              draggable
              onDragStart={() => setDraggedId(todo.id)}
            >
              <span>{todo.text}</span>
              <span className="close" onClick={() => removeTodo(todo.id)}>
                ×
              </span>
            </div>
          ))}
      </div>
    );
  }

  return (
    <div className="container">
      {/* HEADER */}
      <div className="todo-header">
        <input
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          placeholder="Novo Todo"
        />
        <button onClick={addTodo}>Adicionar</button>
      </div>

      {/* BOARD */}
      <div className="todo-container">
        {renderColumn("No Status", "no_status")}
        {renderColumn("Not Started", "not_started")}
        {renderColumn("In Progress", "in_progress")}
        {renderColumn("Completed", "completed")}
      </div>
    </div>
  );
}
