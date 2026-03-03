const STORAGE_KEY = "clientes-loja-roupas-v5";

const form = document.getElementById("customer-form");
const list = document.getElementById("customers-list");
const search = document.getElementById("search");
const template = document.getElementById("customer-template");
const overdueList = document.getElementById("overdue-customers-list");

let customers = normalizeCustomers(loadCustomers());

initializeTabs();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const providedId = document.getElementById("customer-id").value.trim();
  const customerId = providedId || generateCustomerId();

  if (customers.some((entry) => entry.customerCode === customerId)) {
    window.alert("Já existe um cliente com esse ID.");
    return;
  }

  customers.unshift({
    id: crypto.randomUUID(),
    customerCode: customerId,
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    creditLimit: Number(document.getElementById("limit").value) || 0,
    purchases: [],
    payments: [],
    createdAt: new Date().toISOString(),
  });

  persist();
  form.reset();
  document.getElementById("limit").value = "0";
  render();
});

search.addEventListener("input", render);

function initializeTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;
      tabButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
      tabContents.forEach((content) => {
        content.classList.toggle("active", content.id === `tab-${target}`);
      });
    });
  });
}

function render() {
  renderDashboard();
  renderCustomers();
}

function renderDashboard() {
  const overdueData = getOverdueCustomers();
  const totalOverdue = overdueData.reduce((acc, item) => acc + item.overdueAmount, 0);

  document.getElementById("kpi-total-clients").textContent = String(customers.length);
  document.getElementById("kpi-overdue-clients").textContent = String(overdueData.length);
  document.getElementById("kpi-overdue-amount").textContent = money(totalOverdue);

  overdueList.innerHTML = "";
  if (!overdueData.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum cliente com vencimento em atraso.";
    overdueList.appendChild(empty);
    return;
  }

  overdueData.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "overdue-item";
    item.innerHTML = `<strong>${escapeHtml(entry.name)}</strong> (ID: ${escapeHtml(
      entry.customerCode
    )})<br>Telefone: ${escapeHtml(entry.phone)}<br>Valor em atraso: <strong>${money(
      entry.overdueAmount
    )}</strong>`;
    overdueList.appendChild(item);
  });
}

function renderCustomers() {
  const query = search.value.trim().toLowerCase();
  list.innerHTML = "";

  const filtered = customers.filter((customer) => {
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      customer.customerCode.toLowerCase().includes(query)
    );
  });

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum cliente encontrado.";
    list.appendChild(empty);
    return;
  }

  filtered.forEach((customer) => {
    const totals = getTotals(customer);
    const fragment = template.content.cloneNode(true);

    fragment.querySelector(".customer-name").textContent = customer.name;
    fragment.querySelector(".customer-id-line").textContent = `ID: ${customer.customerCode}`;
    fragment.querySelector(".customer-contact").textContent = `${customer.phone}${
      customer.email ? ` • ${customer.email}` : ""
    }`;
    fragment.querySelector(".customer-credit").textContent = `Limite: ${money(customer.creditLimit)} | Compras ficha: ${money(
      totals.totalPurchases
    )} | Pagamentos: ${money(totals.totalPayments)}`;
    fragment.querySelector(".customer-debt").textContent = `Saldo devedor: ${money(
      totals.outstanding
    )} | Em atraso: ${money(totals.overdue)}`;

    const badge = fragment.querySelector(".badge");
    if (totals.outstanding === 0) {
      badge.className = "badge ok";
      badge.textContent = "Sem dívida";
    } else if (totals.overdue > 0) {
      badge.className = "badge alert";
      badge.textContent = "Vencido";
    } else {
      badge.className = "badge warning";
      badge.textContent = "A vencer";
    }

    bindEditForm(fragment, customer);
    bindPurchaseForm(fragment, customer);
    bindPaymentForm(fragment, customer);
    bindDelete(fragment, customer);
    bindReport(fragment, customer);
    renderPurchases(fragment, customer);
    renderPayments(fragment, customer);

    list.appendChild(fragment);
  });
}

