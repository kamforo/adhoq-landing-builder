import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import type { FormElement, FormField } from '@/types';

/**
 * Extract form elements and their fields
 */
export function extractForms($: cheerio.CheerioAPI): FormElement[] {
  const forms: FormElement[] = [];

  $('form').each((_, el) => {
    const $form = $(el);
    const action = $form.attr('action') || '';
    const method = ($form.attr('method') || 'get').toUpperCase();

    // Generate selector for this form
    const formId = $form.attr('id');
    const formClass = $form.attr('class');
    let selector = 'form';
    if (formId) {
      selector = `#${formId}`;
    } else if (formClass) {
      selector = `form.${formClass.split(/\s+/)[0]}`;
    }

    // Extract form fields
    const fields: FormField[] = [];

    // Input fields
    $form.find('input').each((_, inputEl) => {
      const $input = $(inputEl);
      const type = $input.attr('type') || 'text';
      const name = $input.attr('name') || '';

      // Skip hidden, submit, and button types for content purposes
      if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) {
        return;
      }

      fields.push({
        name: name || `input-${fields.length}`,
        type,
        placeholder: $input.attr('placeholder'),
        required: $input.attr('required') !== undefined,
      });
    });

    // Textareas
    $form.find('textarea').each((_, textareaEl) => {
      const $textarea = $(textareaEl);
      fields.push({
        name: $textarea.attr('name') || `textarea-${fields.length}`,
        type: 'textarea',
        placeholder: $textarea.attr('placeholder'),
        required: $textarea.attr('required') !== undefined,
      });
    });

    // Select dropdowns
    $form.find('select').each((_, selectEl) => {
      const $select = $(selectEl);
      fields.push({
        name: $select.attr('name') || `select-${fields.length}`,
        type: 'select',
        required: $select.attr('required') !== undefined,
      });
    });

    forms.push({
      id: uuidv4(),
      action,
      method,
      fields,
      selector,
    });
  });

  return forms;
}
