import { db } from "./firebase.js";
import { 
  collection, 
  getDocs, 
  query, 
  where,
  addDoc,
  updateDoc,
  doc
} 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// Para GitHub Pages - reemplaza con tu usuario y repositorio
const LOGO_URL =
  "https://raw.githubusercontent.com/kevinMejia6/Firmador_Contrato/main/logo_como.webp";

let logoImageData = null;

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
  cargarSupervisores();
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
    if (comprensiones < 4) {
      showToast(
        "⚠️ Por favor, marca todas las casillas de comprensión",
        "warning",
      );
      return;
    }

    const fechaInicio = document.getElementById("fechaInicio").value;
    const fechaFin = document.getElementById("fechaFin").value;

    if (!fechaInicio || !fechaFin) {
      showToast("⚠️ Debes completar las fechas de capacitación", "warning");
      return;
    }

    if (new Date(fechaFin) < new Date(fechaInicio)) {
      showToast("⚠️ La fecha final no puede ser menor que la inicial", "warning");
      return;
    }

    const telefono = document.getElementById("telefono").value;
  const dui = document.getElementById("dui").value;

  const telefonoRegex = /^\d{4}-\d{4}$/;
  const duiRegex = /^\d{8}-\d{1}$/;

  if (!telefonoRegex.test(telefono)) {
    showToast("⚠️ El teléfono debe tener formato 0000-0000", "warning");
    return;
  }

  if (!duiRegex.test(dui)) {
    showToast("⚠️ El DUI debe tener formato 00000000-0", "warning");
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
  function addSectionTitle(text) {

    if (y > pageHeight - 40) {
      newPage();
    }
  
    doc.setFont("times", "bold");
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(11);
  
    doc.text(text, margin, y);
    y += 5;
  
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
  
    y += 6;
  
    // Reset a normal para el contenido
    doc.setFont("times", "normal");
    doc.setTextColor(0);
    doc.setFontSize(9);
  }
function generarPDF() {
  const { jsPDF } = window.jspdf;

  const nombre = document.getElementById("nombre").value;
  const telefono = document.getElementById("telefono").value;
  const email = document.getElementById("email").value;
  const dui = document.getElementById("dui").value;
  //const canal = document.querySelector('input[name="canal"]:checked').value;
  //const supervisor = document.getElementById("supervisor").value;
  const selectSupervisor = document.getElementById("supervisor");
  const supervisor =
  selectSupervisor.options[selectSupervisor.selectedIndex].text;
  const talla = document.getElementById("talla").value;
  const fecha = document.getElementById("fecha").value;
  const reingresoComo = document.querySelector(
    'input[name="reingreso_como"]:checked',
  ).value;
  const reingresoMarca = document.querySelector(
    'input[name="reingreso_marca"]:checked',
  ).value;
  const fechaInicio = document.getElementById("fechaInicio").value;
  const fechaFin = document.getElementById("fechaFin").value;

  if (new Date(fechaFin) < new Date(fechaInicio)) {
  showToast("⚠️ La fecha final no puede ser menor que la inicial", "warning");
  return;
}
  const instructor = document.getElementById("instructor").value;
  const contenidos = getContenidosSeleccionados();
  const signatureImage = canvas.toDataURL("image/png");
  const fechaActual = new Date().toLocaleDateString("es-ES");

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12; // Márgenes más pequeños
  let y = 35; // Aumentado de 30 a 35
  const dias =
  (new Date(fechaFin) - new Date(fechaInicio)) /
  (1000 * 60 * 60 * 24) + 1;
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
 // addParagraph(`Canal: ${canal}`, 3.8, 9);
  addParagraph(`Supervisor: ${supervisor}`, 3.8, 9);
  addParagraph(`Talla de Camisa: ${talla}`, 3.8, 9);
  addParagraph(`Fecha: ${fecha}`, 3.8, 9);
  addParagraph(`Reingreso a COMO: ${reingresoComo}`, 3.8, 9);
  addParagraph(`Reingreso a la Marca: ${reingresoMarca}`, 3.8, 9);
  y += 2;

  // 🔹 2. Información de la Capacitación
  addSectionTitle("2. INFORMACIÓN DE LA CAPACITACIÓN");

  doc.setFont("times", "normal");
  doc.setTextColor(0);
  addParagraph(`Duración: ${dias} día(s)`, 3.8, 9);
  addParagraph(`Fecha de Inicio: ${fechaInicio}`, 3.8, 9);
  addParagraph(`Fecha de Finalización: ${fechaFin}`, 3.8, 9);
  addParagraph(`Instructor: ${instructor}`, 3.8, 9);
  y += 2;

// 🔹 3. Contenidos brindados
addSectionTitle("3. CONTENIDOS BRINDADOS");

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
    "He comprendido la dinámica laboral, horarios y el marco legal del reglamento interno y código de trabajo, incluyendo las consecuencias que asumir en caso de su incumplimiento y los canales de comunicación pertinentes. Asimismo, comprendo que el trabajo es de campo y el uso correcto de los sistemas de activación y facturación, comprometiéndome a cumplir los lineamientos de venta de la empresa y a reportar activamente cualquier incidencia técnica o administrativa a mi jefe inmediato o al personal de apoyo designado.",
  
    "He sido instruido sobre las políticas contra el fraude, usurpación de identidad y sobreprecios, aceptando las consecuencias de dichas malas prácticas; asimismo, comprendo la oferta comercial de Movistar y me comprometo a su seguimiento y actualización constante ante cualquier variante.",
  
    "Comprendí la responsabilidad que poseo al portar uniformes que representen la marca MOVISTAR EL SALVADOR comprometiéndome a hacer un buen uso de este durante horario laboral o fuera del mismo y comprendo las consecuencias por el mal uso de este.",
  
    "Comprendí y acepto las condiciones de pago de comisiones proporcionales durante los primeros 3 meses de relación laboral, en donde se me pagará el 15% del saldo inicial de las activaciones de calidad independientemente la cantidad vendida durante un mes natural y que este se mantendrá hasta que en mis resultados posea un N3 (ventas de hace 3 meses activas a la fecha de medición) para un cálculo regular y siempre y cuando exista relación laboral, comprendo que en caso de despido o renuncia el cálculo de mis comisiones se hará tomando de base la meta del canal y el departamento donde me desempeño."
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
        "Esta constancia no constituye ni sustituye un contrato laboral, ni implica compromisos adicionales a los establecidos por la ley o el contrato de trabajo. Su finalidad es dejar evidencia de la participación y comprensión de los temas, dinámicas y condiciones que la empresa ofrece para la plaza en la que se desempeñará el empleado, abordados durante la capacitación."
    },
    {
      titulo: "2. Firma digital:",
      texto:
        "Al firmar electrónicamente este documento, el empleado confirma su asistencia y comprensión de los contenidos descritos, así como su compromiso de aplicar lo aprendido de manera correcta y responsable en el desempeño de sus funciones. La firma digital o electrónica tendrá la misma validez que la firma manuscrita para efectos de registro interno, cumplimiento de controles de capacitación u otros fines administrativos que el empleador considere necesarios."
    },
    {
      titulo: "3. Resguardo y confidencialidad:",
      texto:
        "Este documento será almacenado en la bitácora del empleado dentro de los sistemas de la empresa y se entregará una copia en formato PDF para su respaldo personal. La constancia servirá como evidencia administrativa y operativa de la participación y comprensión de los temas abordados durante la capacitación o inducción. Podrá utilizarse como respaldo en caso de requerirse una verificación interna o ante autoridades competentes sobre los contenidos impartidos al inicio de la relación laboral o en refuerzos posteriores."
    },
    {
      titulo: "4. Actualización de contenidos:",
      texto:
        "La empresa podrá actualizar los temas de inducción o modificar procedimientos según necesidades operativas, legales o de seguridad. El empleado se compromete a mantenerse informado sobre dichos cambios y a participar en futuras capacitaciones cuando sea convocado."
    },
    {
      titulo: "5. Aceptación:",
      texto:
        "Al firmar, el empleado declara que ha leído, comprendido y acepta los contenidos, términos, dinámicas, condiciones y procedimientos establecidos para la plaza para la cual ha sido contratado. Esta aceptación no implica compromisos distintos a los establecidos por la ley o el contrato de trabajo, sino el cumplimiento adecuado de las funciones propias de su puesto conforme a lo requerido por el empleador."
    }
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

async function cargarSupervisores() {
  const selectSupervisor = document.getElementById("supervisor");

  try {
    // Solo traer supervisores activos
    const q = query(
      collection(db, "supervisores"),
      where("estado", "==", true)
    );

    const querySnapshot = await getDocs(q);

    selectSupervisor.innerHTML = '<option value="">Seleccione un supervisor</option>';

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      const nombreCompleto = `${data.nombres} ${data.apellidos}`;

      const option = document.createElement("option");
      option.value = nombreCompleto;
      option.textContent = nombreCompleto;

      selectSupervisor.appendChild(option);
    });

  } catch (error) {
    console.error("Error cargando supervisores:", error);
    selectSupervisor.innerHTML = '<option value="">Error al cargar</option>';
  }
}