function bindEditForm(fragment, customer) {
  const editForm = fragment.querySelector(".edit-form");
  editForm.querySelector(".edit-id").value = customer.customerCode;
  editForm.querySelector(".edit-name").value = customer.name;
  editForm.querySelector(".edit-phone").value = customer.phone;
  editForm.querySelector(".edit-email").value = customer.email || "";
  editForm.querySelector(".edit-limit").value = customer.creditLimit;

  editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const index = customers.findIndex((entry) => entry.id === customer.id);
    if (index === -1) return;

    const newCode = editForm.querySelector(".edit-id").value.trim() || generateCustomerId();
    const duplicated = customers.some(
      (entry) => entry.id !== customer.id && entry.customerCode === newCode
    );
    if (duplicated) {
      window.alert("Já existe outro cliente com esse ID.");
      return;
    }

    customers[index].customerCode = newCode;
    customers[index].name = editForm.querySelector(".edit-name").value.trim();
    customers[index].phone = editForm.querySelector(".edit-phone").value.trim();
    customers[index].email = editForm.querySelector(".edit-email").value.trim();
    customers[index].creditLimit = Number(editForm.querySelector(".edit-limit").value) || 0;

    persist();
    render();
  });
}

function bindPurchaseForm(fragment, customer) {
  const purchaseForm = fragment.querySelector(".purchase-form");
  const purchaseTypeInput = purchaseForm.querySelector(".purchase-type");
  const installmentsInput = purchaseForm.querySelector(".purchase-installments");
  const firstDueInput = purchaseForm.querySelector(".purchase-first-due");
  const creditOnlyFields = purchaseForm.querySelectorAll(".credit-only");

  purchaseForm.querySelector(".purchase-date").value = todayISO();
  firstDueInput.value = todayISO();

  const syncCreditFields = () => {
    const isCreditPurchase = purchaseTypeInput.value === "ficha";
    installmentsInput.required = isCreditPurchase;
    firstDueInput.required = isCreditPurchase;
    installmentsInput.disabled = !isCreditPurchase;
    firstDueInput.disabled = !isCreditPurchase;
    creditOnlyFields.forEach((field) => field.classList.toggle("hidden", !isCreditPurchase));
  };

  purchaseTypeInput.addEventListener("change", syncCreditFields);
  syncCreditFields();

  purchaseForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const amount = Number(purchaseForm.querySelector(".purchase-amount").value);
    const date = purchaseForm.querySelector(".purchase-date").value;
    const paymentType = purchaseForm.querySelector(".purchase-type").value;
    const installments = Number(purchaseForm.querySelector(".purchase-installments").value);
    const firstDueDate = purchaseForm.querySelector(".purchase-first-due").value;

    const isCreditPurchase = paymentType === "ficha";
    if (!amount || amount <= 0 || !date || !paymentType) return;
    if (isCreditPurchase && (!installments || installments < 1 || !firstDueDate)) return;

    const index = customers.findIndex((entry) => entry.id === customer.id);
    if (index === -1) return;

    customers[index].purchases.unshift({
      id: crypto.randomUUID(),
      amount,
      date,
      paymentType,
      installments: isCreditPurchase ? generateInstallments(amount, installments, firstDueDate) : [],
    });

    persist();
    render();
  });
}

function bindPaymentForm(fragment, customer) {
  const paymentForm = fragment.querySelector(".payment-form");
  paymentForm.querySelector(".payment-date").value = todayISO();

  paymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(paymentForm.querySelector(".payment-amount").value);
    const date = paymentForm.querySelector(".payment-date").value;
    const paymentType = paymentForm.querySelector(".payment-type").value;

    if (!amount || amount <= 0 || !date || !paymentType) return;

    const index = customers.findIndex((entry) => entry.id === customer.id);
    if (index === -1) return;

    customers[index].payments.unshift({
      id: crypto.randomUUID(),
      amount,
      date,
      paymentType,
    });

    persist();
    render();
  });
}

