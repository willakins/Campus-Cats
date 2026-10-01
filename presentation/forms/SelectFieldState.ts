import { Dispatch, SetStateAction } from 'react';

export interface SelectFieldState<T> {
  readonly value: T;
  readonly setValue: Dispatch<SetStateAction<T>>;
  readonly open: boolean;
  readonly setOpen: Dispatch<SetStateAction<boolean>>;
  readonly items: { readonly label: string; readonly value: string }[];
  readonly setItems: Dispatch<
    SetStateAction<{ readonly label: string; readonly value: string }[]>
  >;
}
