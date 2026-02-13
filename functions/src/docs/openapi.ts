import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

const definition = {
  openapi: "3.0.3",
  info: {
    title: "HKTECH API",
    version: "1.0.0",
    description: "Documentação oficial da API HKTECH",
  },
  servers: [{ url: "/", description: "Default" }],
  tags: [
    { name: "Auth", description: "Autenticação e usuários" },
    { name: "Marketplace", description: "Produtos e marketplace" },
    { name: "Checkout", description: "Fluxo de checkout" },
    { name: "Projects", description: "Projetos e arquivos" },
    { name: "IA", description: "Domínio de IA" },
  ],
};

const apis = [
  path.join(__dirname, "openapi.annotations.js"),
  path.join(__dirname, "openapi.annotations.ts"),
];

export const swaggerSpec = swaggerJsdoc({
  definition,
  apis,
});
