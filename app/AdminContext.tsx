import { createContext, useState } from 'react';

export const AdminContext = createContext({
  adminStatus: false,
  setAdminStatus: (value: boolean) => {},
});

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [adminStatus, setAdminStatus] = useState<boolean>(false);

  return (
    <AdminContext.Provider value={{ adminStatus, setAdminStatus }}>
      {children}
    </AdminContext.Provider>
  );
};