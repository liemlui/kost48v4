export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'select'
  | 'date'
  | 'textarea'
  | 'checkbox'
  | 'password'
  | 'currency';

export type ResourceField = {
  name: string;
  label: string;
  type: FieldType;
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
};

export type ResourceConfig = {
  title: string;
  path: string;
  idField?: string;
  columns: { key: string; label: string }[];
  fields: ResourceField[];
  allowDelete?: boolean;
  createLabel?: string;
  supportsIsActiveFilter?: boolean;
};

export type ManageGuardResult = {
  allowed: boolean;
  reason?: string;
};
