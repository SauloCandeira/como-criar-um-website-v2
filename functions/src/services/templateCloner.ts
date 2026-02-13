type QueryClient = { query: (sql: string, params?: any[]) => Promise<any> };

type SaveFileInput = {
  userId: string;
  projectId: string;
  fileName: string;
  fileType: string;
  content: string;
};

export type CloneTemplateDeps = {
  ensureProjectsColumns: (client: QueryClient) => Promise<void>;
  ensureTemplateTasksTable: (client: QueryClient) => Promise<void>;
  ensureProjectTasksTable: (client: QueryClient) => Promise<void>;
  ensureTemplateFilesTable: (client: QueryClient) => Promise<void>;
  ensureProjectFilesTable: (client: QueryClient) => Promise<void>;
  ensureUserStorageRoot: (userId: string) => Promise<void>;
  ensureProjectStorageFolders: (userId: string, projectId: string) => Promise<void>;
  saveProjectFileToStorage: (input: SaveFileInput) => Promise<string>;
  httpError: (status: number, message: string) => Error & { status?: number };
};

export async function cloneTemplate(
  client: QueryClient,
  templateId: string,
  userId: string,
  deps: CloneTemplateDeps
) {
  await deps.ensureProjectsColumns(client);
  await deps.ensureTemplateTasksTable(client);
  await deps.ensureProjectTasksTable(client);
  await deps.ensureTemplateFilesTable(client);
  await deps.ensureProjectFilesTable(client);

  const templateResult = await client.query(
    "SELECT id, name, description, version, is_active FROM templates WHERE id = $1",
    [templateId]
  );

  const template = templateResult.rows[0];
  if (!template || !template.is_active) {
    throw deps.httpError(404, "Template não encontrado ou inativo.");
  }

  const projectInsert = await client.query(
    "INSERT INTO projects (name, description, project_type, sale_price, production_cost, purchase_count, repository, domain, hosting, status, paid, is_public, owner_user_id, product_id, base_project_id, purchase_id, created_from_purchase, is_template, html_content, css_content, version, template_id, template_version, updated_at) VALUES ($1, $2, '', '', '', 0, '', '', '', 'Ativo', false, true, $3, NULL, NULL, NULL, false, false, '', '', 1, $4, $5, NOW()) RETURNING id, name, description, status, owner_user_id, template_id, template_version, created_at, updated_at",
    [
      `${template.name} (Clone)`,
      template.description ?? "",
      userId,
      template.id,
      Number(template.version ?? 1),
    ]
  );

  const projectId = projectInsert.rows[0]?.id;
  if (!projectId) {
    throw deps.httpError(500, "Falha ao criar projeto a partir do template.");
  }
  await deps.ensureUserStorageRoot(userId);
  await deps.ensureProjectStorageFolders(userId, projectId);

  const tasksResult = await client.query(
    "SELECT title, description, status, position FROM template_tasks WHERE template_id = $1 ORDER BY position ASC, created_at ASC",
    [templateId]
  );

  for (const task of tasksResult.rows) {
    await client.query(
      "INSERT INTO project_tasks (project_id, title, description, status, position) VALUES ($1, $2, $3, $4, $5)",
      [projectId, task.title ?? "", task.description ?? "", task.status ?? "TODO", Number(task.position ?? 0)]
    );
  }

  const filesResult = await client.query(
    "SELECT file_name, file_type, content, position FROM template_files WHERE template_id = $1 ORDER BY position ASC, created_at ASC",
    [templateId]
  );

  for (const file of filesResult.rows) {
    const fileName = file.file_name ?? "";
    const fileType = file.file_type ?? "html";
    const content = file.content ?? "";
    const storagePath = await deps.saveProjectFileToStorage({
      userId,
      projectId,
      fileName,
      fileType,
      content,
    });
    await client.query(
      "INSERT INTO project_files (project_id, file_name, file_type, content, storage_path, updated_at) VALUES ($1, $2, $3, $4, $5, NOW())",
      [projectId, fileName, fileType, content, storagePath]
    );
  }

  return projectInsert.rows[0];
}
