// 🔷 CONFIGURACIÓN DEL LOGO
// Para GitHub Pages - reemplaza con tu usuario y repositorio
const LOGO_URL =
  "https://raw.githubusercontent.com/kevinMejia6/Firmador_Contrato/main/logo_como.webp";

let logoImageData = null;

// Función para cargar logo desde URL
async function cargarLogoDesdeURL(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    reader.onload = function (e) {
      logoImageData = e.target.result;
      // Mostrar en formulario
      document.getElementById("logoFormulario").src = logoImageData;
      console.log("✓ Logo cargado correctamente");
    };
    reader.readAsDataURL(blob);
  } catch (error) {
    console.log("⚠️ No se pudo cargar el logo desde:", url);
    // Si falla, mostrar la imagen directamente sin conversión
    document.getElementById("logoFormulario").src = url;
  }
}

// Cargar logo al iniciar
window.addEventListener("load", function () {
  cargarLogoDesdeURL(LOGO_URL);
});

const canvas = document.getElementById("signatureCanvas");
const ctx = canvas.getContext("2d");
let isDrawing = false;
let hasSignature = false;

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width - 4;
  canvas.height = 150;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("touchstart", handleTouch, false);
canvas.addEventListener("touchmove", handleTouch, false);
canvas.addEventListener("touchend", stopDrawing);

function startDrawing(e) {
  if (e.button !== 0) return;
  isDrawing = true;
  hasSignature = true;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  ctx.beginPath();
  ctx.moveTo(x, y);
  updateStatus();
}

function draw(e) {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#0d47a1";
  ctx.lineTo(x, y);
  ctx.stroke();
}

function handleTouch(e) {
  e.preventDefault();
  if (e.type === "touchstart") {
    isDrawing = true;
    hasSignature = true;
  }
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const y = (touch.clientY - rect.top) * (canvas.height / rect.height);

  if (e.type === "touchstart") {
    ctx.beginPath();
    ctx.moveTo(x, y);
  } else if (e.type === "touchmove") {
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0d47a1";
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  updateStatus();
}

function stopDrawing() {
  isDrawing = false;
}

function updateStatus() {
  const status = document.getElementById("signatureStatus");
  if (hasSignature) {
    status.classList.remove("status-pending");
    status.classList.add("status-completed");
    status.innerHTML = "✓ Firma completada";
  }
}

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSignature = false;
  const status = document.getElementById("signatureStatus");
  status.classList.add("status-pending");
  status.classList.remove("status-completed");
  status.innerHTML = "✏️ Esperando firma...";
}

function limpiarFormulario() {
  document.getElementById("mainForm").reset();
  clearSignature();
  document.getElementById("fecha").valueAsDate = new Date();
}

document.getElementById("fecha").valueAsDate = new Date();

function getContenidosSeleccionados() {
  const checkboxes = document.querySelectorAll(
    'input[name="contenidos"]:checked',
  );
  return Array.from(checkboxes).map((cb) => cb.value);
}

// Función para mostrar toast
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show " + type;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

document
  .getElementById("mainForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!hasSignature) {
      showToast("❌ Por favor, firma el documento antes de continuar", "error");
      return;
    }

    const comprensiones = document.querySelectorAll(
      'input[name="comprension"]:checked',
    ).length;
    if (comprensiones < 6) {
      showToast(
        "⚠️ Por favor, marca todas las casillas de comprensión",
        "warning",
      );
      return;
    }

    // Mostrar loading
    document.getElementById("loading").classList.add("show");
    document.getElementById("overlay").classList.add("show");

    setTimeout(() => {
      try {
        generarPDF();
        showToast("✓ PDF generado exitosamente", "success");
      } catch (error) {
        showToast("❌ Error al generar PDF", "error");
        console.error(error);
      } finally {
        // Ocultar loading
        document.getElementById("loading").classList.remove("show");
        document.getElementById("overlay").classList.remove("show");
        limpiarFormulario();
      }
    }, 1200);
  });

