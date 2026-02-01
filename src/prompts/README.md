# HKTech – AI Prompts Guide

Esta pasta contém os prompts oficiais usados para alinhar
GitHub Copilot e ChatGPT com a arquitetura, visão e regras do sistema HKTech.

Esses prompts formam a base de governança técnica e evitam:
- Código genérico
- Quebra de arquitetura
- Violações de LGPD
- Decisões inconsistentes entre IAs

---

## 📁 Estrutura

/prompts
├── hktech.system.context.prompt.md
├── hktech.system.description.prompt.md
├── hktech.system.execution.prompt.md
├── mybot.domain.prompt.md
├── hktech.event.driven.learning.md
├── hktech.security.isolation.review.md
├── hktech.observability.metrics.md
└── hktech.scalability.preparation.md

---

## 🧠 Ordem CORRETA de uso

### 1. Contexto (SEMPRE primeiro)
Arquivo:
- hktech.system.context.prompt.md

Uso:
Ensina a IA como o HKTech funciona.
Deve ser carregado no início de toda sessão nova.

---

### 2. Descrição (validação)
Arquivo:
- hktech.system.description.prompt.md

Uso:
Força a IA a explicar o sistema inteiro.
Usado para validar entendimento e gerar documentação viva.

---

### 3. Execução (resolver problemas)
Arquivo:
- hktech.system.execution.prompt.md

Uso:
Transforma riscos, análises e decisões em ações concretas.

---

### 4. Domínio específico
Arquivo:
- mybot.domain.prompt.md

Uso:
Trabalhar diretamente no MyBot (memória, eventos, estágios).

---

### 5. Governança e escala
Arquivos:
- hktech.event.driven.learning.md
- hktech.security.isolation.review.md
- hktech.observability.metrics.md
- hktech.scalability.preparation.md

Uso:
Garantir segurança, LGPD, métricas e escalabilidade correta.

---

## ✅ Regra de ouro
Nunca pedir código ou refatoração sem antes carregar
o `hktech.system.context.prompt.md`.

Esse arquivo é a fonte única de verdade.
