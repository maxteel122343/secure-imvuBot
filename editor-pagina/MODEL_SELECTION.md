# 🎛️ Seleção de Modelo Gemini - Guia Completo

## ✨ Nova Funcionalidade

Agora você pode **escolher qual modelo Gemini usar** diretamente na interface!

---

## 🎯 Modelos Disponíveis

### 1. **Gemini 1.5 Flash** (Recomendado) ⭐
- **ID:** `flash-1.5`
- **Quota Free Tier:** ✅ Alta (15 req/min)
- **Velocidade:** Rápido
- **Precisão:** Boa
- **Uso:** Ideal para uso geral

### 2. **Gemini 2.0 Flash** (Experimental) 🚀
- **ID:** `flash-2.0`
- **Quota Free Tier:** ❌ Muito baixa (0 req/min no free)
- **Velocidade:** Muito rápido
- **Precisão:** Excelente
- **Uso:** Apenas com API paga ou para testes rápidos

### 3. **Gemini 1.5 Pro** (Mais Inteligente) 🧠
- **ID:** `pro-1.5`
- **Quota Free Tier:** ⚠️ Média (2 req/min)
- **Velocidade:** Mais lento
- **Precisão:** Muito alta
- **Uso:** Tarefas complexas que precisam de raciocínio avançado

### 4. **Gemini 1.5 Flash 8B** (Mais Rápido) ⚡
- **ID:** `flash-8b`
- **Quota Free Tier:** ✅ Alta
- **Velocidade:** Muito rápido
- **Precisão:** Boa
- **Uso:** Quando velocidade é prioridade

---

## 🎮 Como Usar

### **Na Interface Web:**

1. Abra `http://localhost:3000`
2. Veja o dropdown **"AI Model:"**
3. Selecione o modelo desejado
4. O sistema troca automaticamente!

### **Feedback Visual:**

Quando você troca de modelo, verá:
```
[15:30:45] Changing model to: flash-2.0...
[15:30:46] ✅ Model changed to: gemini-2.0-flash-exp
```

---

## 📊 Comparação de Modelos

| Modelo | Quota (Free) | Velocidade | Precisão | Quando Usar |
|--------|--------------|------------|----------|-------------|
| **Flash 1.5** | 15/min | ⚡⚡⚡ | ⭐⭐⭐⭐ | Uso geral (padrão) |
| **Flash 2.0** | 0/min | ⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ | API paga ou teste |
| **Pro 1.5** | 2/min | ⚡⚡ | ⭐⭐⭐⭐⭐ | Tarefas complexas |
| **Flash 8B** | 15/min | ⚡⚡⚡⚡ | ⭐⭐⭐ | Velocidade máxima |

---

## 🧪 Testando Modelos

### **Experimento Sugerido:**

1. **Teste com Flash 1.5:**
   - Comando: "Clique no botão de pesquisa"
   - Observe: Tempo de resposta e precisão

2. **Troque para Pro 1.5:**
   - Mesmo comando
   - Compare: Mais lento, mas pode ser mais preciso

3. **Troque para Flash 8B:**
   - Mesmo comando
   - Compare: Mais rápido, precisão similar

---

## ⚠️ Tratamento de Erros

### **Quota Excedida:**

Se você escolher um modelo sem quota:
```
Plan: ⚠️ API quota excedida. Tente outro modelo ou aguarde 1 minuto.
```

**Solução:** Troque para outro modelo no dropdown!

---

## 💡 Dicas de Uso

### ✅ **Melhores Práticas:**

1. **Comece com Flash 1.5** (padrão recomendado)
2. **Use Pro 1.5** para tarefas que exigem raciocínio complexo
3. **Use Flash 8B** quando precisar de respostas muito rápidas
4. **Evite Flash 2.0** no free tier (quota zero)

### 🎯 **Casos de Uso:**

| Tarefa | Modelo Recomendado |
|--------|-------------------|
| Cliques simples | Flash 8B |
| Navegação geral | Flash 1.5 |
| Formulários complexos | Pro 1.5 |
| Tarefas repetitivas | Flash 1.5 |
| Análise de conteúdo | Pro 1.5 |

---

## 🔧 Implementação Técnica

### **Backend (server.js):**

```javascript
const AVAILABLE_MODELS = {
    'flash-1.5': 'gemini-1.5-flash-latest',
    'flash-2.0': 'gemini-2.0-flash-exp',
    'pro-1.5': 'gemini-1.5-pro-latest',
    'flash-8b': 'gemini-1.5-flash-8b-latest'
};

function changeModel(modelKey) {
    if (AVAILABLE_MODELS[modelKey]) {
        model = genAI.getGenerativeModel({ 
            model: AVAILABLE_MODELS[modelKey]
        });
        return { success: true };
    }
    return { success: false };
}
```

### **Frontend (index.html):**

```javascript
modelSelect.onchange = () => {
    const selectedModel = modelSelect.value;
    ws.send(JSON.stringify({ 
        type: 'change_model', 
        model: selectedModel 
    }));
};
```

### **Protocolo WebSocket:**

**Cliente → Servidor:**
```json
{
  "type": "change_model",
  "model": "flash-2.0"
}
```

**Servidor → Cliente:**
```json
{
  "type": "model_changed",
  "success": true,
  "model": "gemini-2.0-flash-exp",
  "current": "flash-2.0"
}
```

---

## 📈 Monitoramento

### **Logs do Servidor:**

Quando você troca de modelo:
```
[Model] Switched to: gemini-2.0-flash-exp
```

### **Logs da Interface:**

```
[15:30:45] Changing model to: flash-2.0...
[15:30:46] ✅ Model changed to: gemini-2.0-flash-exp
```

---

## 🚀 Próximas Melhorias

- [ ] Salvar preferência de modelo (localStorage)
- [ ] Mostrar quota restante em tempo real
- [ ] Auto-fallback se quota exceder
- [ ] Estatísticas de uso por modelo
- [ ] Comparação A/B automática

---

## ✅ Status

**Funcionalidade:** ✅ Implementada  
**Modelos:** 4 disponíveis  
**Troca em tempo real:** ✅ Sim  
**Sem restart:** ✅ Sim  

**Teste agora em:** http://localhost:3000

---

## 🎉 Benefícios

1. **Flexibilidade** - Escolha o melhor modelo para cada tarefa
2. **Economia** - Evite modelos sem quota
3. **Performance** - Otimize velocidade vs precisão
4. **Experimentação** - Compare modelos facilmente
5. **Sem Restart** - Troca instantânea

**Aproveite a nova funcionalidade!** 🚀
