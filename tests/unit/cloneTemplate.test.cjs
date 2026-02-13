const { cloneTemplate } = require('../../functions/lib/services/templateCloner');

describe('cloneTemplate', () => {
  test('clones template into project with tasks and files', async () => {
    const calls = [];
    const client = {
      query: jest.fn(async (sql, params) => {
        calls.push({ sql, params });
        if (sql.includes('SELECT id, name, description, version, is_active FROM templates')) {
          return { rows: [{ id: 'tpl-1', name: 'Template', description: 'Desc', version: 2, is_active: true }] };
        }
        if (sql.startsWith('INSERT INTO projects')) {
          return { rows: [{ id: 'proj-1', name: 'Template (Clone)', description: 'Desc' }] };
        }
        if (sql.includes('FROM template_tasks')) {
          return { rows: [{ title: 'T1', description: 'D1', status: 'TODO', position: 1 }] };
        }
        if (sql.includes('FROM template_files')) {
          return { rows: [{ file_name: 'index.html', file_type: 'html', content: '<h1>Oi</h1>', position: 1 }] };
        }
        return { rows: [] };
      }),
    };

    const deps = {
      ensureProjectsColumns: jest.fn(async () => {}),
      ensureTemplateTasksTable: jest.fn(async () => {}),
      ensureProjectTasksTable: jest.fn(async () => {}),
      ensureTemplateFilesTable: jest.fn(async () => {}),
      ensureProjectFilesTable: jest.fn(async () => {}),
      ensureUserStorageRoot: jest.fn(async () => {}),
      ensureProjectStorageFolders: jest.fn(async () => {}),
      saveProjectFileToStorage: jest.fn(async () => 'gs://bucket/proj-1/index.html'),
      httpError: (status, message) => Object.assign(new Error(message), { status }),
    };

    const result = await cloneTemplate(client, 'tpl-1', 'user-1', deps);

    expect(result.id).toBe('proj-1');
    expect(deps.ensureProjectsColumns).toHaveBeenCalled();
    expect(deps.ensureUserStorageRoot).toHaveBeenCalledWith('user-1');
    expect(deps.saveProjectFileToStorage).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-1', fileName: 'index.html' })
    );
    expect(calls.some((call) => call.sql.includes('INSERT INTO project_tasks'))).toBe(true);
    expect(calls.some((call) => call.sql.includes('INSERT INTO project_files'))).toBe(true);
  });
});
