import { createContext, useState } from 'react';

export const AdminContext = createContext({
  adminView: 0,
  adminStatus: 0,
  setAdminView: (value: number) => {},
  setAdminStatus: (value: number) => {},
});

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [adminView, setAdminView] = useState(0);
  const [adminStatus, setAdminStatus] = useState(0);

  return (
    <AdminContext.Provider value={{ adminView, adminStatus, setAdminView, setAdminStatus }}>
      {children}
    </AdminContext.Provider>
  );
};