import { useEffect, useMemo, useState } from "react";
import TodoBoard from "../TodoBoard/TodoBoard";
import type { KanbanColumn, KanbanItem, KanbanStatus } from "../../services/kanbanTypes";
import {
  TemplateDTO,
  TemplateFileDTO,
  TemplateResourceDTO,
  TemplateTaskDTO,
  fetchTemplateById,
  fetchTemplateFiles,
  fetchTemplateResources,
  fetchTemplateTasks,
  updateTemplate,
  createTemplateTask,
  updateTemplateTask,
  deleteTemplateTask,
  createTemplateResource,
  updateTemplateResource,
  deleteTemplateResource,
  createTemplateFile,
  updateTemplateFile,
  deleteTemplateFile,
} from "../../services/templatesApi";

const UI_COLUMNS: Array<Omit<KanbanColumn, "projectId">> = [
  { id: "no_status", title: "No Status", status: "no_status", order: 1 },
  { id: "not_started", title: "Not Started", status: "not_started", order: 2 },
  { id: "in_progress", title: "In Progress", status: "in_progress", order: 3 },
  { id: "completed", title: "Completed", status: "completed", order: 4 },
];

const mapTemplateStatusToUi = (status: string): KanbanStatus => {
  switch (status) {
    case "IN_PROGRESS":
      return "in_progress";
    case "DONE":
      return "completed";
    case "BLOCKED":
      return "not_started";
    case "REVIEW":
      return "in_progress";
    case "TODO":
    default:
      return "no_status";
  }
};

const mapUiToTemplateStatus = (status: KanbanStatus): string => {
  switch (status) {
    case "completed":
      return "DONE";
    case "in_progress":
      return "IN_PROGRESS";
    case "not_started":
      return "TODO";
    case "no_status":
    default:
      return "TODO";
  }
};

type TabKey = "tasks" | "content" | "resources" | "files";

type TemplateEditorProps = {
  templateId: string;
  adminId: string;
  onBack: () => void;
};

