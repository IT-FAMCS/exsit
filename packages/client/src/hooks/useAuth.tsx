import type { AuthInformation } from "@exsit/shared/types/auth";
import { createContext, useContext } from "react";

export const AuthContext = createContext<AuthInformation | null>(null);
export const useAuth = () => useContext(AuthContext);
