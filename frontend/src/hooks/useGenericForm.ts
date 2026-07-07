import { useForm, type UseFormProps, type FieldValues } from 'react-hook-form';

/** Wrapper react-hook-form dengan default KOST48 */
export function useGenericForm<T extends FieldValues>(props?: UseFormProps<T>) {
  return useForm<T>({
    mode: 'onBlur',          // validasi saat keluar field
    reValidateMode: 'onChange',
    ...props,
  });
}
