---
name: security-audit
description: Auditoria de segurança e análise de vulnerabilidades em código. Use quando o usuário pedir para revisar segurança, encontrar vulnerabilidades, fazer code review de segurança, análise estática, verificar código seguro, ou mencionar termos como CVE, OWASP, injection, XSS, CSRF, auth bypass, privilege escalation, CodeQL, Semgrep, pentest, hardening, secure code review, vulnerability scan, ou análise de dependências.
---

# Security Audit

Skill para auditoria de segurança de código inspirada nas práticas da Trail of Bits. Inclui análise estática, detecção de vulnerabilidades, e code review focado em segurança.

## Áreas de Análise

### 1. Injection Vulnerabilities
- SQL Injection
- NoSQL Injection
- Command Injection
- LDAP Injection
- XPath Injection
- Template Injection (SSTI)

### 2. Authentication & Authorization
- Broken Authentication
- Session Management Flaws
- Privilege Escalation
- IDOR (Insecure Direct Object Reference)
- Missing Access Controls
- JWT Vulnerabilities

### 3. Data Exposure
- Sensitive Data in Logs
- Hardcoded Secrets
- Insecure Storage
- Information Disclosure
- PII Exposure

### 4. Input Validation
- XSS (Cross-Site Scripting)
- Path Traversal
- File Upload Vulnerabilities
- Buffer Overflow
- Integer Overflow
- Format String Bugs

### 5. Cryptography
- Weak Algorithms
- Improper Key Management
- Missing Encryption
- Insecure Random
- Hash Without Salt

### 6. Dependencies
- Known Vulnerabilities (CVEs)
- Outdated Packages
- Supply Chain Risks
- Typosquatting

---

## Checklist de Auditoria

### Análise Estática Rápida

```
□ Secrets hardcoded (API keys, passwords, tokens)
□ SQL queries com concatenação de strings
□ Eval/exec com input do usuário
□ Deserialização de dados não confiáveis
□ File paths com input do usuário
□ Shell commands com input do usuário
□ innerHTML/dangerouslySetInnerHTML
□ Crypto com algoritmos fracos (MD5, SHA1, DES)
□ Random sem seed seguro
□ Logs com dados sensíveis
```

### Por Linguagem

#### JavaScript/TypeScript
```
□ eval(), Function(), setTimeout/setInterval com strings
□ innerHTML, outerHTML, document.write
□ Prototype pollution
□ ReDoS (regex denial of service)
□ npm audit / yarn audit
□ CSP headers configurados
```

#### Python
```
□ pickle.loads() com dados externos
□ yaml.load() sem SafeLoader
□ subprocess/os.system com shell=True
□ assert usado para validação (removido em produção)
□ format strings com input do usuário
□ pip-audit / safety check
```

#### SQL/Database
```
□ Prepared statements vs concatenação
□ Permissões mínimas (least privilege)
□ Escaping apropriado
□ Validação de tipos
□ Rate limiting em queries
```

#### API/Backend
```
□ Rate limiting implementado
□ Input validation em todos endpoints
□ Output encoding
□ CORS configurado corretamente
□ Headers de segurança (CSP, HSTS, etc)
□ Autenticação em rotas sensíveis
```

---

## Severidade de Vulnerabilidades

### 🔴 Crítica (CVSS 9.0-10.0)
- RCE (Remote Code Execution)
- SQL Injection em dados sensíveis
- Auth Bypass em sistema crítico
- Secrets expostos publicamente

**Ação:** Corrigir imediatamente, considerar takedown

### 🟠 Alta (CVSS 7.0-8.9)
- XSS Stored
- IDOR em dados sensíveis
- Privilege Escalation
- SSRF com acesso interno

**Ação:** Corrigir em 24-48h

### 🟡 Média (CVSS 4.0-6.9)
- XSS Reflected
- CSRF
- Information Disclosure
- Weak Cryptography

**Ação:** Corrigir no próximo sprint

### 🟢 Baixa (CVSS 0.1-3.9)
- Missing Headers
- Verbose Errors
- Minor Information Leak

**Ação:** Backlog, corrigir quando possível

---

## Ferramentas de Análise

### Semgrep Rules
```yaml
# Detectar SQL Injection
rules:
  - id: sql-injection
    patterns:
      - pattern: $QUERY = "..." + $INPUT + "..."
      - pattern: $QUERY = f"...{$INPUT}..."
      - pattern: cursor.execute($QUERY % $INPUT)
    message: "Possível SQL Injection"
    severity: ERROR
```

### CodeQL Queries
```ql
// Detectar command injection
import javascript

from CallExpr call, DataFlow::Node source
where
  call.getCalleeName() = "exec" and
  source = call.getArgument(0) and
  source.asExpr().mayHaveStringValue(_)
select call, "Possível command injection"
```

### Comandos Úteis
```bash
# JavaScript/Node
npm audit
npx snyk test

# Python
pip-audit
safety check
bandit -r ./src

# General
semgrep --config auto .
trivy fs .
```

---

## Formato de Relatório

```markdown
## Security Audit Report

**Projeto:** [nome]
**Data:** [data]
**Escopo:** [arquivos/componentes analisados]

### Sumário Executivo

| Severidade | Quantidade |
|------------|------------|
| 🔴 Crítica | X |
| 🟠 Alta    | X |
| 🟡 Média   | X |
| 🟢 Baixa   | X |

### Vulnerabilidades Encontradas

#### [VULN-001] SQL Injection em UserController

**Severidade:** 🔴 Crítica
**Arquivo:** `src/controllers/user.js:45`
**CWE:** CWE-89

**Descrição:**
Query SQL construída com concatenação de strings permite injeção.

**Código Vulnerável:**
```javascript
const query = `SELECT * FROM users WHERE id = '${userId}'`;
```

**Código Corrigido:**
```javascript
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);
```

**Referências:**
- https://owasp.org/www-community/attacks/SQL_Injection
- https://cwe.mitre.org/data/definitions/89.html

---

### Recomendações Gerais

1. Implementar prepared statements em todas queries
2. Adicionar rate limiting nos endpoints de auth
3. Atualizar dependências com vulnerabilidades conhecidas
4. Configurar CSP headers
```

---

## OWASP Top 10 Quick Reference

| # | Vulnerabilidade | Verificar |
|---|-----------------|-----------|
| A01 | Broken Access Control | Authz em todas rotas, IDOR |
| A02 | Cryptographic Failures | Algoritmos, key management |
| A03 | Injection | SQL, NoSQL, OS, LDAP |
| A04 | Insecure Design | Threat modeling, abuse cases |
| A05 | Security Misconfiguration | Headers, defaults, errors |
| A06 | Vulnerable Components | Dependencies, CVEs |
| A07 | Auth Failures | Session, MFA, passwords |
| A08 | Data Integrity Failures | CI/CD, deserialization |
| A09 | Logging Failures | Monitoring, audit trail |
| A10 | SSRF | URL validation, allowlists |

---

## Comandos Rápidos

- `/security-audit` - Auditoria completa
- `/security-quick` - Checklist rápido
- `/security-deps` - Análise de dependências
- `/security-fix <vuln>` - Corrigir vulnerabilidade específica
- `/cve-check` - Verificar CVEs conhecidos
- `/owasp-check` - Verificar contra OWASP Top 10
