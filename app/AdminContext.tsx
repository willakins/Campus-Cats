import { createContext, useState } from 'react';

export const AdminContext = createContext({
  adminView: false,
  adminStatus: false,
  setAdminView: (value: boolean) => {},
  setAdminStatus: (value: boolean) => {},
});

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [adminView, setAdminView] = useState<boolean>(false);
  const [adminStatus, setAdminStatus] = useState<boolean>(false);

  return (
    <AdminContext.Provider value={{ adminView, adminStatus, setAdminView, setAdminStatus }}>
      {children}
    </AdminContext.Provider>
  );
};