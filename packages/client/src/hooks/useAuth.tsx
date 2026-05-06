import type { Student } from "@exsit/shared/types/auth";
import { createContext, useContext } from "react";
import type z from "zod";

export const AuthContext = createContext<z.infer<typeof Student> | null>(null);
export const useAuth = () => useContext(AuthContext);