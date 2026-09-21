import { Sparkles } from "lucide-react";

/**
 * Avatar + texto guionado de Richi. No es un chat con IA -- es copy fijo por
 * pantalla, coherente con el tono definido en la guía de marca: directo,
 * cálido, nunca alarmista, explica el porqué.
 */
export function RichiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="pfi-richi">
      <div className="pfi-richi-avatar"><Sparkles className="size-5" /></div>
      <div className="pfi-richi-bubble">{children}</div>
    </div>
  );
}
