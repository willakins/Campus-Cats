import { createContext, useState, ReactNode } from 'react';

// Define the AdminContext type
interface AdminContextType {
  adminStatus: boolean;
  setAdminStatus: (value: boolean) => void;
}

// Create a default context value
export const AdminContext = createContext<AdminContextType>({
  adminStatus: false,  // Default value
  setAdminStatus: () => {},  // Default empty function
});

// Create the AdminProvider component
export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [adminStatus, setAdminStatus] = useState<boolean>(false);

  return (
    <AdminContext.Provider value={{ adminStatus, setAdminStatus }}>
      {children}
    </AdminContext.Provider>
  );
};
