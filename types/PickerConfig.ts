import { Dispatch, SetStateAction } from 'react';

export interface PickerConfig<T> {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  items: { label: string; value: string }[];
  setItems: Dispatch<SetStateAction<{ label: string; value: string }[]>>;
}
