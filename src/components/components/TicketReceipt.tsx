import React from 'react';

interface Product {
  cod_barra: string;
  descripcion: string;
  precio: number;
  peso: number;
  es_pesable: boolean;
}

interface TicketReceiptProps {
  products: Product[];
  productQuantities: { [key: string]: number };
  ruc: string;
  razonSocial: string;
  totalAmount: number;
  onPrintComplete?: () => void;
}

export default function TicketReceipt({ 
  products, 
  productQuantities, 
  ruc, 
  razonSocial, 
  totalAmount,
  onPrintComplete 
}: TicketReceiptProps) {

  React.useEffect(() => {
    // Auto-print after component mounts
    const timer = setTimeout(() => {
      window.print();
      onPrintComplete?.();
    }, 100);

    return () => clearTimeout(timer);
  }, [onPrintComplete]);

  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString('es-PY');
  const timeStr = currentDate.toLocaleTimeString('es-PY');
  const facturaNum = `001-001-${Math.floor(Math.random() * 100000).toString().padStart(7, '0')}`;

  return (
    <div>
      <style>{`
        /* 80mm receipt style */
        :root{--paper-width:80mm;}
        body{font-family: "Courier New", Courier, monospace; margin:0; padding:10px; background:#fff;}
        .receipt{width:var(--paper-width); max-width:100%; margin:0 auto; padding:6px 8px; box-sizing:border-box;}
        .center{text-align:center;}
        .right{text-align:right;}
        .bold{font-weight:700;}
        .small{font-size:11px;}
        .tiny{font-size:10px;}
        h1,h2,h3{margin:3px 0;}
        hr{border:none;border-top:1px dashed #000;margin:6px 0;}
        .company{font-size:12px;}
        .items{width:100%; font-size:11px; margin-top:4px;}
        .items .row{display:flex; justify-content:space-between; gap:8px;}
        .items .desc{flex:1 1 65%;}
        .items .qty{width:36px; text-align:left;}
        .items .price{width:80px; text-align:right; white-space:nowrap;}
        .totals{margin-top:6px; font-size:12px;}
        .totals .line{display:flex; justify-content:space-between;}
        .thankyou{margin-top:8px; font-size:11px; text-align:center;}
        /* Make it printer friendly */
        @media print {
          * {
            visibility: hidden;
          }
          .receipt, .receipt * {
            visibility: visible;
          }
          .receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            box-shadow: none;
            margin: 0;
            border: none;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      <div className="receipt">
        <div className="center company">
          <div className="bold">Fe-SCO</div>
          <div>Sistema de Gestión</div>
          <div className="tiny">RUC:80000000-0</div>
          <div className="tiny">Asunción - Paraguay</div>
          <div className="tiny">Telefono:(021)000000 - (0976)000000</div>
          <div className="tiny">Timbrado:12345678</div>
          <div className="tiny">Fecha Inicio Vigencia:01/01/2024</div>
          <div className="tiny">Fecha Fin Vigencia:31/12/2024</div>
        </div>

        <hr/>

        <div className="small">
          <div><strong>Comprobante Nro.:</strong> {facturaNum}</div>
          <div className="right bold">IVA INCLUIDO</div>
        </div>

        <hr/>

        <div className="small">
          <div><strong>Cliente:</strong> {razonSocial === 'SIN NOMBRE' ? 'Cliente Ocasional' : razonSocial}</div>
          <div><strong>RUC/CI:</strong> {ruc}</div>
          <div><strong>Forma Pago:</strong> CONTADO</div>
          <div><strong>Fecha:</strong> {dateStr} {timeStr}</div>
        </div>

        <hr/>

        <div className="items small">
          <div className="row bold tiny">
            <div className="qty">Cant.</div>
            <div className="desc">Descripcion</div>
            <div className="price">(P.U.)</div>
          </div>
          {products.map((product, index) => {
            const quantity = productQuantities[product.cod_barra] || 1;
            const subtotal = product.precio * quantity;
            
            return (
              <React.Fragment key={index}>
                <div className="row">
                  <div className="qty">{quantity}</div>
                  <div className="desc">{product.descripcion}</div>
                  <div className="price right">₲{product.precio.toLocaleString('es-PY')}</div>
                </div>
                <div className="tiny">EXEN &nbsp;&nbsp;IVA5% &nbsp;&nbsp;IVA10% &nbsp;&nbsp;SUBTOTAL</div>
                <div className="tiny right">₲{subtotal.toLocaleString('es-PY')}</div>
              </React.Fragment>
            );
          })}
        </div>

        <hr/>

        <div className="totals">
          <div className="line"><div>TOTAL BRUTO</div><div className="right bold">₲{totalAmount.toLocaleString('es-PY')}</div></div>
          <div className="line"><div>DESCUENTO</div><div className="right">₲0</div></div>
          <div className="line"><div>TOTAL</div><div className="right bold">₲{totalAmount.toLocaleString('es-PY')}</div></div>

          <div style={{marginTop:'6px'}}></div>

          <div className="line"><div>IVA 10%</div><div className="right">₲0</div></div>
          <div className="line"><div>IVA 5%</div><div className="right">₲0</div></div>
          <div className="line"><div>TOTAL IVA</div><div className="right">₲0</div></div>

          <div style={{marginTop:'6px'}}></div>

          <div className="line"><div>SubTotal 10%</div><div className="right">₲0</div></div>
          <div className="line"><div>SubTotal 5%</div><div className="right">₲0</div></div>
          <div className="line"><div>SubTotal EXENTA</div><div className="right">₲{totalAmount.toLocaleString('es-PY')}</div></div>

          <div style={{marginTop:'6px'}}></div>

          <div className="line"><div>RECIBIDO</div><div className="right">₲{totalAmount.toLocaleString('es-PY')}</div></div>
          <div className="line"><div>VUELTO</div><div className="right">₲0</div></div>

          <hr/>

          <div className="small"><strong>Cajero/a:</strong> Sistema Fe-SCO</div>
        </div>

        <div className="thankyou">
          <div>Gracias por su Preferencia!!!</div>
          <div className="tiny">Original: Cliente</div>
          <div className="tiny">Duplicado: Contabilidad</div>
        </div>
      </div>
    </div>
  );
}