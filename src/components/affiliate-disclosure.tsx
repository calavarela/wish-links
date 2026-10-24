/**
 * Aviso de links de afiliado. Componente de servidor: la frase de Amazon
 * (texto que exige Amazon Associates) aparece solo cuando el programa está
 * activo, es decir, cuando hay AMAZON_ASSOCIATE_TAG cargado.
 */
export const AFFILIATE_NOTICE =
  "Algunos links pueden ser de afiliado: si comprás, Wish Links puede recibir una comisión de la tienda, sin costo extra para vos.";

export const AMAZON_NOTICE =
  "Como Afiliado de Amazon, Wish Links obtiene ingresos por las compras adscritas que cumplen los requisitos aplicables.";

export function amazonProgramActive(): boolean {
  return Boolean(process.env.AMAZON_ASSOCIATE_TAG);
}

export default function AffiliateDisclosure({ className = "" }: { className?: string }) {
  return (
    <p className={`max-w-md text-center text-[11px] leading-relaxed text-subtle ${className}`}>
      {AFFILIATE_NOTICE}
      {amazonProgramActive() && <> {AMAZON_NOTICE}</>}
    </p>
  );
}
