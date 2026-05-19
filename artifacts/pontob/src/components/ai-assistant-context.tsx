import { createContext, useContext } from "react";

export interface AiAssistantContextType {
  openAssistant: () => void;
}

export const AiAssistantContext = createContext<AiAssistantContextType>({
  openAssistant: () => {},
});

export function useAiAssistant() {
  return useContext(AiAssistantContext);
}