const modal = document.getElementById("modalSupervisor");

document.getElementById("btnNuevoSupervisor").addEventListener("click", () => {
  modal.classList.add("show");
});

document.getElementById("cerrarModal").addEventListener("click", () => {
  modal.classList.remove("show");
});

document.getElementById("guardarSupervisor").addEventListener("click", async () => {

  const nombres = document.getElementById("nuevoNombre").value.trim();
  const apellidos = document.getElementById("nuevoApellido").value.trim();
  const sucursal = document.getElementById("nuevaSucursal").value.trim();

  const errorDiv = document.getElementById("errorSupervisor");

    errorDiv.style.display = "none";
    document.getElementById("nuevoNombre").classList.remove("input-error");
    document.getElementById("nuevoApellido").classList.remove("input-error");

    if (!nombres || !apellidos) {

      errorDiv.textContent = "⚠️ Completa nombres y apellidos";
      errorDiv.style.display = "block";

      if (!nombres) {
        document.getElementById("nuevoNombre").classList.add("input-error");
      }

      if (!apellidos) {
        document.getElementById("nuevoApellido").classList.add("input-error");
      }

      return;
    }

  try {

    await addDoc(collection(db, "supervisores"), {
      nombres,
      apellidos,
      sucursal,
      estado: true,
      creado: new Date()
    });

    alert("Supervisor agregado correctamente");

    modal.classList.remove("show");

    // limpiar inputs
    document.getElementById("nuevoNombre").value = "";
    document.getElementById("nuevoApellido").value = "";
    document.getElementById("nuevaSucursal").value = "";

    // recargar select
    cargarSupervisores();

  } catch (error) {
    console.error(error);
    alert("Error al guardar supervisor");
  }

});

