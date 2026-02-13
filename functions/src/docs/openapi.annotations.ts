/**
 * @openapi
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         description: { type: string }
 *         price: { type: string }
 *         sale_price: { type: string }
 *         template_id: { type: string, nullable: true }
 *     CheckoutResponse:
 *       type: object
 *       properties:
 *         order: { type: object }
 *         product: { $ref: '#/components/schemas/Product' }
 *         coupon:
 *           type: object
 *           nullable: true
 *           properties:
 *             code: { type: string }
 *             discount: { type: number }
 *             autoApply: { type: boolean }
 *         amounts:
 *           type: object
 *           properties:
 *             original: { type: number }
 *             discount: { type: number }
 *             final: { type: number }
 *         projectId: { type: string, nullable: true }
 *         purchaseId: { type: string, nullable: true }
 *     ProjectFile:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         file_name: { type: string }
 *         file_type: { type: string }
 *         content: { type: string }
 *         storage_path: { type: string }
 */

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Marketplace]
 *     summary: Lista produtos
 *     responses:
 *       200:
 *         description: Lista de produtos
 *   post:
 *     tags: [Marketplace]
 *     summary: Cria produto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               price: { type: string }
 *               description: { type: string }
 *               templateId: { type: string }
 *     responses:
 *       201:
 *         description: Produto criado
 */

/**
 * @openapi
 * /checkout/products/{id}:
 *   post:
 *     tags: [Checkout]
 *     summary: Executa checkout de um produto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       201:
 *         description: Checkout concluído
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutResponse'
 */

/**
 * @openapi
 * /checkout:
 *   post:
 *     tags: [Checkout]
 *     summary: Executa checkout de um produto via payload
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId: { type: string }
 *               userId: { type: string }
 *     responses:
 *       201:
 *         description: Checkout concluído
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutResponse'
 */

/**
 * @openapi
 * /projects/{id}/files:
 *   get:
 *     tags: [Projects]
 *     summary: Lista arquivos de um projeto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de arquivos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProjectFile'
 */

/**
 * @openapi
 * /templates/{id}/clone:
 *   post:
 *     tags: [Projects]
 *     summary: Clona um template para o usuário
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       201:
 *         description: Projeto clonado
 */

/**
 * @openapi
 * /projects/clone:
 *   post:
 *     tags: [Projects]
 *     summary: Clona template para projeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               templateId: { type: string }
 *               userId: { type: string }
 *     responses:
 *       201:
 *         description: Projeto clonado
 */

/**
 * @openapi
 * /ia/tasks:
 *   get:
 *     tags: [IA]
 *     summary: Lista tarefas de IA
 *     responses:
 *       200:
 *         description: Lista de tarefas
 */

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Auth]
 *     summary: Cria/atualiza usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               authUid: { type: string }
 *               name: { type: string }
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: Usuário registrado
 */
