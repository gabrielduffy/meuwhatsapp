/**
 * Sistema de Modais Reutilizável
 * Cria modais dinâmicos para CRUD operations
 */

const Modal = {
  /**
   * Renderiza um modal
   * @param {Object} config - Configuração do modal
   * @param {string} config.id - ID único do modal
   * @param {string} config.title - Título do modal
   * @param {string} config.content - Conteúdo HTML do modal
   * @param {Array} config.buttons - Array de botões [{text, class, onClick}]
   * @param {string} config.size - Tamanho do modal: 'sm', 'md', 'lg', 'xl' (default: 'md')
   * @param {boolean} config.closeOnOverlay - Fechar ao clicar fora (default: true)
   */
  render(config) {
    const {
      id,
      title,
      content,
      buttons = [],
      size = 'md',
      closeOnOverlay = true
    } = config;

    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-2xl',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl'
    };

    const modalHTML = `
      <div id="${id}" class="modal-overlay" style="display: none;">
        <div class="modal-container ${sizeClasses[size]}">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close" onclick="Modal.close('${id}')">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
          <div class="modal-footer">
            ${buttons.map((btn, idx) => `
              <button
                class="${btn.class || 'btn btn-outline'}"
                onclick="Modal.handleButtonClick('${id}', ${idx})"
              >
                ${btn.text}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Remove modal existente
    const existingModal = document.getElementById(id);
    if (existingModal) {
      existingModal.remove();
    }

    // Adiciona novo modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Store button handlers
    const modal = document.getElementById(id);
    modal._buttonHandlers = buttons.map(btn => btn.onClick);
    modal._closeOnOverlay = closeOnOverlay;

    // Overlay click handler
    modal.addEventListener('click', (e) => {
      if (e.target === modal && closeOnOverlay) {
        Modal.close(id);
      }
    });

    // ESC key handler
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        Modal.close(id);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    return id;
  },

  /**
   * Abre um modal
   */
  open(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      // Focus no primeiro input
      setTimeout(() => {
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) firstInput.focus();
      }, 100);
    }
  },

  /**
   * Fecha um modal
   */
  close(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  },

  /**
   * Remove um modal do DOM
   */
  destroy(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.remove();
      document.body.style.overflow = '';
    }
  },

  /**
   * Handler para cliques em botões
   */
  handleButtonClick(modalId, buttonIndex) {
    const modal = document.getElementById(modalId);
    if (modal && modal._buttonHandlers && modal._buttonHandlers[buttonIndex]) {
      modal._buttonHandlers[buttonIndex]();
    }
  },

  /**
   * Modal de confirmação
   */
  confirm(config) {
    const {
      title = 'Confirmar',
      message,
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      onConfirm,
      onCancel,
      danger = false
    } = config;

    const modalId = 'modal-confirm-' + Date.now();

    this.render({
      id: modalId,
      title,
      content: `<p class="text-gray-700 dark:text-gray-300">${message}</p>`,
      size: 'sm',
      buttons: [
        {
          text: cancelText,
          class: 'btn btn-outline',
          onClick: () => {
            this.close(modalId);
            this.destroy(modalId);
            if (onCancel) onCancel();
          }
        },
        {
          text: confirmText,
          class: danger ? 'btn btn-danger' : 'btn btn-primary',
          onClick: () => {
            this.close(modalId);
            this.destroy(modalId);
            if (onConfirm) onConfirm();
          }
        }
      ]
    });

    this.open(modalId);
  },

  /**
   * Modal de formulário CRUD
   */
  form(config) {
    const {
      id,
      title,
      fields,
      data = {},
      onSubmit,
      onCancel,
      submitText = 'Salvar',
      cancelText = 'Cancelar',
      size = 'md'
    } = config;

    const modalId = id || 'modal-form-' + Date.now();

    // Gera HTML dos campos
    const fieldsHTML = fields.map(field => {
      const value = data[field.name] || field.defaultValue || '';

      let inputHTML = '';

      if (field.type === 'textarea') {
        inputHTML = `
          <textarea
            id="${modalId}-${field.name}"
            name="${field.name}"
            class="input"
            placeholder="${field.placeholder || ''}"
            ${field.required ? 'required' : ''}
            ${field.disabled ? 'disabled' : ''}
          >${value}</textarea>
        `;
      } else if (field.type === 'select') {
        inputHTML = `
          <select
            id="${modalId}-${field.name}"
            name="${field.name}"
            class="input"
            ${field.required ? 'required' : ''}
            ${field.disabled ? 'disabled' : ''}
          >
            ${field.placeholder ? `<option value="">${field.placeholder}</option>` : ''}
            ${field.options.map(opt => `
              <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        `;
      } else if (field.type === 'checkbox') {
        inputHTML = `
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="${modalId}-${field.name}"
              name="${field.name}"
              class="w-4 h-4"
              ${value ? 'checked' : ''}
              ${field.disabled ? 'disabled' : ''}
            >
            <label for="${modalId}-${field.name}" class="text-sm">${field.label}</label>
          </div>
        `;
        return `<div class="mb-4">${inputHTML}</div>`;
      } else {
        inputHTML = `
          <input
            type="${field.type || 'text'}"
            id="${modalId}-${field.name}"
            name="${field.name}"
            class="input"
            placeholder="${field.placeholder || ''}"
            value="${value}"
            ${field.required ? 'required' : ''}
            ${field.disabled ? 'disabled' : ''}
            ${field.min !== undefined ? `min="${field.min}"` : ''}
            ${field.max !== undefined ? `max="${field.max}"` : ''}
            ${field.pattern ? `pattern="${field.pattern}"` : ''}
          >
        `;
      }

      return `
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2" for="${modalId}-${field.name}">
            ${field.label}
            ${field.required ? '<span class="text-red-500">*</span>' : ''}
          </label>
          ${inputHTML}
          ${field.help ? `<p class="text-xs text-gray-500 mt-1">${field.help}</p>` : ''}
        </div>
      `;
    }).join('');

    const formContent = `
      <form id="${modalId}-form" onsubmit="return false;">
        ${fieldsHTML}
      </form>
    `;

    this.render({
      id: modalId,
      title,
      content: formContent,
      size,
      buttons: [
        {
          text: cancelText,
          class: 'btn btn-outline',
          onClick: () => {
            this.close(modalId);
            this.destroy(modalId);
            if (onCancel) onCancel();
          }
        },
        {
          text: submitText,
          class: 'btn btn-primary',
          onClick: () => {
            const form = document.getElementById(`${modalId}-form`);
            if (form.checkValidity()) {
              const formData = new FormData(form);
              const data = {};

              for (let [key, value] of formData.entries()) {
                data[key] = value;
              }

              // Handle checkboxes
              fields.forEach(field => {
                if (field.type === 'checkbox') {
                  const checkbox = document.getElementById(`${modalId}-${field.name}`);
                  data[field.name] = checkbox.checked;
                }
              });

              if (onSubmit) {
                const result = onSubmit(data);
                // Se onSubmit retornar false, não fecha o modal
                if (result !== false) {
                  this.close(modalId);
                  this.destroy(modalId);
                }
              }
            } else {
              form.reportValidity();
            }
          }
        }
      ]
    });

    this.open(modalId);
    return modalId;
  },

  /**
   * Modal de visualização (somente leitura)
   */
  view(config) {
    const {
      id,
      title,
      data,
      closeText = 'Fechar',
      size = 'md'
    } = config;

    const modalId = id || 'modal-view-' + Date.now();

    const contentHTML = Object.entries(data).map(([key, value]) => `
      <div class="mb-3">
        <label class="block text-sm font-medium text-gray-500 mb-1">${key}</label>
        <p class="text-gray-900 dark:text-gray-100">${value || '-'}</p>
      </div>
    `).join('');

    this.render({
      id: modalId,
      title,
      content: contentHTML,
      size,
      buttons: [
        {
          text: closeText,
          class: 'btn btn-primary',
          onClick: () => {
            this.close(modalId);
            this.destroy(modalId);
          }
        }
      ]
    });

    this.open(modalId);
    return modalId;
  },

  /**
   * Modal de loading
   */
  loading(message = 'Carregando...') {
    const modalId = 'modal-loading';

    const content = `
      <div class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">${message}</p>
      </div>
    `;

    this.render({
      id: modalId,
      title: '',
      content,
      size: 'sm',
      buttons: [],
      closeOnOverlay: false
    });

    this.open(modalId);
    return modalId;
  },

  /**
   * Fecha e remove modal de loading
   */
  closeLoading() {
    this.close('modal-loading');
    this.destroy('modal-loading');
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Modal;
}