function bindDelete(fragment, customer) {
  fragment.querySelector(".delete-btn").addEventListener("click", () => {
    customers = customers.filter((entry) => entry.id !== customer.id);
    persist();
    render();
  });
}

function bindReport(fragment, customer) {
  fragment.querySelector(".report-btn").addEventListener("click", () => {
    const totals = getTotals(customer);
    const paymentApplied = getPaymentAllocation(customer);
    const installments = getAllInstallments(customer).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

    const installmentsRows = installments
      .map((ins) => {
        const paid = paymentApplied.byInstallmentId[ins.id] || 0;
        const pending = Math.max(ins.amount - paid, 0);
        return `<tr><td>${ins.number}/${ins.total}</td><td>${formatDateOnly(ins.dueDate)}</td><td>${money(ins.amount)}</td><td>${money(paid)}</td><td>${money(pending)}</td></tr>`;
      })
      .join("");

    const paymentsRows = customer.payments
      .map((p) => `<tr><td>${formatDateOnly(p.date)}</td><td>${labelPaymentType(p.paymentType)}</td><td>${money(p.amount)}</td></tr>`)
      .join("");

    const reportWindow = window.open("", "_blank");
    if (!reportWindow) return;

    reportWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório ${escapeHtml(customer.name)}</title><style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ccc;padding:6px;text-align:left}h1,h2{margin:8px 0}</style></head><body><h1>Ficha do Cliente</h1><p><strong>ID:</strong> ${escapeHtml(customer.customerCode)}<br><strong>Nome:</strong> ${escapeHtml(customer.name)}<br><strong>Telefone:</strong> ${escapeHtml(customer.phone)}<br><strong>E-mail:</strong> ${escapeHtml(customer.email || "-")}</p><h2>Resumo</h2><p>Total compras: ${money(totals.totalPurchases)}<br>Total pagamentos: ${money(totals.totalPayments)}<br>Saldo devedor: ${money(totals.outstanding)}<br>Em atraso: ${money(totals.overdue)}</p><h2>Parcelas</h2><table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Pago</th><th>Em aberto</th></tr></thead><tbody>${installmentsRows || '<tr><td colspan="5">Sem parcelas</td></tr>'}</tbody></table><h2>Pagamentos</h2><table><thead><tr><th>Data</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${paymentsRows || '<tr><td colspan="3">Sem pagamentos</td></tr>'}</tbody></table><script>window.print()</script></body></html>`);
    reportWindow.document.close();
  });
}

function renderPurchases(fragment, customer) {
  const ul = fragment.querySelector(".purchase-history");
  const paymentApplied = getPaymentAllocation(customer);

  if (!customer.purchases.length) {
    const li = document.createElement("li");
    li.textContent = "Sem compras registradas.";
    ul.appendChild(li);
    return;
  }

  customer.purchases.forEach((purchase) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const details = purchase.installments
      .map((installment) => {
        const paidPart = paymentApplied.byInstallmentId[installment.id] || 0;
        const pending = Math.max(installment.amount - paidPart, 0);
        const overdue = pending > 0 && isPastDate(installment.dueDate);
        return `${installment.number}/${installment.total}: ${money(installment.amount)} | aberto ${money(pending)} | vence ${formatDateOnly(installment.dueDate)}${overdue ? " (ATRASADO)" : ""}`;
      })
      .join(" • ");

    const text = document.createElement("span");
    const baseLine = `${formatDateOnly(purchase.date)} | ${money(purchase.amount)} | ${labelPaymentType(purchase.paymentType)}`;
    text.textContent = purchase.paymentType === "ficha" ? `${baseLine} | ${details}` : `${baseLine} | sem vencimento`;

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "mini-btn";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", () => editPurchase(customer.id, purchase.id));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "mini-btn danger-mini";
    removeBtn.textContent = "Excluir";
    removeBtn.addEventListener("click", () => removePurchase(customer.id, purchase.id));

    li.append(text, editBtn, removeBtn);
    ul.appendChild(li);
  });
}

function renderPayments(fragment, customer) {
  const ul = fragment.querySelector(".payment-history");

  if (!customer.payments.length) {
    const li = document.createElement("li");
    li.textContent = "Sem pagamentos registrados.";
    ul.appendChild(li);
    return;
  }

  customer.payments.forEach((payment) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const text = document.createElement("span");
    text.textContent = `${formatDateOnly(payment.date)} — ${money(payment.amount)} (${labelPaymentType(payment.paymentType)})`;

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "mini-btn";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", () => editPayment(customer.id, payment.id));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "mini-btn danger-mini";
    removeBtn.textContent = "Excluir";
    removeBtn.addEventListener("click", () => removePayment(customer.id, payment.id));

    li.append(text, editBtn, removeBtn);
    ul.appendChild(li);
  });
}

function editPurchase(customerId, purchaseId) {
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return;
  const purchase = customer.purchases.find((p) => p.id === purchaseId);
  if (!purchase) return;

  const amount = Number(window.prompt("Novo valor total da compra:", String(purchase.amount)));
  const date = window.prompt("Nova data da compra (AAAA-MM-DD):", purchase.date);
  const type = window.prompt("Tipo (ficha, cartao, dinheiro, pix):", purchase.paymentType);
  const installmentsCount = Number(window.prompt("Quantidade de parcelas:", String(purchase.installments?.length || 1)));
  const firstDue = window.prompt("Primeiro vencimento (AAAA-MM-DD):", purchase.installments?.[0]?.dueDate || todayISO());

  if (!amount || amount <= 0 || !date || !["ficha", "cartao", "dinheiro", "pix"].includes(type)) return;
  if (type === "ficha" && (!installmentsCount || installmentsCount < 1 || !firstDue)) return;

  purchase.amount = amount;
  purchase.date = date;
  purchase.paymentType = type;
  purchase.installments = type === "ficha" ? generateInstallments(amount, installmentsCount, firstDue) : [];

  persist();
  render();
}

function editPayment(customerId, paymentId) {
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return;
  const payment = customer.payments.find((p) => p.id === paymentId);
  if (!payment) return;

  const amount = Number(window.prompt("Novo valor do pagamento:", String(payment.amount)));
  const date = window.prompt("Nova data do pagamento (AAAA-MM-DD):", payment.date);
  const type = window.prompt("Tipo (cartao, dinheiro, pix):", payment.paymentType);

  if (!amount || amount <= 0 || !date || !["cartao", "dinheiro", "pix"].includes(type)) return;

  payment.amount = amount;
  payment.date = date;
  payment.paymentType = type;

  persist();
  render();
}

function removePurchase(customerId, purchaseId) {
  const index = customers.findIndex((c) => c.id === customerId);
  if (index === -1) return;
  customers[index].purchases = customers[index].purchases.filter((p) => p.id !== purchaseId);
  persist();
  render();
}

function removePayment(customerId, paymentId) {
  const index = customers.findIndex((c) => c.id === customerId);
  if (index === -1) return;
  customers[index].payments = customers[index].payments.filter((p) => p.id !== paymentId);
  persist();
  render();
}

function getTotals(customer) {
  const creditPurchases = customer.purchases.filter((purchase) => purchase.paymentType === "ficha");
  const allInstallments = getAllInstallments({ ...customer, purchases: creditPurchases });
  const totalPurchases = allInstallments.reduce((acc, item) => acc + item.amount, 0);
  const totalPayments = customer.payments.reduce((acc, item) => acc + item.amount, 0);
  const outstanding = Math.max(totalPurchases - totalPayments, 0);

  const allocation = getPaymentAllocation(customer);
  const overdue = allInstallments.reduce((acc, installment) => {
    const paid = allocation.byInstallmentId[installment.id] || 0;
    const pending = Math.max(installment.amount - paid, 0);
    if (pending > 0 && isPastDate(installment.dueDate)) return acc + pending;
    return acc;
  }, 0);

  return { totalPurchases, totalPayments, outstanding, overdue };
}

function getOverdueCustomers() {
  return customers
    .map((customer) => {
      const totals = getTotals(customer);
      return {
        id: customer.id,
        customerCode: customer.customerCode,
        name: customer.name,
        phone: customer.phone,
        overdueAmount: totals.overdue,
      };
    })
    .filter((item) => item.overdueAmount > 0)
    .sort((a, b) => b.overdueAmount - a.overdueAmount);
}

function getPaymentAllocation(customer) {
  const creditPurchases = customer.purchases.filter((purchase) => purchase.paymentType === "ficha");
  const installments = getAllInstallments({ ...customer, purchases: creditPurchases }).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  let remainingPayment = customer.payments.reduce((acc, item) => acc + item.amount, 0);
  const byInstallmentId = {};

  installments.forEach((installment) => {
    const paid = remainingPayment > 0 ? Math.min(installment.amount, remainingPayment) : 0;
    byInstallmentId[installment.id] = paid;
    remainingPayment -= paid;
  });

  return { byInstallmentId };
}

function getAllInstallments(customer) {
  return customer.purchases.flatMap((purchase) => {
    if (Array.isArray(purchase.installments) && purchase.installments.length) return purchase.installments;
    return [{
      id: `${purchase.id || crypto.randomUUID()}-1`,
      number: 1,
      total: 1,
      amount: Number(purchase.amount) || 0,
      dueDate: purchase.dueDate || purchase.date || todayISO(),
    }];
  });
}

function generateInstallments(totalAmount, count, firstDueDate) {
  const installments = [];
  const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
  let accumulated = 0;

  for (let i = 1; i <= count; i += 1) {
    const amount = i === count ? roundCurrency(totalAmount - accumulated) : baseAmount;
    accumulated = roundCurrency(accumulated + amount);
    installments.push({
      id: crypto.randomUUID(),
      number: i,
      total: count,
      amount,
      dueDate: addMonthsToDate(firstDueDate, i - 1),
    });
  }

  return installments;
}

function addMonthsToDate(yyyyMmDd, months) {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  const date = new Date(year, month - 1 + months, day);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

function isPastDate(yyyyMmDd) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${yyyyMmDd}T00:00:00`);
  return target < today;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function labelPaymentType(type) {
  if (type === "ficha") return "Ficha";
  if (type === "cartao") return "Cartão";
  if (type === "dinheiro") return "Dinheiro";
  if (type === "pix") return "PIX";
  return "Não informado";
}

function generateCustomerId() {
  const count = customers.length + 1;
  return `CLI-${String(count).padStart(4, "0")}`;
}

function escapeHtml(text) {
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function normalizeCustomers(rawCustomers) {
  return rawCustomers.map((item) => {
    const purchases = Array.isArray(item.purchases)
      ? item.purchases.map((purchase) => {
          const installments = Array.isArray(purchase.installments)
            ? purchase.installments
            : [{
                id: `${purchase.id || crypto.randomUUID()}-1`,
                number: 1,
                total: 1,
                amount: Number(purchase.amount) || 0,
                dueDate: purchase.dueDate || purchase.date || todayISO(),
              }];
          return {
            id: purchase.id || crypto.randomUUID(),
            amount: Number(purchase.amount) || installments.reduce((acc, ins) => acc + (Number(ins.amount) || 0), 0),
            date: purchase.date || todayISO(),
            paymentType: purchase.paymentType || "ficha",
            installments: purchase.paymentType === "ficha" ? installments : [],
          };
        })
      : [];

    const payments = Array.isArray(item.payments)
      ? item.payments.map((payment) => ({
          id: payment.id || crypto.randomUUID(),
          amount: Number(payment.amount) || 0,
          date: payment.date || todayISO(),
          paymentType: payment.paymentType || "dinheiro",
        }))
      : [];

    return {
      id: item.id || crypto.randomUUID(),
      customerCode: item.customerCode || item.code || generateCustomerId(),
      name: item.name || "",
      phone: item.phone || "",
      email: item.email || "",
      creditLimit: Number(item.creditLimit) || 0,
      purchases,
      payments,
      createdAt: item.createdAt || new Date().toISOString(),
    };
  });
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

function loadCustomers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateOnly(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

render();
