export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const validateField = (
  value: string,
  rules: ValidationRule
): string | null => {
  if (rules.required && (!value || value.trim() === '')) {
    return rules.message || 'This field is required';
  }

  if (value && rules.minLength && value.length < rules.minLength) {
    return rules.message || `Must be at least ${rules.minLength} characters`;
  }

  if (value && rules.maxLength && value.length > rules.maxLength) {
    return rules.message || `Must be no more than ${rules.maxLength} characters`;
  }

  if (value && rules.pattern && !rules.pattern.test(value)) {
    return rules.message || 'Invalid format';
  }

  return null;
};

export const validateForm = (
  data: Record<string, string>,
  rules: Record<string, ValidationRule>
): ValidationErrors => {
  const errors: ValidationErrors = {};

  for (const [field, rule] of Object.entries(rules)) {
    const error = validateField(data[field] || '', rule);
    if (error) {
      errors[field] = error;
    }
  }

  return errors;
};

// Common validation rules
export const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Name must be between 2 and 50 characters',
  },
};