document.getElementById("btnClearSignature")
  .addEventListener("click", clearSignature);
  document.getElementById("btnLimpiar")
  .addEventListener("click", limpiarFormulario);

  document.getElementById("btnAdministrarSupervisor")
  .addEventListener("click", () => {
    document.getElementById("modalAdministrar").classList.add("show");
    cargarSupervisoresAdmin();
  });

document.getElementById("cerrarModalAdmin")
  .addEventListener("click", () => {
    document.getElementById("modalAdministrar").classList.remove("show");
  });
  async function cargarSupervisoresAdmin() {

    const tbody = document.getElementById("tablaSupervisoresBody");
    tbody.innerHTML = "";
  
    const querySnapshot = await getDocs(collection(db, "supervisores"));
  
    querySnapshot.forEach((docSnap) => {
  
      const data = docSnap.data();
  
      const tr = document.createElement("tr");
  
      tr.innerHTML = `
        <td>${data.nombres} ${data.apellidos}</td>
        <td>${data.sucursal || "-"}</td>
        <td>
          <div class="radio-group">
            <label>
              <input type="radio" 
                     name="estado_${docSnap.id}" 
                     value="true"
                     ${data.estado ? "checked" : ""}
                     data-id="${docSnap.id}">
              Sí
            </label>
            <label>
              <input type="radio" 
                     name="estado_${docSnap.id}" 
                     value="false"
                     ${!data.estado ? "checked" : ""}
                     data-id="${docSnap.id}">
              No
            </label>
          </div>
        </td>
      `;
  
      tbody.appendChild(tr);
    });
  
  }
  document.addEventListener("change", async (e) => {

    if (e.target.matches('input[type="radio"][data-id]')) {
  
      const supervisorId = e.target.dataset.id;
      const nuevoEstado = e.target.value === "true";
  
      try {
  
        await updateDoc(doc(db, "supervisores", supervisorId), {
          estado: nuevoEstado
        });
  
        showToast("Estado actualizado correctamente", "success");
  
        cargarSupervisores(); // refresca el select principal
  
      } catch (error) {
        console.error(error);
        showToast("Error actualizando estado", "error");
      }
    }
  
  });

const inputTelefono = document.getElementById("telefono");

inputTelefono.addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, ""); // quitar todo lo que no sea número

  if (value.length > 8) value = value.slice(0, 8);

  if (value.length > 4) {
    value = value.slice(0, 4) + "-" + value.slice(4);
  }

  e.target.value = value;
});

const inputDui = document.getElementById("dui");

inputDui.addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "");

  if (value.length > 9) value = value.slice(0, 9);

  if (value.length > 8) {
    value = value.slice(0, 8) + "-" + value.slice(8);
  }

  e.target.value = value;
});
const inputNombre = document.getElementById("nombre");

inputNombre.addEventListener("input", (e) => {
  // Permitir solo letras y espacios (incluye acentos)
  e.target.value = e.target.value.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ\s]/g, "");
});
document.querySelectorAll(".termino-header").forEach(btn => {
  btn.addEventListener("click", function () {

    const item = this.parentElement;

    // Cerrar otros si quieres modo exclusivo
    document.querySelectorAll(".termino-item").forEach(i => {
      if (i !== item) i.classList.remove("active");
    });

    item.classList.toggle("active");
  });
});