export default function TemplateEditor({ templateId, adminId, onBack }: TemplateEditorProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("tasks");
  const [template, setTemplate] = useState<TemplateDTO | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TemplateTaskDTO[]>([]);
  const [resources, setResources] = useState<TemplateResourceDTO[]>([]);
  const [files, setFiles] = useState<TemplateFileDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [contentDraft, setContentDraft] = useState("");
  const [metaDraft, setMetaDraft] = useState({ name: "", description: "", level: "", category: "" });
  const [resourceDraft, setResourceDraft] = useState({ title: "", type: "link", content: "", position: 0 });
  const [fileDraft, setFileDraft] = useState({ fileName: "index.html", fileType: "html", content: "", position: 0 });
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const kanbanItems = useMemo<KanbanItem[]>(() => {
    return tasks
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((task) => ({
        id: task.id,
        text: task.title,
        status: mapTemplateStatusToUi(task.status),
        order: task.position,
        projectId: templateId,
      }));
  }, [tasks, templateId]);

  const kanbanColumns = useMemo<KanbanColumn[]>(() => UI_COLUMNS.map((col) => ({ ...col, projectId: templateId })), [templateId]);

  const loadAll = async () => {
    setLoading(true);
    setTemplateError(null);
    try {
      const [templateData, taskData, resourceData, fileData] = await Promise.all([
        fetchTemplateById(templateId),
        fetchTemplateTasks(templateId),
        fetchTemplateResources(templateId),
        fetchTemplateFiles(templateId),
      ]);
      setTemplate(templateData);
      setTasks(taskData);
      setResources(resourceData);
      setFiles(fileData);
      setContentDraft(templateData.blogContent ?? "");
      setMetaDraft({
        name: templateData.name,
        description: templateData.description,
        level: templateData.level,
        category: templateData.category,
      });
      if (fileData.length > 0) {
        setSelectedFileId(fileData[0].id);
      }
    } catch (error) {
      setTemplateError("Não foi possível carregar o template.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, [templateId]);

  const handleSaveMeta = async () => {
    if (!template) return;
    setTemplateError(null);
    try {
      const updated = await updateTemplate(template.id, {
        name: metaDraft.name,
        description: metaDraft.description,
        blogContent: contentDraft,
        level: metaDraft.level,
        category: metaDraft.category,
        adminId,
      });
      setTemplate(updated);
      setContentDraft(updated.blogContent ?? "");
      setMetaDraft({
        name: updated.name,
        description: updated.description,
        level: updated.level,
        category: updated.category,
      });
    } catch (error) {
      setTemplateError("Não foi possível salvar o template.");
    }
  };

  const handleAddTask = async (text: string) => {
    try {
      const created = await createTemplateTask(templateId, {
        title: text,
        description: "",
        status: "TODO",
        position: tasks.length,
        adminId,
      });
      setTasks((prev) => [...prev, created]);
    } catch (error) {
      setTemplateError("Não foi possível criar a tarefa.");
    }
  };

  const handleMoveTask = async (taskId: string, status: KanbanStatus) => {
    const current = tasks.find((task) => task.id === taskId);
    if (!current) return;
    try {
      const updated = await updateTemplateTask(templateId, taskId, {
        title: current.title,
        description: current.description,
        status: mapUiToTemplateStatus(status),
        position: current.position,
        adminId,
      });
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
    } catch (error) {
      setTemplateError("Não foi possível mover a tarefa.");
    }
  };

  const handleEditTask = async (taskId: string, title: string) => {
    const current = tasks.find((task) => task.id === taskId);
    if (!current) return;
    try {
      const updated = await updateTemplateTask(templateId, taskId, {
        title,
        description: current.description,
        status: current.status,
        position: current.position,
        adminId,
      });
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
    } catch (error) {
      setTemplateError("Não foi possível editar a tarefa.");
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    try {
      await deleteTemplateTask(templateId, taskId, adminId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (error) {
      setTemplateError("Não foi possível remover a tarefa.");
    }
  };

  const handleCreateResource = async () => {
    if (!resourceDraft.title.trim()) return;
    try {
      const created = await createTemplateResource(templateId, {
        title: resourceDraft.title,
        type: resourceDraft.type,
        content: resourceDraft.content,
        position: Number(resourceDraft.position) || 0,
        adminId,
      });
      setResources((prev) => [...prev, created]);
      setResourceDraft({ title: "", type: "link", content: "", position: 0 });
    } catch (error) {
      setTemplateError("Não foi possível criar o recurso.");
    }
  };

  const handleUpdateResource = async (resource: TemplateResourceDTO) => {
    try {
      const updated = await updateTemplateResource(templateId, resource.id, {
        title: resource.title,
        type: resource.type,
        content: resource.content,
        position: resource.position,
        adminId,
      });
      setResources((prev) => prev.map((item) => (item.id === resource.id ? updated : item)));
    } catch (error) {
      setTemplateError("Não foi possível atualizar o recurso.");
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    try {
      await deleteTemplateResource(templateId, resourceId, adminId);
      setResources((prev) => prev.filter((item) => item.id !== resourceId));
    } catch (error) {
      setTemplateError("Não foi possível excluir o recurso.");
    }
  };

  const handleCreateFile = async () => {
    if (!fileDraft.fileName.trim()) return;
    try {
      const created = await createTemplateFile(templateId, {
        fileName: fileDraft.fileName,
        fileType: fileDraft.fileType,
        content: fileDraft.content,
        position: Number(fileDraft.position) || 0,
        adminId,
      });
      setFiles((prev) => [...prev, created]);
      setSelectedFileId(created.id);
      setFileDraft({ fileName: "index.html", fileType: "html", content: "", position: 0 });
    } catch (error) {
      setTemplateError("Não foi possível criar o arquivo.");
    }
  };

  const handleUpdateFile = async (file: TemplateFileDTO) => {
    try {
      const updated = await updateTemplateFile(templateId, file.id, {
        fileName: file.fileName,
        fileType: file.fileType,
        content: file.content,
        position: file.position,
        adminId,
      });
      setFiles((prev) => prev.map((item) => (item.id === file.id ? updated : item)));
    } catch (error) {
      setTemplateError("Não foi possível atualizar o arquivo.");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteTemplateFile(templateId, fileId, adminId);
      setFiles((prev) => prev.filter((item) => item.id !== fileId));
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
      }
    } catch (error) {
      setTemplateError("Não foi possível excluir o arquivo.");
    }
  };

  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;

  return (
    <div className="template-editor">
      <div className="template-editor__header">
        <button className="admin-btn admin-btn--ghost" onClick={onBack}>Voltar</button>
        <div>
          <h2>Template</h2>
          {template && <p>Versão {template.version}</p>}
        </div>
        <button className="admin-btn" onClick={handleSaveMeta} disabled={loading}>Salvar</button>
      </div>

      {templateError && <p className="admin-modal__error">{templateError}</p>}

      <div className="template-editor__meta">
        <label>
          <span>Nome</span>
          <input value={metaDraft.name} onChange={(e) => setMetaDraft((prev) => ({ ...prev, name: e.target.value }))} />
        </label>
        <label>
          <span>Descrição</span>
          <input value={metaDraft.description} onChange={(e) => setMetaDraft((prev) => ({ ...prev, description: e.target.value }))} />
        </label>
        <label>
          <span>Nível</span>
          <select value={metaDraft.level} onChange={(e) => setMetaDraft((prev) => ({ ...prev, level: e.target.value }))}>
            <option value="">Selecione</option>
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select>
        </label>
        <label>
          <span>Categoria</span>
          <input value={metaDraft.category} onChange={(e) => setMetaDraft((prev) => ({ ...prev, category: e.target.value }))} />
        </label>
      </div>

      <div className="template-editor__tabs">
        <button className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")}>Tasks</button>
        <button className={activeTab === "content" ? "active" : ""} onClick={() => setActiveTab("content")}>Conteúdo</button>
        <button className={activeTab === "resources" ? "active" : ""} onClick={() => setActiveTab("resources")}>Recursos</button>
        <button className={activeTab === "files" ? "active" : ""} onClick={() => setActiveTab("files")}>Arquivos Base</button>
      </div>

      {activeTab === "tasks" && (
        <TodoBoard
          columns={kanbanColumns}
          items={kanbanItems}
          onAdd={handleAddTask}
          onMove={handleMoveTask}
          onRemove={handleRemoveTask}
          onEdit={handleEditTask}
          isLoading={loading}
        />
      )}

      {activeTab === "content" && (
        <div className="template-editor__content">
          <textarea
            value={contentDraft}
            onChange={(e) => setContentDraft(e.target.value)}
            placeholder="Conteúdo do blog (markdown ou rich text)"
          />
        </div>
      )}

      {activeTab === "resources" && (
        <div className="template-editor__resources">
          <div className="template-editor__resource-form">
            <input
              placeholder="Título"
              value={resourceDraft.title}
              onChange={(e) => setResourceDraft((prev) => ({ ...prev, title: e.target.value }))}
            />
            <select
              value={resourceDraft.type}
              onChange={(e) => setResourceDraft((prev) => ({ ...prev, type: e.target.value }))}
            >
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="github">GitHub</option>
              <option value="link">Link</option>
              <option value="video">Vídeo</option>
            </select>
            <input
              placeholder="Conteúdo ou URL"
              value={resourceDraft.content}
              onChange={(e) => setResourceDraft((prev) => ({ ...prev, content: e.target.value }))}
            />
            <input
              type="number"
              placeholder="Posição"
              value={resourceDraft.position}
              onChange={(e) => setResourceDraft((prev) => ({ ...prev, position: Number(e.target.value) }))}
            />
            <button className="admin-btn" onClick={handleCreateResource}>Adicionar</button>
          </div>

          <div className="template-editor__resource-list">
            {resources
              .slice()
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map((resource) => (
                <div key={resource.id} className="template-editor__resource-item">
                  <input
                    value={resource.title}
                    onChange={(e) =>
                      setResources((prev) => prev.map((item) => (item.id === resource.id ? { ...item, title: e.target.value } : item)))
                    }
                  />
                  <select
                    value={resource.type}
                    onChange={(e) =>
                      setResources((prev) => prev.map((item) => (item.id === resource.id ? { ...item, type: e.target.value } : item)))
                    }
                  >
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="github">GitHub</option>
                    <option value="link">Link</option>
                    <option value="video">Vídeo</option>
                  </select>
                  <input
                    value={resource.content}
                    onChange={(e) =>
                      setResources((prev) => prev.map((item) => (item.id === resource.id ? { ...item, content: e.target.value } : item)))
                    }
                  />
                  <input
                    type="number"
                    value={resource.position}
                    onChange={(e) =>
                      setResources((prev) => prev.map((item) => (item.id === resource.id ? { ...item, position: Number(e.target.value) } : item)))
                    }
                  />
                  <button className="admin-btn" onClick={() => handleUpdateResource(resource)}>Salvar</button>
                  <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteResource(resource.id)}>Excluir</button>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === "files" && (
        <div className="template-editor__files">
          <aside className="template-editor__files-sidebar">
            <h4>Arquivos</h4>
            <ul>
              {files.map((file) => (
                <li
                  key={file.id}
                  className={file.id === selectedFileId ? "active" : ""}
                  onClick={() => setSelectedFileId(file.id)}
                >
                  {file.fileName}
                </li>
              ))}
            </ul>
            <div className="template-editor__files-new">
              <input
                placeholder="Arquivo"
                value={fileDraft.fileName}
                onChange={(e) => setFileDraft((prev) => ({ ...prev, fileName: e.target.value }))}
              />
              <select
                value={fileDraft.fileType}
                onChange={(e) => setFileDraft((prev) => ({ ...prev, fileType: e.target.value }))}
              >
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="js">JS</option>
              </select>
              <input
                type="number"
                placeholder="Posição"
                value={fileDraft.position}
                onChange={(e) => setFileDraft((prev) => ({ ...prev, position: Number(e.target.value) }))}
              />
              <button className="admin-btn" onClick={handleCreateFile}>Adicionar</button>
            </div>
          </aside>

          <div className="template-editor__files-editor">
            {selectedFile ? (
              <>
                <div className="template-editor__files-header">
                  <input
                    value={selectedFile.fileName}
                    onChange={(e) =>
                      setFiles((prev) => prev.map((file) => (file.id === selectedFile.id ? { ...file, fileName: e.target.value } : file)))
                    }
                  />
                  <select
                    value={selectedFile.fileType}
                    onChange={(e) =>
                      setFiles((prev) => prev.map((file) => (file.id === selectedFile.id ? { ...file, fileType: e.target.value } : file)))
                    }
                  >
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="js">JS</option>
                  </select>
                  <input
                    type="number"
                    value={selectedFile.position}
                    onChange={(e) =>
                      setFiles((prev) => prev.map((file) => (file.id === selectedFile.id ? { ...file, position: Number(e.target.value) } : file)))
                    }
                  />
                  <button className="admin-btn" onClick={() => handleUpdateFile(selectedFile)}>Salvar</button>
                  <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteFile(selectedFile.id)}>Excluir</button>
                </div>
                <textarea
                  className="template-editor__code"
                  value={selectedFile.content}
                  onChange={(e) =>
                    setFiles((prev) => prev.map((file) => (file.id === selectedFile.id ? { ...file, content: e.target.value } : file)))
                  }
                />
              </>
            ) : (
              <p>Nenhum arquivo selecionado.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