function generarPDF() {
  const { jsPDF } = window.jspdf;

  const nombre = document.getElementById("nombre").value;
  const telefono = document.getElementById("telefono").value;
  const email = document.getElementById("email").value;
  const dui = document.getElementById("dui").value;
  const canal = document.querySelector('input[name="canal"]:checked').value;
  const supervisor = document.getElementById("supervisor").value;
  const talla = document.getElementById("talla").value;
  const fecha = document.getElementById("fecha").value;
  const reingresoComo = document.querySelector(
    'input[name="reingreso_como"]:checked',
  ).value;
  const reingresoMarca = document.querySelector(
    'input[name="reingreso_marca"]:checked',
  ).value;
  const fechaCapacitacion = document.getElementById("fechaCapacitacion").value;
  const duracion = document.getElementById("duracion").value;
  const instructor = document.getElementById("instructor").value;
  const contenidos = getContenidosSeleccionados();
  const signatureImage = canvas.toDataURL("image/png");
  const fechaActual = new Date().toLocaleDateString("es-ES");

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12; // Márgenes más pequeños
  let y = 35; // Aumentado de 30 a 35

  // 🔷 Encabezado institucional
  function header() {
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, pageWidth, 28, "F");

    // Agregar logo si existe
    if (logoImageData) {
      try {
        // Detectar formato de imagen
        let imageFormat = "PNG"; // Por defecto
        if (
          logoImageData.includes("image/jpeg") ||
          logoImageData.includes("image/jpg")
        ) {
          imageFormat = "JPEG";
        } else if (logoImageData.includes("image/webp")) {
          imageFormat = "WEBP";
        } else if (logoImageData.includes("image/gif")) {
          imageFormat = "GIF";
        }

        doc.addImage(logoImageData, imageFormat, 10, 3, 20, 22);
      } catch (error) {
        console.log("Error al agregar logo al PDF:", error);
        // Si falla, intenta con PNG
        try {
          doc.addImage(logoImageData, "PNG", 10, 3, 20, 22);
        } catch (e) {
          console.log("No se pudo agregar el logo al PDF");
        }
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text("DOCUMENTO DE CONFORMIDAD DE CAPACITACIÓN", pageWidth / 2, 8, {
      align: "center",
    });
    doc.setFontSize(8);
    doc.setFont("times", "normal");
    doc.text(
      "Capacitación de Personal de Nuevo Ingreso – Área de Ventas",
      pageWidth / 2,
      14,
      { align: "center" },
    );
    doc.setFontSize(7);
    doc.setFont("times", "bold");
    doc.text("COMERCIALIZACIÓN EN MOVIMIENTO S.A. DE C.V.", pageWidth / 2, 20, {
      align: "center",
    });
  }

  // 🔷 Pie de página
  function footer() {
    doc.setDrawColor(150);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.setFontSize(6.5);
    doc.setTextColor(100);
    doc.text(
      "Documento emitido por Comercialización en Movimiento S.A. de C.V. | Confidencial - Uso Interno",
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" },
    );
  }

  function newPage() {
    doc.addPage();
    header();
    footer();
    y = 35; // Aumentado de 32 a 35
  }

  function checkSpace(extra = 12) {
    if (y + extra > pageHeight - 15) newPage();
  }

  // 🔷 Texto con ancho máximo controlado
  function addParagraph(text, lineHeight = 4, fontSize = 9) {
    const maxWidth = pageWidth - 2 * margin - 2;
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.setFontSize(fontSize);
    lines.forEach((line) => {
      checkSpace(lineHeight);
      doc.text(line, margin + 1, y);
      y += lineHeight;
    });
    y += 0.5;
  }

  header();
  footer();

  // 🔹 1. Datos del participante
  doc.setFont("times", "bold");
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(10);
  doc.text("1. DATOS DEL PARTICIPANTE", margin, y);
  y += 4.5;
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.35);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont("times", "normal");
  doc.setTextColor(0);
  addParagraph(`Nombre Completo: ${nombre}`, 3.8, 9);
  addParagraph(`DUI: ${dui}`, 3.8, 9);
  addParagraph(`Teléfono: ${telefono}`, 3.8, 9);
  addParagraph(`Correo Electrónico: ${email}`, 3.8, 9);
  addParagraph(`Canal: ${canal}`, 3.8, 9);
  addParagraph(`Supervisor: ${supervisor}`, 3.8, 9);
  addParagraph(`Talla de Camisa: ${talla}`, 3.8, 9);
  addParagraph(`Fecha: ${fecha}`, 3.8, 9);
  addParagraph(`Reingreso a COMO: ${reingresoComo}`, 3.8, 9);
  addParagraph(`Reingreso a la Marca: ${reingresoMarca}`, 3.8, 9);
  y += 2;

  // 🔹 2. Información de la Capacitación
  doc.setFont("times", "bold");
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(10);
  doc.text("2. INFORMACIÓN DE LA CAPACITACIÓN", margin, y);
  y += 4.5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont("times", "normal");
  doc.setTextColor(0);
  addParagraph(`Fecha de Capacitación: ${fechaCapacitacion}`, 3.8, 9);
  addParagraph(`Duración: ${duracion}`, 3.8, 9);
  addParagraph(`Instructor: ${instructor}`, 3.8, 9);
  y += 2;

  // 🔹 3. Contenidos brindados
  checkSpace();
  doc.setFont("times", "bold");
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(10);
  doc.text("3. CONTENIDOS BRINDADOS", margin, y);
  y += 4.5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont("times", "normal");
  doc.setTextColor(0);
  contenidos.forEach((c, i) => {
    addParagraph(`${i + 1}. ${c}`, 3.8, 8.5);
  });
  y += 1.5;

  // 🔹 4. Declaraciones
  checkSpace();
  doc.setFont("times", "bold");
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(10);
  doc.text("4. POR LO QUE HAGO CONSTAR QUE:", margin, y);
  y += 4.5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont("times", "normal");
  doc.setTextColor(0);
  const declaraciones = [
    "Comprendí la dinámica de trabajo, horarios y permisos laborales y sé cuáles son los procesos para seguir o en su defecto a quién dirigirme ante una situación que pueda enfrentar que imposibilite el cumplimiento de estos y los procesos o consecuencias de no seguir los criterios bajo la normativa del reglamento y políticas internas tanto del código de trabajo que la empresa implementará.",
    "Comprendí la dinámica de trabajo en campo y el manejo de los sistemas de activación, registro y facturación que utilizaré, comprometiéndome a ejercer mis funciones de ventas bajo los criterios y lineamiento de la empresa, también a usar los sistemas de manera adecuada bajo los criterios del empleador y a reportar de manera activa algún imprevisto o problema que sufra en los mismos con mi jefe inmediato o personal instruido para el apoyo de este.",
    "Fui instruido/a sobre la política interna de la empresa sobre Fraude, usurpación de identidad y sobreprecios de los productos prepago de Movistar a comercializar en mis actividades diarias y las consecuencias de estas malas prácticas.",
    "Comprendí la oferta comercial activa presentada por el capacitador y me comprometo a darle seguimiento y repaso a la oferta y las variantes que se puedan presentar por Movistar.",
    "Comprendí la responsabilidad que poseo al portar uniformes que representen la marca MOVISTAR EL SALVADOR comprometiéndome a hacer un buen uso de este durante horario laboral o fuera del mismo y comprendo las consecuencias por el mal uso de este.",
    "Comprendí y acepto las condiciones de pago de comisión proporcional durante 3 meses: Me doy por enterado que en caso de no cumplir la meta establecida para el canal y departamento correspondiente del KPI de SALDO Y ACTIVACIONES se me pagará el 15% del saldo inicial (Primer recarga) de las activaciones de calidad, y que este beneficio estará habilitado hasta tener ventas en N3 (los primeros 3 meses de relación laboral) para medición mientras SIGA LABORANDO PARA LA EMPRESA, sé que en el caso de renuncia o despido la medición se realizará según meta correspondiente del canal y departamento como vendedor antiguo anulando lo anteriormente establecido al principio de este punto.",
  ];
  declaraciones.forEach((t, i) => {
    addParagraph(`${i + 1}. ${t}`, 4.2, 8.5);
  });

  // 🔹 5. Términos y Condiciones
  newPage();
  doc.setFont("times", "bold");
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(10);
  doc.text("5. TÉRMINOS Y CONDICIONES GENERALES", margin, y);
  y += 4.5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  const terminos = [
    {
      titulo: "1. Naturaleza del documento:",
      texto:
        "Esta constancia no constituye un contrato laboral ni genera derechos adicionales. Su finalidad es dejar constancia de la participación y comprensión de los temas abordados durante la capacitación de inducción.",
    },
    {
      titulo: "2. Firma digital:",
      texto:
        "La firma electrónica aquí plasmada tiene validez legal equivalente a una firma manuscrita, confirmando la asistencia y comprensión del participante.",
    },
    {
      titulo: "3. Resguardo y confidencialidad:",
      texto:
        "El documento será almacenado digitalmente y protegido conforme a las políticas de confidencialidad de Comercialización en Movimiento S.A. de C.V., siendo de uso exclusivo interno.",
    },
    {
      titulo: "4. Actualización de contenidos:",
      texto:
        "La empresa podrá modificar los contenidos o procedimientos según las necesidades operativas o normativas, comprometiéndose el colaborador a mantenerse informado.",
    },
    {
      titulo: "5. Aceptación:",
      texto:
        "El firmante declara haber leído, comprendido y aceptado todos los términos y políticas establecidas en la presente conformidad.",
    },
  ];

  doc.setFont("times", "normal");
  doc.setTextColor(0);
  terminos.forEach((t) => {
    checkSpace(10);
    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.text(t.titulo, margin + 1, y);
    y += 3.5;
    doc.setFont("times", "normal");
    addParagraph(t.texto, 3.8, 8.5);
  });

  // 🔹 6. Firma
  newPage();
  doc.setFont("times", "bold");
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(10);
  doc.text("6. FIRMA DIGITAL", margin, y);
  y += 4.5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Agregar imagen de firma
  if (signatureImage && signatureImage !== "data:image/png;base64,") {
    const sigWidth = pageWidth - 2 * margin - 4;
    const sigHeight = 30;
    doc.addImage(signatureImage, "PNG", margin + 2, y, sigWidth, sigHeight);
    y += sigHeight + 5;
  }

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(`Nombre: ${nombre}`, margin + 1, y);
  y += 4;
  doc.text(`DUI: ${dui}`, margin + 1, y);
  y += 4;
  doc.text(`Fecha de firma: ${fechaActual}`, margin + 1, y);

  // ✅ Guardar archivo
  const filename = `Conformidad_${nombre.replace(/\s+/g, "_")}_${dui}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
