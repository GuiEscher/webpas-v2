import React, { createContext, useContext, useEffect, useState } from "react";

// Contexto GLOBAL de campus: define se o app está operando em "São Carlos"
// ou "Sorocaba". Persistido em localStorage para sobreviver a navegação/reload.
const CampusContext = createContext({ campus: "São Carlos", setCampus: () => {} });

const STORAGE_KEY = "webpas_campus";

export const CampusProvider = ({ children }) => {
  const [campus, setCampusState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "São Carlos";
    } catch {
      return "São Carlos";
    }
  });

  const setCampus = (novo) => {
    if (!novo) return;
    setCampusState(novo);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, campus);
    } catch {
      /* ignore */
    }
  }, [campus]);

  return (
    <CampusContext.Provider value={{ campus, setCampus }}>
      {children}
    </CampusContext.Provider>
  );
};

export const useCampus = () => useContext(CampusContext);

export default CampusContext;
